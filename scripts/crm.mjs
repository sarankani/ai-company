#!/usr/bin/env node
/**
 * Evalyn CRM CLI (Tech Spec 002 §4.2) — how AI employees read/write business
 * records. Zero dependencies; talks to the panel's /api/crm over HTTP so
 * every write goes through the one validated path (RBAC, lifecycles,
 * activity log, gates).
 *
 * Env: PANEL_URL (default http://localhost:3000)
 *      CRM_AGENT_TOKEN (required)
 *      CRM_AGENT_ID (your employee id, e.g. sdr — or pass --as <id>)
 *
 * Usage:
 *   crm.mjs list <type> [--stage s] [--owner o] [--account a] [--q text]
 *   crm.mjs get <id>
 *   crm.mjs create <type> --title "…" [--summary "…"] [--owner o] [--account ACC-…] [--field k=v …]
 *   crm.mjs update <id> [--title "…"] [--summary "…"] [--owner o] [--account ACC-…] [--field k=v …]
 *   crm.mjs move <id> <stage>        # gated moves return the APR id to watch
 *   crm.mjs check <id>               # reconcile a parked record with its APR
 *   crm.mjs link <from-id> <rel> <to-id>
 *   crm.mjs comment <id> "text"
 *   crm.mjs search "query"
 *   crm.mjs notifications [--unread] [--ack]
 *   crm.mjs types                    # list record types + stages
 */

const BASE = (process.env.PANEL_URL || "http://localhost:3000").replace(/\/$/, "");

function parseArgs(argv) {
  const pos = [];
  const opts = { fields: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--field" || a === "--set") {
      const kv = argv[++i] ?? "";
      const j = kv.indexOf("=");
      if (j < 1) fail(`--field expects k=v, got '${kv}'`);
      opts.fields[kv.slice(0, j)] = kv.slice(j + 1);
    } else if (a.startsWith("--")) {
      const j = a.indexOf("=");
      if (j > 2) opts[a.slice(2, j)] = a.slice(j + 1);
      else if (i + 1 < argv.length && !argv[i + 1].startsWith("--")) opts[a.slice(2)] = argv[++i];
      else opts[a.slice(2)] = "1";
    } else pos.push(a);
  }
  return { pos, opts };
}

function fail(msg) {
  console.error(`crm: ${msg}`);
  process.exit(1);
}

async function api(method, path, body, opts) {
  const token = process.env.CRM_AGENT_TOKEN;
  if (!token) fail("CRM_AGENT_TOKEN is not set");
  const agent = opts.as || process.env.CRM_AGENT_ID;
  if (!agent) fail("set CRM_AGENT_ID or pass --as <employee-id>");
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Agent-Id": agent,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { fail(`${res.status} — ${text.slice(0, 300)}`); }
  if (!res.ok && res.status !== 202) fail(`${res.status} — ${json.error ?? text.slice(0, 300)}`);
  return { status: res.status, json };
}

function printRecord(r) {
  const f = Object.entries(r.fields ?? {}).filter(([, v]) => v != null && v !== "")
    .map(([k, v]) => `${k}=${v}`).join(" ");
  console.log(`${r.id}  [${r.stage}]${r.aprId ? ` (awaiting ${r.aprId} → ${r.pendingStage})` : ""}  ${r.title}`);
  console.log(`  owner=${r.owner}${r.accountId ? ` account=${r.accountId}` : ""}${f ? `  ${f}` : ""}`);
  if (r.summary) console.log(`  ${r.summary}`);
}

const { pos, opts } = parseArgs(process.argv.slice(2));
const [cmd, ...rest] = pos;

const patchBody = () => ({
  ...(opts.title !== undefined ? { title: opts.title } : {}),
  ...(opts.summary !== undefined ? { summary: opts.summary } : {}),
  ...(opts.owner !== undefined ? { owner: opts.owner } : {}),
  ...(opts.account !== undefined ? { account_id: opts.account || null } : {}),
  ...(Object.keys(opts.fields).length ? { fields: opts.fields } : {}),
});

switch (cmd) {
  case "list": {
    const [type] = rest;
    if (!type) fail("usage: list <type>");
    const p = new URLSearchParams({ type });
    for (const k of ["stage", "owner", "account", "q", "limit"]) if (opts[k]) p.set(k, opts[k]);
    const { json } = await api("GET", `/api/crm/records?${p}`, null, opts);
    if (!json.records.length) console.log("(none)");
    for (const r of json.records) printRecord(r);
    break;
  }
  case "get": {
    const [id] = rest;
    if (!id) fail("usage: get <id>");
    const { json } = await api("GET", `/api/crm/records/${id}`, null, opts);
    printRecord(json.record);
    for (const l of json.related ?? []) console.log(`  ${l.dir === "out" ? "→" : "←"} ${l.rel} ${l.id} [${l.stage}] ${l.title}`);
    for (const a of (json.activities ?? []).slice(0, 15)) {
      console.log(`  ${String(a.at).slice(0, 16).replace("T", " ")} ${a.actor} ${a.kind} ${JSON.stringify(a.detail)}`);
    }
    break;
  }
  case "create": {
    const [type] = rest;
    if (!type || !opts.title) fail("usage: create <type> --title \"…\"");
    const { json } = await api("POST", "/api/crm/records", { type, ...patchBody() }, opts);
    printRecord(json.record);
    break;
  }
  case "update": {
    const [id] = rest;
    if (!id) fail("usage: update <id> [--title …] [--field k=v]");
    const { json } = await api("PATCH", `/api/crm/records/${id}`, patchBody(), opts);
    printRecord(json.record);
    break;
  }
  case "move": {
    const [id, to] = rest;
    if (!id || !to) fail("usage: move <id> <stage>");
    const { status, json } = await api("POST", `/api/crm/records/${id}/transition`, { to }, opts);
    if (status === 202) {
      console.log(`GATED — approval filed: ${json.apr_id} (${json.gate} gate).`);
      console.log(`A human decides it in the panel inbox; run 'crm.mjs check ${id}' after.`);
    } else {
      printRecord(json.record);
    }
    break;
  }
  case "check": {
    const [id] = rest;
    if (!id) fail("usage: check <id>");
    const { json } = await api("POST", `/api/crm/records/${id}/transition`, { check: true }, opts);
    console.log(`gate status: ${json.status}${json.aprId ? ` (${json.aprId})` : ""}`);
    if (json.row) printRecord(json.row);
    break;
  }
  case "link": {
    const [from, rel, to] = rest;
    if (!from || !rel || !to) fail("usage: link <from-id> <rel> <to-id>");
    await api("POST", `/api/crm/records/${from}/links`, { rel, to }, opts);
    console.log(`linked ${from} -[${rel}]-> ${to}`);
    break;
  }
  case "comment": {
    const [id, ...words] = rest;
    const text = words.join(" ");
    if (!id || !text) fail("usage: comment <id> \"text\"");
    await api("POST", `/api/crm/records/${id}/comments`, { text }, opts);
    console.log("ok");
    break;
  }
  case "search": {
    const q = rest.join(" ");
    if (!q) fail("usage: search <query>");
    const { json } = await api("GET", `/api/crm/search?q=${encodeURIComponent(q)}`, null, opts);
    if (!json.records.length) console.log("(no matches)");
    for (const r of json.records) console.log(`${r.id}  [${r.stage}]  ${r.title}`);
    break;
  }
  case "notifications": {
    const p = opts.unread ? "?unread=1" : "";
    const { json } = await api("GET", `/api/crm/notifications${p}`, null, opts);
    if (!json.notifications.length) console.log("(none)");
    for (const n of json.notifications) {
      console.log(`${n.readAt ? " " : "•"} ${String(n.createdAt).slice(0, 16).replace("T", " ")}  ${n.message}`);
    }
    if (opts.ack && json.notifications.length) {
      await api("POST", "/api/crm/notifications", {}, opts);
      console.log("(marked read)");
    }
    break;
  }
  case "types": {
    // static — mirrors panel/lib/crm/lifecycles.ts
    const TYPES = {
      accounts: "prospect→active→dormant/churned", contacts: "active/left-company/do-not-contact",
      leads: "new→contacted→qualified/disqualified", opportunities: "discovery→scoping→proposal→negotiation→won/lost",
      estimates: "draft→reviewed→approved", quotes: "draft→approved→sent*→accepted",
      proposals: "draft→sent*→signed", pos: "received→verified→booked*",
      projects: "kickoff→in-delivery*→uat→delivered→closed", sows: "draft→sent*→signed",
      milestones: "planned→in-progress→delivered→accepted*→invoiced", invoices: "draft→sent*→paid/overdue",
      tickets: "new→triaged→in-progress→resolved→closed", vendors: "prospective→approved→active",
      "purchase-orders-out": "requested→approved→ordered*→received", assets: "procured→allocated→in-use→retired",
    };
    for (const [t, s] of Object.entries(TYPES)) console.log(`${t.padEnd(20)} ${s}`);
    console.log("\n* = human-gated transition (files an approval, decided in the panel inbox)");
    break;
  }
  default:
    fail(`unknown command '${cmd ?? ""}' — see the header of scripts/crm.mjs for usage`);
}

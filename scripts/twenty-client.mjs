#!/usr/bin/env node
/**
 * Evalyn Twenty CRM Client (EX-801.4) — AI employee CLI for Twenty CRM.
 *
 * Lightweight zero-dependency GraphQL wrapper. Uses native fetch.
 * Maps Twenty entities (companies, people, opportunities, notes, tasks,
 * activities) to Evalyn's Company OS concepts.
 *
 * Env:
 *   TWENTY_API_URL    — your Twenty instance (default: http://localhost:3000)
 *   TWENTY_API_KEY    — API key from Twenty Settings > Developers & API
 *
 * Usage:
 *   twenty-client.mjs list <entity> [--q text] [--limit N]
 *   twenty-client.mjs get <id>
 *   twenty-client.mjs create <entity> --title "..." [--field k=v ...]
 *   twenty-client.mjs update <id> --title "..." [--field k=v ...]
 *   twenty-client.mjs search "query"
 *   twenty-client.mjs companies
 *   twenty-client.mjs people
 *   twenty-client.mjs opportunities
 *   twenty-client.mjs notes <linked-object-id>
 *   twenty-client.mjs tasks [--status open|done]
 *   twenty-client.mjs activities <linked-object-id>
 *
 * Entity mapping (Evalyn → Twenty):
 *   accounts              → companies
 *   contacts              → people
 *   leads                 → companies (stage = lead)
 *   opportunities         → opportunities
 *   projects              → companies (with custom fields) or custom object
 *   invoices              → custom object or notes
 *   tickets               → tasks (with custom fields)
 *   vendors               → companies (stage = vendor)
 *   milestones            → notes or custom object
 *   estimates/quotes/sows/pos/purchase-orders-out/assets → notes or custom objects
 */

const BASE = (process.env.TWENTY_API_URL || "http://localhost:3000").replace(/\/$/, "");
const TOKEN = process.env.TWENTY_API_KEY;

// ---------- helpers ----------

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
  console.error(`twenty-client: ${msg}`);
  process.exit(1);
}

async function gql(query, variables = {}) {
  if (!TOKEN) fail("TWENTY_API_KEY is not set");
  const res = await fetch(`${BASE}/graphql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify({ query, variables }),
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { fail(`${res.status} — ${text.slice(0, 300)}`); }
  if (json.errors) {
    const first = json.errors[0]?.message ?? JSON.stringify(json.errors);
    fail(`GraphQL error: ${first}`);
  }
  return json.data;
}

// ---------- print helpers ----------

function printCompany(c) {
  console.log(`${c.id}  ${c.name ?? "(no name)"}${c.domainName ? ` · ${c.domainName}` : ""}`);
  if (c.address) console.log(`  addr: ${c.address}`);
  if (c.employees) console.log(`  team: ${c.employees}`);
}

function printPerson(p) {
  console.log(`${p.id}  ${p.name?.firstName ?? ""} ${p.name?.lastName ?? ""}`.trim());
  if (p.email) console.log(`  email: ${p.email}`);
  if (p.phone) console.log(`  phone: ${p.phone}`);
  if (p.company?.name) console.log(`  company: ${p.company.name}`);
}

function printOpportunity(o) {
  console.log(`${o.id}  ${o.name ?? "(no name)"}  [${o.stage?.name ?? "?"}]`);
  if (o.amount?.amountMicros) console.log(`  value: ${o.amount.amountMicros / 1_000_000} ${o.amount.currencyCode ?? ""}`);
  if (o.closeDate) console.log(`  close: ${o.closeDate}`);
  if (o.company?.name) console.log(`  company: ${o.company.name}`);
  if (o.pointOfContact?.name?.firstName) console.log(`  contact: ${o.pointOfContact.name.firstName} ${o.pointOfContact.name.lastName ?? ""}`);
}

function printNote(n) {
  console.log(`${n.id}  note${n.title ? `: ${n.title}` : ""}`);
  if (n.body) console.log(`  ${n.body.slice(0, 200)}${n.body.length > 200 ? "…" : ""}`);
}

function printTask(t) {
  console.log(`${t.id}  ${t.title ?? "(no title)"}  [${t.status ?? "?"}]`);
  if (t.dueAt) console.log(`  due: ${t.dueAt}`);
  if (t.assignee?.name?.firstName) console.log(`  assignee: ${t.assignee.name.firstName}`);
}

// ---------- commands ----------

const { pos, opts } = parseArgs(process.argv.slice(2));
const [cmd, ...rest] = pos;

switch (cmd) {
  case "list": {
    const [entity] = rest;
    if (!entity) fail("usage: list <entity>  (companies | people | opportunities | tasks)");
    const limit = Math.min(Number(opts.limit ?? 50), 200);
    if (entity === "companies") {
      const data = await gql(`
        query Companies($limit: Int) {
          companies(paging: { first: $limit }) {
            edges { node { id name domainName address employees } }
          }
        }`, { limit });
      const items = data.companies?.edges?.map((e) => e.node) ?? [];
      if (!items.length) console.log("(none)");
      for (const c of items) printCompany(c);
    } else if (entity === "people" || entity === "contacts") {
      const data = await gql(`
        query People($limit: Int) {
          people(paging: { first: $limit }) {
            edges { node { id name { firstName lastName } email phone company { name } } }
          }
        }`, { limit });
      const items = data.people?.edges?.map((e) => e.node) ?? [];
      if (!items.length) console.log("(none)");
      for (const p of items) printPerson(p);
    } else if (entity === "opportunities") {
      const data = await gql(`
        query Opportunities($limit: Int) {
          opportunities(paging: { first: $limit }) {
            edges { node { id name stage { name } amount { amountMicros currencyCode } closeDate company { name } pointOfContact { name { firstName lastName } } } }
          }
        }`, { limit });
      const items = data.opportunities?.edges?.map((e) => e.node) ?? [];
      if (!items.length) console.log("(none)");
      for (const o of items) printOpportunity(o);
    } else if (entity === "tasks" || entity === "tickets") {
      const filter = opts.status ? `, filter: { status: { eq: "${opts.status}" } }` : "";
      const data = await gql(`
        query Tasks($limit: Int) {
          tasks(paging: { first: $limit }${filter}) {
            edges { node { id title status dueAt assignee { name { firstName } } } }
          }
        }`, { limit });
      const items = data.tasks?.edges?.map((e) => e.node) ?? [];
      if (!items.length) console.log("(none)");
      for (const t of items) printTask(t);
    } else {
      fail(`unknown entity '${entity}' — try: companies, people, opportunities, tasks`);
    }
    break;
  }

  case "get": {
    const [id] = rest;
    if (!id) fail("usage: get <id>  (Twenty object ID)");
    // Try each type in order — Twenty IDs are UUIDs, not type-prefixed
    const types = [
      { name: "company", query: `query($id: UUID!) { company(id: $id) { id name domainName address employees } }`, print: printCompany },
      { name: "person", query: `query($id: UUID!) { person(id: $id) { id name { firstName lastName } email phone company { name } } }`, print: printPerson },
      { name: "opportunity", query: `query($id: UUID!) { opportunity(id: $id) { id name stage { name } amount { amountMicros currencyCode } closeDate company { name } pointOfContact { name { firstName lastName } } } }`, print: printOpportunity },
    ];
    for (const t of types) {
      try {
        const data = await gql(t.query, { id });
        const obj = data[t.name];
        if (obj) { t.print(obj); process.exit(0); }
      } catch { /* try next type */ }
    }
    fail(`record '${id}' not found in companies, people, or opportunities`);
  }

  case "create": {
    const [entity] = rest;
    if (!entity || !opts.title) fail("usage: create <entity> --title '...' [--field k=v ...]");
    if (entity === "company" || entity === "companies") {
      const data = await gql(`
        mutation CreateCompany($data: CompanyCreateInput!) {
          createCompany(data: $data) { id name domainName }
        }`, { data: { name: opts.title, ...(opts.fields.domainName ? { domainName: opts.fields.domainName } : {}) } });
      console.log(`created company ${data.createCompany.id} — ${data.createCompany.name}`);
    } else if (entity === "person" || entity === "people" || entity === "contact" || entity === "contacts") {
      const input = { name: { firstName: opts.title } };
      if (opts.fields.email) input.email = opts.fields.email;
      if (opts.fields.phone) input.phone = opts.fields.phone;
      if (opts.fields.companyId) input.companyId = opts.fields.companyId;
      const data = await gql(`
        mutation CreatePerson($data: PersonCreateInput!) {
          createPerson(data: $data) { id name { firstName lastName } email }
        }`, { data: input });
      console.log(`created person ${data.createPerson.id}`);
    } else if (entity === "opportunity" || entity === "opportunities") {
      const input = { name: opts.title };
      if (opts.fields.amount) input.amount = Number(opts.fields.amount) * 1_000_000;
      if (opts.fields.closeDate) input.closeDate = opts.fields.closeDate;
      if (opts.fields.companyId) input.companyId = opts.fields.companyId;
      if (opts.fields.personId) input.pointOfContactId = opts.fields.personId;
      const data = await gql(`
        mutation CreateOpportunity($data: OpportunityCreateInput!) {
          createOpportunity(data: $data) { id name stage { name } }
        }`, { data: input });
      console.log(`created opportunity ${data.createOpportunity.id} — ${data.createOpportunity.name}`);
    } else if (entity === "note" || entity === "notes") {
      const input = { title: opts.title };
      if (opts.fields.body) input.body = opts.fields.body;
      const data = await gql(`
        mutation CreateNote($data: NoteCreateInput!) {
          createNote(data: $data) { id title body }
        }`, { data: input });
      console.log(`created note ${data.createNote.id}`);
    } else if (entity === "task" || entity === "tasks" || entity === "ticket" || entity === "tickets") {
      const input = { title: opts.title };
      if (opts.fields.status) input.status = opts.fields.status;
      if (opts.fields.dueAt) input.dueAt = opts.fields.dueAt;
      if (opts.fields.assigneeId) input.assigneeId = opts.fields.assigneeId;
      const data = await gql(`
        mutation CreateTask($data: TaskCreateInput!) {
          createTask(data: $data) { id title status }
        }`, { data: input });
      console.log(`created task ${data.createTask.id}`);
    } else {
      fail(`unknown entity '${entity}' — try: company, person, opportunity, note, task`);
    }
    break;
  }

  case "update": {
    const [id] = rest;
    if (!id) fail("usage: update <id> --title '...' [--field k=v ...]");
    // Try to infer type from fields, or brute-force each type
    const updates = {};
    if (opts.title) updates.name = opts.title;
    for (const [k, v] of Object.entries(opts.fields)) {
      if (k === "stage") updates.stage = v;
      else if (k === "amount") updates.amount = Number(v) * 1_000_000;
      else if (k === "closeDate") updates.closeDate = v;
      else if (k === "email") updates.email = v;
      else if (k === "phone") updates.phone = v;
      else if (k === "body") updates.body = v;
      else if (k === "status") updates.status = v;
      else if (k === "dueAt") updates.dueAt = v;
      else updates[k] = v;
    }
    const types = [
      { name: "company", mutation: `mutation($id: UUID!, $data: CompanyUpdateInput!) { updateCompany(id: $id, data: $data) { id name } }` },
      { name: "person", mutation: `mutation($id: UUID!, $data: PersonUpdateInput!) { updatePerson(id: $id, data: $data) { id name { firstName } } }` },
      { name: "opportunity", mutation: `mutation($id: UUID!, $data: OpportunityUpdateInput!) { updateOpportunity(id: $id, data: $data) { id name } }` },
      { name: "note", mutation: `mutation($id: UUID!, $data: NoteUpdateInput!) { updateNote(id: $id, data: $data) { id title } }` },
      { name: "task", mutation: `mutation($id: UUID!, $data: TaskUpdateInput!) { updateTask(id: $id, data: $data) { id title } }` },
    ];
    for (const t of types) {
      try {
        const data = await gql(t.mutation, { id, data: updates });
        if (data[t.name === "person" ? "updatePerson" : `update${t.name.charAt(0).toUpperCase() + t.name.slice(1)}`]) {
          console.log(`updated ${t.name} ${id}`);
          process.exit(0);
        }
      } catch { /* try next */ }
    }
    fail(`could not update '${id}' — check the ID exists and the fields are valid for that type`);
  }

  case "search": {
    const q = rest.join(" ");
    if (!q) fail("usage: search <query>");
    // Twenty search is per-entity; run across key types
    console.log(`=== Companies ===`);
    try {
      const data = await gql(`
        query SearchCompanies($q: String!, $limit: Int) {
          companies(filter: { name: { ilike: $q } }, paging: { first: $limit }) {
            edges { node { id name domainName } }
          }
        }`, { q: `%${q}%`, limit: 20 });
      const items = data.companies?.edges?.map((e) => e.node) ?? [];
      if (!items.length) console.log("(no matches)");
      for (const c of items) printCompany(c);
    } catch (e) { console.log(`(error: ${e.message})`); }

    console.log(`\n=== People ===`);
    try {
      const data = await gql(`
        query SearchPeople($q: String!, $limit: Int) {
          people(filter: { name: { firstName: { ilike: $q } } }, paging: { first: $limit }) {
            edges { node { id name { firstName lastName } email } }
          }
        }`, { q: `%${q}%`, limit: 20 });
      const items = data.people?.edges?.map((e) => e.node) ?? [];
      if (!items.length) console.log("(no matches)");
      for (const p of items) printPerson(p);
    } catch (e) { console.log(`(error: ${e.message})`); }

    console.log(`\n=== Opportunities ===`);
    try {
      const data = await gql(`
        query SearchOpportunities($q: String!, $limit: Int) {
          opportunities(filter: { name: { ilike: $q } }, paging: { first: $limit }) {
            edges { node { id name stage { name } company { name } } }
          }
        }`, { q: `%${q}%`, limit: 20 });
      const items = data.opportunities?.edges?.map((e) => e.node) ?? [];
      if (!items.length) console.log("(no matches)");
      for (const o of items) printOpportunity(o);
    } catch (e) { console.log(`(error: ${e.message})`); }
    break;
  }

  case "companies": {
    const data = await gql(`
      query { companies(paging: { first: 100 }) { edges { node { id name domainName address employees } } } }`);
    const items = data.companies?.edges?.map((e) => e.node) ?? [];
    if (!items.length) console.log("(none)");
    for (const c of items) printCompany(c);
    break;
  }

  case "people": {
    const data = await gql(`
      query { people(paging: { first: 100 }) { edges { node { id name { firstName lastName } email phone company { name } } } } }`);
    const items = data.people?.edges?.map((e) => e.node) ?? [];
    if (!items.length) console.log("(none)");
    for (const p of items) printPerson(p);
    break;
  }

  case "opportunities": {
    const data = await gql(`
      query { opportunities(paging: { first: 100 }) { edges { node { id name stage { name } amount { amountMicros currencyCode } closeDate company { name } pointOfContact { name { firstName lastName } } } } } }`);
    const items = data.opportunities?.edges?.map((e) => e.node) ?? [];
    if (!items.length) console.log("(none)");
    for (const o of items) printOpportunity(o);
    break;
  }

  case "notes": {
    const [linkedId] = rest;
    const data = await gql(`
      query($linkedId: UUID!) {
        notes(filter: { noteTargets: { companyId: { eq: $linkedId } } }, paging: { first: 50 }) {
          edges { node { id title body createdAt author { name { firstName } } } }
        }
      }`, { linkedId });
    const items = data.notes?.edges?.map((e) => e.node) ?? [];
    if (!items.length) console.log("(none)");
    for (const n of items) printNote(n);
    break;
  }

  case "tasks": {
    const filter = opts.status ? `, filter: { status: { eq: "${opts.status}" } }` : "";
    const data = await gql(`
      query { tasks(paging: { first: 100 }${filter}) { edges { node { id title status dueAt assignee { name { firstName } } } } } }`);
    const items = data.tasks?.edges?.map((e) => e.node) ?? [];
    if (!items.length) console.log("(none)");
    for (const t of items) printTask(t);
    break;
  }

  case "activities": {
    const [linkedId] = rest;
    const data = await gql(`
      query($linkedId: UUID!) {
        activities(filter: { activityTargets: { companyId: { eq: $linkedId } } }, paging: { first: 50 }) {
          edges { node { id title type createdAt author { name { firstName } } } }
        }
      }`, { linkedId });
    const items = data.activities?.edges?.map((e) => e.node) ?? [];
    if (!items.length) console.log("(none)");
    for (const a of items) console.log(`${a.id}  ${a.type ?? "activity"}: ${a.title ?? ""}  (${a.createdAt?.slice(0, 10) ?? ""})`);
    break;
  }

  default:
    console.log(`
Evalyn Twenty CRM Client — AI employee CLI

Usage:
  twenty-client.mjs list <entity> [--q text] [--limit N]
    entity: companies | people | opportunities | tasks

  twenty-client.mjs get <id>
    Try companies, people, opportunities in order.

  twenty-client.mjs create <entity> --title "..." [--field k=v ...]
    entity: company | person | opportunity | note | task
    fields: domainName, email, phone, companyId, amount, closeDate, body, status, dueAt, assigneeId

  twenty-client.mjs update <id> --title "..." [--field k=v ...]

  twenty-client.mjs search "query"
    Searches companies, people, opportunities.

  twenty-client.mjs companies         # list all companies
  twenty-client.mjs people            # list all people
  twenty-client.mjs opportunities     # list all opportunities
  twenty-client.mjs notes <linked-id> # notes linked to a company
  twenty-client.mjs tasks [--status open|done]
  twenty-client.mjs activities <linked-id>

Env:
  TWENTY_API_URL  — Twenty instance URL (default: http://localhost:3000)
  TWENTY_API_KEY  — API key from Twenty Settings > Developers & API

Entity mapping (Evalyn → Twenty):
  accounts/contacts/leads/vendors → companies / people
  opportunities → opportunities
  tickets → tasks
  projects/milestones/invoices/etc → notes / custom objects
`);
    process.exit(cmd ? 1 : 0);
}

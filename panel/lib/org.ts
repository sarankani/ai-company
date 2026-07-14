/** Org layer: humans registry + seat authorization (Tech Spec §2.2, §3). */
import { parseRecord, repoSource, type InlineDict } from "./records";

export interface Human {
  id: string;
  name: string;
  email: string;
  title: string;
  availability: "available" | "busy" | "ooo";
  roles: { department: string; seat: string }[];
}

let orgCache: { at: number; humans: Human[] } | null = null;
const TTL_MS = Number(process.env.CACHE_TTL_MS ?? 5 * 60 * 1000);

/** Drop org caches after a write that touched company/org/. */
export function revalidateOrg() {
  orgCache = null;
  deptCache = null;
}

export async function loadHumans(): Promise<Human[]> {
  if (orgCache && Date.now() - orgCache.at < TTL_MS) return orgCache.humans;
  const src = repoSource();
  const humans: Human[] = [];
  for (const name of await src.listDir("company/org/humans")) {
    const { data } = parseRecord(await src.readFile(`company/org/humans/${name}`));
    humans.push({
      id: String(data.id),
      name: String(data.name),
      email: String(data.email),
      title: String(data.title ?? ""),
      availability: (data.availability as Human["availability"]) ?? "available",
      roles: ((data.roles as InlineDict[]) ?? []).map((r) => ({
        department: String(r.department),
        seat: String(r.seat),
      })),
    });
  }
  orgCache = { at: Date.now(), humans };
  return humans;
}

export async function humanByEmail(email: string): Promise<Human | null> {
  const humans = await loadHumans();
  return humans.find((h) => h.email.toLowerCase() === email.trim().toLowerCase()) ?? null;
}

export async function humanById(id: string): Promise<Human | null> {
  const humans = await loadHumans();
  return humans.find((h) => h.id === id) ?? null;
}

/** A human may decide an item if they hold any seat in its department, or the ceo seat. */
export function authorized(h: Human, department: string): boolean {
  return h.roles.some((r) => r.seat === "ceo" || r.department === department);
}

export function isCeoSeat(h: Human): boolean {
  return h.roles.some((r) => r.seat === "ceo");
}

export function isHeadOf(h: Human, department: string): boolean {
  return h.roles.some((r) => r.seat === "ceo" || (r.department === department && r.seat === "head"));
}

// ---------- departments (company/org/departments.md, markdown table) ----------

export interface Department {
  id: string;
  name: string;
  employees: string[];
  gates: string;
}

let deptCache: { at: number; depts: Department[] } | null = null;

export async function loadDepartments(): Promise<Department[]> {
  if (deptCache && Date.now() - deptCache.at < TTL_MS) return deptCache.depts;
  const raw = await repoSource().readFile("company/org/departments.md");
  const depts: Department[] = [];
  for (const line of raw.split("\n")) {
    // data rows look like: | `engineering` | Engineering | developer, … | merge / deploy |
    const m = line.match(/^\|\s*`([a-z-]+)`\s*\|([^|]*)\|([^|]*)\|([^|]*)\|/);
    if (!m) continue;
    depts.push({
      id: m[1],
      name: m[2].trim(),
      employees: m[3].split(",").map((s) => s.trim()).filter(Boolean),
      gates: m[4].trim(),
    });
  }
  deptCache = { at: Date.now(), depts };
  return depts;
}

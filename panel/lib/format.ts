/** Shared presentation helpers (inbox rows + item detail header). */

export function slaLabel(due: string, now: Date): { text: string; overdue: boolean } {
  const ms = new Date(due).getTime() - now.getTime();
  const overdue = ms < 0;
  const abs = Math.abs(ms);
  const h = Math.floor(abs / 3600_000);
  const m = Math.floor((abs % 3600_000) / 60_000);
  const span = h >= 48 ? `${Math.floor(h / 24)}d` : h > 0 ? `${h}h ${m}m` : `${m}m`;
  return { text: overdue ? `Overdue by ${span}` : `Due in ${span}`, overdue };
}

/** Body section extractor: record bodies are "## Summary / ## Decision /
 * ## Thread" — returns the text under one heading. */
export function bodySection(body: string, heading: string): string {
  const re = new RegExp(`^## ${heading}\\s*\\n([\\s\\S]*?)(?=^## |$(?![\\s\\S]))`, "m");
  return (body.match(re)?.[1] ?? "").trim();
}

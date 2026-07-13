# /memory — Evalyn's durable cross-session memory

Every AI employee session starts stateless. This folder is how the company remembers. It complements — never replaces — the system of record: **business state lives in `company/`, decisions with architectural weight live in `docs/adrs/`, this folder holds everything else worth remembering.**

## Files & rules

| File | Holds | Write rule |
|---|---|---|
| `company-context.md` | Durable facts: people, direction, current focus, project status snapshot | Keep current — **edit in place**, it's a snapshot not a log; date the header on change |
| `decisions-log.md` | Operational decisions (reversible, day-to-day) with date + who + why | **Append-only**, newest first; promote to an ADR if it turns out to be load-bearing |
| `glossary.md` | Terms, codenames, acronyms, record-ID schemes | Append/refine as language emerges |

## How employees use it

- **At session start** (any significant task): read `company-context.md`, skim recent `decisions-log.md` entries, check `glossary.md` for unfamiliar terms.
- **Before ending a work session** that decided something, changed direction, or learned a durable fact: write it here. If a future session would waste time rediscovering it, it belongs in memory.
- Keep entries short and factual. Unknowns are `TBD`, never guessed (CLAUDE.md §6.2).

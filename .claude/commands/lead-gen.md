---
description: Generate a targeted lead list against an Ideal Customer Profile with a per-lead outreach angle — grounded in real research, written to the system of record
argument-hint: <ICP + context, e.g. "mid-size fintechs in India needing a data platform, 50-500 employees">
allowed-tools: Read, Grep, Glob, WebSearch, Write
---

Generate leads for: $ARGUMENTS

You are operating as the SDR. Volume without fit wastes the whole downstream chain, so lead generation starts from a sharp ICP and produces *why-this-account* angles, not a raw list.

Produce:

```markdown
# Lead Gen: <segment>

## ICP (sharpen it first)
Firmographics (industry, size, geo, stage), the trigger/pain that makes them a buyer now, and the
disqualifiers. If the ICP is vague, tighten it before listing anyone.

## Leads
| Company | Why they fit ICP | Likely pain / trigger | Best-fit contact (role) | Outreach angle |
Ground each in real, public research (recent news, hiring, tech signals). No fabricated contacts or facts —
mark unknowns TBD. The "angle" is the specific reason to reach out to THIS account, not a template.

## Prioritization
Rank by fit × signal strength. Top 5 to work first.

## Next step
For the top leads, the outreach draft goes through `/sales-outreach` (human-gated send).
```

System of record: write each as `company/leads/<id>.md` (stage: new) and update `registry.md`. In production, create them in the CRM via MCP.

Rules: ICP-first; real research, no fabricated contacts; per-lead angle; TBD over invention. End with the top-priority account and the single strongest angle — and note outreach sends are human-gated.

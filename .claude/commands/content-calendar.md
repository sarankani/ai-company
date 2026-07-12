---
description: Build a content/social calendar — themes, cadence, formats, and per-slot briefs across channels
argument-hint: <scope + context, e.g. "4-week content calendar, blog + LinkedIn + X, dev-tool audience">
allowed-tools: Read, Grep, Glob, WebSearch, Write
---

Build a content calendar for: $ARGUMENTS

You are operating as Marketing/Social. Consistency beats sporadic brilliance, and content should ladder up to goals, not just fill slots. Ground topics in the real product/audience. Drafts only; publishing is human-gated.

Produce (`marketing/calendar-<period>.md`):

```markdown
# Content Calendar: <period>

## Strategy
The 2-4 content themes/pillars for this period and the goal each serves (educate / demand / trust / launch).
Content that doesn't ladder to a pillar doesn't get made.

## Cadence
What goes out where, how often — realistic and sustainable per channel (each channel has its own norms).

## Calendar
| Date | Channel | Format | Theme | Working title | Goal | Owner | CTA |
Vary formats (how-to, opinion, customer story, product, curated). Match format to channel.

## Per-slot briefs (for the near-term ones)
For upcoming pieces: the angle, key point, audience takeaway, and CTA — enough for drafting (route social
drafts to `/social-post`, long-form to the writer).

## Repurposing
How one piece becomes many (a post → thread → clips) so cadence is sustainable.
```

Rules: every slot ladders to a theme/goal; cadence sustainable per channel; formats varied. End with: the pillar most important this period, and the one piece to prioritize — publishing stays human-gated.

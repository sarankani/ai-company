---
description: Write an inclusive, effective job description that widens the candidate pool and screens on real signal
argument-hint: <role + context, e.g. "senior backend engineer, Python/Go, remote India, our stack is FastAPI + Postgres">
allowed-tools: Read, Grep, Glob, WebSearch, Write
---

Write a job description for: $ARGUMENTS

You are operating as HR. A JD is a filter — a bad one repels great candidates and attracts wrong ones. The two failure modes: an impossible wishlist (narrows the pool, hits underrepresented candidates hardest) and vague fluff (attracts everyone, signals nothing). Ground it in the real role, team, and stack.

Write (`hiring/jd-<role-slug>.md`):

```markdown
# <Role Title>
Team · Location/remote · Level

## About the role
2-3 honest sentences: the actual problem this person solves and why it matters. No "rockstar/ninja".

## What you'll do
5-6 concrete responsibilities — the real work, not aspirations.

## Must-haves (keep this SHORT)
The genuinely required capabilities — 4-6 max. Every extra "requirement" shrinks the pool; if it can be
learned on the job, it's a nice-to-have. Prefer capabilities/outcomes over specific years or exact tools.

## Nice-to-haves
Explicitly optional. This is where the long tail goes so it doesn't gatekeep.

## How we work / what we offer
Team culture, stack, growth, comp range (include it — omitting it wastes everyone's time and skews equity).

## Interview process
The steps, so candidates know what to expect (respectful and increasingly common).
```

Rules: inclusive language that widens the pool; must-haves ≤6 and truly required; state comp range; describe real work, not hype. End with: the one requirement most likely over-filtering good candidates, and the core signal the interview loop must test.

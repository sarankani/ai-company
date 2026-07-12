---
description: Build a 30/60/90-day onboarding plan for a new hire — ramp, early wins, and clear expectations
argument-hint: <role + context, e.g. "onboard a new backend engineer joining the payments team">
allowed-tools: Read, Grep, Glob, Write
---

Build an onboarding plan for: $ARGUMENTS

You are operating as HR with the hiring manager. Good onboarding is the difference between a hire productive in weeks vs months — and a big driver of early attrition. Ground it in the real team, stack, and codebase.

Produce (`onboarding/<role-slug>.md`):

```markdown
# Onboarding: <role> · <name TBD>

## Before day 1
Access, accounts, hardware, a prepared first task, and a named buddy/mentor. (Nothing kills week 1 like
missing access.)

## Week 1 — land & connect
Goals: environment set up, first tiny PR merged (a real, safe starter task), key people met, the "why"
understood. Not: deliver anything big.

## Days 1–30 — learn the system
Ramp goals, the codebase/product map (point to any ml-system-map/codebase-map or architecture docs),
who owns what, first real (small) deliverable. What "good" looks like here.

## Days 31–60 — contribute
Owning a feature/area with support; expectations made explicit; first feedback checkpoint.

## Days 61–90 — operate
Fully productive in the role; a 90-day review against the success profile; their own take on what to improve.

## Expectations & support
What success looks like at 90 days, how feedback flows, who to ask for what, the 1:1 cadence.
```

Rules: front-load a real early win; make expectations explicit at each stage; assign a human buddy. End with: the most important thing for this hire to achieve by day 30, and the biggest ramp risk for this role.

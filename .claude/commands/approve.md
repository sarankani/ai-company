---
description: Decide an approval/question record (approve, reject, answer, delegate) as an authorized human seat-holder — one command, full audit stamp
---

# /approve — decide a gate record

You are acting on behalf of a **human seat-holder** deciding an Evalyn approval record. This is the human decision interface until the Control Panel exists, and the fallback path forever after.

## Input

`$ARGUMENTS` — the record id and intent, e.g.:
- `APR-20260714-001` (show it, then ask for the decision)
- `approve APR-20260714-001 as saran` / `approve APR-... as saran with conditions: ...`
- `reject APR-... as saravanan-p because <reason>`
- `answer QST-... as saran: <the answer>`
- `delegate APR-... from saran to saravanan-p`

## Procedure

1. **Identify the human.** The decider must be a real id from `company/org/humans/`. If not stated, ask — never guess, never decide as an AI employee. This command is only valid when the human themself is directing the session.
2. **Show the record first** (frontmatter + Summary section) so the decision is informed: gate, department, priority, the **exact action**, artifact link, SLA state.
3. **Run the engine** — it enforces authorization, reject-reasons, dual-approval, and question/approval outcome rules; never edit record frontmatter by hand:
   ```bash
   python3 scripts/approval_engine.py decide <ID> --by <human-id> --outcome approved|rejected|answered [--reason "..."] [--conditions "..."]
   # or: python3 scripts/approval_engine.py delegate <ID> --by <human-id> --to <human-id>
   ```
4. **If the engine refuses** (not authorized, missing reason, wrong outcome type), relay the message verbatim — do not work around it.
5. **Dual-approval note (`people` gate):** one stamp leaves the record `pending`; tell the human the second stamp (ceo seat) is still required.
6. **After an `approved` outcome:** remind that execution is a separate, exactly-once step:
   ```bash
   python3 scripts/approval_engine.py claim <ID> --by <executor-id>   # then perform the EXACT action
   python3 scripts/approval_engine.py complete <ID> --result "..."
   ```
7. **Commit** the record change: `git add company/ && git commit -m "<ID>: <outcome> by <human-id>"` (push per the session's branch rules).

## Never

Decide without a named human directing it · bypass the engine · treat silence as consent (ADR-0004) · perform the gated action before `claim`.

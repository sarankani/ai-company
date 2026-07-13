# Runbook — GitHub Project board for the Evalyn backlog

- **Why this runbook exists:** GitHub Projects (v2) boards can only be created by a signed-in user (UI or GraphQL with a user token) — the repo's automation cannot create one. Everything *around* the board is already automated in `.github/workflows/`; this runbook is the one ~5-minute manual step, done once.
- **Outcome:** one Project board tracking all epics (#2–#6) and tasks (#7–#32), with phase/owner views, auto-add for new issues, and status automation.

## 1. Create the Project (~1 min)

1. Go to **github.com/sarankani?tab=projects** → **New project**.
2. Choose the **Board** template. Name it: **Evalyn — Approval Loop & Control Panel**.
3. Note its URL, e.g. `https://github.com/users/sarankani/projects/1`.

## 2. Configure the Status field (~1 min)

Edit the `Status` field's options to Evalyn's task states (Plan 002 §2):

`Backlog` · `Ready` · `In progress` · `In review` · `Blocked` · `Waiting on gate` · `Done`

(`Waiting on gate` is Evalyn-specific: the AI work is finished and a human approval is pending — keep it separate from `Blocked` so gate latency is visible at a glance.)

## 3. Enable the built-in Project workflows (~1 min)

Project → **⋯ menu → Workflows**, enable:

| Built-in workflow | Set to |
|---|---|
| Item added to project | Status: `Backlog` |
| Item closed | Status: `Done` |
| Pull request merged | Status: `Done` |
| Auto-add to project *(if offered on your plan)* | repo `sarankani/ai-company`, filter `is:issue,pr` |
| Auto-archive items | `is:closed updated:<-4w` (optional) |

If the built-in **Auto-add** workflow isn't available on your plan, skip it — the repo's `add-to-project.yml` Action (step 5) does the same thing.

## 4. Add the existing backlog (~1 min)

In the project: **+ Add item → ⌕ → paste** `sarankani/ai-company` and bulk-add issues **#2–#32** (or use "Add items from repository" and select all open issues). Set the epics (#2–#6) to Status `Backlog`; set **#7 to `Ready`** — it's the only unblocked task.

## 5. Wire the repo automation (~1 min)

The repo already contains two Actions workflows (on the PR #1 branch; they activate when merged to main):

- **`.github/workflows/add-to-project.yml`** — auto-adds every new/reopened issue and PR to the board. Needs two one-time settings in **repo Settings → Secrets and variables → Actions**:
  - Variable **`EVALYN_PROJECT_URL`** = the URL from step 1
  - Secret **`EVALYN_PROJECTS_TOKEN`** = a fine-grained PAT (Settings → Developer settings → Fine-grained tokens) with **Projects: Read & write** (and access to this repo). *The default `GITHUB_TOKEN` cannot write to user-level Projects — the PAT is required.*
  - Until the variable is set, the workflow skips silently — nothing breaks.
- **`.github/workflows/task-unblock-notifier.yml`** — needs **no setup**. When any issue closes, it finds open tasks whose body says `Blocked by … #<that issue>`, comments on them (⛓️ still blocked by X / ✅ now unblocked), and labels fully-unblocked tasks **`ready`**. This is what makes the dependency chain in the backlog self-driving.

## 6. Recommended views (~1 min, optional)

Add saved views in the project:

| View | Layout | Group / filter |
|---|---|---|
| Board | Board by `Status` | default working view |
| By phase | Table grouped by label | `phase-0` … `phase-4` |
| By owner | Board grouped by label | `owner:*` labels |
| Gates waiting | Table | filter `status:"Waiting on gate"` — the founder's daily check |
| Roadmap | Roadmap | after adding a date field per epic (optional) |

## Done when

- [ ] Board exists with the 7 statuses; issues #2–#32 on it; #7 in `Ready`
- [ ] Built-in workflows enabled (added→Backlog, closed→Done, merged→Done)
- [ ] `EVALYN_PROJECT_URL` variable + `EVALYN_PROJECTS_TOKEN` secret set
- [ ] Test: open a scratch issue → it appears on the board automatically → close it → it moves to Done → delete it

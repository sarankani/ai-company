# docs/specs — Product & technical specifications

Conventions: `prd-NNN-<title>.md` for product requirements, `tech-spec-NNN-<title>.md` for technical designs. Every spec carries a **Status** line (Draft → Approved → Implemented → Superseded), an owner, and links to its plan and ADRs. Specs are approved by the relevant human approver before implementation starts.

| Spec | What | Status |
|---|---|---|
| [prd-001-control-panel.md](prd-001-control-panel.md) | Control Panel product requirements | Draft — awaiting Founder (EX-002 / issue tracker) |
| [spec-002-phased-implementation.md](spec-002-phased-implementation.md) | All-phases implementation spec (0–4) — source of the epics/issues | Draft — awaiting Founder |
| [tech-spec-001-approval-loop-and-panel.md](tech-spec-001-approval-loop-and-panel.md) | Approval loop + panel technical design | Approved (PR #1) · implemented Phase 1 (PR #34) |
| [design-brief-001-control-panel.md](design-brief-001-control-panel.md) | Control Panel MVP design brief — flows, states, AA, handoff | Draft — awaiting Founder (EX-201, #19) |
| [evalyn-operating-handbook.pdf](evalyn-operating-handbook.pdf) | Visual operating handbook (40 pp): org, value chain, approval loop, architectures, 7 workflows, 23 employee dossiers | Presentation companion to the specs — regenerate from [evalyn-operating-handbook-source.html](evalyn-operating-handbook-source.html) via headless Chromium `--print-to-pdf` |

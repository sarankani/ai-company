export const meta = {
  name: 'company-standup',
  description: 'Roll up a company-wide status: each department "employee" reports in parallel (engineering, product, delivery, GTM, people/finance, support/data), then a CEO-level synthesis with risks and the one decision needed',
  whenToUse: 'A weekly/at-a-glance company status across all departments. Pass args: {period?: "this week", focus?: "optional area"}',
  phases: [
    { title: 'Departments', detail: 'each department reports in parallel' },
    { title: 'Synthesize', detail: 'CEO-level roll-up' },
  ],
}

const period = (args && args.period) || 'this week'
const focus = (args && args.focus) || ''

const REPORT_SCHEMA = {
  type: 'object',
  required: ['department', 'progress', 'risks', 'needs'],
  properties: {
    department: { type: 'string' },
    progress: { type: 'array', items: { type: 'string' }, description: 'concrete outcomes, not activity' },
    risks: { type: 'array', items: { type: 'object', required: ['risk', 'severity'], properties: { risk: { type: 'string' }, severity: { type: 'string', enum: ['high', 'medium', 'low'] }, mitigation: { type: 'string' } } } },
    needs: { type: 'array', items: { type: 'string' }, description: 'decisions/help needed from leadership or another department' },
    metric: { type: 'string', description: 'the one number this department watches, with direction if known' },
  },
}

const DEPARTMENTS = [
  { key: 'engineering', lens: 'As the eng-manager: delivery vs plan, what shipped, what is blocked/at-risk, reliability/tech-debt health. Read git/PR/CI state if available.' },
  { key: 'product', lens: 'As the product-manager: what moved toward the roadmap/OKRs, key decisions, evidence from users/data, what is unclear.' },
  { key: 'delivery', lens: 'As the project-manager: sprint goal status, on-track/at-risk/blocked items, dependencies, schedule risk to any commitment.' },
  { key: 'go-to-market', lens: 'As marketing + sales: pipeline/launch status, campaigns live or planned, wins, and anything needing product/support coordination. Drafts only — note what awaits human send.' },
  { key: 'people-finance', lens: 'As hr + finance: hiring progress, team-health flags, budget/burn/runway posture (numbers or TBD), any spend/people decision pending a human.' },
  { key: 'support-data', lens: 'As support + data-analyst: ticket volume/severity trends, recurring issues (product feedback), and the key product/business metrics with direction. Numbers computed, not guessed.' },
]

phase('Departments')
const reports = (await parallel(DEPARTMENTS.map(d => () =>
  agent(
    `Give the ${period} status for the "${d.key}" function of a software company. ${d.lens} ` +
    (focus ? `Pay special attention to: ${focus}. ` : '') +
    `Inspect the repo/workspace for real signal where relevant. Report concrete progress (outcomes not activity), ranked risks with mitigations, and specific needs (decisions/help). Be honest — surface problems, don't bury them.`,
    { label: `dept:${d.key}`, phase: 'Departments', schema: REPORT_SCHEMA }
  )
))).filter(Boolean)

phase('Synthesize')
const allRisks = reports.flatMap(r => r.risks.map(x => ({ department: r.department, ...x })))
const highRisks = allRisks.filter(r => r.severity === 'high')
const allNeeds = reports.flatMap(r => r.needs.map(n => ({ department: r.department, need: n })))

const summary = await agent(
  `As the CEO, synthesize a company standup for ${period} from these department reports:\n${JSON.stringify(reports, null, 2)}\n` +
  `Write a tight exec summary: the overall state in 3 lines; the top cross-company risks (esp. the high ones) with who owns them; ` +
  `the decisions leadership must make this ${period}; and whether the company is on track against its priorities. ` +
  `Call out anything sitting at a human-approval gate. End with the SINGLE most important decision or risk to address now. Return the summary text.`,
  { label: 'ceo-synthesis', phase: 'Synthesize' }
)

return {
  period,
  departments: reports.map(r => ({ department: r.department, progress: r.progress, metric: r.metric })),
  highRisks,
  decisionsNeeded: allNeeds,
  execSummary: summary,
}

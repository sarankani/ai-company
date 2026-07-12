export const meta = {
  name: 'product-launch',
  description: 'Coordinate a cross-functional product launch: each function (product, engineering/QA, docs, marketing, sales, support, social) prepares its launch readiness in parallel, then a launch-readiness verdict with blockers and a go/no-go — public actions stay human-gated',
  whenToUse: 'Preparing to launch a feature/product across the whole company. Pass args: {launch: "<what is launching>", date?: "target date", scope?: "beta|GA|major"}',
  phases: [
    { title: 'Prep', detail: 'each function prepares its launch readiness in parallel' },
    { title: 'Verdict', detail: 'launch readiness go/no-go' },
  ],
}

const launch = (args && args.launch) || 'the launch'
const date = (args && args.date) || 'TBD'
const scope = (args && args.scope) || 'GA'

const READY_SCHEMA = {
  type: 'object',
  required: ['function', 'status', 'ready', 'blockers'],
  properties: {
    function: { type: 'string' },
    status: { type: 'string', enum: ['ready', 'at-risk', 'blocked'] },
    ready: { type: 'array', items: { type: 'string' }, description: 'what is prepared/done' },
    blockers: { type: 'array', items: { type: 'object', required: ['blocker', 'severity', 'owner'], properties: { blocker: { type: 'string' }, severity: { type: 'string', enum: ['blocker', 'high', 'medium'] }, owner: { type: 'string' } } } },
    humanGated: { type: 'array', items: { type: 'string' }, description: 'actions prepared but awaiting human approval (publish, send, deploy)' },
  },
}

const FUNCTIONS = [
  { key: 'product', lens: 'As product-manager: is the feature scoped and its success metric defined? Acceptance criteria met? Rollout plan (flag, %). What decides launch vs hold?' },
  { key: 'engineering-qa', lens: 'As eng-manager + tester + devops: is it built, tested (QA go/no-go), and deploy-ready (readiness audit)? Rollback path? Deploy is human-gated — note it.' },
  { key: 'docs', lens: 'As tech-writer: are user docs, release notes, and any API docs drafted and accurate to the shipped behavior? Publishing is human-gated.' },
  { key: 'marketing', lens: 'As marketing: launch messaging, campaign brief, assets, and the goal+metric. Claims verified against the real feature. Publish/spend human-gated.' },
  { key: 'sales', lens: 'As sales: enablement — what the team needs to sell it (talk track, FAQ, pricing if any). Feature claims honest; commitments human-gated.' },
  { key: 'support', lens: 'As support: readiness for inbound — likely tickets, macros/answers drafted, escalation path, known-issues list. Replies human-gated.' },
  { key: 'social', lens: 'As social-media: launch-day posts drafted per platform, queued and on-brand. Posting human-gated.' },
]

phase('Prep')
const prep = (await parallel(FUNCTIONS.map(f => () =>
  agent(
    `Prepare launch readiness for the "${f.key}" function. Launch: "${launch}" (scope: ${scope}, target date: ${date}). ${f.lens} ` +
    `Ground it in the actual repo/product where relevant. Report what's ready, blockers (with owner + severity), and any actions prepared-but-human-gated (publish/send/deploy). Be honest about what's not ready.`,
    { label: `prep:${f.key}`, phase: 'Prep', schema: READY_SCHEMA }
  )
))).filter(Boolean)

phase('Verdict')
const blockers = prep.flatMap(p => p.blockers.filter(b => b.severity === 'blocker').map(b => ({ function: p.function, ...b })))
const atRisk = prep.filter(p => p.status === 'at-risk' || p.status === 'blocked')
const gated = prep.flatMap(p => (p.humanGated || []).map(g => ({ function: p.function, action: g })))
const verdict = blockers.length ? 'NO-GO' : (atRisk.length ? 'GO-WITH-RISKS' : 'GO')
log(`Launch readiness: ${verdict} — ${blockers.length} blockers across ${prep.length} functions`)

const summary = await agent(
  `As the CEO/launch owner, write the launch-readiness summary for "${launch}" (target ${date}).\n` +
  `Function readiness: ${JSON.stringify(prep.map(p => ({ function: p.function, status: p.status, blockers: p.blockers })), null, 2)}\n` +
  `Verdict: ${verdict}. Summarize: overall readiness, the blockers with owners and what must happen to clear each, the risks if launching with them, ` +
  `and the checklist of human-gated actions (deploy, publish, send) that a human must approve on launch day. End with the single biggest risk to a clean launch. Return the summary.`,
  { label: 'launch-verdict', phase: 'Verdict' }
)

return {
  launch, date, scope,
  verdict,
  functionStatus: prep.map(p => ({ function: p.function, status: p.status })),
  blockers,
  humanGatedActions: gated,
  summary,
}

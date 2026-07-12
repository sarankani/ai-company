export const meta = {
  name: 'project-kickoff',
  description: 'Turn a booked PO into a ready-to-deliver project: verify PO vs deal → SOW → resourcing plan → delivery plan & milestones → risk register → kickoff pack. Committing dates/resourcing is human-gated.',
  whenToUse: 'A customer PO is in and the project must be set up for delivery. Pass args: {project: "<name/id>", po: "<PO ref + amount + terms>", deal: "<link to quote/proposal or summary>"}',
  phases: [
    { title: 'Verify', detail: 'reconcile PO to the deal' },
    { title: 'Plan', detail: 'SOW, resourcing, delivery plan in parallel' },
    { title: 'Risk', detail: 'delivery risk register' },
    { title: 'Kickoff', detail: 'assemble the kickoff pack' },
  ],
}

const project = (args && args.project) || 'the project'
const po = (args && args.po) || 'PO details not provided'
const deal = (args && args.deal) || 'deal summary not provided'

const VERIFY_SCHEMA = {
  type: 'object',
  required: ['matches', 'discrepancies', 'blocksKickoff'],
  properties: {
    matches: { type: 'boolean' },
    discrepancies: { type: 'array', items: { type: 'object', required: ['field', 'issue'], properties: { field: { type: 'string' }, issue: { type: 'string' } } } },
    onerousTerms: { type: 'array', items: { type: 'string' } },
    blocksKickoff: { type: 'boolean', description: 'true if a discrepancy must be resolved before kickoff' },
  },
}

const PLAN_SCHEMA = {
  type: 'object',
  required: ['artifact', 'content'],
  properties: { artifact: { type: 'string' }, content: { type: 'string' }, notes: { type: 'string' } },
}

const RISK_SCHEMA = {
  type: 'object',
  required: ['risks'],
  properties: {
    risks: { type: 'array', items: { type: 'object', required: ['risk', 'likelihood', 'impact', 'mitigation', 'owner'], properties: { risk: { type: 'string' }, likelihood: { type: 'string', enum: ['high', 'medium', 'low'] }, impact: { type: 'string', enum: ['high', 'medium', 'low'] }, mitigation: { type: 'string' }, owner: { type: 'string' } } } },
  },
}

phase('Verify')
const verify = await agent(
  `As sales→finance, verify the customer PO against the agreed deal before kickoff.\nPO: ${po}\nDeal: ${deal}\n` +
  `Reconcile amount, scope, milestone/payment schedule, and terms. List every discrepancy and any onerous term (penalties, IP, liability). blocksKickoff=true if anything must be resolved first. Read company/pos and company/quotes if present. Nothing kicks off on a mismatched PO.`,
  { label: 'verify-po', phase: 'Verify', schema: VERIFY_SCHEMA }
)
if (verify.blocksKickoff) log(`PO mismatch blocks kickoff: ${verify.discrepancies.map(d => d.field).join(', ')}`)
else log('PO verified — proceeding to planning')

phase('Plan')
const [sow, resourcing, plan] = await parallel([
  () => agent(
    `As delivery-manager + solutions-architect, draft the SOW for "${project}" to "company/sows/${project.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.md". ` +
    `Deal: ${deal}. PO: ${po}. Include scope, explicit out-of-scope, milestones with CLIENT-VERIFIABLE acceptance criteria + payment triggers, assumptions/dependencies, mutual RACI, change-control, and commercials. Return artifact name + content.`,
    { label: 'sow', phase: 'Plan', schema: PLAN_SCHEMA }
  ),
  () => agent(
    `As eng-manager + delivery-manager, produce the resourcing plan for "${project}": roles needed × duration, named allocation vs to-hire/contract, ramp, and any skill gap (loop procurement if tools/licenses/subcontractors are needed → procurement-cycle). Deal: ${deal}. Return artifact + content.`,
    { label: 'resourcing', phase: 'Plan', schema: PLAN_SCHEMA }
  ),
  () => agent(
    `As delivery-manager + project-manager, produce the delivery plan for "${project}": phases/sprints mapped to the SOW milestones, dependencies, the critical path, and a first-sprint plan. Realistic calendar given parallelism. Return artifact + content.`,
    { label: 'delivery-plan', phase: 'Plan', schema: PLAN_SCHEMA }
  ),
])

phase('Risk')
const risk = await agent(
  `As delivery-manager, build the delivery risk register for "${project}" from the SOW, resourcing, and plan:\n` +
  `SOW: ${sow ? sow.content.slice(0, 1500) : 'n/a'}\nResourcing: ${resourcing ? resourcing.content.slice(0, 800) : 'n/a'}\n` +
  `Cover scope/requirement volatility, dependency/client-input risk, skill/capacity risk, integration/technical unknowns, and margin/overrun risk. Each with likelihood, impact, mitigation, owner.`,
  { label: 'risk', phase: 'Risk', schema: RISK_SCHEMA }
)

phase('Kickoff')
const kickoff = await agent(
  `As delivery-manager, assemble the kickoff pack for "${project}" into "company/projects/${project.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.md" and a kickoff doc. ` +
  `SOW, resourcing, delivery plan, and risk register are prepared. Risk register: ${JSON.stringify(risk.risks)}. ` +
  `The pack: confirmed scope + milestones, team + RACI, plan, risks, change-control, communication cadence, and the internal + client kickoff agendas. Set the project stage to kickoff and link the PO/SOW/milestones. Return a 6-line summary.`,
  { label: 'kickoff', phase: 'Kickoff' }
)

return {
  project,
  poVerified: verify.matches && !verify.blocksKickoff,
  discrepancies: verify.discrepancies,
  onerousTerms: verify.onerousTerms,
  topRisks: risk.risks.filter(r => r.likelihood === 'high' || r.impact === 'high'),
  outputs: ['company/sows/<project>.md', 'company/projects/<project>.md'],
  humanGates: ['committing delivery dates & resourcing to the client', 'agreeing any change order', 'accepting onerous PO terms'],
  summary: kickoff,
}

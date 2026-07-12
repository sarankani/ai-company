export const meta = {
  name: 'delivery-to-invoice',
  description: 'Close the delivery→cash loop for a milestone: verify the deliverable meets acceptance criteria → QA/security gate → prepare client acceptance → draft the invoice reconciled to the PO/SOW → set collections. Acceptance sign-off, sending, and collections are human-gated.',
  whenToUse: 'A milestone is delivered and you want it accepted and billed. Pass args: {project: "<id>", milestone: "<name/number>", acceptanceCriteria?: "the criteria from the SOW"}',
  phases: [
    { title: 'Verify', detail: 'deliverable vs acceptance criteria' },
    { title: 'Gate', detail: 'QA + security check in parallel' },
    { title: 'Accept', detail: 'client acceptance package' },
    { title: 'Invoice', detail: 'draft invoice + collections' },
  ],
}

const project = (args && args.project) || 'the project'
const milestone = (args && args.milestone) || 'the milestone'
const acceptanceCriteria = (args && args.acceptanceCriteria) || 'read from the SOW record'

const VERIFY_SCHEMA = {
  type: 'object',
  required: ['meetsCriteria', 'gaps'],
  properties: {
    meetsCriteria: { type: 'boolean' },
    criteriaChecked: { type: 'array', items: { type: 'object', required: ['criterion', 'met'], properties: { criterion: { type: 'string' }, met: { type: 'boolean' }, evidence: { type: 'string' } } } },
    gaps: { type: 'array', items: { type: 'string' }, description: 'what is not yet meeting acceptance' },
  },
}

const GATE_SCHEMA = {
  type: 'object',
  required: ['area', 'status', 'blockers'],
  properties: { area: { type: 'string' }, status: { type: 'string', enum: ['pass', 'concerns', 'fail'] }, blockers: { type: 'array', items: { type: 'string' } } },
}

const DOC_SCHEMA = { type: 'object', required: ['content'], properties: { content: { type: 'string' }, note: { type: 'string' } } }

phase('Verify')
const verify = await agent(
  `As delivery-manager, verify milestone "${milestone}" of project "${project}" against its acceptance criteria: ${acceptanceCriteria}. ` +
  `Read the SOW/milestone records and the actual deliverable in the repo where possible. For each criterion, is it met, with evidence? meetsCriteria=true only if ALL are met. List gaps. Do NOT accept an unmet milestone — that would trigger a wrong invoice.`,
  { label: 'verify-milestone', phase: 'Verify', schema: VERIFY_SCHEMA }
)
if (!verify.meetsCriteria) { log(`Milestone NOT ready: ${verify.gaps.length} gaps — stopping before acceptance/invoice`) }
else log('Milestone meets acceptance criteria — running quality gate')

let gates = []
if (verify.meetsCriteria) {
  phase('Gate')
  gates = (await parallel([
    () => agent(`As tester, run a QA gate on milestone "${milestone}" of "${project}": does the delivered work function correctly and meet quality for client acceptance? Evidence-based go/no-go. Blockers if any.`,
      { label: 'qa-gate', phase: 'Gate', schema: GATE_SCHEMA }),
    () => agent(`As security, run a quick security gate on milestone "${milestone}" of "${project}": any exposed secret, injection, authz, or data risk that must not ship to the client? Evidence-based. Blockers if any.`,
      { label: 'sec-gate', phase: 'Gate', schema: GATE_SCHEMA }),
  ])).filter(Boolean)
}
const gateBlockers = gates.flatMap(g => g.blockers)
const ready = verify.meetsCriteria && !gates.some(g => g.status === 'fail')

let acceptance = null, invoice = null
if (ready) {
  phase('Accept')
  acceptance = await agent(
    `As delivery-manager, prepare the client acceptance package for milestone "${milestone}" of "${project}": the deliverable summary, the acceptance criteria each marked met with evidence, and a sign-off request. This goes to the client for formal acceptance (human-gated send). Write to the milestone record. Return the content.`,
    { label: 'acceptance', phase: 'Accept', schema: DOC_SCHEMA }
  )

  phase('Invoice')
  invoice = await agent(
    `As finance, draft the invoice for milestone "${milestone}" of "${project}" to "company/invoices/". ` +
    `Reconcile the amount EXACTLY to the PO/SOW milestone payment trigger; apply correct tax; reference the PO number; set terms and a collections cadence. Only bill on acceptance (note it's contingent on client sign-off). Update the milestone to invoiced. Return the content.`,
    { label: 'invoice', phase: 'Invoice', schema: DOC_SCHEMA }
  )
}

return {
  project, milestone,
  milestoneReady: ready,
  gaps: verify.gaps,
  gateBlockers,
  status: ready ? 'ready-for-acceptance-and-invoice' : 'not-ready',
  outputs: ready ? ['milestone acceptance package', 'company/invoices/<id>.md (draft)'] : [],
  humanGates: ['client acceptance sign-off', 'sending the invoice', 'any collections action'],
  note: ready ? 'Acceptance package + draft invoice prepared; both await human approval before sending.' : 'Milestone not yet meeting acceptance — no invoice generated (correct behavior).',
}

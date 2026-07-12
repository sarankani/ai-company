export const meta = {
  name: 'opportunity-to-proposal',
  description: 'Move a qualified opportunity to a sendable proposal: discovery → solution scope → effort estimate → valuation/pricing → proposal, with an internal deal-risk review. Pricing and sending stay human-gated.',
  whenToUse: 'A qualified opportunity needs a proposal. Pass args: {opportunity: "<name/id>", brief: "<what the customer wants + what you know>", model?: "fixed|t&m|retainer"}',
  phases: [
    { title: 'Discovery', detail: 'structure the requirements + unknowns' },
    { title: 'Scope', detail: 'solution outline (solutions-architect)' },
    { title: 'Estimate', detail: 'decomposed effort + risk' },
    { title: 'Value', detail: 'pricing/valuation (finance+sales)' },
    { title: 'Review', detail: 'adversarial deal-risk check' },
    { title: 'Proposal', detail: 'assemble the proposal' },
  ],
}

const opportunity = (args && args.opportunity) || 'the opportunity'
const brief = (args && args.brief) || 'No brief provided.'
const model = (args && args.model) || 'to be recommended'

const DISCOVERY_SCHEMA = {
  type: 'object',
  required: ['requirements', 'unknowns', 'successCriteria'],
  properties: {
    requirements: { type: 'array', items: { type: 'string' } },
    unknowns: { type: 'array', items: { type: 'string' }, description: 'open questions to confirm with the customer — not invented answers' },
    successCriteria: { type: 'array', items: { type: 'string' }, description: 'what the customer would call success' },
    redFlags: { type: 'array', items: { type: 'string' }, description: 'scope/fit/feasibility concerns' },
  },
}

const SCOPE_SCHEMA = {
  type: 'object',
  required: ['solution', 'components', 'outOfScope'],
  properties: {
    solution: { type: 'string' },
    components: { type: 'array', items: { type: 'string' } },
    outOfScope: { type: 'array', items: { type: 'string' } },
    architectureRisks: { type: 'array', items: { type: 'string' } },
  },
}

const ESTIMATE_SCHEMA = {
  type: 'object',
  required: ['breakdown', 'effortWeeks', 'internalCost', 'risks'],
  properties: {
    breakdown: { type: 'array', items: { type: 'object', required: ['item', 'likelyWeeks'], properties: { item: { type: 'string' }, optimisticWeeks: { type: 'number' }, likelyWeeks: { type: 'number' }, pessimisticWeeks: { type: 'number' } } } },
    effortWeeks: { type: 'object', required: ['optimistic', 'likely', 'pessimistic'], properties: { optimistic: { type: 'number' }, likely: { type: 'number' }, pessimistic: { type: 'number' } } },
    internalCost: { type: 'string', description: 'effort × loaded cost; note the assumed rate or TBD' },
    risks: { type: 'array', items: { type: 'string' } },
  },
}

const VALUE_SCHEMA = {
  type: 'object',
  required: ['pricingModel', 'priceBuildUp', 'marginPct', 'marginFloor', 'valueJustification'],
  properties: {
    pricingModel: { type: 'string' },
    priceBuildUp: { type: 'string', description: 'cost → margin → price, shown' },
    listPrice: { type: 'string' },
    marginPct: { type: 'string' },
    marginFloor: { type: 'string', description: 'the discount/price floor that must not be crossed' },
    valueJustification: { type: 'string', description: 'price framed against customer value' },
    paymentTerms: { type: 'string' },
  },
}

const REVIEW_SCHEMA = {
  type: 'object',
  required: ['dealRisks', 'recommendation'],
  properties: {
    dealRisks: { type: 'array', items: { type: 'object', required: ['risk', 'severity'], properties: { risk: { type: 'string' }, severity: { type: 'string', enum: ['deal-breaker', 'serious', 'watch'] }, mitigation: { type: 'string' } } } },
    recommendation: { type: 'string', enum: ['propose', 'propose-with-conditions', 'requalify', 'walk-away'] },
  },
}

phase('Discovery')
const discovery = await agent(
  `As the SDR/sales, structure discovery for opportunity "${opportunity}". Brief: ${brief}\n` +
  `Extract concrete requirements, the customer's success criteria, and the UNKNOWNS to confirm (never invent budget/scope answers). Flag any fit/scope red flags. Read any related records in company/opportunities.`,
  { label: 'discovery', phase: 'Discovery', schema: DISCOVERY_SCHEMA }
)
log(`${discovery.requirements.length} requirements, ${discovery.unknowns.length} unknowns`)

phase('Scope')
const scope = await agent(
  `As the solutions-architect, design the solution scope for "${opportunity}".\nRequirements: ${JSON.stringify(discovery.requirements)}\nSuccess criteria: ${JSON.stringify(discovery.successCriteria)}\n` +
  `Outline the solution and its components, an explicit out-of-scope list, and architecture/delivery risks. Design for what's needed — no gold-plating.`,
  { label: 'scope', phase: 'Scope', schema: SCOPE_SCHEMA }
)

phase('Estimate')
const estimate = await agent(
  `As the solutions-architect, produce a decomposed effort & cost estimate for this scope:\n${JSON.stringify(scope)}\n` +
  `Break down by component; give optimistic/likely/pessimistic weeks; add integration/testing/PM/DevOps and a risk buffer as explicit items; internal cost = effort × loaded rate (state the rate or TBD). Honest risks. Ranges, never a single number.`,
  { label: 'estimate', phase: 'Estimate', schema: ESTIMATE_SCHEMA }
)
log(`Estimate: ${estimate.effortWeeks.likely} eng-weeks likely (${estimate.effortWeeks.optimistic}-${estimate.effortWeeks.pessimistic})`)

phase('Value')
const value = await agent(
  `As finance+sales, produce the valuation & price for "${opportunity}". Preferred model: ${model}.\n` +
  `Internal cost: ${estimate.internalCost}; effort ${JSON.stringify(estimate.effortWeeks)}; delivery risk: ${JSON.stringify(estimate.risks)}.\n` +
  `Pick the pricing model and justify it (for fixed-price, price against the PESSIMISTIC estimate + risk premium). Show the cost→margin→price build-up, state margin % and the margin FLOOR, justify the price against customer value, and set payment terms. Do not cross the floor.`,
  { label: 'value', phase: 'Value', schema: VALUE_SCHEMA }
)

phase('Review')
const review = await agent(
  `Adversarially review this deal before we propose. Discovery: ${JSON.stringify(discovery)}\nScope: ${JSON.stringify(scope)}\nEstimate: ${JSON.stringify(estimate)}\nValue: ${JSON.stringify(value)}\n` +
  `Attack: underestimation vs scope, margin risk on fixed-price, unresolved unknowns being priced as if known, feasibility/capability gaps, onerous-terms exposure, and whether we should requalify or walk away. Rank risks; give a recommendation.`,
  { label: 'deal-review', phase: 'Review', schema: REVIEW_SCHEMA }
)
const dealBreakers = review.dealRisks.filter(r => r.severity === 'deal-breaker')
log(`Deal review: ${review.recommendation} (${dealBreakers.length} deal-breakers)`)

phase('Proposal')
const proposal = await agent(
  `As sales (with delivery-manager), assemble the proposal for "${opportunity}" into "company/proposals/${opportunity.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.md" (Write tool). ` +
  `Inputs — discovery: ${JSON.stringify(discovery)}; scope: ${JSON.stringify(scope)}; value: ${JSON.stringify(value)}; deal risks to address: ${JSON.stringify(review.dealRisks)}.\n` +
  `Structure: their situation & goal (their words) → proposed solution → scope + explicit out-of-scope → milestones with acceptance criteria → pricing (marked DRAFT, human-gated) → assumptions/terms (flag for legal) → next steps. Also update company/quotes and company/estimates records. Return a 6-line summary.`,
  { label: 'proposal', phase: 'Proposal' }
)

return {
  opportunity,
  recommendation: review.recommendation,
  effortWeeks: estimate.effortWeeks,
  pricingModel: value.pricingModel,
  marginFloor: value.marginFloor,
  dealBreakers,
  openUnknowns: discovery.unknowns,
  output: 'company/proposals/<opportunity>.md',
  humanGates: ['pricing/discount approval', 'sending the proposal', 'accepting any onerous term'],
  summary: proposal,
}

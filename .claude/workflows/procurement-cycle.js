export const meta = {
  name: 'procurement-cycle',
  description: 'Run a procurement need to a ready-to-approve order: check the asset register for reclaim first → source & compare vendors on TCO → security/data risk check → draft the outbound PO → plan asset registration. Approving spend and ordering are human-gated.',
  whenToUse: 'The company needs to buy something (tools, licenses, cloud, hardware, subcontractor). Pass args: {need: "<what + why + for whom>", quantity?: "N", budget?: "cap"}',
  phases: [
    { title: 'Reclaim-check', detail: 'can existing assets cover this?' },
    { title: 'Source', detail: 'vendor options in parallel' },
    { title: 'Risk', detail: 'security/data + TCO review' },
    { title: 'Order', detail: 'recommendation + draft PO' },
  ],
}

const need = (args && args.need) || 'the procurement need'
const quantity = (args && args.quantity) || 'right-size it'
const budgetCap = (args && args.budget) || 'not stated'

const RECLAIM_SCHEMA = {
  type: 'object',
  required: ['canReclaim', 'rightSizedQuantity'],
  properties: {
    canReclaim: { type: 'boolean', description: 'true if existing unused/underused assets could cover the need' },
    reclaimable: { type: 'array', items: { type: 'string' } },
    rightSizedQuantity: { type: 'string', description: 'the challenged, right-sized quantity (may be less than requested)' },
    note: { type: 'string' },
  },
}

const VENDOR_SCHEMA = {
  type: 'object',
  required: ['vendor', 'fit', 'price', 'tco', 'terms', 'risks'],
  properties: {
    vendor: { type: 'string' },
    fit: { type: 'string' },
    price: { type: 'string' },
    tco: { type: 'string', description: 'total cost incl. renewal, support, lock-in' },
    terms: { type: 'string' },
    risks: { type: 'array', items: { type: 'string' }, description: 'security/data/reliability/lock-in' },
  },
}

const RISK_SCHEMA = {
  type: 'object',
  required: ['securityConcerns', 'recommendation'],
  properties: {
    securityConcerns: { type: 'array', items: { type: 'string' }, description: 'data/security issues per vendor that need review' },
    needsSecurityReview: { type: 'boolean' },
    recommendation: { type: 'string' },
  },
}

phase('Reclaim-check')
const reclaim = await agent(
  `As procurement, before buying anything for this need, check the asset register (company/assets) for reclaim: "${need}" (requested qty: ${quantity}). ` +
  `Are there unused/underused licenses, idle cloud resources, or spare devices that could cover it instead? Right-size the quantity — challenge the request (do they need N or fewer?). Reclaim before you buy is real money saved.`,
  { label: 'reclaim-check', phase: 'Reclaim-check', schema: RECLAIM_SCHEMA }
)
if (reclaim.canReclaim) log(`Possible reclaim without buying: ${reclaim.reclaimable.join(', ')}`)
log(`Right-sized quantity: ${reclaim.rightSizedQuantity}`)

phase('Source')
// Source 3 candidate options in parallel (varied by positioning to get real coverage).
const ANGLES = [
  { key: 'best-fit', lens: 'the market-leading / best-fit option for the requirement' },
  { key: 'value', lens: 'the best value / cost-efficient option' },
  { key: 'incumbent-or-oss', lens: 'an incumbent-standard OR open-source / self-hosted option (to test build-vs-buy and lock-in)' },
]
const vendors = (await parallel(ANGLES.map(a => () =>
  agent(
    `As procurement, research a vendor/option for "${need}" (qty ${reclaim.rightSizedQuantity}, budget ${budgetCap}): ${a.lens}. ` +
    `Report fit, real price (research it; TBD if unknown), TCO (incl. renewal/support/lock-in), terms, and risks (security/data/reliability/lock-in). No fabricated pricing.`,
    { label: `vendor:${a.key}`, phase: 'Source', schema: VENDOR_SCHEMA }
  )
))).filter(Boolean)

phase('Risk')
const risk = await agent(
  `As procurement + security, review these vendor options for "${need}" on data/security risk and TCO:\n${JSON.stringify(vendors, null, 2)}\n` +
  `Flag any option that touches company/customer data or systems and needs a formal security review. Recommend the best option on TCO + fit + acceptable risk (not sticker price). needsSecurityReview=true if the pick handles sensitive data.`,
  { label: 'risk-review', phase: 'Risk', schema: RISK_SCHEMA }
)

phase('Order')
const order = await agent(
  `As procurement, produce the procurement recommendation + draft outbound PO for "${need}".\n` +
  `Reclaim option: ${JSON.stringify(reclaim)}\nVendors: ${JSON.stringify(vendors)}\nRisk review: ${JSON.stringify(risk)}\n` +
  `Write: the recommendation (or "reclaim instead of buy" if that covers it), the runner-up, the negotiation angle, and a DRAFT outbound PO (vendor, right-sized qty, price, term, terms) to "company/purchase-orders-out/". Note the renewal date to set a reminder, and the asset-register entries to create on receipt. ` +
  `Return a 5-line summary.`,
  { label: 'order', phase: 'Order' }
)

return {
  need,
  rightSizedQuantity: reclaim.rightSizedQuantity,
  reclaimAvailable: reclaim.canReclaim ? reclaim.reclaimable : [],
  optionsCompared: vendors.map(v => ({ vendor: v.vendor, tco: v.tco })),
  needsSecurityReview: risk.needsSecurityReview,
  output: 'company/purchase-orders-out/<id>.md (draft)',
  humanGates: ['approving the spend', 'signing the vendor agreement', 'placing the order'],
  summary: order,
}

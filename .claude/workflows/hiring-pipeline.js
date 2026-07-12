export const meta = {
  name: 'hiring-pipeline',
  description: 'Run the hiring prep pipeline for a role: job description → sourcing strategy → structured interview loop → bias-aware scorecard → a fair debrief framework. Prepares everything; the hire decision stays human-gated.',
  whenToUse: 'Opening a role and wanting the whole hiring kit prepared consistently. Pass args: {role: "<title>", context: "level, stack, location, budget, must-haves"}',
  phases: [
    { title: 'Profile', detail: 'success profile + competencies' },
    { title: 'Build', detail: 'JD, sourcing, loop, scorecard in parallel' },
    { title: 'Assemble', detail: 'the hiring kit + fairness check' },
  ],
}

const role = (args && args.role) || 'the role'
const context = (args && args.context) || 'unspecified — capture as open questions'

const PROFILE_SCHEMA = {
  type: 'object',
  required: ['sixMonthOutcomes', 'competencies', 'openQuestions'],
  properties: {
    sixMonthOutcomes: { type: 'array', items: { type: 'string' }, description: 'what a successful hire DOES in 6 months' },
    competencies: { type: 'array', items: { type: 'object', required: ['name', 'why'], properties: { name: { type: 'string' }, why: { type: 'string' } } }, description: '3-5 core competencies that predict success' },
    openQuestions: { type: 'array', items: { type: 'string' }, description: 'things a human must confirm (comp band, level, must-haves)' },
  },
}

const ARTIFACT_SCHEMA = {
  type: 'object',
  required: ['artifact', 'content', 'file'],
  properties: { artifact: { type: 'string' }, content: { type: 'string' }, file: { type: 'string' } },
}

const FAIRNESS_SCHEMA = {
  type: 'object',
  required: ['issues', 'verdict'],
  properties: {
    issues: { type: 'array', items: { type: 'object', required: ['issue', 'fix'], properties: { issue: { type: 'string' }, fix: { type: 'string' } } } },
    verdict: { type: 'string', enum: ['fair', 'needs-fixes'] },
  },
}

phase('Profile')
const profile = await agent(
  `As HR, define the success profile for hiring: ${role}. Context: ${context}.\n` +
  `What must this person DO in 6 months (outcomes)? Derive 3-5 core competencies that predict those outcomes — these become what the whole loop tests. List open questions a human must confirm (comp band, level, non-negotiables). Do not invent comp or level.`,
  { label: 'profile', phase: 'Profile', schema: PROFILE_SCHEMA }
)
log(`${profile.competencies.length} core competencies defined for ${role}`)

const comps = JSON.stringify(profile.competencies)
const BUILDERS = [
  { key: 'job-description', prompt: `Write an inclusive JD for ${role} (context: ${context}). Must-haves ≤6 and truly required (map to competencies); state comp range as [TBD — confirm] if unknown; describe real work; widen the pool. Write to hiring/jd.md.` },
  { key: 'sourcing', prompt: `Design a sourcing strategy for ${role}: where these candidates are, inbound vs outbound, and how to widen the pool toward underrepresented sources, realistic for the context. Write to hiring/sourcing.md.` },
  { key: 'interview-loop', prompt: `Design a structured interview loop that tests these competencies: ${comps}. Each stage maps to competencies, no stage duplicates another, include a work-sample over trivia. Every competency tested at least once. Write to hiring/loop.md.` },
  { key: 'scorecard', prompt: `Build a bias-aware scorecard for these competencies: ${comps}. Anchored rating scale (what "strong" looks like), evidence required, independent scoring BEFORE debrief. Write to hiring/scorecard.md.` },
]

phase('Build')
const built = (await parallel(BUILDERS.map(b => () =>
  agent(
    `As HR, ${b.prompt} Success profile: ${JSON.stringify(profile.sixMonthOutcomes)}. Keep it fair, structured, and job-relevant. Return the artifact name, content, and file path.`,
    { label: `build:${b.key}`, phase: 'Build', schema: ARTIFACT_SCHEMA }
  )
))).filter(Boolean)

phase('Assemble')
const fairness = await agent(
  `Review this hiring kit for fairness/bias before use:\n${JSON.stringify(built.map(b => ({ artifact: b.artifact, content: b.content })), null, 2)}\n` +
  `Check: must-haves that over-filter (esp. hitting underrepresented candidates), non-job-relevant criteria, loop stages testing pedigree over ability, scorecard anchors that invite bias. Verdict fair / needs-fixes with specific fixes.`,
  { label: 'fairness', phase: 'Assemble', schema: FAIRNESS_SCHEMA }
)

return {
  role,
  competencies: profile.competencies.map(c => c.name),
  openQuestions: profile.openQuestions,
  kit: built.map(b => ({ artifact: b.artifact, file: b.file })),
  fairness,
  note: 'Hiring kit prepared. The hire/reject decision and any candidate communication are human-gated.',
}

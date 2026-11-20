// All mock data for the Pathline demo. No runtime fetching — imported directly.

// ─── Types ───────────────────────────────────────────────────────────────────

export type WeightLabel = "Low" | "Medium" | "High"
export type BucketId = "priority" | "strong" | "review" | "not_now" | "shortlisted"
export const STRONG_THRESHOLD = 70
export const SHORTLIST_QUALITY = { shortlisted: 10, passedIntro: 7 }
export const SAMPLE_INTERVIEWED_COUNT = 3

export interface Trait {
  id: string
  label: string
  numericWeight: number // 1=Low, 2=Medium, 3=High; continuous for scoring
  jdQuote: string // phrase from the job description this trait maps to
}

export interface ProofPrompt {
  id: string
  question: string
  approved: boolean
  basedOnTraits: string[] // traitIds this question is designed to surface
}

export interface ExampleProfile {
  id: string
  name: string
  initials: string
  currentRole: string
  highlights: string[]
}

export interface CalibrationResult {
  weights: Record<string, number>
  summary: string
  traitSources: Record<string, string[]> // traitId → profileId[]
}

export interface EvidenceItem {
  id: string
  source: "resume" | "proof_answer"
  traitId: string
  quote: string
  strength: number // 0–100
}

export interface Candidate {
  id: string
  name: string
  initials: string
  headline: string
  summary: string
  traitVector: Record<string, number> // traitId → 0–100 strength
  evidence: EvidenceItem[]
  whySurfaced: string[]
  personalLine: string // pre-written outreach line grounded in their evidence
  status: "pending" | "shortlisted" | "pass" | "closed"
  appliedDate: string // ISO date string, e.g. "2026-11-17"
  bucket?: "priority" | "strong" | "review" // manual override for pending candidates
  manuallyBucketed?: boolean // prevents auto-reassignment after nudge
}

export interface Role {
  id: string
  company: string
  title: string
  team: string
  location: string
  salary: { min: number; max: number }
  stages: string[]
  applicantCount: number
  traits: Trait[]
  proofPrompts: ProofPrompt[]
  jobDescription: string
}

// ─── Applicant source data ────────────────────────────────────────────────────

export const APPLICANT_SOURCES = [
  { name: "LinkedIn", count: 268 },
  { name: "Indeed", count: 104 },
  { name: "Handshake", count: 61 },
  { name: "Careers page", count: 31 },
  { name: "Imported", count: 23 },
]

// Which channel each demo candidate came from
export const APPLIED_VIA_LOOKUP: Record<string, string> = {
  c01: "LinkedIn", c02: "LinkedIn", c03: "LinkedIn", c04: "Indeed",
  c05: "LinkedIn", c06: "Handshake", c07: "LinkedIn", c08: "Indeed",
  c09: "LinkedIn", c10: "LinkedIn", c11: "Handshake", c12: "LinkedIn",
  c13: "Indeed", c14: "LinkedIn", c15: "LinkedIn", c16: "Indeed",
  c17: "Indeed", c18: "LinkedIn", c19: "LinkedIn", c20: "LinkedIn",
  c21: "Indeed", c22: "Indeed", c23: "LinkedIn", c24: "LinkedIn",
  c25: "Handshake", c26: "LinkedIn", c27: "LinkedIn", c28: "Indeed",
  c29: "Handshake", c30: "LinkedIn", c31: "Indeed", c32: "Careers page",
  c33: "LinkedIn", c34: "Handshake", c35: "LinkedIn", c36: "Careers page",
  c37: "Careers page", c38: "LinkedIn", c39: "Imported", c40: "Imported",
}

// ─── Scoring helpers ─────────────────────────────────────────────────────────

export function toWeightLabel(w: number): WeightLabel {
  if (w < 1.5) return "Low"
  if (w <= 2.5) return "Medium"
  return "High"
}

export function computeScore(candidate: Candidate, traits: Trait[]): number {
  const total = traits.reduce((s, t) => s + t.numericWeight, 0)
  if (total === 0) return 0
  return Math.round(
    traits.reduce((s, t) => s + (t.numericWeight / total) * (candidate.traitVector[t.id] ?? 0), 0)
  )
}

export function nudgeWeights(
  traits: Trait[],
  candidate: Candidate,
  dir: "more" | "less"
): { updated: Trait[]; changed: Array<{ label: string; dir: "raised" | "lowered" }> } {
  const sign = dir === "more" ? 1 : -1
  const updated = traits.map((t) => ({
    ...t,
    numericWeight: Math.min(
      3.5,
      Math.max(0.5, t.numericWeight + sign * 0.4 * ((candidate.traitVector[t.id] ?? 0) / 100))
    ),
  }))
  const changed: Array<{ label: string; dir: "raised" | "lowered" }> = []
  updated.forEach((t, i) => {
    const before = toWeightLabel(traits[i].numericWeight)
    const after = toWeightLabel(t.numericWeight)
    if (before !== after) {
      changed.push({ label: t.label, dir: sign > 0 ? "raised" : "lowered" })
    }
  })
  return { updated, changed }
}

// ─── Question bank ───────────────────────────────────────────────────────────

export const QUESTION_BANK: Record<string, string[]> = {
  ownership: [
    "Tell us about a time you owned a messy process from start to finish. What did you change, and what was the result?",
    "Describe a project where you had to define the scope yourself with no prior guidance. How did you decide what success looked like?",
  ],
  data: [
    "Describe a situation where you had to use data to influence a decision. What did you find, and how did you present it?",
    "Tell us about a time you built something with data — a model, a report, or a dashboard — that others ended up relying on.",
  ],
  systems: [
    "Tell us about a process or system you built that outlasted your direct involvement. What made it stick?",
    "Describe a time you inherited a broken or missing process and had to build it from scratch. What was your approach?",
  ],
  xfunc: [
    "Tell us about a project where you had to coordinate across teams with different priorities. How did you get alignment?",
    "Describe a time you had to influence an important decision without direct authority. What did you do?",
  ],
  ambiguity: [
    "Tell us about a time you had to make a significant decision with incomplete information. What did you do?",
    "Describe a situation where your role or priorities changed suddenly. How did you adapt?",
  ],
  operator: [
    "Tell us about a time you worked directly with customers or external partners to solve a problem. What did you learn?",
    "Describe an experience where understanding the customer's or operator's perspective changed how you approached a problem.",
  ],
}

export function questionForTrait(traitId: string, traitLabel: string): string {
  const qs = QUESTION_BANK[traitId]
  if (qs) return qs[0]
  return `Tell us about a specific time you demonstrated ${traitLabel.toLowerCase()}. What was the situation, and what did you do?`
}

export function daysWaiting(appliedDate: string, today = "2026-11-19"): number {
  const a = new Date(appliedDate)
  const b = new Date(today)
  return Math.floor((b.getTime() - a.getTime()) / 86400000)
}

// ─── Role ────────────────────────────────────────────────────────────────────

export const DEMO_ROLE: Role = {
  id: "demo",
  company: "Vittacus",
  title: "Business Operations Associate",
  team: "Operations",
  location: "San Francisco, CA (Hybrid)",
  salary: { min: 85000, max: 115000 },
  stages: ["Intro Call", "Case Study", "Final Round", "Offer"],
  applicantCount: 487,
  jobDescription: `Vittacus is a Series A company (60 people) building the operating layer for distributed teams. We're hiring a Business Operations Associate to help us scale our internal systems, support cross-functional planning, and own messy problems that don't have a clear owner yet.

You'll work directly with our Head of Operations on everything from vendor management to quarterly planning to ad-hoc analyses that influence company strategy. The right person is comfortable going from zero context to owning a workstream in under a week, can build a process and document it clearly, and doesn't wait to be told what to do.

What we're looking for: demonstrated ownership of ambiguous, end-to-end problems; comfort with data and light analytics (SQL a plus, not required); strong cross-functional communication; experience building systems and processes that others rely on; and ideally some customer or operator exposure.

We move fast and expect you to as well. If you've thrived in an environment where the job description changed before you finished reading it, this role is for you.`,
  traits: [
    {
      id: "ownership",
      label: "Owns messy problems end to end",
      numericWeight: 2,
      jdQuote: "comfortable going from zero context to owning a workstream in under a week",
    },
    {
      id: "data",
      label: "Data and analytical fluency",
      numericWeight: 2,
      jdQuote: "comfort with data and light analytics (SQL a plus, not required)",
    },
    {
      id: "systems",
      label: "Builds systems and processes",
      numericWeight: 2,
      jdQuote: "can build a process and document it clearly",
    },
    {
      id: "xfunc",
      label: "Cross-functional communication",
      numericWeight: 2,
      jdQuote: "support cross-functional planning",
    },
    {
      id: "ambiguity",
      label: "Comfort with ambiguity and startup pace",
      numericWeight: 2,
      jdQuote: "doesn't wait to be told what to do",
    },
    {
      id: "operator",
      label: "Customer or operator exposure",
      numericWeight: 2,
      jdQuote: "ideally some customer or operator exposure",
    },
  ],
  proofPrompts: [
    {
      id: "pp1",
      question:
        "Tell us about a time you owned a messy process from start to finish. What did you change, and what was the result?",
      approved: false,
      basedOnTraits: ["ownership", "systems"],
    },
    {
      id: "pp2",
      question:
        "Describe a situation where you had to use data to influence a decision. What did you find, and how did you present it?",
      approved: false,
      basedOnTraits: ["data", "xfunc"],
    },
  ],
}

// ─── Example profiles (calibration) ──────────────────────────────────────────

export const EXAMPLE_PROFILES: ExampleProfile[] = [
  {
    id: "ep1",
    name: "Maya Chen",
    initials: "MC",
    currentRole: "BizOps Lead, Series B fintech",
    highlights: [
      "Built company's first vendor management system from scratch, cutting costs 23%",
      "Ran cross-functional OKR process across 4 teams with no prior ops infrastructure",
      "Learned SQL in 3 weeks to self-serve analytics after data team was deprioritized",
    ],
  },
  {
    id: "ep2",
    name: "Jordan Park",
    initials: "JP",
    currentRole: "Strategy & Ops, early-stage logistics startup",
    highlights: [
      "Owned onboarding workflow from day 1 — rewrote it twice as the team 3x'd",
      "Built and maintained real-time ops dashboard used daily by exec team",
      "Led pilots with 12 enterprise clients, coordinating legal, product, and CS",
    ],
  },
  {
    id: "ep3",
    name: "Sam Rivera",
    initials: "SR",
    currentRole: "Operations Manager, marketplace startup",
    highlights: [
      "Turned chaotic support queue into documented, automated triage system",
      "Created financial reporting process that CEO now uses for board meetings",
      "Comfortable going from zero context to owning a workstream in under a week",
    ],
  },
]

export const CALIBRATION_RESULT: CalibrationResult = {
  weights: {
    ownership: 3,
    data: 2.5,
    systems: 2.5,
    xfunc: 2,
    ambiguity: 2.5,
    operator: 1.5,
  },
  summary:
    "Found: strong ownership of 0-to-1 projects and data fluency across all 3 profiles. Systems-building and comfort with ambiguity also prominent.",
  traitSources: {
    ownership: ["ep1", "ep2", "ep3"],
    data: ["ep1", "ep2"],
    systems: ["ep1", "ep3"],
    xfunc: ["ep2"],
    ambiguity: ["ep2", "ep3"],
    operator: ["ep2"],
  },
}

// ─── Candidates ───────────────────────────────────────────────────────────────

export const DEMO_CANDIDATES: Candidate[] = [
  {
    id: "c01",
    name: "Priya Nair",
    initials: "PN",
    headline: "Ex-Ops at Stripe, ran 3 internal tooling projects",
    summary:
      "Ran Stripe's vendor contract renewal process single-handedly, cutting cycle time from 6 weeks to 11 days. Built three internal Notion dashboards still in use by the ops team.",
    traitVector: {
      ownership: 92,
      data: 78,
      systems: 88,
      xfunc: 72,
      ambiguity: 85,
      operator: 60,
    },
    evidence: [
      {
        id: "e01a",
        source: "proof_answer",
        traitId: "ownership",
        quote:
          "Inherited a vendor renewal process with no documentation — I mapped every step, found 4 redundant approvals, removed them, and cut the cycle from 6 weeks to 11 days.",
        strength: 92,
      },
      {
        id: "e01b",
        source: "resume",
        traitId: "systems",
        quote:
          "Built three internal dashboards adopted by 20+ team members within a month of launch.",
        strength: 85,
      },
      {
        id: "e01c",
        source: "proof_answer",
        traitId: "data",
        quote:
          "Pulled contract value and renewal rate data from Salesforce to show leadership that 40% of late renewals came from one contract type — they restructured the template.",
        strength: 80,
      },
    ],
    whySurfaced: ["Strong ownership track record", "Short answer quality", "Systems-builder"],
    personalLine:
      "Mapping a vendor renewal process with zero documentation — then cutting it from 6 weeks to 11 days — is exactly the kind of end-to-end ownership this role is built around.",
    status: "shortlisted",
    appliedDate: "2026-11-17",
  },
  {
    id: "c02",
    name: "Marcus Webb",
    initials: "MW",
    headline: "BizOps at Figma, owned cross-team planning process",
    summary:
      "Led Figma's quarterly planning cycle across 6 teams for two consecutive quarters. Created the company's first shared OKR tracking system, adopted org-wide.",
    traitVector: {
      ownership: 85,
      data: 65,
      systems: 80,
      xfunc: 90,
      ambiguity: 75,
      operator: 55,
    },
    evidence: [
      {
        id: "e02a",
        source: "resume",
        traitId: "xfunc",
        quote:
          "Coordinated quarterly planning across 6 departments, aligning 40+ individual OKRs into a coherent company plan.",
        strength: 90,
      },
      {
        id: "e02b",
        source: "proof_answer",
        traitId: "systems",
        quote:
          "Built the OKR tracking system in Notion after the previous spreadsheet broke every other week. It's still being used 18 months later.",
        strength: 82,
      },
      {
        id: "e02c",
        source: "resume",
        traitId: "ownership",
        quote: "Sole owner of planning process — no manager oversight after first quarter.",
        strength: 84,
      },
    ],
    whySurfaced: ["Cross-functional leadership", "Short answer quality", "Process ownership"],
    personalLine:
      "The OKR system you built in Notion is still running 18 months later. That's the bar for 'systems that last' — and it's the kind of work we need here.",
    status: "shortlisted",
    appliedDate: "2026-11-17",
  },
  {
    id: "c03",
    name: "Aisha Okonkwo",
    initials: "AO",
    headline: "Strategy & Ops, Series A healthtech",
    summary:
      "Built the company's first customer success playbook from scratch. Owns a weekly metrics review that feeds directly into exec decisions. Comfortable jumping between product, ops, and finance.",
    traitVector: {
      ownership: 88,
      data: 82,
      systems: 76,
      xfunc: 80,
      ambiguity: 90,
      operator: 85,
    },
    evidence: [
      {
        id: "e03a",
        source: "proof_answer",
        traitId: "ambiguity",
        quote:
          "In my first week, there was no onboarding plan, no documentation, and three competing priorities. I picked the highest-leverage one and shipped a working process in 10 days.",
        strength: 92,
      },
      {
        id: "e03b",
        source: "resume",
        traitId: "operator",
        quote:
          "Managed relationships with 30+ enterprise customers, ran weekly check-ins, and owned escalations.",
        strength: 85,
      },
      {
        id: "e03c",
        source: "proof_answer",
        traitId: "data",
        quote:
          "Built a cohort retention model in Google Sheets that surfaced a churn pattern nobody had seen — led to a product change that cut 60-day churn by 15%.",
        strength: 83,
      },
    ],
    whySurfaced: ["Strong ambiguity tolerance", "Customer-facing experience", "Data-driven"],
    personalLine:
      "A retention model in Sheets that surfaced a churn pattern nobody had thought to look for — and led to a real product change. That's the data thinking we need.",
    status: "shortlisted",
    appliedDate: "2026-11-17",
  },
  {
    id: "c04",
    name: "Daniel Torres",
    initials: "DT",
    headline: "Operations Analyst, logistics scale-up",
    summary:
      "Automated three manual reporting workflows, saving 12 hours per week across the ops team. Built strong SQL skills self-taught on the job.",
    traitVector: {
      ownership: 70,
      data: 88,
      systems: 82,
      xfunc: 60,
      ambiguity: 65,
      operator: 70,
    },
    evidence: [
      {
        id: "e04a",
        source: "resume",
        traitId: "data",
        quote:
          "Built 6 automated reports in Metabase, eliminating 12 hours of manual work per week across ops and finance teams.",
        strength: 88,
      },
      {
        id: "e04b",
        source: "resume",
        traitId: "systems",
        quote:
          "Designed end-to-end data pipeline for carrier performance tracking, used by 3 teams daily.",
        strength: 83,
      },
      {
        id: "e04c",
        source: "resume",
        traitId: "operator",
        quote:
          "Worked directly with carrier operations teams to surface and resolve SLA violations.",
        strength: 70,
      },
    ],
    whySurfaced: ["Strong data skills", "Automation track record"],
    personalLine:
      "Twelve hours of manual work eliminated per week, across two teams. That's real leverage — and it's exactly the kind of automation mindset we're hiring for.",
    status: "shortlisted",
    appliedDate: "2026-11-17",
  },
  {
    id: "c05",
    name: "Lena Hoffmann",
    initials: "LH",
    headline: "Chief of Staff, 40-person B2B SaaS startup",
    summary:
      "Ran CEO's weekly priorities, owned board prep, and stood up the company's first hiring process. High comfort with ambiguity and moving fast.",
    traitVector: {
      ownership: 90,
      data: 60,
      systems: 72,
      xfunc: 88,
      ambiguity: 92,
      operator: 50,
    },
    evidence: [
      {
        id: "e05a",
        source: "resume",
        traitId: "xfunc",
        quote:
          "Coordinated cross-functional projects across product, sales, and engineering — often with no formal authority.",
        strength: 88,
      },
      {
        id: "e05b",
        source: "proof_answer",
        traitId: "ownership",
        quote:
          "CEO handed me board prep with two days notice and no prior materials. I built the deck from scratch, ran the Q&A prep, and got positive feedback from two board members.",
        strength: 90,
      },
      {
        id: "e05c",
        source: "proof_answer",
        traitId: "ambiguity",
        quote:
          "My job description changed three times in six months. I stopped waiting for clarity and started setting the agenda myself.",
        strength: 93,
      },
    ],
    whySurfaced: ["Short answer quality", "Startup pace experience", "High ownership"],
    personalLine:
      "Board prep with two days notice and no prior materials — you built the deck, ran Q&A prep, and got positive feedback from the board. That's the bar.",
    status: "shortlisted",
    appliedDate: "2026-11-16",
  },
  {
    id: "c06",
    name: "Tariq Osei",
    initials: "TO",
    headline: "Revenue Ops, Series B SaaS",
    summary:
      "Built the go-to-market operations stack from scratch, including CRM hygiene workflows and a pipeline reporting model used by the sales team weekly.",
    traitVector: {
      ownership: 80,
      data: 85,
      systems: 86,
      xfunc: 70,
      ambiguity: 72,
      operator: 78,
    },
    evidence: [
      {
        id: "e06a",
        source: "resume",
        traitId: "systems",
        quote: "Built Salesforce hygiene workflow that reduced duplicate records by 90% in 60 days.",
        strength: 85,
      },
      {
        id: "e06b",
        source: "resume",
        traitId: "data",
        quote:
          "Created pipeline reporting model in Looker, now used by 8-person sales team for weekly forecasting.",
        strength: 86,
      },
      {
        id: "e06c",
        source: "resume",
        traitId: "operator",
        quote:
          "Partnered with CS team to identify upsell signals — contributed to 20% expansion revenue increase.",
        strength: 78,
      },
    ],
    whySurfaced: ["Data and systems depth", "Revenue ops track record"],
    personalLine:
      "A pipeline model in Looker that the full sales team runs their week on. Building something people rely on daily is the goal — you've already done it.",
    status: "shortlisted",
    appliedDate: "2026-11-16",
  },
  {
    id: "c07",
    name: "Yuki Tanaka",
    initials: "YT",
    headline: "Operations Manager, marketplace startup (resume only)",
    summary:
      "Managed day-to-day operations for a 2-sided marketplace. Built SOPs for onboarding, escalations, and partner communications.",
    traitVector: {
      ownership: 82,
      data: 72,
      systems: 82,
      xfunc: 72,
      ambiguity: 78,
      operator: 85,
    },
    evidence: [
      {
        id: "e07a",
        source: "resume",
        traitId: "systems",
        quote: "Wrote 15 SOPs covering onboarding, escalation, and partner comms — still in use.",
        strength: 78,
      },
      {
        id: "e07b",
        source: "resume",
        traitId: "operator",
        quote:
          "Managed relationships with 200+ supply-side partners, maintaining 94% satisfaction rate.",
        strength: 82,
      },
    ],
    whySurfaced: ["Operator experience", "Process documentation"],
    personalLine:
      "Your 200-partner relationship management experience — with a 94% satisfaction rate — shows strong operator instincts we'd put to work immediately.",
    status: "pending",
    appliedDate: "2026-11-16",
    bucket: "priority",
    manuallyBucketed: true,
  },
  {
    id: "c08",
    name: "Fatima Al-Rashid",
    initials: "FR",
    headline: "Project Manager, consulting → startup (resume only)",
    summary:
      "Five years in management consulting before moving to a 25-person startup. Known for running structured project retrospectives and clear written communication.",
    traitVector: {
      ownership: 68,
      data: 70,
      systems: 74,
      xfunc: 76,
      ambiguity: 60,
      operator: 45,
    },
    evidence: [
      {
        id: "e08a",
        source: "resume",
        traitId: "xfunc",
        quote:
          "Led 12 cross-functional engagements at [Consulting Firm], coordinating 4–8 stakeholder groups per project.",
        strength: 76,
      },
      {
        id: "e08b",
        source: "resume",
        traitId: "data",
        quote: "Built financial models for 3 clients that informed $2M+ in strategic decisions.",
        strength: 70,
      },
    ],
    whySurfaced: ["Cross-functional coordination", "Structured thinking"],
    personalLine:
      "Your track record running 12 cross-functional engagements — coordinating up to 8 stakeholder groups — is a strong signal for the kind of coordination this role requires.",
    status: "pending",
    appliedDate: "2026-11-16",
  },
  {
    id: "c09",
    name: "Carlos Mendez",
    initials: "CM",
    headline: "BizOps Analyst, edtech Series A",
    summary:
      "Built the company's first revenue reconciliation workflow and owns the monthly finance close process. Learning to manage stakeholder expectations as the team grows.",
    traitVector: {
      ownership: 74,
      data: 80,
      systems: 70,
      xfunc: 58,
      ambiguity: 65,
      operator: 50,
    },
    evidence: [
      {
        id: "e09a",
        source: "proof_answer",
        traitId: "data",
        quote:
          "Discovered a $40K reconciliation error by cross-referencing Stripe and our internal ledger — built a weekly auto-check that's caught 3 issues since.",
        strength: 82,
      },
      {
        id: "e09b",
        source: "resume",
        traitId: "systems",
        quote: "Owns monthly finance close process from data pull to CFO sign-off.",
        strength: 72,
      },
    ],
    whySurfaced: ["Data accuracy mindset", "Finance systems experience"],
    personalLine:
      "Your discovery of the $40K reconciliation error — and the auto-check you built to prevent recurrence — shows the kind of detail-oriented ownership we need.",
    status: "pending",
    appliedDate: "2026-11-15",
    bucket: "priority",
    manuallyBucketed: true,
  },
  {
    id: "c10",
    name: "Zoe Kimura",
    initials: "ZK",
    headline: "Ops & Strategy, seed-stage startup",
    summary:
      "One of three employees at a seed-stage company for 18 months. Did a bit of everything — customer success, finance, and hiring ops — before the company raised a Series A.",
    traitVector: {
      ownership: 86,
      data: 58,
      systems: 65,
      xfunc: 72,
      ambiguity: 90,
      operator: 80,
    },
    evidence: [
      {
        id: "e10a",
        source: "proof_answer",
        traitId: "ambiguity",
        quote:
          "For 6 months I was the entire ops team. I made decisions I had no precedent for and learned to tell the CEO when I was guessing — that turned out to be the right call.",
        strength: 91,
      },
      {
        id: "e10b",
        source: "resume",
        traitId: "operator",
        quote: "Personally onboarded first 50 customers, built the initial CS playbook.",
        strength: 80,
      },
      {
        id: "e10c",
        source: "proof_answer",
        traitId: "ownership",
        quote:
          "I owned the hiring process when we went from 3 to 15 people. No recruiter, no ATS — just me, a Notion board, and a lot of coordination.",
        strength: 86,
      },
    ],
    whySurfaced: ["Early-stage startup experience", "Short answer quality", "High ambiguity tolerance"],
    personalLine:
      "Being one of three employees for 18 months — owning everything from CS to hiring ops — is exactly the kind of zero-to-one experience this role builds on.",
    status: "pending",
    appliedDate: "2026-11-15",
  },
  {
    id: "c11",
    name: "Noah Okafor",
    initials: "NO",
    headline: "Operations Coordinator, enterprise SaaS (resume only)",
    summary:
      "Coordinates implementation projects for enterprise clients. Strong at tracking milestones and keeping stakeholders updated. Limited experience owning a problem independently.",
    traitVector: {
      ownership: 50,
      data: 55,
      systems: 60,
      xfunc: 72,
      ambiguity: 45,
      operator: 68,
    },
    evidence: [
      {
        id: "e11a",
        source: "resume",
        traitId: "xfunc",
        quote: "Managed 20 concurrent implementation projects across product, CS, and engineering.",
        strength: 72,
      },
      {
        id: "e11b",
        source: "resume",
        traitId: "operator",
        quote: "Primary POC for 15 enterprise accounts, $3M ARR.",
        strength: 68,
      },
    ],
    whySurfaced: ["Client coordination experience"],
    personalLine:
      "Your experience managing 20 concurrent implementation projects is a good foundation — we'd want to see more independent ownership in this role.",
    status: "pending",
    appliedDate: "2026-11-15",
  },
  {
    id: "c12",
    name: "Isabelle Roy",
    initials: "IR",
    headline: "Product Ops, B2B marketplace",
    summary:
      "Works at the intersection of product and operations — writing specs, running pilots, and translating user feedback into process improvements.",
    traitVector: {
      ownership: 76,
      data: 72,
      systems: 74,
      xfunc: 78,
      ambiguity: 70,
      operator: 72,
    },
    evidence: [
      {
        id: "e12a",
        source: "proof_answer",
        traitId: "xfunc",
        quote:
          "Ran a 3-month pilot with the product and supply teams — wrote the brief, owned the timeline, and presented results to leadership. Got buy-in for a full rollout.",
        strength: 78,
      },
      {
        id: "e12b",
        source: "resume",
        traitId: "operator",
        quote:
          "Synthesized feedback from 60 supplier interviews into a prioritized product roadmap item.",
        strength: 72,
      },
    ],
    whySurfaced: ["Product-ops bridge", "Pilot ownership"],
    personalLine:
      "The 3-month pilot you owned — from brief to leadership presentation to full rollout — shows the kind of end-to-end ownership this role demands.",
    status: "pending",
    appliedDate: "2026-11-15",
  },
  {
    id: "c13",
    name: "Darius Chang",
    initials: "DC",
    headline: "Finance & Ops, early-stage consumer startup (resume only)",
    summary:
      "Came up through finance but moved into ops. Built the company's first budget-to-actual reporting process and started running the weekly ops review.",
    traitVector: {
      ownership: 68,
      data: 84,
      systems: 70,
      xfunc: 60,
      ambiguity: 62,
      operator: 48,
    },
    evidence: [
      {
        id: "e13a",
        source: "resume",
        traitId: "data",
        quote:
          "Built budget-to-actual model in Sheets that became the standard for monthly finance reviews.",
        strength: 84,
      },
      {
        id: "e13b",
        source: "resume",
        traitId: "systems",
        quote: "Designed weekly ops review template, adopted by CEO and 3 team leads.",
        strength: 70,
      },
    ],
    whySurfaced: ["Finance-to-ops background", "Data-first approach"],
    personalLine:
      "Your budget-to-actual model that became the company standard is a strong signal — we're looking for someone who builds things others rely on.",
    status: "pending",
    appliedDate: "2026-11-14",
  },
  {
    id: "c14",
    name: "Amara Diallo",
    initials: "AD",
    headline: "Operations Generalist, climate tech startup",
    summary:
      "One of two ops hires at a 30-person climate tech company. Owns recruiting coordination, vendor management, and office operations. Looking to go deeper into strategy.",
    traitVector: {
      ownership: 65,
      data: 50,
      systems: 68,
      xfunc: 70,
      ambiguity: 72,
      operator: 60,
    },
    evidence: [
      {
        id: "e14a",
        source: "proof_answer",
        traitId: "ambiguity",
        quote:
          "Our vendor contracts were a mess when I started — no central list, no renewal dates tracked. I fixed it over two weeks because nobody else was going to.",
        strength: 72,
      },
      {
        id: "e14b",
        source: "resume",
        traitId: "systems",
        quote: "Built vendor contract tracking system in Airtable, covering 25 vendors.",
        strength: 68,
      },
    ],
    whySurfaced: ["Takes initiative", "Systems mindset"],
    personalLine:
      "Fixing the vendor contract chaos because nobody else was going to — that kind of initiative without being asked is what we're looking for.",
    status: "pending",
    appliedDate: "2026-11-14",
  },
  {
    id: "c15",
    name: "Felix Brandt",
    initials: "FB",
    headline: "Analyst, management consulting → growth company",
    summary:
      "Three years in consulting followed by an analyst role at a 150-person growth-stage company. Comfortable with structured problem-solving; less comfortable with ambiguity.",
    traitVector: {
      ownership: 55,
      data: 76,
      systems: 65,
      xfunc: 68,
      ambiguity: 48,
      operator: 42,
    },
    evidence: [
      {
        id: "e15a",
        source: "resume",
        traitId: "data",
        quote:
          "Built 3 market sizing models for strategic planning, used by exec team for annual planning.",
        strength: 76,
      },
      {
        id: "e15b",
        source: "resume",
        traitId: "xfunc",
        quote:
          "Coordinated cross-functional working groups across 4 departments for 6-month transformation initiative.",
        strength: 68,
      },
    ],
    whySurfaced: ["Strong analytical skills", "Structured thinking"],
    personalLine:
      "Your market sizing models used in executive planning show strong analytical fundamentals — we'd want to understand how comfortable you are outside of a structured environment.",
    status: "pending",
    appliedDate: "2026-11-14",
  },
  {
    id: "c16",
    name: "Keiko Watanabe",
    initials: "KW",
    headline: "BizOps at Notion, global expansion focus (resume only)",
    summary:
      "Runs BizOps for Notion's international expansion effort. High cross-functional fluency; has worked with legal, finance, and product to launch in 4 markets.",
    traitVector: {
      ownership: 78,
      data: 68,
      systems: 72,
      xfunc: 90,
      ambiguity: 76,
      operator: 65,
    },
    evidence: [
      {
        id: "e16a",
        source: "resume",
        traitId: "xfunc",
        quote:
          "Coordinated legal, finance, compliance, and product to launch Notion in 4 international markets in 18 months.",
        strength: 90,
      },
      {
        id: "e16b",
        source: "resume",
        traitId: "ownership",
        quote: "Sole BizOps owner for international expansion — no prior playbook.",
        strength: 78,
      },
    ],
    whySurfaced: ["Cross-functional leadership", "International ops experience"],
    personalLine:
      "Coordinating 4 international market launches across legal, finance, compliance, and product — with no prior playbook — is strong evidence of the cross-functional ownership we need.",
    status: "pass",
    appliedDate: "2026-11-14",
  },
  {
    id: "c17",
    name: "Ravi Patel",
    initials: "RP",
    headline: "Operations Manager, D2C e-commerce",
    summary:
      "Managed fulfillment ops and 3PL relationships for a D2C brand. Good at structured execution and hitting SLAs; less experience with 0-to-1 or ambiguous problems.",
    traitVector: {
      ownership: 60,
      data: 64,
      systems: 72,
      xfunc: 55,
      ambiguity: 45,
      operator: 76,
    },
    evidence: [
      {
        id: "e17a",
        source: "resume",
        traitId: "operator",
        quote: "Managed 3 3PL relationships and $4M in annual fulfillment spend.",
        strength: 76,
      },
      {
        id: "e17b",
        source: "resume",
        traitId: "systems",
        quote: "Implemented inventory tracking system, reducing stockout rate from 12% to 3%.",
        strength: 72,
      },
    ],
    whySurfaced: ["Operator and vendor management", "Process improvement"],
    personalLine:
      "Cutting stockout rates from 12% to 3% with an inventory tracking system shows strong systems instincts — the ambiguity of an early-stage role would be a new challenge.",
    status: "pass",
    appliedDate: "2026-11-13",
  },
  {
    id: "c18",
    name: "Simone Laurent",
    initials: "SL",
    headline: "Chief of Staff, non-profit → tech startup",
    summary:
      "Three years as CoS at a non-profit, then made the jump to a 50-person tech startup six months ago. Learning to operate at startup pace while applying strong project management fundamentals.",
    traitVector: {
      ownership: 72,
      data: 55,
      systems: 68,
      xfunc: 80,
      ambiguity: 65,
      operator: 58,
    },
    evidence: [
      {
        id: "e18a",
        source: "proof_answer",
        traitId: "xfunc",
        quote:
          "Ran the annual planning process across 8 departments — built the template, facilitated the sessions, and synthesized 60 pages of input into a 10-page org strategy.",
        strength: 80,
      },
      {
        id: "e18b",
        source: "resume",
        traitId: "ownership",
        quote: "Owned board meeting preparation — agenda, materials, and exec briefing — solo.",
        strength: 72,
      },
    ],
    whySurfaced: ["Strong facilitation and coordination", "Short answer quality"],
    personalLine:
      "Synthesizing 60 pages of department input into a 10-page org strategy is exactly the kind of structured, high-ownership work we need in this role.",
    status: "pending",
    appliedDate: "2026-11-13",
  },
  {
    id: "c19",
    name: "Jaden Brooks",
    initials: "JB",
    headline: "Sales Development Rep turned Ops, B2B SaaS (resume only)",
    summary:
      "Started in SDR, transitioned to revenue ops after 12 months. Good commercial instincts; building data and systems skills on the job.",
    traitVector: {
      ownership: 65,
      data: 58,
      systems: 55,
      xfunc: 68,
      ambiguity: 60,
      operator: 80,
    },
    evidence: [
      {
        id: "e19a",
        source: "resume",
        traitId: "operator",
        quote:
          "Managed pipeline for 8 AEs, running weekly deal reviews and tracking conversion by stage.",
        strength: 80,
      },
      {
        id: "e19b",
        source: "resume",
        traitId: "xfunc",
        quote: "Collaborated with marketing and product on go-to-market launch for 2 new features.",
        strength: 68,
      },
    ],
    whySurfaced: ["Commercial and operator exposure", "Upward trajectory"],
    personalLine:
      "Moving from SDR to revenue ops in 12 months shows strong self-direction — your operator experience would map well to the customer-facing parts of this role.",
    status: "pending",
    appliedDate: "2026-11-13",
  },
  {
    id: "c20",
    name: "Mei Fong",
    initials: "MF",
    headline: "Operations Lead, Series B fintech",
    summary:
      "Runs the operations function at a 70-person fintech. Built the compliance ops process from scratch after a regulatory change. Data-driven, high attention to detail.",
    traitVector: {
      ownership: 82,
      data: 80,
      systems: 78,
      xfunc: 68,
      ambiguity: 74,
      operator: 62,
    },
    evidence: [
      {
        id: "e20a",
        source: "proof_answer",
        traitId: "ownership",
        quote:
          "When regulators changed our KYC requirements, there was no playbook. I read the regulation, mapped the gaps, built the new process, and trained the team — in 3 weeks.",
        strength: 85,
      },
      {
        id: "e20b",
        source: "proof_answer",
        traitId: "data",
        quote:
          "Built a compliance monitoring dashboard in Mode — catches anomalies before they become audit findings.",
        strength: 80,
      },
    ],
    whySurfaced: ["Short answer quality", "Builds under pressure", "Data systems depth"],
    personalLine:
      "Reading the regulation, mapping the gaps, building the process, and training the team in 3 weeks — that kind of zero-to-one ownership under pressure is exactly what we're hiring for.",
    status: "pending",
    appliedDate: "2026-11-13",
  },
  {
    id: "c21",
    name: "Alexei Petrov",
    initials: "AP",
    headline: "Business Analyst, enterprise software (resume only)",
    summary:
      "Five years as a business analyst at a large enterprise software company. Strong with requirements gathering and documentation; limited experience at a startup or in ambiguous environments.",
    traitVector: {
      ownership: 48,
      data: 72,
      systems: 65,
      xfunc: 60,
      ambiguity: 38,
      operator: 50,
    },
    evidence: [
      {
        id: "e21a",
        source: "resume",
        traitId: "data",
        quote: "Analyzed user behavior data for 3 product features, informing roadmap decisions.",
        strength: 72,
      },
      {
        id: "e21b",
        source: "resume",
        traitId: "systems",
        quote: "Wrote 20+ BRDs and functional specifications for enterprise product features.",
        strength: 65,
      },
    ],
    whySurfaced: ["Analytical background", "Process documentation"],
    personalLine:
      "Your analytical background and documentation depth are strong — the unstructured nature of an early-stage startup would be a significant shift from enterprise.",
    status: "pending",
    appliedDate: "2026-11-12",
  },
  {
    id: "c22",
    name: "Nadia Obi",
    initials: "NO",
    headline: "Ops & Finance Manager, Series A startup",
    summary:
      "Owns a mix of finance ops and business operations at a Series A company. High attention to detail, strong at running recurring processes. Building toward more strategic work.",
    traitVector: {
      ownership: 70,
      data: 76,
      systems: 74,
      xfunc: 62,
      ambiguity: 60,
      operator: 55,
    },
    evidence: [
      {
        id: "e22a",
        source: "proof_answer",
        traitId: "data",
        quote:
          "Built the weekly KPI dashboard that leadership uses every Monday morning — started with 3 metrics, now tracks 12.",
        strength: 76,
      },
      {
        id: "e22b",
        source: "resume",
        traitId: "systems",
        quote: "Owns monthly close process, accounts payable, and vendor reconciliation.",
        strength: 74,
      },
    ],
    whySurfaced: ["Data and reporting skills", "Finance ops background"],
    personalLine:
      "The KPI dashboard you built — starting with 3 metrics and growing to 12 based on what leadership actually needed — shows good instincts for iterating toward impact.",
    status: "pending",
    appliedDate: "2026-11-12",
  },
  {
    id: "c23",
    name: "Owen Clarke",
    initials: "OC",
    headline: "Growth Ops, consumer app startup (resume only)",
    summary:
      "Runs growth operations for a consumer app — managing paid acquisition tracking, referral program analytics, and growth experiment reporting.",
    traitVector: {
      ownership: 68,
      data: 80,
      systems: 65,
      xfunc: 60,
      ambiguity: 65,
      operator: 55,
    },
    evidence: [
      {
        id: "e23a",
        source: "resume",
        traitId: "data",
        quote: "Built end-to-end paid acquisition reporting model covering $2M in annual spend.",
        strength: 80,
      },
      {
        id: "e23b",
        source: "resume",
        traitId: "systems",
        quote: "Designed experiment tracking framework used by growth team for A/B tests.",
        strength: 65,
      },
    ],
    whySurfaced: ["Strong data background", "Growth ops experience"],
    personalLine:
      "Your end-to-end paid acquisition reporting model — covering $2M in annual spend — shows the kind of data ownership this role requires.",
    status: "pending",
    appliedDate: "2026-11-12",
  },
  {
    id: "c24",
    name: "Clara Nguyen",
    initials: "CN",
    headline: "Office & People Ops, early-stage startup (resume only)",
    summary:
      "Runs office operations and people ops for a 40-person startup. Organized, reliable, and good at juggling multiple workstreams. Limited exposure to data or strategic work.",
    traitVector: {
      ownership: 60,
      data: 42,
      systems: 65,
      xfunc: 65,
      ambiguity: 58,
      operator: 60,
    },
    evidence: [
      {
        id: "e24a",
        source: "resume",
        traitId: "systems",
        quote: "Designed onboarding workflow for new hires, reducing ramp time by estimated 30%.",
        strength: 65,
      },
      {
        id: "e24b",
        source: "resume",
        traitId: "xfunc",
        quote: "Coordinates across HR, finance, and IT for new hire setup and equipment.",
        strength: 65,
      },
    ],
    whySurfaced: ["Coordination and logistics skills"],
    personalLine:
      "Your onboarding workflow work shows process thinking — this role would push further into data and strategy than your current scope.",
    status: "pending",
    appliedDate: "2026-11-12",
  },
  {
    id: "c25",
    name: "Hamid Rashidi",
    initials: "HR",
    headline: "Strategy & Ops, Series B marketplace",
    summary:
      "Works in a 4-person S&O team at a Series B marketplace. Owns supplier operations and has built several internal tools. Interested in moving to a smaller team with more ownership.",
    traitVector: {
      ownership: 76,
      data: 72,
      systems: 76,
      xfunc: 68,
      ambiguity: 72,
      operator: 78,
    },
    evidence: [
      {
        id: "e25a",
        source: "proof_answer",
        traitId: "operator",
        quote:
          "Managed the supplier quality review process for 300+ active suppliers — built the scoring rubric, ran the quarterly reviews, and owned the offboarding process for underperformers.",
        strength: 78,
      },
      {
        id: "e25b",
        source: "resume",
        traitId: "systems",
        quote:
          "Built internal supplier portal in Retool that replaced a 60-step manual review process.",
        strength: 76,
      },
    ],
    whySurfaced: ["Strong operator experience", "Systems-builder", "Short answer quality"],
    personalLine:
      "Building the supplier scoring rubric, running quarterly reviews, and owning the offboarding process — end-to-end ownership of a complex operation — is exactly the depth we're looking for.",
    status: "pending",
    appliedDate: "2026-11-11",
  },
  {
    id: "c26",
    name: "Brielle Thomas",
    initials: "BT",
    headline: "Operations Analyst, media company (resume only)",
    summary:
      "Three years in operations at a large media company. Good at managing recurring processes and stakeholder communication. Limited startup or 0-to-1 experience.",
    traitVector: {
      ownership: 52,
      data: 60,
      systems: 60,
      xfunc: 65,
      ambiguity: 42,
      operator: 58,
    },
    evidence: [
      {
        id: "e26a",
        source: "resume",
        traitId: "xfunc",
        quote: "Coordinated content operations across editorial, ad sales, and legal teams.",
        strength: 65,
      },
      {
        id: "e26b",
        source: "resume",
        traitId: "data",
        quote: "Generated weekly performance reports for editorial and monetization teams.",
        strength: 60,
      },
    ],
    whySurfaced: ["Coordination experience", "Media ops background"],
    personalLine:
      "Your cross-functional coordination across editorial, ad sales, and legal shows strong collaboration instincts — the ambiguity of a startup environment would be a step change.",
    status: "pending",
    appliedDate: "2026-11-11",
  },
  {
    id: "c27",
    name: "Elena Vasquez",
    initials: "EV",
    headline: "Ops & CS Lead, seed-stage B2B startup",
    summary:
      "One of the first 5 employees at a seed-stage startup. Wore many hats — built the customer success process, ran the onboarding calls, and owned the ops side of fundraising prep.",
    traitVector: {
      ownership: 85,
      data: 60,
      systems: 70,
      xfunc: 76,
      ambiguity: 88,
      operator: 84,
    },
    evidence: [
      {
        id: "e27a",
        source: "proof_answer",
        traitId: "ambiguity",
        quote:
          "With 5 people and no formal roles, I owned whatever wasn't owned. Some weeks that was customer calls, some weeks it was building the data room for investors. I never waited to be assigned.",
        strength: 90,
      },
      {
        id: "e27b",
        source: "resume",
        traitId: "operator",
        quote:
          "Personally onboarded first 40 customers and built the initial CS playbook, now used by a 3-person team.",
        strength: 84,
      },
    ],
    whySurfaced: ["Early-stage experience", "High ambiguity tolerance", "Short answer quality"],
    personalLine:
      "Owning whatever wasn't owned — from customer calls to investor data rooms — without waiting to be assigned is exactly the mindset we're hiring for.",
    status: "pending",
    appliedDate: "2026-11-11",
  },
  {
    id: "c28",
    name: "Marcus Thompson",
    initials: "MT",
    headline: "Data Analyst, Series B SaaS (resume only)",
    summary:
      "Strong data analyst with experience in product and marketing analytics. Looking to move into an ops role with more cross-functional exposure.",
    traitVector: {
      ownership: 55,
      data: 86,
      systems: 68,
      xfunc: 58,
      ambiguity: 52,
      operator: 44,
    },
    evidence: [
      {
        id: "e28a",
        source: "resume",
        traitId: "data",
        quote:
          "Built company's first attribution model, reducing CAC measurement error by estimated 35%.",
        strength: 86,
      },
      {
        id: "e28b",
        source: "resume",
        traitId: "systems",
        quote: "Designed event tracking taxonomy used by product and growth teams.",
        strength: 68,
      },
    ],
    whySurfaced: ["Strong data skills", "Analytical depth"],
    personalLine:
      "Your attribution model — reducing CAC measurement error by 35% — shows the kind of data quality mindset we need; the ops side of this role would be a new muscle to build.",
    status: "pending",
    appliedDate: "2026-11-11",
  },
  {
    id: "c29",
    name: "Priscilla Osei",
    initials: "PO",
    headline: "Project Manager, agency → in-house startup",
    summary:
      "Three years as a project manager at a creative agency, recently moved in-house to a 30-person startup. Learning to operate without clients and timelines set by others.",
    traitVector: {
      ownership: 65,
      data: 55,
      systems: 70,
      xfunc: 72,
      ambiguity: 58,
      operator: 60,
    },
    evidence: [
      {
        id: "e29a",
        source: "proof_answer",
        traitId: "xfunc",
        quote:
          "At the agency I was the translator between clients, designers, and developers — nobody else wanted that role, so I took it and built a reputation for un-sticking projects.",
        strength: 72,
      },
      {
        id: "e29b",
        source: "resume",
        traitId: "systems",
        quote:
          "Built project tracking system in Asana, adopted by 15-person agency for all client work.",
        strength: 70,
      },
    ],
    whySurfaced: ["Cross-functional coordination", "Systems thinking"],
    personalLine:
      "Being the translator between clients, designers, and developers — taking that role because nobody else wanted it — is a good signal for the kind of initiative this role requires.",
    status: "pending",
    appliedDate: "2026-11-10",
  },
  {
    id: "c30",
    name: "Antoine Leclerc",
    initials: "AL",
    headline: "BizOps, international expansion (resume only)",
    summary:
      "Spent 2 years running business operations for a European startup expanding into the US. Managed legal setup, vendor relationships, and office ops across two continents.",
    traitVector: {
      ownership: 74,
      data: 62,
      systems: 72,
      xfunc: 76,
      ambiguity: 72,
      operator: 70,
    },
    evidence: [
      {
        id: "e30a",
        source: "resume",
        traitId: "xfunc",
        quote:
          "Coordinated US market entry across legal, finance, HR, and product — managed 8 external vendors simultaneously.",
        strength: 76,
      },
      {
        id: "e30b",
        source: "resume",
        traitId: "ownership",
        quote:
          "Sole ops person in the US office for first 12 months — owned everything from lease negotiations to hiring logistics.",
        strength: 74,
      },
    ],
    whySurfaced: ["International ops experience", "High ownership in lean environment"],
    personalLine:
      "Being the sole ops person in the US office for 12 months — owning lease negotiations through hiring logistics — is strong evidence of independent ownership.",
    status: "pending",
    appliedDate: "2026-11-10",
  },
  {
    id: "c31",
    name: "Taylor Reeves",
    initials: "TR",
    headline: "Operations Specialist, healthcare startup (resume only)",
    summary:
      "Runs day-to-day operations for a healthcare startup. Good at process documentation and managing vendors. Less experience with data or ambiguous strategy questions.",
    traitVector: {
      ownership: 58,
      data: 48,
      systems: 65,
      xfunc: 60,
      ambiguity: 52,
      operator: 65,
    },
    evidence: [
      {
        id: "e31a",
        source: "resume",
        traitId: "systems",
        quote: "Documented 25 operational SOPs for clinical and administrative workflows.",
        strength: 65,
      },
      {
        id: "e31b",
        source: "resume",
        traitId: "operator",
        quote: "Managed 10 vendor contracts, including renewal negotiation and performance tracking.",
        strength: 65,
      },
    ],
    whySurfaced: ["Process documentation", "Vendor management"],
    personalLine:
      "Your vendor contract management and SOP documentation show solid ops fundamentals — this role would push you toward more ambiguity and data work.",
    status: "pending",
    appliedDate: "2026-11-10",
  },
  {
    id: "c32",
    name: "Ingrid Hansen",
    initials: "IH",
    headline: "Strategy Analyst, consulting → fintech (resume only)",
    summary:
      "Two years at McKinsey, then moved to a fintech to do strategy. Currently supports the CFO with financial modeling and strategic projects. Wants more operational ownership.",
    traitVector: {
      ownership: 60,
      data: 82,
      systems: 62,
      xfunc: 65,
      ambiguity: 58,
      operator: 45,
    },
    evidence: [
      {
        id: "e32a",
        source: "resume",
        traitId: "data",
        quote:
          "Built 5 financial models for strategic decisions including two M&A opportunities and a market expansion.",
        strength: 82,
      },
      {
        id: "e32b",
        source: "resume",
        traitId: "xfunc",
        quote: "Presented strategic recommendations to executive team on 4 occasions.",
        strength: 65,
      },
    ],
    whySurfaced: ["Strong analytical background", "Consulting rigor"],
    personalLine:
      "Your financial modeling background — including M&A analysis — is analytically strong; the ops side of this role would be a meaningful shift toward hands-on execution.",
    status: "pending",
    appliedDate: "2026-11-10",
  },
  {
    id: "c33",
    name: "Kevin Oduya",
    initials: "KO",
    headline: "Operations Coordinator, nonprofit → Series A startup",
    summary:
      "Spent 3 years in nonprofit operations, recently moved to a startup. Learning fast, excited by the pace, but earlier in their career arc for this level of ownership.",
    traitVector: {
      ownership: 55,
      data: 50,
      systems: 60,
      xfunc: 62,
      ambiguity: 60,
      operator: 55,
    },
    evidence: [
      {
        id: "e33a",
        source: "proof_answer",
        traitId: "ambiguity",
        quote:
          "At the startup there's no one to tell me what good looks like. I've started writing my own weekly priorities and sharing them with my manager — she said she wishes more people did that.",
        strength: 62,
      },
      {
        id: "e33b",
        source: "resume",
        traitId: "systems",
        quote: "Managed grant reporting process and financial reconciliation for 5 annual grants.",
        strength: 60,
      },
    ],
    whySurfaced: ["Growth trajectory", "Self-direction signals"],
    personalLine:
      "Writing your own weekly priorities without being asked — and sharing them with your manager — is a good sign; we'd want someone with more end-to-end ownership experience for this role.",
    status: "pending",
    appliedDate: "2026-11-09",
  },
  {
    id: "c34",
    name: "Sara Kim",
    initials: "SK",
    headline: "Product Operations, B2B SaaS",
    summary:
      "Runs product operations including release management, customer feedback synthesis, and internal tooling. Strong communicator; builds things that last.",
    traitVector: {
      ownership: 78,
      data: 68,
      systems: 76,
      xfunc: 80,
      ambiguity: 72,
      operator: 68,
    },
    evidence: [
      {
        id: "e34a",
        source: "proof_answer",
        traitId: "xfunc",
        quote:
          "Release management meant being the single point of contact between product, engineering, CS, and marketing. I built the launch checklist that became the company standard.",
        strength: 82,
      },
      {
        id: "e34b",
        source: "resume",
        traitId: "systems",
        quote:
          "Designed internal tooling roadmap and owned implementation of 3 tools in 12 months.",
        strength: 76,
      },
    ],
    whySurfaced: ["Cross-functional coordination", "Systems-builder", "Short answer quality"],
    personalLine:
      "Building the launch checklist that became the company standard — and being the single point of contact across product, engineering, CS, and marketing — shows the systems and coordination depth this role needs.",
    status: "pending",
    appliedDate: "2026-11-09",
  },
  {
    id: "c35",
    name: "Ben Achebe",
    initials: "BA",
    headline: "Finance & Strategy, pre-IPO company (resume only)",
    summary:
      "Spent 4 years in FP&A and strategy at a pre-IPO company. Strong with financial modeling and board reporting. Interested in transitioning to a more operational role.",
    traitVector: {
      ownership: 55,
      data: 85,
      systems: 62,
      xfunc: 60,
      ambiguity: 50,
      operator: 44,
    },
    evidence: [
      {
        id: "e35a",
        source: "resume",
        traitId: "data",
        quote: "Led annual budgeting process, managing $80M in revenue projections.",
        strength: 85,
      },
      {
        id: "e35b",
        source: "resume",
        traitId: "systems",
        quote: "Built financial reporting model adopted as the standard for 4 business units.",
        strength: 62,
      },
    ],
    whySurfaced: ["Strong data and finance background", "Analytical depth"],
    personalLine:
      "Leading the annual budgeting process for $80M in projections shows strong financial rigor — the operational ambiguity of an early-stage role would be a significant new challenge.",
    status: "pending",
    appliedDate: "2026-11-09",
  },
  {
    id: "c36",
    name: "Lucia Fernandez",
    initials: "LF",
    headline: "Ops & Partnerships, early-stage marketplace",
    summary:
      "One of the first 10 employees at an early-stage marketplace. Owns partner onboarding, ops metrics, and strategic partnerships.",
    traitVector: {
      ownership: 82,
      data: 70,
      systems: 74,
      xfunc: 74,
      ambiguity: 80,
      operator: 82,
    },
    evidence: [
      {
        id: "e36a",
        source: "proof_answer",
        traitId: "operator",
        quote:
          "Signed and onboarded the company's first 50 supply partners — built the pitch, the contracts, and the onboarding workflow entirely from scratch.",
        strength: 85,
      },
      {
        id: "e36b",
        source: "resume",
        traitId: "systems",
        quote:
          "Designed partner operations system in Airtable, tracking 150+ active partnerships.",
        strength: 74,
      },
    ],
    whySurfaced: ["Strong operator and partnership experience", "Short answer quality", "0-to-1 track record"],
    personalLine:
      "Building the pitch, contracts, and onboarding workflow for your first 50 supply partners from scratch is strong 0-to-1 operator experience — exactly what we're looking for.",
    status: "pending",
    appliedDate: "2026-11-09",
  },
  {
    id: "c37",
    name: "Dmitri Volkov",
    initials: "DV",
    headline: "Data & Analytics Manager, enterprise SaaS (resume only)",
    summary:
      "Leads a 3-person analytics team at an enterprise SaaS company. Deep data skills; limited operational or startup experience.",
    traitVector: {
      ownership: 58,
      data: 90,
      systems: 68,
      xfunc: 55,
      ambiguity: 45,
      operator: 40,
    },
    evidence: [
      {
        id: "e37a",
        source: "resume",
        traitId: "data",
        quote:
          "Built company's customer health scoring model, reducing churn prediction error by 28%.",
        strength: 90,
      },
      {
        id: "e37b",
        source: "resume",
        traitId: "systems",
        quote: "Designed data warehouse architecture used by all analytics functions.",
        strength: 68,
      },
    ],
    whySurfaced: ["Exceptional data skills"],
    personalLine:
      "Your customer health scoring model — reducing churn prediction error by 28% — is impressive analytical work; the ops breadth of this role would be a significant pivot.",
    status: "pending",
    appliedDate: "2026-11-08",
  },
  {
    id: "c38",
    name: "Amira Khalil",
    initials: "AK",
    headline: "BizOps & People Ops, seed to Series A journey",
    summary:
      "Joined a startup at seed, grew with it through Series A. Owns both business ops and people ops. Known for building things that scale.",
    traitVector: {
      ownership: 85,
      data: 65,
      systems: 80,
      xfunc: 76,
      ambiguity: 85,
      operator: 70,
    },
    evidence: [
      {
        id: "e38a",
        source: "proof_answer",
        traitId: "systems",
        quote:
          "Built the company's hiring process from a Google Doc wishlist to a full Notion system with structured interviews, scorecards, and offer templates — used for 40+ hires.",
        strength: 82,
      },
      {
        id: "e38b",
        source: "proof_answer",
        traitId: "ambiguity",
        quote:
          "At seed, there were no clean handoffs. I learned to close things myself rather than wait — if nobody owns it, I do.",
        strength: 86,
      },
    ],
    whySurfaced: ["Seed-to-Series A experience", "Short answer quality", "High ownership + ambiguity tolerance"],
    personalLine:
      "Building the hiring process from a Google Doc wishlist to a system used for 40+ hires — and your 'if nobody owns it, I do' mindset — is exactly what we're looking for at this stage.",
    status: "pending",
    appliedDate: "2026-11-08",
  },
  {
    id: "c39",
    name: "Julian Osei",
    initials: "JO",
    headline: "Operations Manager, D2C brand (resume only)",
    summary:
      "Runs fulfillment and logistics ops for a D2C brand. Good at structured execution and hitting targets. Ambiguity and strategic work are less developed.",
    traitVector: {
      ownership: 58,
      data: 60,
      systems: 65,
      xfunc: 55,
      ambiguity: 45,
      operator: 72,
    },
    evidence: [
      {
        id: "e39a",
        source: "resume",
        traitId: "operator",
        quote:
          "Managed 4 logistics partners and $3M in annual freight spend, hitting on-time delivery SLA 95%+ for 18 months.",
        strength: 72,
      },
      {
        id: "e39b",
        source: "resume",
        traitId: "systems",
        quote: "Implemented WMS system, reducing fulfillment errors by 40%.",
        strength: 65,
      },
    ],
    whySurfaced: ["Logistics and operations execution", "SLA track record"],
    personalLine:
      "Maintaining 95%+ on-time delivery across 4 logistics partners for 18 months shows strong execution — the ambiguity of this role would be a meaningful step up.",
    status: "pending",
    appliedDate: "2026-11-08",
  },
  {
    id: "c40",
    name: "Patricia Obi",
    initials: "PO",
    headline: "Head of Ops, 15-person startup (resume only)",
    summary:
      "Head of Ops at a very early-stage company. Owns everything — finance, HR, office, vendor management. High ownership by necessity; building leadership skills.",
    traitVector: {
      ownership: 80,
      data: 55,
      systems: 68,
      xfunc: 70,
      ambiguity: 82,
      operator: 72,
    },
    evidence: [
      {
        id: "e40a",
        source: "resume",
        traitId: "ownership",
        quote: "Sole ops function at 15-person company — no team, no playbook, no prior hire.",
        strength: 82,
      },
      {
        id: "e40b",
        source: "resume",
        traitId: "ambiguity",
        quote: "Built company's first finance, HR, and vendor ops processes from scratch.",
        strength: 80,
      },
    ],
    whySurfaced: ["Full-stack ops ownership", "Startup-first experience"],
    personalLine:
      "Being the sole ops function at a 15-person company — building finance, HR, and vendor ops from scratch with no team and no playbook — is strong evidence of independent ownership.",
    status: "pending",
    appliedDate: "2026-11-08",
  },
]

export const DEMO_CANDIDATE_IDS = new Set(DEMO_CANDIDATES.map((c) => c.id))

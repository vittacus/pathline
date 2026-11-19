// Generates public/sample-import/ (CSV + PDFs) and public/vittacus_bizops_applicants_export.zip
// Run: node scripts/gen-sample-import.mjs

import { createWriteStream, mkdirSync, writeFileSync, readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const PDFDocument = require('pdfkit')
const JSZip = require('jszip')

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

const APPLICANTS = [
  {
    id: 'applicant_01', first_name: 'Alex', last_name: 'Rivera',
    email: 'alex.rivera@email.com', current_title: 'Operations Manager',
    current_company: 'Brightfield Retail', applied_date: '2026-11-10',
    linkedin_url: 'linkedin.com/in/alex-rivera',
    experience: [{
      title: 'Operations Manager', company: 'Brightfield Retail', period: '2024–2026',
      bullets: [
        'Built end-to-end vendor onboarding system from scratch, reducing time-to-active from 3 weeks to 4 days',
        'Documented all operational procedures in a company-wide playbook used by 20+ employees',
        'Owned quarterly planning cycle, coordinating across finance, product, and HR teams',
        'Ran SQL analysis of inventory data, identifying $200K in excess stock across 4 categories',
        'Managed relationships with 60+ vendor accounts, maintaining 97% on-time delivery SLA',
      ]
    }, {
      title: 'Operations Coordinator', company: 'Greenway Logistics', period: '2022–2024',
      bullets: [
        'Coordinated cross-functional project to design a new fulfillment workflow',
        'Built process documentation and checklist for new hire onboarding',
      ]
    }],
    education: 'B.A. Business Administration, University of Florida, 2022',
  },
  {
    id: 'applicant_02', first_name: 'Taylor', last_name: 'Kim',
    email: 'taylor.kim@email.com', current_title: 'Business Analyst',
    current_company: 'Atlas Analytics', applied_date: '2026-11-10',
    linkedin_url: 'linkedin.com/in/taylor-kim',
    experience: [{
      title: 'Business Analyst', company: 'Atlas Analytics', period: '2023–2026',
      bullets: [
        'Built Tableau dashboard tracking 12 KPIs for C-suite weekly review, reducing reporting prep from 4 hours to 20 minutes',
        'Wrote SQL queries to analyze customer churn across 50K accounts, surfacing $1.2M at-risk ARR',
        'Coordinated across finance, product, and marketing teams for quarterly business reviews',
        'Built revenue forecast model adopted by CFO for board presentations',
        'Partnered with data engineering team to redesign metrics taxonomy',
      ]
    }],
    education: 'B.S. Statistics, University of Michigan, 2023',
  },
  {
    id: 'applicant_03', first_name: 'Morgan', last_name: 'Chen',
    email: 'morgan.chen@email.com', current_title: 'Project Coordinator',
    current_company: 'Kinetic Creative', applied_date: '2026-11-11',
    linkedin_url: 'linkedin.com/in/morgan-chen',
    experience: [{
      title: 'Project Coordinator', company: 'Kinetic Creative', period: '2024–2026',
      bullets: [
        'Coordinated across design, engineering, and PM teams on 15+ client projects simultaneously',
        'Documented agency project workflows and built onboarding checklist for new project managers',
        'Partnered with 8 enterprise clients to align on deliverables and timelines',
        'Built internal process for client escalations that reduced resolution time by 40%',
      ]
    }, {
      title: 'Project Assistant', company: 'Vela Digital', period: '2022–2024',
      bullets: [
        'Supported coordination across product and engineering workstreams',
        'Maintained project tracking system used by a 10-person team',
      ]
    }],
    education: 'B.A. Communications, NYU, 2022',
  },
  {
    id: 'applicant_04', first_name: 'Jordan', last_name: 'Williams',
    email: 'jordan.williams@email.com', current_title: 'Chief of Staff',
    current_company: 'Crest AI', applied_date: '2026-11-11',
    linkedin_url: 'linkedin.com/in/jordan-williams',
    experience: [{
      title: 'Chief of Staff', company: 'Crest AI', period: '2024–2026',
      bullets: [
        'First ops hire at a seed-stage startup; built all internal processes from scratch with no prior playbook',
        'Owned company-wide OKR process from inception, coordinating across all 6 functions',
        'Navigated ambiguous, shifting priorities as the company scaled from 8 to 40 people',
        'Led Series A fundraise operations, coordinating due diligence across legal, finance, and product',
        'Built first vendor management and procurement process from scratch',
      ]
    }],
    education: 'B.A. Political Science, Yale, 2023',
  },
  {
    id: 'applicant_05', first_name: 'Casey', last_name: 'Martinez',
    email: 'casey.martinez@email.com', current_title: 'Sales Development Rep',
    current_company: 'Prism Software', applied_date: '2026-11-12',
    linkedin_url: 'linkedin.com/in/casey-martinez',
    experience: [{
      title: 'Sales Development Rep', company: 'Prism Software', period: '2024–2026',
      bullets: [
        'Managed outreach to 150+ customer accounts per month across enterprise and mid-market segments',
        'Ran pilot program with 5 strategic client accounts in coordination with the AE team',
        'Supported customer success team on escalations and renewal coordination',
        'Built outbound sequence system in Salesforce used by 3 SDRs',
      ]
    }, {
      title: 'Sales Assistant', company: 'Radius Marketing', period: '2022–2024',
      bullets: [
        'Coordinated with clients on campaign deliverables and timelines',
        'Maintained CRM data quality for a 15-person sales team',
      ]
    }],
    education: 'B.B.A. Marketing, Arizona State University, 2022',
  },
  {
    id: 'applicant_06', first_name: 'Riley', last_name: 'Johnson',
    email: 'riley.johnson@email.com', current_title: 'Finance & Ops Manager',
    current_company: 'Veda Health', applied_date: '2026-11-12',
    linkedin_url: 'linkedin.com/in/riley-johnson',
    experience: [{
      title: 'Finance & Ops Manager', company: 'Veda Health', period: '2023–2026',
      bullets: [
        'Built financial model supporting the company\'s Series A raise; owned the data room end to end',
        'Owned vendor management from scratch — built the RFP process, vendor scoring, and renewal workflow',
        'Documented financial workflows and built a finance handbook for the ops team',
        'SQL analysis of unit economics surfaced a 22% margin gap by product line, informing pricing strategy',
        'Coordinated across product, legal, and finance teams on two partnership agreements',
      ]
    }],
    education: 'B.S. Finance, Georgetown, 2023',
  },
  {
    id: 'applicant_07', first_name: 'Sam', last_name: 'Patel',
    email: 'sam.patel@email.com', current_title: 'Operations Analyst',
    current_company: 'Harbor Freight & Logistics', applied_date: '2026-11-13',
    linkedin_url: 'linkedin.com/in/sam-patel',
    experience: [{
      title: 'Operations Analyst', company: 'Harbor Freight & Logistics', period: '2023–2026',
      bullets: [
        'Built SOP library covering 20+ logistics and fulfillment workflows; reduced onboarding time by 50%',
        'Analyzed carrier performance data to redesign routing strategy, cutting avg. transit time by 1.2 days',
        'Coordinated across ops and customer success teams on a new returns process',
        'Documented escalation handbook for a 30-person ops team',
        'Managed relationships with 40+ vendor and carrier accounts',
      ]
    }, {
      title: 'Logistics Coordinator', company: 'Waverly Shipping', period: '2021–2023',
      bullets: [
        'Maintained shipment tracking system and supported customer escalations',
        'Built process documentation for inbound receiving workflow',
      ]
    }],
    education: 'B.S. Supply Chain Management, Ohio State, 2021',
  },
  {
    id: 'applicant_08', first_name: 'Blake', last_name: 'Thompson',
    email: 'blake.thompson@email.com', current_title: 'Customer Success Lead',
    current_company: 'Forge Enterprise', applied_date: '2026-11-13',
    linkedin_url: 'linkedin.com/in/blake-thompson',
    experience: [{
      title: 'Customer Success Lead', company: 'Forge Enterprise', period: '2023–2026',
      bullets: [
        'Managed 40+ enterprise client accounts totaling $8M ARR, maintaining 95% NPS',
        'Ran pilots with 12 strategic B2B accounts, coordinating across legal, product, and support teams',
        'Partnered with product team to build a customer feedback loop, surfacing 3 roadmap changes',
        'Coordinated with vendor partners on integrations and escalation resolution',
        'Built client onboarding system reducing time-to-value from 6 weeks to 2.5 weeks',
      ]
    }],
    education: 'B.A. Psychology, University of Wisconsin, 2022',
  },
  {
    id: 'applicant_09', first_name: 'Avery', last_name: 'Davis',
    email: 'avery.davis@email.com', current_title: 'Analyst',
    current_company: 'Meridian Consulting', applied_date: '2026-11-14',
    linkedin_url: 'linkedin.com/in/avery-davis',
    experience: [{
      title: 'Analyst', company: 'Meridian Consulting', period: '2024–2026',
      bullets: [
        'Built financial models and revenue forecasts for 6 clients in retail and logistics',
        'SQL analysis of customer data for a B2B SaaS client surfaced $3M in upsell opportunities',
        'Coordinated across finance, operations, and HR workstreams for two org-design engagements',
        'Built Tableau dashboard for executive reporting on a supply chain engagement',
        'Partnered with client stakeholders to present findings and drive decisions',
      ]
    }, {
      title: 'Research Associate', company: 'Brightside Analytics', period: '2022–2024',
      bullets: [
        'Analyzed market data and built models for investment screening',
        'Supported cross-functional teams on client deliverables',
      ]
    }],
    education: 'B.A. Economics, Dartmouth, 2022',
  },
  {
    id: 'applicant_10', first_name: 'Quinn', last_name: 'Anderson',
    email: 'quinn.anderson@email.com', current_title: 'Office & People Manager',
    current_company: 'Rove Systems', applied_date: '2026-11-14',
    linkedin_url: 'linkedin.com/in/quinn-anderson',
    experience: [{
      title: 'Office & People Manager', company: 'Rove Systems', period: '2023–2026',
      bullets: [
        'Documented HR onboarding checklist and employee handbook used by 50-person team',
        'Managed vendor relationships for facilities, IT, and office operations',
        'Coordinated with legal and finance teams on benefits renewal and compliance',
        'Built process for tracking and resolving facilities issues',
      ]
    }, {
      title: 'Office Coordinator', company: 'Telepath Inc', period: '2021–2023',
      bullets: [
        'Supported operations and administrative coordination for a 25-person team',
        'Managed vendor accounts for office and event needs',
      ]
    }],
    education: 'B.A. Communications, University of Oregon, 2021',
  },
  {
    id: 'applicant_11', first_name: 'Drew', last_name: 'Wilson',
    email: 'drew.wilson@email.com', current_title: 'Program Manager',
    current_company: 'Catalyst Software', applied_date: '2026-11-15',
    linkedin_url: 'linkedin.com/in/drew-wilson',
    experience: [{
      title: 'Program Manager', company: 'Catalyst Software', period: '2023–2026',
      bullets: [
        'Owned product launch program from scratch at a Series A startup with undefined processes',
        'Coordinated across engineering, marketing, and sales on 4 major launches in 18 months',
        'Navigated ambiguous, shifting priorities; built the planning process from zero as the company scaled',
        'Built project management playbook adopted across 3 product teams',
        'Partnered with finance team on program budgeting and ROI reporting',
      ]
    }],
    education: 'B.S. Computer Science, UCLA, 2023',
  },
  {
    id: 'applicant_12', first_name: 'Peyton', last_name: 'Brown',
    email: 'peyton.brown@email.com', current_title: 'Logistics Coordinator',
    current_company: 'SkyLine Distribution', applied_date: '2026-11-15',
    linkedin_url: 'linkedin.com/in/peyton-brown',
    experience: [{
      title: 'Logistics Coordinator', company: 'SkyLine Distribution', period: '2023–2026',
      bullets: [
        'Documented freight management SOPs and built a standard checklist for carrier onboarding',
        'Coordinated with 50+ carrier and vendor accounts on scheduling, claims, and escalations',
        'Built shipment tracking system reducing manual status updates by 70%',
        'Supported customer escalations in coordination with the support team',
        'Analyzed carrier performance data monthly; shared findings with operations leadership',
      ]
    }],
    education: 'A.S. Business Administration, Valencia College, 2022',
  },
  {
    id: 'applicant_13', first_name: 'Sage', last_name: 'Garcia',
    email: 'sage.garcia@email.com', current_title: 'Growth Analyst',
    current_company: 'Drift Consumer', applied_date: '2026-11-16',
    linkedin_url: 'linkedin.com/in/sage-garcia',
    experience: [{
      title: 'Growth Analyst', company: 'Drift Consumer', period: '2024–2026',
      bullets: [
        'SQL analysis of 2M+ user events to identify activation bottlenecks, improving D7 retention by 18%',
        'Built Tableau dashboards for growth, marketing, and finance teams',
        'Modeled retention and revenue forecast adopted by the CFO for Series A materials',
        'First analytics hire at this seed-stage startup; built the data infrastructure from scratch',
        'Partnered with product team on experimentation framework and A/B test analysis',
      ]
    }],
    education: 'B.S. Applied Mathematics, UC Berkeley, 2024',
  },
  {
    id: 'applicant_14', first_name: 'Cameron', last_name: 'Lee',
    email: 'cameron.lee@email.com', current_title: 'Operations Manager',
    current_company: 'Nori Marketplace', applied_date: '2026-11-17',
    linkedin_url: 'linkedin.com/in/cameron-lee',
    experience: [{
      title: 'Operations Manager', company: 'Nori Marketplace', period: '2023–2026',
      bullets: [
        'Owned operations function end to end as the company scaled from 15 to 60 people over 18 months',
        'Built company\'s first vendor management system from scratch; now handles $5M in annual spend',
        'Ran quarterly business reviews with CEO and board, owning all ops metrics and reporting',
        'Navigated ambiguous, shifting priorities through two funding rounds at a Series A startup',
        'Documented all operational workflows; built a playbook that onboarded 3 new ops hires',
      ]
    }],
    education: 'B.A. Economics, University of Chicago, 2023',
  },
  {
    id: 'applicant_15', first_name: 'Alexis', last_name: 'White',
    email: 'alexis.white@email.com', current_title: 'Revenue Operations Manager',
    current_company: 'Polaris SaaS', applied_date: '2026-11-18',
    linkedin_url: 'linkedin.com/in/alexis-white',
    experience: [{
      title: 'Revenue Operations Manager', company: 'Polaris SaaS', period: '2023–2026',
      bullets: [
        'Built CRM system and revenue forecast model; reduced sales cycle visibility gaps by 60%',
        'SQL analysis of sales pipeline data to surface conversion bottlenecks across 3 segments',
        'Coordinated across sales, finance, and product teams on annual planning and territory design',
        'Documented RevOps playbook and process handbook for a team of 3 AEs and 2 SDRs',
        'Built dashboard for executive reporting on pipeline health and forecast accuracy',
      ]
    }],
    education: 'B.B.A. Information Systems, Indiana University, 2023',
  },
]

function generatePDF(applicant) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'LETTER' })
    const chunks = []
    doc.on('data', (chunk) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    // Name header
    doc.fontSize(18).font('Helvetica-Bold')
      .text(`${applicant.first_name} ${applicant.last_name}`, { align: 'center' })
    doc.fontSize(10).font('Helvetica')
      .text(`${applicant.email}  |  ${applicant.linkedin_url}`, { align: 'center' })
    doc.moveDown(1.5)

    // Experience section
    doc.fontSize(13).font('Helvetica-Bold').text('EXPERIENCE')
    doc.moveTo(50, doc.y).lineTo(560, doc.y).stroke()
    doc.moveDown(0.5)

    for (const job of applicant.experience) {
      doc.fontSize(11).font('Helvetica-Bold').text(`${job.title}`)
      doc.fontSize(10).font('Helvetica').fillColor('#555555')
        .text(`${job.company}  ·  ${job.period}`)
      doc.fillColor('#000000').moveDown(0.3)
      for (const bullet of job.bullets) {
        doc.fontSize(10).font('Helvetica')
          .text(`•  ${bullet}`, { indent: 15, lineGap: 2 })
      }
      doc.moveDown(0.8)
    }

    // Education section
    doc.fontSize(13).font('Helvetica-Bold').text('EDUCATION')
    doc.moveTo(50, doc.y).lineTo(560, doc.y).stroke()
    doc.moveDown(0.3)
    doc.fontSize(10).font('Helvetica').text(applicant.education)

    doc.end()
  })
}

async function main() {
  const outDir = resolve(ROOT, 'public', 'sample-import', 'resumes')
  mkdirSync(outDir, { recursive: true })

  // Build CSV
  const csvHeader = 'first_name,last_name,email,current_title,current_company,applied_date,linkedin_url,resume_file\n'
  const csvRows = APPLICANTS.map(a =>
    `${a.first_name},${a.last_name},${a.email},"${a.current_title}","${a.current_company}",${a.applied_date},${a.linkedin_url},${a.id}.pdf`
  ).join('\n')
  const csvContent = csvHeader + csvRows
  writeFileSync(resolve(ROOT, 'public', 'sample-import', 'applicants.csv'), csvContent)
  console.log('  Wrote applicants.csv')

  // Generate PDFs
  const pdfBuffers = {}
  for (const applicant of APPLICANTS) {
    const buf = await generatePDF(applicant)
    const outPath = resolve(outDir, `${applicant.id}.pdf`)
    writeFileSync(outPath, buf)
    pdfBuffers[applicant.id] = buf
    console.log(`  Wrote ${applicant.id}.pdf`)
  }

  // Build zip
  const zip = new JSZip()
  zip.file('applicants.csv', csvContent)
  const resumesFolder = zip.folder('resumes')
  for (const [id, buf] of Object.entries(pdfBuffers)) {
    resumesFolder.file(`${id}.pdf`, buf)
  }
  const zipBuf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
  writeFileSync(resolve(ROOT, 'public', 'vittacus_bizops_applicants_export.zip'), zipBuf)
  console.log('  Wrote vittacus_bizops_applicants_export.zip')
  console.log('Done.')
}

main().catch(err => { console.error(err); process.exit(1) })

# Pathline

**Live demo:** https://pathline-sigma.vercel.app

Pathline is a recruiter-side tool for startup hiring teams. It sorts applicants into clear buckets based on evidence of what they've actually done (not keywords), helps recruiters reach a qualified shortlist faster, and makes sure every applicant gets an honest answer.

Built as a clickable prototype for the Nectar Social APM take-home.

## The flow

**Home → 1 Role Setup → 2 Calibrate → 3 Review → 4 Invite → 5 Close**

- **Role Setup:** import a job post, set salary, stages, a response commitment and blind screening. Applicants arrive through a Pathline apply link or an imported ATS export.
- **Calibrate:** approve traits pulled from the job description, tune them from your best hires, approve 2 optional application questions.
- **Review:** applicants sorted into Priority, Strong match, Worth reviewing and Not now, with evidence for every placement and one-click side-by-side comparison.
- **Invite:** a personal, transparent intro email (the moment of connection).
- **Close:** honest notes for everyone not moving forward. Pathline never auto-rejects.

## Trying the demo

- All data is fictional sample data. **Reset demo** (top right) restores the starting state.
- To try importing: Role Setup → Import → **Download sample export** (a CSV plus 15 fictional PDF resumes), then upload it.

## Docs

- [PRD.md](./PRD.md): problem, hypothesis, decisions, metrics and what I deliberately didn't build
- [PROMPT_LOG.md](./PROMPT_LOG.md): how I built this with AI, including where I pushed back on the model

## Run locally

```bash
npm install
npm run dev
```

Stack: Next.js 16, TypeScript, Tailwind, Framer Motion. No backend; state lives in the browser.

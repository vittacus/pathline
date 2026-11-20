# Prompt Log

Every prompt I gave Claude Code to build Pathline, in order and verbatim.

## 1. Build plan from the PRD

```
Read PRD.md and AGENTS.md in this project. I'm building a clickable prototype of Pathline, a recruiter-side hiring tool, for a demo. I have about 3 hours total, so scope matters.

Before writing any code, give me a build plan:

1. Screens and routes: the pages in the Next.js App Router, matching the Core Flow in the PRD (role setup and calibration, "what good looks like", ranked queue, split-screen moment of connection, closure).
2. Data model: the shape of the mock JSON for the role, traits, candidates (with evidence items labeled by source: resume or proof answer), and outreach messages.
3. Scoring logic: how match scores are computed from trait weights, and how "More like this" / "Less like this" adjust weights and re-rank.
4. Design system: a color palette with one confident accent color, typography, spacing, and the core reusable components (card, chip, button, score badge, evidence card). It should look like a polished, funded early-stage SaaS product: calm, light background, generous spacing, rounded cards, soft shadows. Not a chart-heavy dashboard.
5. Build order: the sequence that gets a working end-to-end flow first, then polish. Prioritize the ranked queue and the split-screen moment of connection, since those are the centerpiece of the demo.

Constraints:
- Next.js App Router with TypeScript and Tailwind. No backend, no real auth, no live AI calls. All data is local JSON, and "AI" outputs are pre-written in the mock data.
- Keep dependencies minimal. Framer Motion for the re-rank animation and lucide-react for icons are fine.
- Show a visible "Sample data" label.

Ask me any questions that would change the plan before we start building.
```

## 2. Continue after an accidental rejection

```
Sorry, I rejected the tsconfig change by accident. Go ahead with it (point @/* to ./src/*) and continue the build from where you left off.
```

## 3. Prioritized polish pass after reviewing every screen

```
I reviewed every screen. Here's a prioritized polish pass. Plan it briefly, then build in this order. If time runs short, finish Priority 1 and 2 fully before 3.

PRIORITY 1: QUEUE REDESIGN (centerpiece)
- Switch from big stacked cards to a master-detail layout. Left: a compact, scannable list (one row per candidate: rank, score badge, headline, 1-2 why-surfaced tags, source badge "Proof answers" or "Resume only"). Right: a detail panel for the selected candidate with summary, all evidence cards (labeled by source), and actions.
- In the detail panel, make Shortlist / Not now primary, and More like this / Less like this large and clearly visible, since they're the learning loop.
- Fix: "Less like this" must use its own negative reasons: "Not enough ops depth", "Evidence too thin", "Too senior or too junior", "Missing data skills", "Other". "More like this" keeps the positive ones.
- Keyboard shortcuts: up/down arrows to move, S = shortlist, X = not now. Show a small hint.
- After an action, auto-select the next candidate. Re-rank animation still applies after nudges.

PRIORITY 2: CONSISTENCY + OUTREACH + CLOSURE
- Single source of truth: all counts (applicants, shortlisted, sent, heard back, not moving forward) and all match scores come from the same state, so every screen agrees. Scores shown in outreach must match the queue.
- Outreach: add "To send" and "Sent" tabs. Sending one moves it to Sent and auto-opens the next. In the list, replace the match score with the candidate's top why-shortlisted tag. Style the composer like an email (To, Subject line, normal sans-serif font, not monospace). Fix the status tracker on the right being cut off (all stages must fit or wrap). Add a small label "Names revealed after shortlisting" to show the bias protection is deliberate.
- Closure: split recipients into two groups: "Reviewed, not moving forward" (marked Not now) and "Below shortlist, not individually reviewed". The second group needs an explicit checkbox confirmation ("I've reviewed the threshold and approve sending") and a "Spot-check 10 random applicants" button that opens a short list. For each previewed applicant show applied date, last contact, and days left on the 7-day promise.

PRIORITY 3: ROLE SETUP + CALIBRATION
- Role switcher: the "Vittacus · BizOps Associate" chip becomes a dropdown listing 3 roles with applicant counts (BizOps Associate 487, Sales Development Rep 312, Customer Success Manager 198). Only BizOps is live; others show "Sample only".
- Role Setup: add an "Import job post" option at the top (paste a LinkedIn URL or drop a file) that shows a short loading state and fills in all fields. Process stages get up/down arrows to reorder. Move the public job post preview here as a final "Review & publish" section.
- Calibration: two-column layout to cut scrolling. Left: example profiles or manual setup. Right (sticky): trait weights, sorted by weight automatically. Add a live "impact preview" under the traits: "With these weights: ~X of 487 strong matches" plus the top 3 candidates' headlines, updating as weights change. Proof prompts: inline edit needs Save and Cancel.

Keep the existing design system. Don't add new dependencies beyond what's installed.
```

## 4. Rename terminology

```
Rename terminology everywhere in the UI: "proof prompts" → "Application questions", "proof answers" → "Short answers". Queue badge: "Answered questions" vs "Resume only". Evidence source labels: "Short answer" vs "Resume". Also update PRD.md to use the same terms.
```

## 5. Polish pass: Home dashboard, calibration from the job description, import

```
Final polish pass. Plan briefly, then build in priority order. Finish P1 before P2, P2 before P3.

P1: HOME DASHBOARD (new entry page at "/", replaces the redirect)
- Greeting: "Good morning, Sarah" + today's date.
- Card for the active role (BizOps Associate): "32 to review today", "6 invites ready to send", "4 days left on the 7-day promise", with buttons that jump to Queue / Outreach / Closure.
- Impact funnel, live from shared state: 487 applicants → 32 ranked for review → shortlisted/invited count → closed with a real answer. Plus "~X recruiter hours saved this week" (assume ~2 min saved per applicant not manually screened).
- Smaller cards for the 2 other roles (Sample only).
- Add "Home" to the top nav, first position.

P1: CALIBRATION REWORK (make traits clearly come from the role)
- Remove the "Use example profiles / Set manually" tabs. Layout: left column has "1. Traits from your job description" then "2. Tune with examples (optional)" then "3. Application questions". Right column (sticky): live impact preview (keep it, it's good).
- Each trait is a card showing the quoted line from the job description it came from (e.g. "'You'll own vendor and ops processes end to end'" → Owns messy problems end to end), plus its Low/Medium/High weight. Add "+ Add trait", and allow removing or renaming a trait.
- Tune with examples: a drop zone "Drop resumes or LinkedIn profiles of people who'd be great in this role — like your best current hire" (any dropped file triggers the simulation), with a link "Or try 3 sample profiles". After analysis, show what changed, ex "Your examples raised Data and analytical fluency from Medium → High", and highlight the changed traits briefly.
- Application questions are generated from the top 2 traits and say so ("Based on: Owns messy problems, Data fluency"). Edit has Save/Cancel.

P1: ROLE SETUP IMPORT
- "Import from a job post": a URL field ("Paste a LinkedIn or job board link") AND a file drop zone ("Have a file? Drop a PDF or DOCX"). Either triggers ~1.5s loading, then fills all fields with a short highlight animation. Show a small "Simulated in this demo" note.
- Add a "Job description" textarea (prefilled with a realistic ~150-word BizOps Associate description at Vittacus). The calibration trait quotes must come from this text.

P2: QUEUE
- Multi-select: a checkbox on each row, shift-click to select a range, and a bulk action bar ("3 selected · Shortlist · Pass").
- Rename "Not now" to "Pass" everywhere (queue, closure labels, keyboard hint: P = pass).
- Insights must be dynamic: generate them from the reasons the recruiter actually picked and the trait weights that changed. Keep a collapsible "What Pathline has learned" list in the queue sidebar, newest first, e.g. "You chose 'Great short answers' 3× — raised Owns messy problems to High."

P2: OUTREACH
- "Edit template" applies to all invites. Use merge fields {first_name}, {role}, {personal_line}, {booking_link}. Booking link is set once (e.g. cal.com/sarah-vittacus/intro) and fills every email.
- Rewrite the pre-written personal lines so they sound human and varied. Don't start them all the same way, and avoid "stood out to us" repeating. Keep each one specific to that candidate's evidence.
- Label the right panel "What Priya receives: email + status page".

Keep the design system and existing behavior. Keep all counts consistent from shared state. Rename any remaining "Not now" in PRD.md to "Pass".
```

## 6. Bug-fix and refinement pass

```
Bug-fix and refinement pass. No new screens.

BUGS
1. Bulk actions: selecting multiple candidates and clicking Pass (or Shortlist) must apply to ALL selected, not just one. Clear the selection after.
2. Application questions must regenerate whenever trait weights change. Always base them on the current top 2 weighted traits. Use a small pre-written question bank (1-2 questions per trait, including any added custom trait via a generic template), and update the "Based on:" chips.
3. Job post preview must show process stages in the same order as the Role Setup list.
4. "Tune with examples": after analysis, clearly show what changed (ex: "Raised Data and analytical fluency: Medium → High") and briefly highlight those trait cards.

CANDIDATE VIEW (outreach right panel)
5. Remove the match score. It's internal to the recruiter.
6. Remove the "Why you were shortlisted" chips. The personal line in the email carries the why.

RESPONSE COMMITMENT (replace the single 7-day countdown)
7. Each applicant has their own clock from their applied date (add appliedDate to mock data, spread over the last 10 days). Commitment is set by the company (default 7 days).
8. Home: replace "7 days left on 7-day promise" with "X applicants reach 7 days in the next 48 hours" and a "Responds within 7 days: 96%" track-record stat.
9. Job post preview: replace "Every applicant hears back within 7 days" with "This team responds to 96% of applicants within 7 days".
10. Closure: show each previewed applicant's days waiting, and add a "Send 'still reviewing' update" option for applicants near their deadline with no decision (a status update, not a rejection).

SMALL
11. Replace "JD" with "job description" everywhere in the UI.
12. Queue: make row checkboxes always visible and add "Select all on screen".

Update PRD.md: replace the "7-day response promise" with a company-set response commitment, measured per applicant and shown publicly as a track record. Keep everything else consistent.
```

## 7. Clarity pass: a first-time recruiter understands the workflow

```
Final UX clarity pass. Goal: a first-time recruiter understands the workflow without explanation. No new screens.

WORKFLOW
1. Top nav becomes numbered steps: 1 Role Setup → 2 Calibrate → 3 Review → 4 Invite → 5 Close (Home stays separate). Show a check on completed steps. Every page ends with a clear primary "Next: <step> →" button.

ROLE SETUP
2. Import actually works (simulated): clicking Import or dropping a file shows "Reading job post…" for ~1s, then fills title, team, location, salary, job description and stages with a different sample role, briefly highlights each changed field, and shows a toast "Filled 6 fields from job post. Review below."
3. Add "Response commitment" select (5/7/10/14 days, default 7) with helper text "Every applicant hears back within this window. Pathline tracks it for you." Store in context; Home, job post preview, queue and Closure all read this value instead of hardcoded 7.
4. Add "Blind screening" toggle (default on) with helper "Names hidden during review, revealed after shortlisting."

CALIBRATE
5. Each suggested trait has a state: Suggested → Approved. Add Approve button per trait plus "Approve all". Show "4 of 6 traits approved" at top. Live impact preview recomputes instantly on every weight change or approval. "Strong matches" count must be ≤ the ranked count shown on Home.
6. Rename "Tune with examples" to "Learn from your best hires". Copy: "Add 3 people you'd hire again, like a top current employee. Pathline finds what they have in common and suggests weight changes. You approve each one." Sample profiles labeled "Example: your 3 best hires". After Analyze, show each proposed change ONCE with reason ("All 3 profiles show this") and Accept / Skip buttons; weights change only on Accept. Fix bug: duplicates and wrong arrow directions (↑ for increase, ↓ for decrease).
7. Application questions: keep approve, simplify to question + Approve/Edit, smaller "Based on" tag.

REVIEW (queue)
8. Replace "Why surfaced" chips with "Why #1": one plain-English sentence plus a score breakdown, a small bar per trait showing its contribution to the score (e.g., Owns messy problems +24). Each evidence card is tagged with the trait it supports.
9. If blind screening is on, replace the Names hidden toggle with a lock badge "Names hidden until shortlist" (not clickable).

INVITE (outreach)
10. Remove the "What Priya receives: email + status page" panel and the status timeline. Right side becomes "Preview" showing exactly the email Priya gets, plus one line "Track your application status →".
11. Make the email editable inline (click to edit). "Edit template" becomes a visible secondary button next to Send with an icon, labeled "Edit template for all invites".

CLOSE
12. Home: the yellow deadline card is clickable, leads to Close, and reads "85 applicants reach your 7-day commitment in 48h → Send updates". Close page header shows the commitment and how many are at risk.

Update PRD.md to reflect: editable response commitment, blind screening as a role setting, outreach = intro email only, approve-first calibration.
```

## 8. Polish pass: navigation, consistent counts, optional-question fairness, honest closure

```
Final polish pass. No new screens. Keep all existing behavior.

NAV
1. Pathline logo links to Home. Add a small "Home" link left of step 1.
2. Step indicators: incomplete steps show a plain gray number (not a badge style); completed steps show a check. Add a real count badge on Invite showing invites ready to send, updating live when candidates are shortlisted.

DATA CONSISTENCY
3. One source of truth in DemoContext: shortlisted count, invites to send, closed, and not-moving-forward counts must match on Home, Review, Invite and Close at all times. Shortlisting in Review updates all of them.

REVIEW
4. Rename "Why surfaced" to "Why ranked here". Keep the one-sentence explanation visible. Put the per-trait score bars behind a "Show score breakdown" toggle, collapsed by default.
5. Ranking mix: at least one "Resume only" candidate in the top 3 (ex. #2 or #3), so answering questions is visibly not required to rank highly.

APPLICATION QUESTIONS
6. In Calibrate under Application questions, add helper text: "Optional for applicants. Answers count as evidence for the same traits as a resume, never as a bonus for answering."
7. In the job post preview, label the questions "Optional (about 5 min). You won't be penalized for skipping."

INVITE
8. Add a subject line to the composer and the preview: "Business Operations Associate at Vittacus: let's talk".

CLOSE
9. Two closure note templates: (a) Reviewed — current text. (b) Not individually reviewed — honest text, ex "We received 487 applications and prioritized those most closely matching the role's requirements. We weren't able to move forward with yours this time..." Never claim individual review for group (b). Show which template each section uses.
10. Remove the duplicate "73 applicants" warning at the top; keep the one in the not-individually-reviewed section.

Update PRD.md: two closure templates (honesty), optional questions fairness rule.
```

## 9. Make applicant intake obvious

```
Small clarity pass: make applicant intake obvious. No new screens.

1. Role Setup: add an "Applicant sources" section after process stages.
   - "Post anywhere. Applicants come to Pathline." 
   - Source rows with status: LinkedIn Jobs (Apply link → Pathline, Connected), Indeed (Apply link → Pathline, Connected), Handshake (Apply link → Pathline, Connected), Careers page (Connected), Import from Greenhouse / Lever / CSV (button, simulated).
   - Show the role's Pathline apply link (pathline.app/apply/vittacus-bizops) with a Copy button and helper text: "Use this as the Apply link on every job board."
2. Home: add a slim "How Pathline works" strip at the top for first-time users: "1 Post anywhere → 2 Applicants apply through Pathline or get imported → 3 Pathline ranks on evidence → 4 You invite and close the loop." Dismissible.
3. Home: under the impact funnel, show "Where applicants came from": LinkedIn 268 · Indeed 104 · Handshake 61 · Careers page 31 · Imported 23 (must total 487, read from DemoContext).
4. Review: each candidate shows a small source tag (e.g., "via LinkedIn", "Imported") next to the Answered questions / Resume only label. Imported candidates are always Resume only.
5. Update PRD.md Core Flow with the two intake paths: Apply link routes to Pathline (main path); imports via ATS or CSV export (resume evidence only).
```

## 10. Import from raw resumes (CSV + PDF export)

```
Make applicant import real, from raw resumes. Client-side only.

Sample files: unzip vittacus_bizops_applicants_export.zip into public/sample-import/ (applicants.csv + resumes/*.pdf), and also copy the zip to public/.

1. Import modal (from Role Setup sources and Review "Import"): accepts a .zip (CSV + resumes folder), or a CSV plus PDFs dropped together. Include "Download sample export" linking to /vittacus_bizops_applicants_export.zip.
2. Read the zip with jszip and the CSV with papaparse. Show a mapping preview: detected columns → Pathline fields, first 3 rows, and "15 resumes matched to 15 applicants". Button: "Import 15 applicants".
3. Processing view (~3s total, staged): "Reading 15 resumes…" → "Extracting evidence…" → "Scoring against your calibration…". Extract text from each PDF with pdfjs-dist (set the worker src correctly for Next.js). Split the Experience section into bullet lines.
4. Turn bullets into evidence cards with a keyword heuristic per trait:
   owns messy problems: built|owned|ran|first|from scratch|end to end
   data fluency: SQL|Python|dashboard|model|analysis|forecast|Tableau
   builds systems: process|playbook|handbook|checklist|documented|system
   cross-functional: teams|partnered|coordinated|across|with product|finance
   ambiguity/startup pace: seed|startup|founder|first .* hire|no recruiter|Series A
   customer/operator exposure: customer|client|accounts|vendor|support|pilots
   Trait strength = matched bullets weighted by strong verbs; keep the top 3–4 bullets as evidence, each tagged with its trait and labeled "Resume".
5. Imported candidates: source "Imported (Greenhouse)", "Resume only", applied_date from CSV (feeds response commitment), names hidden under blind screening, headline from current_title + current_company.
6. Candidate detail gets a "View original resume" button that opens the actual PDF (object URL from the zip) in a side panel or new tab. Add this for imported candidates; for existing sample candidates, show "Resume not available in sample data".
7. Score with current weights, merge, re-rank with animation. Toast: "Imported 15 applicants · 3 entered your top 40". All counts update via DemoContext. Reset demo removes imports.
8. Fallback: if PDF parsing fails for any file, show "Couldn't read 1 resume" and skip it. Never crash the demo.
```

## 11. Buckets instead of a ranked list, plus side-by-side compare

```
Restructure Review from a ranked list into buckets + side-by-side compare. Keep scoring logic, evidence cards, blind screening and all existing data.

BUCKETS
1. Replace the numbered ranked list with bucket tabs at the top of Review, each with a count:
   Priority (recruiter-flagged) · Strong match · Worth reviewing · Not now · Shortlist
   Pathline auto-places the 40 candidates: score ≥ 72 → Strong match, else Worth reviewing. Priority, Not now and Shortlist start empty (or a few seeded) and are filled by the recruiter.
2. Remove rank numbers (#1, #2) and the big score circle from list rows. Rows show headline, "Answered questions"/"Resume only", source tag and top 2 trait tags. Within a bucket, order by evidence strength without showing numbers.
3. Detail panel: "Why in this bucket" (one sentence), evidence cards tagged by trait + source, score breakdown behind "Show breakdown" toggle (score only appears there).
4. Actions: Add to shortlist (primary), Move to… (Priority / Strong match / Worth reviewing / Not now), Pass, More like this, Less like this. Keyboard: S shortlist, 1-4 move to bucket, P pass. Multi-select works within a bucket for bulk move/shortlist.
5. More/Less like this: recalculate; if a candidate changes bucket, animate and toast "Moved 3 candidates from Worth reviewing to Strong match because you weighted X higher." Never move candidates the recruiter placed manually.

COMPARE
6. Select 2-3 candidates (checkboxes) → "Compare (3)" button appears. Opens a side-by-side view: one column per candidate (header: headline, bucket, Answered/Resume only), one row per trait showing strength (Low/Med/High dots) and their single strongest evidence quote for that trait. Highlight the strongest candidate per row subtly. Each column has Add to shortlist and Move to… buttons. Close returns to the bucket.

HOME + METRICS
7. Home funnel: Applied → Sorted → Shortlisted → Interviewed → Closed. Add a "Shortlist quality" card: "7 of 10 shortlisted passed the intro call (70%)" with helper text "How well Pathline's evaluation holds up in real interviews." Seed sample data so this is consistent.
8. "Top candidates waiting" on Home becomes "Priority & strong matches" showing bucket counts and 3 candidates, no rank numbers.
9. All counts (bucket counts, shortlist, Invite badge, Close numbers) read from DemoContext and always match. Shortlist bucket feeds Invite.

Update PRD.md to match: buckets instead of ranking, compare view, main metric = shortlist pass-through rate, efficiency metric = time to qualified shortlist.
```

## 12. Fix and simplify compare

```
Fix and simplify Compare in Review.

BUGS
1. Blind screening: compare view must show initials + headline only (no names) when blind screening is on, same as the list. Names appear only after shortlisting.
2. Remove "Score 77" from compare headers. Scores only appear behind "Show breakdown".
3. Bucket placement: recalculate on load. Score ≥ 72 → Strong match, else Worth reviewing (manual placements stay). Strong match should have roughly 8–12 candidates in the seed data.
4. Every compare cell shows one evidence quote for that trait (or "No evidence found" in gray), never just a strength label.

SIMPLER COMPARE
5. Add a "Compare top 3" button in each bucket header; one click opens compare with the first 3 in that bucket.
6. Candidate detail panel: add "Compare with next" button (this candidate + next in bucket).
7. In compare, each column header has a small swap dropdown to replace that candidate with another from the same bucket.
8. Keep checkbox selection for bulk actions, but move "Compare (n)" into the bulk action bar so the top bar isn't crowded.

MAKE DIFFERENCES OBVIOUS
9. Sort trait rows so rows where candidates differ come first, under a "Where they differ" label; rows where all are equal collapse under "Similar on 3 traits" (expandable).
10. Highlight the strongest cell per differing row with a light indigo background.
11. Each column footer: Shortlist (primary) + Move to… + Not now.
```

## 13. Make the intake section self-explanatory

```
Rework the "Applicant intake" section in Role Setup to be self-explanatory. No new screens.

1. Replace the header with "How applicants get to Pathline" and two cards side by side:
   Card A "New applicants: use your apply link" — 3 numbered steps:
     1. Post the job where you already do (LinkedIn, Indeed, Handshake, careers page)
     2. Paste this link as the job's Apply link → [pathline.app/apply/vittacus-bizops] [Copy]
     3. Applicants apply here and appear in Review automatically
   Card B "Already have applicants? Import them" — "Export from Greenhouse, Lever or a job board and upload the file. Pathline reads the resumes and sorts them with everyone else." [Import] [Download sample export]
2. Below Card A, show the job boards as a compact checklist, not "Connected": "LinkedIn ✓ link added · Indeed ✓ link added · Handshake ✓ link added · Careers page ✓ link added", with helper text "Marked when you've added the apply link to that post."
3. Add a "Preview application page" link that opens a simple candidate-facing page: role title, salary, resume upload, the 2 optional questions labeled "Optional (about 5 min). You won't be penalized for skipping," and the response commitment.
```

## 14. Improve the response commitment

```
Improve the Response commitment control in Role Setup. No new screens.

1. Helper text: "Every applicant hears back within [N] days — a decision, or an honest update if you're still reviewing."
2. Keep presets 5 / 7 / 10 / 14 days and add "Custom" (number input, 3–30 days).
3. Small hint under presets: "Suggested: 7 days for ~500 applicants and 1 recruiter."
4. Toggle (on by default): "Auto-send a 'still reviewing' update at the deadline — never a rejection." Expandable preview: "Hi [Name], we're still reviewing applications for the Business Operations Associate role and expect to update you by [date]. Thanks for your patience. — Vittacus"
5. Line showing candidate view: "On your job post: 'Vittacus responds to applicants within [N] days.'" Updates live with N.
6. Close page: show "12 applicants will get an automatic 'still reviewing' update tomorrow" when the toggle is on. All counts from DemoContext.
```

## 15. Import feedback: show where imported applicants went

```
Small fix for import feedback. No new screens.

1. Replace the word "queue" everywhere in UI copy with "Review" (toasts, buttons, empty states).
2. After import, the toast says: "Imported 15 applicants · 4 in Strong match, 11 in Worth reviewing" with a "View imported" button.
3. "View imported" opens Review on the Strong match tab with a filter chip "Imported (15) ×" applied, showing only imported candidates across buckets. Clicking × clears the filter.
4. Imported candidates get a small "New" badge for the session, and bucket tabs show "+4 new" / "+11 new" next to the count until viewed.
```

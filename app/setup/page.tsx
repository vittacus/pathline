"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Plus, X, ChevronUp, ChevronDown, Link as LinkIcon, FileUp, Loader2, Eye, EyeOff, Upload } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import { useDemo } from "@/context/DemoContext"
import { useToast } from "@/components/ui/Toast"
import { ImportModal } from "@/components/ImportModal"

const DEFAULT_STAGES = ["Intro Call", "Case Study", "Final Round", "Offer"]

const SIMULATED_JD = `Vittacus is a Series A company (60 people) building the operating layer for distributed teams. We're hiring a Business Operations Associate to help us scale our internal systems, support cross-functional planning, and own messy problems that don't have a clear owner yet.

You'll work directly with our Head of Operations on everything from vendor management to quarterly planning to ad-hoc analyses that influence company strategy. The right person is comfortable going from zero context to owning a workstream in under a week, can build a process and document it clearly, and doesn't wait to be told what to do.

What we're looking for: demonstrated ownership of ambiguous, end-to-end problems; comfort with data and light analytics (SQL a plus, not required); strong cross-functional communication; experience building systems and processes that others rely on; and ideally some customer or operator exposure.`

// A clearly different role so the import demo shows real field changes
const IMPORT_SAMPLE = {
  title: "Sales Development Rep",
  team: "Sales",
  location: "New York, NY (Remote)",
  salaryMin: "55000",
  salaryMax: "75000",
  stages: ["Phone Screen", "Skills Assessment", "Offer"],
  jobDescription: `Vittacus is building its outbound sales motion and looking for hungry SDRs to join the founding sales team. You'll prospect into mid-market accounts, run high-volume outbound sequences, and book qualified meetings for our AEs.

We're looking for someone who can learn fast, handle rejection, and obsess over pipeline quality over pipeline quantity. Strong written communication is a must — you'll be sending personalized outreach at scale. Prior SDR experience a plus but not required; coachability and grit matter more.`,
}

type ImportState = "idle" | "loading" | "done"

const COMMITMENT_OPTIONS = [
  { days: 5, label: "5 days" },
  { days: 7, label: "7 days" },
  { days: 10, label: "10 days" },
  { days: 14, label: "14 days" },
]

export default function SetupPage() {
  const router = useRouter()
  const { responseCommitment, setResponseCommitment, blindScreening, setBlindScreening, advanceStep } = useDemo()
  const { toast } = useToast()
  const [title, setTitle] = useState("Business Operations Associate")
  const [team, setTeam] = useState("Operations")
  const [location, setLocation] = useState("San Francisco, CA (Hybrid)")
  const [salaryMin, setSalaryMin] = useState("85000")
  const [salaryMax, setSalaryMax] = useState("115000")
  const [jobDescription, setJobDescription] = useState(SIMULATED_JD)
  const [stages, setStages] = useState(DEFAULT_STAGES)
  const [newStage, setNewStage] = useState("")
  const [importUrl, setImportUrl] = useState("")
  const [importState, setImportState] = useState<ImportState>("idle")
  const [highlightedFields, setHighlightedFields] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [showAppPreview, setShowAppPreview] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const addStage = () => {
    if (newStage.trim()) {
      setStages((s) => [...s, newStage.trim()])
      setNewStage("")
    }
  }

  const removeStage = (i: number) => setStages((s) => s.filter((_, j) => j !== i))

  const moveStage = (i: number, dir: "up" | "down") => {
    setStages((s) => {
      const next = [...s]
      const target = dir === "up" ? i - 1 : i + 1
      if (target < 0 || target >= next.length) return s
      ;[next[i], next[target]] = [next[target], next[i]]
      return next
    })
  }

  const runImport = () => {
    setImportState("loading")
    setTimeout(() => {
      setImportState("done")
      setTitle(IMPORT_SAMPLE.title)
      setTeam(IMPORT_SAMPLE.team)
      setLocation(IMPORT_SAMPLE.location)
      setSalaryMin(IMPORT_SAMPLE.salaryMin)
      setSalaryMax(IMPORT_SAMPLE.salaryMax)
      setJobDescription(IMPORT_SAMPLE.jobDescription)
      setStages(IMPORT_SAMPLE.stages)
      setHighlightedFields(true)
      toast("Filled 6 fields from job post. Review below.")
      setTimeout(() => setHighlightedFields(false), 2000)
    }, 1200)
  }

  const handleImport = () => {
    if (!importUrl.trim()) return
    runImport()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    runImport()
  }

  const highlightClass = highlightedFields
    ? "ring-2 ring-accent/40 bg-accent-light/20 transition-all"
    : ""

  const inputClass = `w-full px-3.5 py-2.5 rounded-xl border border-border bg-bg text-text text-sm focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20`

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-text tracking-tight">Create a role</h1>
        <p className="text-muted text-sm mt-1">
          Basic details about the role. You&apos;ll calibrate what good looks like in the next step.
        </p>
      </div>

      {/* Import job post */}
      <Card className="mb-5">
        <h3 className="text-sm font-semibold text-text mb-1">Import from a job post</h3>
        <p className="text-xs text-muted mb-3">
          Paste a URL or drop a file — Pathline fills in the fields.
        </p>

        {/* URL input row */}
        <div className="flex gap-2 mb-3">
          <div className="flex-1 relative">
            <LinkIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="https://linkedin.com/jobs/view/..."
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleImport()}
              className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-border bg-bg text-text text-sm focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 placeholder:text-muted/50"
            />
          </div>
          <Button
            variant="secondary"
            size="md"
            onClick={handleImport}
            disabled={importState === "loading" || !importUrl.trim()}
          >
            {importState === "loading" ? (
              <><Loader2 size={14} className="animate-spin" /> Reading job post…</>
            ) : (
              <><FileUp size={14} /> Import</>
            )}
          </Button>
        </div>

        {/* File drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed transition-colors cursor-pointer ${
            isDragging
              ? "border-accent bg-accent-light"
              : "border-border hover:border-accent/40 hover:bg-bg"
          }`}
        >
          <Upload size={16} className="text-muted" />
          <p className="text-xs text-muted text-center">
            Drop a PDF or Word doc, or <span className="text-accent font-medium">browse</span>
          </p>
          <input ref={fileRef} type="file" className="hidden" onChange={() => runImport()} />
        </div>

        {importState === "done" && (
          <div className="mt-2.5 flex items-center gap-2">
            <p className="text-xs text-emerald-700 font-medium">✓ Fields filled from job post</p>
            <span className="text-xs text-muted">· Simulated in this demo</span>
          </div>
        )}
      </Card>

      {/* Role details */}
      <Card className="mb-5">
        <div className="flex flex-col gap-5">
          <div>
            <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">
              Role title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`${inputClass} ${highlightedFields ? highlightClass : ""}`}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">
                Team
              </label>
              <input
                type="text"
                value={team}
                onChange={(e) => setTeam(e.target.value)}
                className={`${inputClass} ${highlightedFields ? highlightClass : ""}`}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">
                Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className={`${inputClass} ${highlightedFields ? highlightClass : ""}`}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">
              Salary range (USD)
            </label>
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted text-sm">$</span>
                <input
                  type="text"
                  value={salaryMin}
                  onChange={(e) => setSalaryMin(e.target.value)}
                  className={`w-full pl-7 pr-3.5 py-2.5 rounded-xl border border-border bg-bg text-text text-sm focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 ${highlightedFields ? highlightClass : ""}`}
                />
              </div>
              <span className="text-muted text-sm">to</span>
              <div className="relative flex-1">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted text-sm">$</span>
                <input
                  type="text"
                  value={salaryMax}
                  onChange={(e) => setSalaryMax(e.target.value)}
                  className={`w-full pl-7 pr-3.5 py-2.5 rounded-xl border border-border bg-bg text-text text-sm focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 ${highlightedFields ? highlightClass : ""}`}
                />
              </div>
            </div>
          </div>

          {/* Job description */}
          <div>
            <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">
              Job description
            </label>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              rows={6}
              className={`w-full px-3.5 py-2.5 rounded-xl border border-border bg-bg text-text text-sm focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 resize-none leading-relaxed ${highlightedFields ? highlightClass : ""}`}
              placeholder="Paste or write the job description here — Pathline will suggest traits based on what matters in the role."
            />
            <p className="text-xs text-muted mt-1.5">
              Pathline reads this to suggest traits in the next step.
            </p>
          </div>

          {/* Process stages with reorder */}
          <div>
            <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">
              Process stages
            </label>
            <div className="flex flex-col gap-1.5 mb-2">
              {stages.map((stage, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-bg border border-border"
                >
                  <span className="text-xs text-muted font-medium w-4 text-center flex-shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-sm text-text flex-1">{stage}</span>
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => moveStage(i, "up")}
                      disabled={i === 0}
                      className="p-1 rounded text-muted hover:text-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      <ChevronUp size={13} />
                    </button>
                    <button
                      onClick={() => moveStage(i, "down")}
                      disabled={i === stages.length - 1}
                      className="p-1 rounded text-muted hover:text-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      <ChevronDown size={13} />
                    </button>
                    <button
                      onClick={() => removeStage(i)}
                      className="p-1 rounded text-muted hover:text-danger transition-colors cursor-pointer ml-1"
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newStage}
                onChange={(e) => setNewStage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addStage()}
                placeholder="Add a stage..."
                className="flex-1 px-3.5 py-2 rounded-xl border border-border bg-bg text-text text-sm focus:outline-none focus:border-accent/50 placeholder:text-muted/50"
              />
              <Button size="sm" variant="secondary" onClick={addStage}>
                <Plus size={13} />
                Add
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Response commitment + blind screening */}
      <Card className="mb-5">
        <div className="flex flex-col gap-5">
          <div>
            <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">
              Response commitment
            </label>
            <div className="flex gap-2 flex-wrap">
              {COMMITMENT_OPTIONS.map((opt) => (
                <button
                  key={opt.days}
                  onClick={() => setResponseCommitment(opt.days)}
                  className={`px-3.5 py-2 rounded-xl border text-sm font-medium transition-colors cursor-pointer ${
                    responseCommitment === opt.days
                      ? "bg-accent-light border-accent/40 text-accent"
                      : "bg-bg border-border text-text hover:border-accent/30"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted mt-1.5">
              Every applicant hears back within this window. Pathline tracks it for you.
            </p>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-text">Blind screening</p>
              <p className="text-xs text-muted mt-0.5">
                Names hidden during review, revealed after shortlisting.
              </p>
            </div>
            <button
              onClick={() => setBlindScreening(!blindScreening)}
              className={`w-11 h-6 rounded-full transition-colors cursor-pointer flex-shrink-0 relative ${
                blindScreening ? "bg-accent" : "bg-border"
              }`}
            >
              <div
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                  blindScreening ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        </div>
      </Card>

      {/* How applicants get to Pathline */}
      <div className="mb-5">
        <h3 className="text-sm font-semibold text-text mb-3">How applicants get to Pathline</h3>
        <div className="grid grid-cols-2 gap-4">
          {/* Card A — apply link */}
          <div className="p-5 rounded-2xl bg-surface border border-border flex flex-col">
            <p className="text-sm font-semibold text-text mb-4">New applicants: use your apply link</p>
            <div className="flex flex-col gap-3.5 flex-1">
              <div className="flex gap-2.5">
                <span className="w-5 h-5 rounded-full bg-accent text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">1</span>
                <p className="text-xs text-text leading-relaxed">Post the job where you already do (LinkedIn, Indeed, Handshake, careers page)</p>
              </div>
              <div className="flex gap-2.5">
                <span className="w-5 h-5 rounded-full bg-accent text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">2</span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-text leading-relaxed mb-1.5">Paste this link as the job&apos;s Apply link</p>
                  <div className="flex items-center gap-1.5 p-2 rounded-lg bg-bg border border-border">
                    <span className="text-xs text-text font-mono flex-1 truncate">pathline.app/apply/vittacus-bizops</span>
                    <button
                      onClick={() => toast("Link copied to clipboard")}
                      className="text-xs font-medium text-accent hover:text-accent-hover transition-colors cursor-pointer flex-shrink-0 px-2 py-0.5 rounded border border-accent/30 hover:bg-accent-light"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex gap-2.5">
                <span className="w-5 h-5 rounded-full bg-accent text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">3</span>
                <p className="text-xs text-text leading-relaxed">Applicants apply here and appear in Review automatically</p>
              </div>
            </div>

            {/* Job board checklist */}
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex flex-wrap gap-x-3 gap-y-1 mb-1">
                {["LinkedIn", "Indeed", "Handshake", "Careers page"].map((board) => (
                  <span key={board} className="text-xs text-muted">
                    {board} <span className="text-emerald-600 font-medium">✓ link added</span>
                  </span>
                ))}
              </div>
              <p className="text-xs text-muted/70">Marked when you&apos;ve added the apply link to that post.</p>
            </div>

            {/* Preview application page */}
            <button
              onClick={() => setShowAppPreview(true)}
              className="mt-3 flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent-hover transition-colors cursor-pointer"
            >
              <Eye size={12} />
              Preview application page
            </button>
          </div>

          {/* Card B — import */}
          <div className="p-5 rounded-2xl bg-surface border border-border flex flex-col">
            <p className="text-sm font-semibold text-text mb-2">Already have applicants? Import them</p>
            <p className="text-xs text-muted leading-relaxed flex-1 mb-4">
              Export from Greenhouse, Lever or a job board and upload the file. Pathline reads the resumes and sorts them with everyone else.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setImportOpen(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent-hover transition-colors cursor-pointer"
              >
                <Upload size={14} />
                Import
              </button>
              <button
                onClick={() => toast("Sample export downloaded")}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl border border-border bg-bg text-muted text-sm hover:bg-border/50 hover:text-text transition-colors cursor-pointer"
              >
                Download sample export
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Review & publish — public job post preview */}
      <div className="mb-6">
        <button
          onClick={() => setShowPreview((v) => !v)}
          className="flex items-center gap-2 text-sm font-medium text-accent hover:text-accent-hover transition-colors cursor-pointer"
        >
          {showPreview ? <EyeOff size={14} /> : <Eye size={14} />}
          {showPreview ? "Hide" : "Review & publish"} — preview job post
        </button>

        {showPreview && (
          <Card className="mt-3">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-text">{title || "Role title"}</h3>
                <p className="text-sm text-muted mt-0.5">
                  Vittacus · {location || "Location"}
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-700">
                Open
              </span>
            </div>

            <div className="flex gap-3 mb-4">
              <div className="px-3 py-1.5 rounded-lg bg-bg border border-border text-xs text-text font-medium">
                ${salaryMin ? (parseInt(salaryMin) / 1000).toFixed(0) : "?"}k–$
                {salaryMax ? (parseInt(salaryMax) / 1000).toFixed(0) : "?"}k
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-bg border border-border text-xs text-text font-medium">
                {team || "Team"}
              </div>
            </div>

            <div className="mb-4">
              <p className="text-xs font-medium text-muted uppercase tracking-wide mb-2">Process</p>
              <div className="flex items-center flex-wrap gap-1">
                {stages.map((stage, i) => (
                  <span key={stage} className="flex items-center gap-1 text-xs text-text">
                    {i > 0 && <span className="text-muted">→</span>}
                    {stage}
                  </span>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <p className="text-xs font-medium text-muted uppercase tracking-wide mb-2">Application questions</p>
              <p className="text-xs text-muted mb-2">
                Optional (about 5 min). You won&apos;t be penalized for skipping.
              </p>
              <div className="flex flex-col gap-2">
                <div className="p-2.5 rounded-lg bg-bg border border-border">
                  <p className="text-xs text-text leading-relaxed">Tell us about a time you owned a messy process from start to finish. What did you change, and what was the result?</p>
                </div>
                <div className="p-2.5 rounded-lg bg-bg border border-border">
                  <p className="text-xs text-text leading-relaxed">Describe a situation where you had to use data to influence a decision. What did you find, and how did you present it?</p>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
              <p className="text-xs font-medium text-emerald-800">
                96% of applicants hear back within {responseCommitment} days · Vittacus track record
              </p>
            </div>
          </Card>
        )}
      </div>

      <div className="flex justify-end">
        <Button size="lg" onClick={() => { advanceStep(1); router.push("/calibrate") }}>
          Next: Calibrate →
        </Button>
      </div>

      {importOpen && <ImportModal onClose={() => setImportOpen(false)} />}

      {/* Application page preview modal */}
      {showAppPreview && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setShowAppPreview(false)}
        >
          <div
            className="bg-surface rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <p className="text-xs font-medium text-muted uppercase tracking-wide">Application page preview</p>
                <p className="text-xs text-muted mt-0.5">What candidates see when they click Apply</p>
              </div>
              <button
                onClick={() => setShowAppPreview(false)}
                className="p-1.5 rounded-lg text-muted hover:text-text hover:bg-bg transition-colors cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Candidate-facing application page */}
            <div className="p-5">
              {/* Role header */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-accent-light border border-accent/20 flex items-center justify-center text-xs font-bold text-accent flex-shrink-0">
                    V
                  </div>
                  <span className="text-sm text-muted">Vittacus</span>
                </div>
                <h2 className="text-lg font-semibold text-text">{title || "Business Operations Associate"}</h2>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-xs text-muted">{location || "Location"}</span>
                  <span className="text-muted text-xs">·</span>
                  <span className="text-xs text-muted">
                    ${salaryMin ? (parseInt(salaryMin) / 1000).toFixed(0) : "?"}k–${salaryMax ? (parseInt(salaryMax) / 1000).toFixed(0) : "?"}k
                  </span>
                  <span className="text-muted text-xs">·</span>
                  <span className="text-xs text-muted">{team || "Team"}</span>
                </div>
              </div>

              {/* Resume upload */}
              <div className="mb-5">
                <label className="block text-xs font-medium text-muted uppercase tracking-wide mb-1.5">Resume</label>
                <div className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed border-border bg-bg">
                  <Upload size={18} className="text-muted" />
                  <p className="text-sm text-muted text-center">Drop your resume or <span className="text-accent font-medium">browse</span></p>
                  <p className="text-xs text-muted">PDF or Word doc</p>
                </div>
              </div>

              {/* Optional application questions */}
              <div className="mb-5">
                <p className="text-sm font-medium text-text mb-0.5">Two short questions</p>
                <p className="text-xs text-muted mb-3">Optional (about 5 min). You won&apos;t be penalized for skipping.</p>
                <div className="flex flex-col gap-4">
                  <div>
                    <p className="text-xs text-text leading-relaxed mb-1.5">
                      Tell us about a time you owned a messy process from start to finish. What did you change, and what was the result?
                    </p>
                    <textarea
                      rows={3}
                      placeholder="Your answer (150 words or fewer)"
                      className="w-full px-3 py-2 rounded-xl border border-border bg-bg text-text text-sm focus:outline-none focus:border-accent/50 resize-none placeholder:text-muted/50"
                      readOnly
                    />
                  </div>
                  <div>
                    <p className="text-xs text-text leading-relaxed mb-1.5">
                      Describe a situation where you had to use data to influence a decision. What did you find, and how did you present it?
                    </p>
                    <textarea
                      rows={3}
                      placeholder="Your answer (150 words or fewer)"
                      className="w-full px-3 py-2 rounded-xl border border-border bg-bg text-text text-sm focus:outline-none focus:border-accent/50 resize-none placeholder:text-muted/50"
                      readOnly
                    />
                  </div>
                </div>
              </div>

              {/* Response commitment */}
              <div className="mb-5 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <p className="text-xs font-medium text-emerald-800">
                  96% of applicants hear back within {responseCommitment} days · Vittacus track record
                </p>
              </div>

              {/* Submit (disabled in preview) */}
              <button
                disabled
                className="w-full py-3 rounded-xl bg-accent text-white text-sm font-semibold opacity-50 cursor-not-allowed"
              >
                Submit application
              </button>
              <p className="text-xs text-muted text-center mt-2">Preview only — this form isn&apos;t live</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

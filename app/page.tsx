"use client"

import { useState } from "react"
import Link from "next/link"
import { useDemo } from "@/context/DemoContext"
import { daysWaiting, APPLICANT_SOURCES, SHORTLIST_QUALITY, SAMPLE_INTERVIEWED_COUNT } from "@/data/demo"
import { ArrowRight, TrendingUp, Lock, X, Star } from "lucide-react"
import { Card } from "@/components/ui/Card"

const SAMPLE_ROLES = [
  { title: "Sales Development Rep", count: 312, days: 3 },
  { title: "Customer Success Mgr", count: 198, days: 7 },
]

function getHour() {
  return new Date().getHours()
}

function getGreeting() {
  const h = getHour()
  if (h < 12) return "Good morning"
  if (h < 17) return "Good afternoon"
  return "Good evening"
}

export default function HomePage() {
  const { role, candidates, sortedCandidates, scoreOf, responseCommitment, bucketCounts, getBucketOf } = useDemo()
  const [howItWorksDismissed, setHowItWorksDismissed] = useState(false)

  const shortlisted = candidates.filter((c) => c.status === "shortlisted")
  const passed = candidates.filter((c) => c.status === "pass")
  const pending = sortedCandidates.filter((c) => c.status === "pending")
  const toReview = pending.length
  const invitesReady = shortlisted.length
  const heardBack = shortlisted.length + passed.length

  // Candidates still pending who will hit their 7-day response deadline in the next 48h
  const nearDeadlineSample = candidates.filter(
    (c) => c.status === "pending" && daysWaiting(c.appliedDate) >= 5 && daysWaiting(c.appliedDate) < 7
  )
  const approachingDeadlineCount = Math.round(
    nearDeadlineSample.length * (role.applicantCount / candidates.length)
  )

  // Impact funnel
  const ranked = candidates.length
  const closed = passed.filter((c) => c.status === "pass").length

  // Recruiter hours saved estimate: each review ~3 min × applicants processed
  const hoursSaved = Math.round(((role.applicantCount - toReview) * 3) / 60)

  // Top 3 pending by score for the preview
  const top3 = [...pending].slice(0, 3)

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      {/* Greeting */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-text tracking-tight">
          {getGreeting()}, Sarah
        </h1>
        <p className="text-muted text-sm mt-1">
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* How Pathline works strip */}
      {!howItWorksDismissed && (
        <div className="mb-6 p-4 rounded-2xl bg-surface border border-border flex items-start gap-3">
          <div className="flex-1">
            <p className="text-xs font-medium text-muted uppercase tracking-wide mb-2.5">How Pathline works</p>
            <div className="flex items-center gap-1.5 flex-wrap">
              <HowStep n={1} text="Post anywhere" />
              <StepArrow />
              <HowStep n={2} text="Applicants apply through Pathline or get imported" />
              <StepArrow />
              <HowStep n={3} text="Pathline ranks on evidence" />
              <StepArrow />
              <HowStep n={4} text="You invite and close the loop" />
            </div>
          </div>
          <button
            onClick={() => setHowItWorksDismissed(true)}
            className="p-1 rounded text-muted hover:text-text transition-colors cursor-pointer flex-shrink-0 mt-0.5"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Active role card */}
      <div className="mb-6 p-6 rounded-2xl bg-surface border border-border shadow-sm">
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-medium text-emerald-700">Active</span>
            </div>
            <h2 className="text-lg font-semibold text-text">{role.title}</h2>
            <p className="text-sm text-muted">{role.company} · {role.applicantCount} applicants</p>
          </div>
          <Link
            href="/queue"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent-hover transition-colors"
          >
            Review queue
            <ArrowRight size={14} />
          </Link>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-5">
          <div className="p-4 rounded-xl bg-bg border border-border">
            <p className="text-2xl font-bold text-text tabular-nums">{toReview}</p>
            <p className="text-xs text-muted mt-0.5">to review today</p>
          </div>
          <div className="p-4 rounded-xl bg-accent-light border border-accent/20">
            <p className="text-2xl font-bold text-accent tabular-nums">{invitesReady}</p>
            <p className="text-xs text-muted mt-0.5">invites ready to send</p>
          </div>
          <Link
            href="/closure"
            className={`p-4 rounded-xl border transition-colors hover:opacity-90 ${approachingDeadlineCount > 0 ? "bg-amber-50 border-amber-200" : "bg-bg border-border"}`}
          >
            <p className={`text-2xl font-bold tabular-nums ${approachingDeadlineCount > 0 ? "text-amber-700" : "text-text"}`}>{approachingDeadlineCount}</p>
            <p className="text-xs text-muted mt-0.5 leading-snug">
              reach {responseCommitment}-day commitment in 48h → Send updates
            </p>
          </Link>
        </div>

        {/* Track record */}
        <div className="flex items-center gap-2 mb-5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
          <p className="text-xs text-muted">
            <span className="font-semibold text-text">96%</span> of applicants hear back within {responseCommitment} days · Vittacus track record
          </p>
        </div>

        {/* Impact funnel */}
        <div className="mb-5">
          <p className="text-xs font-medium text-muted uppercase tracking-wide mb-3">Impact funnel</p>
          <div className="flex items-center gap-2 flex-wrap">
            <FunnelStep label="Applied" count={role.applicantCount} accent={false} />
            <ArrowRight size={12} className="text-muted flex-shrink-0" />
            <FunnelStep label="Sorted" count={ranked} accent={false} />
            <ArrowRight size={12} className="text-muted flex-shrink-0" />
            <FunnelStep label="Shortlisted" count={shortlisted.length} accent={true} />
            <ArrowRight size={12} className="text-muted flex-shrink-0" />
            <FunnelStep label="Interviewed" count={SAMPLE_INTERVIEWED_COUNT} accent={false} />
            <ArrowRight size={12} className="text-muted flex-shrink-0" />
            <FunnelStep label="Closed" count={heardBack} accent={false} />
          </div>
        </div>

        {/* Shortlist quality */}
        <div className="mb-5 p-4 rounded-xl bg-bg border border-border">
          <div className="flex items-start gap-3">
            <Star size={14} className="text-accent mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-text">
                {SHORTLIST_QUALITY.passedIntro} of {SHORTLIST_QUALITY.shortlisted} shortlisted passed the intro call
                <span className="ml-1.5 text-sm font-normal text-muted">
                  ({Math.round((SHORTLIST_QUALITY.passedIntro / SHORTLIST_QUALITY.shortlisted) * 100)}%)
                </span>
              </p>
              <p className="text-xs text-muted mt-0.5">How well Pathline's evaluation holds up in real interviews.</p>
            </div>
          </div>
        </div>

        {/* Where applicants came from */}
        <div className="mb-5">
          <p className="text-xs font-medium text-muted uppercase tracking-wide mb-2">Where applicants came from</p>
          <div className="flex items-center flex-wrap">
            {APPLICANT_SOURCES.map((s, i) => (
              <span key={s.name} className="text-xs text-muted">
                {i > 0 && <span className="mx-2 text-border">·</span>}
                {s.name} <span className="font-semibold text-text tabular-nums">{s.count}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Hours saved */}
        <div className="flex items-center gap-2 p-3 rounded-xl bg-bg border border-border">
          <TrendingUp size={14} className="text-accent flex-shrink-0" />
          <p className="text-sm text-text">
            <span className="font-semibold">~{hoursSaved} recruiter hours saved</span>
            <span className="text-muted"> on this role so far</span>
          </p>
        </div>
      </div>

      {/* Priority & strong matches */}
      {(bucketCounts.priority > 0 || bucketCounts.strong > 0) && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-text">Priority & strong matches</h3>
              <div className="flex items-center gap-1.5 text-xs text-muted">
                {bucketCounts.priority > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-bg border border-border">
                    Priority {bucketCounts.priority}
                  </span>
                )}
                {bucketCounts.strong > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-bg border border-border">
                    Strong match {bucketCounts.strong}
                  </span>
                )}
              </div>
            </div>
            <Link href="/queue" className="text-xs text-accent hover:text-accent-hover transition-colors">
              Review all →
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            {[
              ...candidates.filter((c) => getBucketOf(c) === "priority"),
              ...candidates.filter((c) => getBucketOf(c) === "strong").sort((a, b) => scoreOf(b) - scoreOf(a)),
            ].slice(0, 3).map((c) => {
              const bucket = getBucketOf(c)
              return (
                <Link
                  key={c.id}
                  href="/queue"
                  className="flex items-center gap-3 p-4 rounded-xl bg-surface border border-border hover:border-accent/30 hover:bg-accent-light/30 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-bg border border-border flex items-center justify-center text-xs font-semibold text-muted flex-shrink-0">
                    {c.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text truncate">{c.headline}</p>
                    <div className="flex gap-1 mt-0.5 flex-wrap items-center">
                      {bucket === "priority" && (
                        <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                          Priority
                        </span>
                      )}
                      {c.whySurfaced.slice(0, 2).map((tag) => (
                        <span key={tag} className="text-xs text-muted">{tag}</span>
                      ))}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Other roles (locked) */}
      <div>
        <h3 className="text-sm font-semibold text-text mb-3">Other roles</h3>
        <div className="grid grid-cols-2 gap-3">
          {SAMPLE_ROLES.map((r) => (
            <div
              key={r.title}
              className="p-4 rounded-xl bg-surface border border-border opacity-60 relative overflow-hidden"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm font-medium text-text">{r.title}</p>
                  <p className="text-xs text-muted mt-0.5">Vittacus · {r.count} applicants</p>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted">
                  <Lock size={11} />
                  Sample only
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-lg font-bold text-text tabular-nums">{r.count}</p>
                  <p className="text-xs text-muted">applicants</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-muted tabular-nums">{r.days}d</p>
                  <p className="text-xs text-muted">left</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function HowStep({ n, text }: { n: number; text: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-4 h-4 rounded-full bg-accent text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">
        {n}
      </span>
      <span className="text-xs text-text">{text}</span>
    </div>
  )
}

function StepArrow() {
  return <ArrowRight size={12} className="text-muted flex-shrink-0" />
}

function FunnelStep({ label, count, accent }: { label: string; count: number; accent: boolean }) {
  return (
    <div className={`flex flex-col items-center px-3 py-2 rounded-lg ${accent ? "bg-accent-light border border-accent/20" : "bg-bg border border-border"}`}>
      <p className={`text-base font-bold tabular-nums ${accent ? "text-accent" : "text-text"}`}>{count}</p>
      <p className="text-xs text-muted whitespace-nowrap">{label}</p>
    </div>
  )
}


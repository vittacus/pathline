"use client"

import { useState, useMemo } from "react"
import { Check, Users, AlertCircle, Shuffle, X, Clock } from "lucide-react"
import { useDemo } from "@/context/DemoContext"
import { useToast } from "@/components/ui/Toast"
import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import { type Candidate, daysWaiting } from "@/data/demo"

const NOTE_REVIEWED = `Hi [Name],

Thank you for applying to the Business Operations Associate role at Vittacus. We really appreciated the time you took, and we reviewed your application carefully.

We've decided to move forward with other candidates whose backgrounds more closely match what we're looking for right now. This was a competitive process and doesn't reflect the quality of your work.

We'd love to stay connected. If you're open to it, we'd like to add you to our talent pool — we hire regularly and will reach out if something comes up that's a strong fit.

Thanks again for your interest in Vittacus.

Sarah Chen
Head of People, Vittacus`

const NOTE_BULK = `Hi [Name],

Thank you for applying to the Business Operations Associate role at Vittacus.

We received 487 applications and prioritized those most closely matching the role's requirements. We weren't able to move forward with yours at this time.

We'd love to stay connected. If you're open to it, we'd like to add you to our talent pool — we hire regularly and will reach out if something comes up that's a strong fit.

Thanks for taking the time to apply to Vittacus.

Sarah Chen
Head of People, Vittacus`


function SpotCheckModal({
  candidates,
  onClose,
}: {
  candidates: Candidate[]
  onClose: () => void
}) {
  // Pick 10 random (but deterministic) candidates
  const sample = useMemo(() => {
    const shuffled = [...candidates].sort(() => 0.5 - Math.sin(candidates.length))
    return shuffled.slice(0, 10)
  }, [candidates])

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-surface rounded-2xl border border-border shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-border flex-shrink-0">
          <div>
            <h3 className="text-base font-semibold text-text">Spot-check: 10 random applicants</h3>
            <p className="text-xs text-muted mt-0.5">Below the shortlist cutoff — not individually reviewed</p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-text transition-colors cursor-pointer">
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <div className="flex flex-col gap-3">
            {sample.map((c) => {
              const waited = daysWaiting(c.appliedDate)
              const daysLeft = Math.max(0, 7 - waited)
              const overdue = waited >= 7
              const appliedLabel = new Date(c.appliedDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
              return (
                <div key={c.id} className="flex items-start gap-3 p-3 rounded-xl bg-bg border border-border">
                  <div className="w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center text-xs font-semibold text-muted flex-shrink-0">
                    {c.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text truncate">{c.headline}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-muted">Applied {appliedLabel}</span>
                      <span className="text-xs text-muted">Last contact: —</span>
                      <span
                        className={`text-xs font-medium ${
                          overdue ? "text-red-600" : daysLeft <= 2 ? "text-amber-700" : "text-emerald-700"
                        }`}
                      >
                        {overdue ? "⚠ Overdue" : daysLeft <= 2 ? `${daysLeft}d left` : `${daysLeft}d left`}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        <div className="p-4 border-t border-border flex-shrink-0">
          <Button variant="secondary" size="sm" className="w-full justify-center" onClick={onClose}>
            Close spot-check
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function ClosurePage() {
  const { candidates, role, responseCommitment, autoStillReviewing, advanceStep } = useDemo()
  const { toast } = useToast()

  const [talentPool, setTalentPool] = useState(true)
  const [noteReviewed, setNoteReviewed] = useState(NOTE_REVIEWED)
  const [noteBulk, setNoteBulk] = useState(NOTE_BULK)
  const [approved, setApproved] = useState(false)
  const [sentGroup1, setSentGroup1] = useState(false)
  const [sentGroup2, setSentGroup2] = useState(false)
  const [sentStillReviewing, setSentStillReviewing] = useState(false)
  const [showSpotCheck, setShowSpotCheck] = useState(false)

  // Group 1: explicitly reviewed and passed on
  const reviewedNotMoving = candidates.filter((c) => c.status === "pass")

  // Near-deadline: pending candidates with 5–6 days waiting (reaching deadline in ≤48h)
  const nearDeadlinePending = candidates.filter(
    (c) => c.status === "pending" && daysWaiting(c.appliedDate) >= 5 && daysWaiting(c.appliedDate) < 7
  )
  const nearDeadlineCount = Math.round(
    nearDeadlinePending.length * (role.applicantCount / candidates.length)
  )

  // Group 2: pending in top 40 + the other 447 not in the queue
  const pendingInQueue = candidates.filter((c) => c.status === "pending")
  const unreviewed = role.applicantCount - candidates.length // 447
  const group2Count = pendingInQueue.length + unreviewed

  const totalNotMovingForward = reviewedNotMoving.length + group2Count

  const handleSendGroup1 = () => {
    setSentGroup1(true)
    toast(`${reviewedNotMoving.length} closure notes sent`)
  }

  const handleSendGroup2 = () => {
    if (!approved) return
    setSentGroup2(true)
    toast(`${group2Count} closure notes queued`)
  }

  const handleSendAll = () => {
    setSentGroup1(true)
    if (approved) setSentGroup2(true)
    advanceStep(4)
    toast(`${totalNotMovingForward} closure notes sent`)
  }

  return (
    <>
      {showSpotCheck && (
        <SpotCheckModal
          candidates={pendingInQueue}
          onClose={() => setShowSpotCheck(false)}
        />
      )}

      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-text tracking-tight">Close the loop</h1>
          <p className="text-muted text-sm mt-1">
            Send a kind, honest note to everyone not moving forward.
          </p>
        </div>

        {/* Summary banner */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-surface border border-border mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-bg border border-border flex items-center justify-center">
              <Users size={16} className="text-muted" />
            </div>
            <div>
              <p className="text-sm font-semibold text-text">
                {totalNotMovingForward} applicants not moving forward
              </p>
              <p className="text-xs text-muted mt-0.5">
                {candidates.filter((c) => c.status === "shortlisted").length} shortlisted ·{" "}
                {role.applicantCount} total applicants
              </p>
            </div>
          </div>
          {sentGroup1 && sentGroup2 && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
              <Check size={13} />
              All sent
            </div>
          )}
        </div>

        {/* Auto still-reviewing banner */}
        {autoStillReviewing && nearDeadlineCount > 0 && (
          <div className="flex items-center gap-3 mb-4 p-3.5 rounded-xl bg-accent-light border border-accent/20">
            <Clock size={14} className="text-accent flex-shrink-0" />
            <p className="text-xs text-text">
              <span className="font-semibold">{nearDeadlineCount} applicants</span> will get an automatic &apos;still reviewing&apos; update tomorrow.
            </p>
          </div>
        )}

        {/* Talent pool toggle */}
        <Card className="mb-6" padding="sm">
          <div className="flex items-center justify-between gap-4 p-2">
            <div>
              <p className="text-sm font-medium text-text">Include talent pool opt-in</p>
              <p className="text-xs text-muted mt-0.5">
                Candidates can opt in to hear about future roles
              </p>
            </div>
            <button
              onClick={() => setTalentPool((v) => !v)}
              className={`w-11 h-6 rounded-full transition-colors cursor-pointer flex-shrink-0 relative ${
                talentPool ? "bg-accent" : "bg-border"
              }`}
            >
              <div
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                  talentPool ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        </Card>

        {/* ── Group 1: Reviewed, not moving forward ───────── */}
        <Card className="mb-4">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-text">
                Reviewed — not moving forward
              </h3>
              <p className="text-xs text-muted mt-0.5">
                {reviewedNotMoving.length} candidate{reviewedNotMoving.length !== 1 ? "s" : ""} explicitly passed on
              </p>
            </div>
            {sentGroup1 ? (
              <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                <Check size={12} />
                Sent
              </div>
            ) : (
              <Button size="sm" variant="secondary" onClick={handleSendGroup1} disabled={reviewedNotMoving.length === 0}>
                Send {reviewedNotMoving.length}
              </Button>
            )}
          </div>
          {reviewedNotMoving.length === 0 ? (
            <p className="text-xs text-muted mb-4">No candidates passed on yet.</p>
          ) : (
            <div className="flex flex-col gap-2 mb-4">
              {reviewedNotMoving.slice(0, 5).map((c) => {
                const waited = daysWaiting(c.appliedDate)
                return (
                  <div
                    key={c.id}
                    className="flex items-center gap-3 py-2 border-b border-border last:border-0"
                  >
                    <div className="w-7 h-7 rounded-full bg-bg border border-border flex items-center justify-center text-xs font-semibold text-muted flex-shrink-0">
                      {c.initials}
                    </div>
                    <p className="text-sm text-text flex-1 truncate">{c.headline}</p>
                    <span className="text-xs text-muted flex-shrink-0 flex items-center gap-1">
                      <Clock size={10} />
                      {waited}d
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 font-medium flex-shrink-0">
                      Passed
                    </span>
                  </div>
                )
              })}
              {reviewedNotMoving.length > 5 && (
                <p className="text-xs text-muted text-center pt-1">
                  +{reviewedNotMoving.length - 5} more
                </p>
              )}
            </div>
          )}
          <div className="pt-4 border-t border-border">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-text">Note template — individually reviewed</p>
              <span className="text-xs text-muted">Recruiter-approved before sending</span>
            </div>
            <textarea
              className="w-full text-sm text-text bg-bg border border-border rounded-xl p-3.5 resize-none focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 leading-relaxed h-48"
              style={{ fontFamily: "var(--font-geist-sans)" }}
              value={noteReviewed}
              onChange={(e) => setNoteReviewed(e.target.value)}
            />
            <p className="text-xs text-muted mt-1.5">[Name] is replaced individually on send.</p>
          </div>
        </Card>

        {/* ── Group 2: Below shortlist, not individually reviewed ─ */}
        <Card className="mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-text">
                Below shortlist — not individually reviewed
              </h3>
              <p className="text-xs text-muted mt-0.5">
                {group2Count} applicants ({pendingInQueue.length} pending in top 40 + {unreviewed} below queue)
              </p>
            </div>
          </div>

          {/* Still reviewing nudge — for near-deadline pending applicants */}
          {nearDeadlineCount > 0 && (
            <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200">
              <Clock size={14} className="text-amber-600 flex-shrink-0" />
              <p className="text-xs text-amber-800 flex-1">
                <span className="font-semibold">{nearDeadlineCount} applicants</span> reach their {responseCommitment}-day response commitment in the next 48 hours.
              </p>
              {sentStillReviewing ? (
                <div className="flex items-center gap-1 text-xs font-medium text-emerald-700 flex-shrink-0">
                  <Check size={11} />
                  Sent
                </div>
              ) : (
                <button
                  onClick={() => { setSentStillReviewing(true); toast(`${nearDeadlineCount} "still reviewing" updates sent`) }}
                  className="text-xs font-medium text-amber-800 hover:text-amber-900 underline underline-offset-2 flex-shrink-0 cursor-pointer transition-colors"
                >
                  Send update
                </button>
              )}
            </div>
          )}

          {/* Spot-check button */}
          <div className="flex items-center gap-2 mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200">
            <AlertCircle size={14} className="text-amber-600 flex-shrink-0" />
            <p className="text-xs text-amber-800 flex-1">
              These applicants were not individually reviewed. Spot-check before sending.
            </p>
            <button
              onClick={() => setShowSpotCheck(true)}
              className="flex items-center gap-1.5 text-xs font-medium text-amber-700 hover:text-amber-800 transition-colors cursor-pointer flex-shrink-0 px-2 py-1 rounded-lg hover:bg-amber-100"
            >
              <Shuffle size={12} />
              Spot-check 10
            </button>
          </div>

          {/* Bulk note template */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-text">Note template — not individually reviewed</p>
              <span className="text-xs text-muted">Recruiter-approved before sending</span>
            </div>
            <textarea
              className="w-full text-sm text-text bg-bg border border-border rounded-xl p-3.5 resize-none focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 leading-relaxed h-44"
              style={{ fontFamily: "var(--font-geist-sans)" }}
              value={noteBulk}
              onChange={(e) => setNoteBulk(e.target.value)}
            />
            <p className="text-xs text-muted mt-1.5">[Name] is replaced individually on send. This note does not claim individual review.</p>
          </div>

          {/* Confirmation checkbox */}
          <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl border border-border hover:bg-bg transition-colors">
            <div className="mt-0.5 flex-shrink-0">
              <input
                type="checkbox"
                checked={approved}
                onChange={(e) => setApproved(e.target.checked)}
                className="w-4 h-4 rounded border-border accent-accent cursor-pointer"
              />
            </div>
            <span className="text-sm text-text leading-relaxed">
              I&apos;ve reviewed the threshold and approve sending closure notes to these{" "}
              <strong>{group2Count}</strong> applicants.
            </span>
          </label>

          <div className="mt-4 flex justify-end">
            {sentGroup2 ? (
              <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                <Check size={12} />
                {group2Count} notes queued
              </div>
            ) : (
              <Button
                size="sm"
                variant={approved ? "primary" : "secondary"}
                onClick={handleSendGroup2}
                disabled={!approved}
              >
                Send to {group2Count}
              </Button>
            )}
          </div>
        </Card>

        {/* Send all */}
        {!sentGroup1 || (!sentGroup2 && approved) ? (
          <div className="flex justify-end">
            <Button
              size="lg"
              onClick={handleSendAll}
              disabled={!approved && group2Count > 0}
            >
              Send all closure notes ({totalNotMovingForward})
            </Button>
          </div>
        ) : null}
      </div>
    </>
  )
}

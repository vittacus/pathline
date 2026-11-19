"use client"

import { useState, useEffect } from "react"
import { Check, Send, ChevronRight, Settings, X, Pencil, ArrowRight } from "lucide-react"
import { useDemo } from "@/context/DemoContext"
import { useToast } from "@/components/ui/Toast"
import { Button } from "@/components/ui/Button"
import Link from "next/link"
import { type Candidate } from "@/data/demo"

const BASE_TEMPLATE = `Hi {first_name},

We've reviewed your application for the {role} role at Vittacus and would love to connect.

{personal_line}

A few things we want you to know upfront:

Compensation: $85,000–$115,000
Process: Intro Call → Case Study → Final Round → Offer
Timeline: Moving quickly — first round interviews next week.

Pick a time directly: {booking_link}

Or reply here with any questions.

Looking forward to speaking,
Sarah Chen
Head of People, Vittacus`

function resolveTemplate(
  template: string,
  candidate: Candidate,
  bookingLink: string
): string {
  return template
    .replace(/{first_name}/g, candidate.name.split(" ")[0])
    .replace(/{role}/g, "Business Operations Associate")
    .replace(/{personal_line}/g, candidate.personalLine)
    .replace(/{booking_link}/g, bookingLink || "calendly.com/vittacus/intro")
}

export default function OutreachPage() {
  const { role, candidates, advanceStep } = useDemo()
  const { toast } = useToast()

  const shortlisted = candidates.filter((c) => c.status === "shortlisted")
  const [tab, setTab] = useState<"to_send" | "sent">("to_send")
  const [selected, setSelected] = useState<Candidate | null>(null)
  const [perCandidateEdits, setPerCandidateEdits] = useState<Record<string, string>>({})
  const [sent, setSent] = useState<Set<string>>(new Set())
  const [template, setTemplate] = useState(BASE_TEMPLATE)
  const [bookingLink, setBookingLink] = useState("calendly.com/vittacus/intro")
  const [editingTemplate, setEditingTemplate] = useState(false)
  const [draftTemplate, setDraftTemplate] = useState(BASE_TEMPLATE)
  const [editingEmail, setEditingEmail] = useState(false)

  const toSend = shortlisted.filter((c) => !sent.has(c.id))
  const sentList = shortlisted.filter((c) => sent.has(c.id))
  const displayList = tab === "to_send" ? toSend : sentList

  useEffect(() => {
    if (!selected || !shortlisted.find((c) => c.id === selected.id)) {
      setSelected(toSend[0] ?? null)
    }
  }, [shortlisted.length]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (tab === "to_send" && selected && sent.has(selected.id)) {
      const remaining = toSend.filter((c) => c.id !== selected.id)
      setSelected(remaining[0] ?? null)
    }
  }, [sent.size]) // eslint-disable-line react-hooks/exhaustive-deps

  const getMessageForCandidate = (candidate: Candidate) =>
    perCandidateEdits[candidate.id] ?? resolveTemplate(template, candidate, bookingLink)

  const handleSend = (candidateId: string) => {
    setSent((prev) => new Set([...prev, candidateId]))
    advanceStep(3)
    toast("Invite sent")
    const idx = toSend.findIndex((c) => c.id === candidateId)
    const remaining = toSend.filter((c) => c.id !== candidateId)
    setSelected(remaining[Math.min(idx, remaining.length - 1)] ?? null)
    setEditingEmail(false)
  }

  const handleSendAll = () => {
    setSent(new Set(shortlisted.map((c) => c.id)))
    advanceStep(3)
    toast(`${shortlisted.length} invites sent`)
    setSelected(null)
    setEditingEmail(false)
  }

  const saveTemplate = () => {
    setTemplate(draftTemplate)
    setEditingTemplate(false)
    setPerCandidateEdits({})
    toast("Template saved")
  }

  const heardBack = candidates.filter((c) => c.status !== "pending").length * 8 + 42
  const totalHeardBack = Math.min(heardBack, role.applicantCount)

  if (shortlisted.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16 text-center">
        <p className="text-base font-medium text-text">No shortlisted candidates yet</p>
        <p className="text-sm text-muted mt-1">Go to the Queue and shortlist candidates first</p>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* ── Left: candidate list ─────────────────────────────── */}
      <div className="w-64 flex-shrink-0 border-r border-border bg-surface flex flex-col">
        <div className="flex border-b border-border flex-shrink-0">
          {(["to_send", "sent"] as const).map((t) => (
            <button
              key={t}
              onClick={() => {
                setTab(t)
                setSelected(t === "to_send" ? toSend[0] ?? null : sentList[0] ?? null)
                setEditingEmail(false)
              }}
              className={`flex-1 py-3 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
                tab === t
                  ? "border-accent text-accent"
                  : "border-transparent text-muted hover:text-text"
              }`}
            >
              {t === "to_send" ? "To send" : "Sent"}
              <span
                className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs font-semibold ${
                  tab === t ? "bg-accent-light text-accent" : "bg-bg text-muted"
                }`}
              >
                {t === "to_send" ? toSend.length : sentList.length}
              </span>
            </button>
          ))}
        </div>

        <div className="px-3 py-2 border-b border-border">
          <p className="text-xs text-muted">Names revealed after shortlisting</p>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {displayList.length === 0 ? (
            <div className="flex items-center justify-center h-20">
              <p className="text-xs text-muted">
                {tab === "to_send" ? "All sent" : "Nothing sent yet"}
              </p>
            </div>
          ) : (
            displayList.map((c) => {
              const isSelected = selected?.id === c.id
              return (
                <button
                  key={c.id}
                  onClick={() => { setSelected(c); setEditingEmail(false) }}
                  className={`w-full text-left rounded-xl p-2.5 mb-1 transition-colors cursor-pointer ${
                    isSelected ? "bg-accent-light" : "hover:bg-bg"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-bg border border-border flex items-center justify-center text-xs font-semibold text-muted flex-shrink-0">
                      {c.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-text truncate">{c.name}</p>
                    </div>
                    {sent.has(c.id) ? (
                      <Check size={12} className="text-emerald-500 flex-shrink-0" />
                    ) : (
                      <ChevronRight size={12} className="text-muted flex-shrink-0" />
                    )}
                  </div>
                </button>
              )
            })
          )}
        </div>

        {tab === "to_send" && (
          <div className="p-3 border-t border-border flex-shrink-0">
            <Button
              variant="primary"
              size="sm"
              className="w-full justify-center"
              onClick={handleSendAll}
              disabled={toSend.length === 0}
            >
              <Send size={13} />
              Send all ({toSend.length})
            </Button>
            <p className="text-xs text-muted text-center mt-2">
              {totalHeardBack} of {role.applicantCount} heard back
            </p>
          </div>
        )}
      </div>

      {selected ? (
        <>
          {/* ── Center: invite composer ──────────────────────── */}
          <div className="flex-1 flex flex-col border-r border-border overflow-hidden">
            {/* Composer header */}
            <div className="px-5 py-3.5 border-b border-border flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-sm font-semibold text-text">Invite composer</h2>
                <p className="text-xs text-muted mt-0.5">
                  Shared template · personal line from {selected.name.split(" ")[0]}&apos;s evidence
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setDraftTemplate(template); setEditingTemplate(true) }}
                  className="flex items-center gap-1.5 text-xs text-muted hover:text-text transition-colors cursor-pointer px-2 py-1.5 rounded-lg hover:bg-bg border border-border"
                >
                  <Settings size={12} />
                  Edit template for all invites
                </button>
                <Button
                  size="sm"
                  variant={sent.has(selected.id) ? "secondary" : "primary"}
                  onClick={() => handleSend(selected.id)}
                  disabled={sent.has(selected.id)}
                >
                  {sent.has(selected.id) ? (
                    <><Check size={13} /> Sent</>
                  ) : (
                    <><Send size={13} /> Send</>
                  )}
                </Button>
              </div>
            </div>

            {/* Template editor (overlay) */}
            {editingTemplate && (
              <div className="flex-shrink-0 border-b border-border bg-bg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold text-text">Edit shared template</p>
                    <p className="text-xs text-muted mt-0.5">
                      Use <code className="bg-border px-1 rounded text-xs">{"{first_name}"}</code>{" "}
                      <code className="bg-border px-1 rounded text-xs">{"{role}"}</code>{" "}
                      <code className="bg-border px-1 rounded text-xs">{"{personal_line}"}</code>{" "}
                      <code className="bg-border px-1 rounded text-xs">{"{booking_link}"}</code>
                    </p>
                  </div>
                  <button onClick={() => setEditingTemplate(false)} className="p-1 rounded text-muted hover:text-text cursor-pointer">
                    <X size={14} />
                  </button>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <label className="text-xs font-medium text-muted whitespace-nowrap">Booking link:</label>
                  <input
                    value={bookingLink}
                    onChange={(e) => setBookingLink(e.target.value)}
                    className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-border bg-surface focus:outline-none focus:border-accent/50"
                    placeholder="calendly.com/..."
                  />
                </div>
                <textarea
                  value={draftTemplate}
                  onChange={(e) => setDraftTemplate(e.target.value)}
                  rows={8}
                  className="w-full text-sm text-text bg-surface border border-border rounded-xl p-3 resize-none focus:outline-none focus:border-accent/50 leading-relaxed font-mono text-xs"
                />
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="primary" onClick={saveTemplate}>Save template</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingTemplate(false)}>Cancel</Button>
                </div>
              </div>
            )}

            {/* Subject line + personal line */}
            {!editingTemplate && (
              <div className="mx-5 mt-4 flex flex-col gap-2 flex-shrink-0">
                <div className="p-3 rounded-xl bg-bg border border-border">
                  <p className="text-xs text-muted mb-0.5">Subject</p>
                  <p className="text-sm font-medium text-text">Business Operations Associate at Vittacus: let&apos;s talk</p>
                </div>
                <div className="p-3 rounded-xl bg-accent-light border border-accent/20">
                  <p className="text-xs font-medium text-accent mb-1">Personal line · {selected.name.split(" ")[0]}&apos;s evidence</p>
                  <p className="text-sm text-text leading-relaxed">{selected.personalLine}</p>
                </div>
              </div>
            )}

            {/* Email — view or edit */}
            {!editingTemplate && (
              <div className="flex-1 overflow-y-auto p-5 pt-3">
                {editingEmail ? (
                  <textarea
                    className="w-full h-full min-h-80 text-sm text-text bg-bg border border-accent/30 rounded-xl p-4 resize-none focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 leading-relaxed"
                    style={{ fontFamily: "var(--font-geist-sans)" }}
                    value={getMessageForCandidate(selected)}
                    onChange={(e) =>
                      setPerCandidateEdits((prev) => ({ ...prev, [selected.id]: e.target.value }))
                    }
                    autoFocus
                    onBlur={() => setEditingEmail(false)}
                  />
                ) : (
                  <div
                    onClick={() => setEditingEmail(true)}
                    className="relative min-h-80 text-sm text-text bg-bg border border-border rounded-xl p-4 leading-relaxed whitespace-pre-wrap cursor-text hover:border-accent/30 transition-colors group"
                  >
                    {getMessageForCandidate(selected)}
                    <span className="absolute top-3 right-3 flex items-center gap-1 text-xs text-muted opacity-0 group-hover:opacity-100 transition-opacity">
                      <Pencil size={11} />
                      Click to edit
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Right: email preview ─────────────────────────── */}
          <div className="w-72 flex-shrink-0 overflow-y-auto bg-bg flex flex-col">
            <div className="p-5 flex-1">
              <p className="text-xs font-medium text-muted uppercase tracking-wide mb-4">
                Preview · what {selected.name.split(" ")[0]} receives
              </p>

              <div className="bg-surface rounded-2xl border border-border p-4">
                {/* Email header */}
                <div className="flex items-center gap-2 mb-3 pb-3 border-b border-border">
                  <div className="w-7 h-7 rounded-full bg-accent-light border border-accent/20 flex items-center justify-center text-xs font-semibold text-accent flex-shrink-0">
                    SC
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-text">Sarah Chen</p>
                    <p className="text-xs text-muted truncate">sarah@vittacus.com → {selected.name.split(" ")[0].toLowerCase()}@email.com</p>
                  </div>
                </div>
                {/* Subject line */}
                <p className="text-xs font-semibold text-text mb-3 pb-3 border-b border-border">
                  Business Operations Associate at Vittacus: let&apos;s talk
                </p>

                {/* Email body */}
                <p className="text-xs text-text leading-relaxed whitespace-pre-wrap">
                  {getMessageForCandidate(selected)}
                </p>
              </div>
            </div>

            <div className="p-5 pt-0">
              <div className="flex items-center gap-1.5 p-3 rounded-xl bg-bg border border-border text-xs text-accent font-medium hover:bg-accent-light transition-colors cursor-pointer">
                <span className="flex-1">Track your application status</span>
                <ArrowRight size={12} />
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted">
            {tab === "to_send" ? "All invites sent" : "Select a candidate"}
          </p>
        </div>
      )}

      {/* Next step footer when all sent */}
      {toSend.length === 0 && sentList.length > 0 && (
        <div className="fixed bottom-6 right-6">
          <Link
            href="/closure"
            onClick={() => advanceStep(4)}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-accent text-white text-sm font-semibold shadow-lg hover:opacity-90 transition-opacity"
          >
            Next: Close →
          </Link>
        </div>
      )}
    </div>
  )
}

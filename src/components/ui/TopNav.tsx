"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useDemo } from "@/context/DemoContext"
import { RotateCcw, ChevronDown, Lock, Check } from "lucide-react"
import { useState, useRef, useEffect } from "react"

const STEPS = [
  { label: "Role Setup", href: "/setup", index: 0 },
  { label: "Calibrate", href: "/calibrate", index: 1 },
  { label: "Review", href: "/queue", index: 2 },
  { label: "Invite", href: "/outreach", index: 3 },
  { label: "Close", href: "/closure", index: 4 },
]

const ROLES = [
  { id: "demo", title: "BizOps Associate", company: "Vittacus", count: 487, live: true },
  { id: "sdr", title: "Sales Development Rep", company: "Vittacus", count: 312, live: false },
  { id: "csm", title: "Customer Success Mgr", company: "Vittacus", count: 198, live: false },
]

export function TopNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { resetDemo, maxReachedStep, candidates } = useDemo()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const invitesReady = candidates.filter((c) => c.status === "shortlisted").length
  const [activeRole] = useState(ROLES[0])
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const handleReset = () => {
    resetDemo()
    router.push("/")
  }

  const currentStepIndex = STEPS.findIndex(
    (s) => pathname === s.href || (s.href.length > 1 && pathname.startsWith(s.href))
  )

  return (
    <header className="sticky top-0 z-40 bg-surface/90 backdrop-blur-sm border-b border-border">
      <div className="max-w-[1400px] mx-auto px-6 h-14 flex items-center gap-5">
        {/* Wordmark */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <div className="w-6 h-6 rounded-lg bg-accent flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-sm bg-white" />
          </div>
          <span className="text-sm font-semibold text-text tracking-tight">Pathline</span>
        </Link>

        {/* Role switcher dropdown */}
        <div className="relative flex-shrink-0" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-bg border border-border hover:border-accent/40 transition-colors cursor-pointer"
          >
            <span className="text-xs text-muted">{activeRole.company}</span>
            <span className="text-muted/40 text-xs">·</span>
            <span className="text-xs font-medium text-text">{activeRole.title}</span>
            <span className="text-xs text-muted ml-0.5 tabular-nums">({activeRole.count})</span>
            <ChevronDown size={11} className="text-muted ml-0.5" />
          </button>

          {dropdownOpen && (
            <div className="absolute top-full left-0 mt-1.5 w-64 bg-surface border border-border rounded-xl shadow-lg overflow-hidden z-50">
              {ROLES.map((role) => (
                <button
                  key={role.id}
                  onClick={() => {
                    if (role.live) setDropdownOpen(false)
                  }}
                  className={`w-full text-left flex items-center gap-3 px-4 py-3 border-b border-border last:border-0 transition-colors ${
                    role.live
                      ? "hover:bg-bg cursor-pointer"
                      : "opacity-60 cursor-not-allowed"
                  } ${role.id === activeRole.id ? "bg-accent-light" : ""}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-text">{role.title}</p>
                      {!role.live && (
                        <span className="flex items-center gap-1 text-xs text-muted">
                          <Lock size={10} />
                          Sample only
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted mt-0.5">
                      {role.company} · {role.count} applicants
                    </p>
                  </div>
                  {role.id === activeRole.id && (
                    <div className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Numbered step pills */}
        <nav className="flex items-center gap-0.5 flex-1">
          <Link
            href="/"
            className={`text-xs px-2.5 py-1.5 rounded-lg transition-colors mr-1 ${
              pathname === "/" ? "text-text font-medium" : "text-muted hover:text-text hover:bg-bg"
            }`}
          >
            Home
          </Link>
          <span className="text-border text-xs mr-1">|</span>
          {STEPS.map((step) => {
            const isActive = currentStepIndex === step.index
            const isComplete = step.index < maxReachedStep
            const isInviteStep = step.index === 3
            return (
              <Link
                key={step.href}
                href={step.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-accent-light text-accent"
                    : isComplete
                    ? "text-text hover:bg-bg"
                    : "text-muted hover:text-text hover:bg-bg"
                }`}
              >
                <span
                  className={`flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                    isActive
                      ? "w-4 h-4 rounded-full bg-accent text-white"
                      : isComplete
                      ? "w-4 h-4 rounded-full bg-emerald-500 text-white"
                      : "text-muted"
                  }`}
                >
                  {isComplete ? <Check size={8} /> : step.index + 1}
                </span>
                {step.label}
                {isInviteStep && invitesReady > 0 && (
                  <span className="ml-0.5 min-w-[16px] px-1 py-0.5 rounded-full bg-accent text-white text-[10px] font-bold leading-none text-center">
                    {invitesReady}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span className="text-xs font-medium text-amber-700">Sample data</span>
          </div>
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs text-muted hover:text-text transition-colors cursor-pointer"
          >
            <RotateCcw size={12} />
            Reset demo
          </button>
        </div>
      </div>
    </header>
  )
}

"use client"

import { type ButtonHTMLAttributes, forwardRef } from "react"

type Variant = "primary" | "secondary" | "ghost" | "danger"
type Size = "sm" | "md" | "lg"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-accent text-white hover:bg-accent-hover active:scale-[0.98] shadow-sm",
  secondary:
    "bg-surface text-text border border-border hover:bg-accent-light hover:border-accent/30 active:scale-[0.98]",
  ghost:
    "bg-transparent text-muted hover:bg-border/60 hover:text-text active:scale-[0.98]",
  danger:
    "bg-transparent text-danger border border-danger/30 hover:bg-danger/5 active:scale-[0.98]",
}

const sizeClasses: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs font-medium rounded-lg gap-1.5",
  md: "px-4 py-2 text-sm font-medium rounded-lg gap-2",
  lg: "px-5 py-2.5 text-sm font-semibold rounded-xl gap-2",
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className = "", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    )
  }
)

Button.displayName = "Button"

import { type HTMLAttributes } from "react"

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean
  padding?: "none" | "sm" | "md" | "lg"
}

const paddingClasses = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
}

export function Card({ hover = false, padding = "md", className = "", children, ...props }: CardProps) {
  return (
    <div
      className={`bg-surface rounded-2xl border border-border shadow-sm ${paddingClasses[padding]} ${hover ? "transition-shadow duration-200 hover:shadow-md" : ""} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

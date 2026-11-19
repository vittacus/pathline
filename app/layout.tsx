import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { DemoProvider } from "@/context/DemoContext"
import { ToastProvider } from "@/components/ui/Toast"
import { TopNav } from "@/components/ui/TopNav"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Pathline — Recruiter Demo",
  description: "Pathline prototype: recruiter-side hiring tool",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-bg antialiased">
        <DemoProvider>
          <ToastProvider>
            <TopNav />
            <main className="flex-1">{children}</main>
          </ToastProvider>
        </DemoProvider>
      </body>
    </html>
  )
}

interface EvidenceCardProps {
  source: "resume" | "proof_answer"
  quote: string
  masked?: boolean // when "hide names & schools" is on
  traitLabel?: string
}

function maskSchools(text: string): string {
  return text
    .replace(/\b(at |from )?(Harvard|Stanford|MIT|Yale|Princeton|Columbia|Penn|Cornell|Dartmouth|Brown|Duke|Northwestern|Georgetown|UCLA|Berkeley|USC|NYU|Michigan|UPenn|Carnegie Mellon|Caltech|Johns Hopkins|Vanderbilt|Rice|Notre Dame|Emory|Washington University|Tufts|Tulane|Wellesley|Amherst|Williams|Pomona|Swarthmore|Bowdoin|Middlebury|Colby|Hamilton|Colgate|Vassar|Wesleyan|Davidson|Furman|Wake Forest|UNC|UVA|Virginia|Georgia Tech|Illinois|Wisconsin|Minnesota|Ohio State|Penn State|Purdue|Indiana|Michigan State|Texas|UT Austin|UC San Diego|UC Davis|UC Santa Barbara|UC Irvine|UC Santa Cruz|SUNY|CUNY|City University|State University)\b/gi,
      (match, prefix) => (prefix ? prefix + "[University]" : "[University]")
    )
    .replace(/\b[A-Z][a-z]+ (University|College|Institute of Technology|School)\b/g, "[University]")
}

export function EvidenceCard({ source, quote, masked = false, traitLabel }: EvidenceCardProps) {
  const displayQuote = masked ? maskSchools(quote) : quote

  return (
    <div className="rounded-xl border border-border bg-bg p-3.5 flex flex-col gap-2">
      <p className="text-sm text-text leading-relaxed">&ldquo;{displayQuote}&rdquo;</p>
      <div className="flex items-center gap-1.5 flex-wrap">
        {source === "proof_answer" ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-accent-light text-accent border border-accent/20">
            <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block" />
            Short answer
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block" />
            Resume
          </span>
        )}
        {traitLabel && (
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-bg border border-border text-muted mt-1 inline-block">
            {traitLabel}
          </span>
        )}
      </div>
    </div>
  )
}

"use client"

import { useMemo, useState } from "react"
import { ArrowDownUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { RefundCase } from "@/types/refund-case.types"
import { PARTY, PrivateBadge, fmtDateTime, timelineIcon } from "./meta"

const FILTERS = [
  { v: "ALL", label: "Everything" },
  { v: "CASE", label: "Our investigation" },
  { v: "CHAT", label: "Chat messages" },
  { v: "ORDER", label: "Before the problem" },
] as const

export function TimelineTab({ c }: { c: RefundCase }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["v"]>("ALL")
  const [newestFirst, setNewestFirst] = useState(true)

  const rows = useMemo(() => {
    const list = c.timeline.filter((t) => filter === "ALL" || t.group === filter)
    return newestFirst ? [...list].reverse() : list
  }, [c.timeline, filter, newestFirst])

  const days: { day: string; items: typeof rows }[] = []
  for (const r of rows) {
    const day = new Date(r.at).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    const last = days[days.length - 1]
    if (last?.day === day) last.items.push(r)
    else days.push({ day, items: [r] })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
        <div>
          <p className="text-base font-semibold">Everything that happened, in order</p>
          <p className="text-sm text-muted-foreground">Every call, note, proof, message and decision — with who did it and when. The customer can’t see most of this.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setNewestFirst(!newestFirst)}><ArrowDownUp className="mr-1.5 h-3.5 w-3.5" />{newestFirst ? "Newest first" : "Oldest first"}</Button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button key={f.v} type="button" onClick={() => setFilter(f.v)} className={cn("rounded-full border px-3 py-1 text-sm", filter === f.v ? "border-primary bg-primary/5 font-medium" : "text-muted-foreground hover:bg-muted/50")}>{f.label}</button>
        ))}
      </div>

      {days.length === 0 && <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">Nothing here yet.</p>}

      {days.map(({ day, items }) => (
        <section key={day}>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{day}</h3>
          <ol className="relative space-y-4 border-l-2 pl-6">
            {items.map((t) => {
              const I = timelineIcon(t.type)
              const P = t.party ? PARTY[t.party] : null
              return (
                <li key={t.id} className="relative">
                  <span className={cn("absolute -left-[39px] flex h-7 w-7 items-center justify-center rounded-full border bg-background", I.tone)}><I.icon className="h-3.5 w-3.5" /></span>
                  <div className="rounded-lg border bg-card p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="text-sm font-medium">{t.title}</p>
                      <span className="shrink-0 text-xs text-muted-foreground">{fmtDateTime(t.at).split(", ").pop()}</span>
                    </div>
                    {t.body && <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{t.body}</p>}
                    {t.meta?.recordingUrl && <audio src={t.meta.recordingUrl} controls className="mt-2 h-8 w-full" />}
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                      {t.actor && <span>by {t.actor}</span>}
                      {P && <span className={cn("rounded-full border px-2 py-0.5", P.chip)}>{P.short}</span>}
                      {t.internal && <PrivateBadge />}
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>
        </section>
      ))}
    </div>
  )
}

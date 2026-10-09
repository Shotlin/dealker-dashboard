"use client"

/**
 * QC for one listing: current decision, the live result of every automatic
 * rule, manual Pass / Recheck / Fail (with a note the seller can act on) and
 * the append-only history.
 */

import { useState } from "react"
import { CheckCircle2, MinusCircle, ShieldAlert, ShieldCheck, Wand2, XCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { useQcActions, useQcDetail } from "@/hooks/useQc"
import { formatDateTime } from "@/lib/utils"
import type { QcStatus } from "@/services/qc.service"
import { QcBadge } from "./QcBadge"

const MODE_LABEL = { MANUAL: "Manual", AUTO: "Automatic", RESET: "Reset" } as const

export function QcPanel({ listingId }: { listingId: string }) {
  const { data: d, isLoading } = useQcDetail(listingId)
  const actions = useQcActions()
  const [pending, setPending] = useState<QcStatus | null>(null)
  const [notes, setNotes] = useState("")

  if (isLoading || !d) return <Skeleton className="h-40 w-full" />

  const needsNote = pending === "QC_FAILED" || pending === "QC_RECHECK"
  const submit = () => {
    if (!pending) return
    actions.setStatus.mutate({ id: listingId, status: pending, notes: notes.trim() || undefined }, {
      onSuccess: () => { setPending(null); setNotes("") },
    })
  }

  return (
    <div className="space-y-4" data-testid="qc-panel">
      <div className="flex flex-wrap items-center gap-2">
        <QcBadge status={d.qc_status} score={d.qc_score} />
        {d.qc_mode && <Badge variant="outline" className="text-[11px]">{MODE_LABEL[d.qc_mode]}</Badge>}
        {d.qc_checked_at && (
          <span className="text-xs text-muted-foreground">
            {formatDateTime(d.qc_checked_at)}{d.qc_checked_by_name ? ` · ${d.qc_checked_by_name}` : ""}
          </span>
        )}
        <Button size="sm" variant="outline" className="ml-auto h-8" disabled={actions.runAuto.isPending}
          onClick={() => actions.runAuto.mutate(listingId)}>
          <Wand2 className="mr-1.5 h-3.5 w-3.5" />Run automatic QC
        </Button>
      </div>

      {d.qc_notes && d.qc_status !== "QC_PASSED" && (
        <p className="rounded-lg border bg-muted/40 p-3 text-sm">{d.qc_notes}</p>
      )}

      <div className="rounded-lg border">
        <div className="flex items-center justify-between border-b px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <span>Automatic checks (live)</span>
          <span>Would be: {d.live.status.replace("QC_", "").toLowerCase()} · {d.live.score}%</span>
        </div>
        <ul className="divide-y">
          {d.live.results.map((r) => (
            <li key={r.key} className="flex items-start gap-2 px-3 py-2 text-sm" data-testid={`qc-rule-${r.key}`}>
              {r.status === "PASS" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                : r.status === "FAIL" ? <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                : <MinusCircle className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />}
              <div className="min-w-0 flex-1">
                <p className="font-medium">{r.label}{r.required && <span className="ml-1.5 text-[10px] font-semibold uppercase text-red-600">required</span>}</p>
                <p className="text-xs text-muted-foreground">{r.detail}</p>
              </div>
              <span className="text-xs tabular-nums text-muted-foreground">{r.status === "SKIP" ? "n/a" : `${r.weight} pts`}</span>
            </li>
          ))}
          {d.live.results.length === 0 && <li className="px-3 py-3 text-sm text-muted-foreground">All automatic rules are switched off.</li>}
        </ul>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Manual decision</p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant={pending === "QC_PASSED" ? "default" : "outline"} onClick={() => setPending("QC_PASSED")}>
            <ShieldCheck className="mr-1.5 h-4 w-4 text-emerald-600" />Pass
          </Button>
          <Button size="sm" variant={pending === "QC_RECHECK" ? "default" : "outline"} onClick={() => setPending("QC_RECHECK")}>
            <ShieldAlert className="mr-1.5 h-4 w-4 text-amber-600" />Recheck
          </Button>
          <Button size="sm" variant={pending === "QC_FAILED" ? "default" : "outline"} onClick={() => setPending("QC_FAILED")}>
            <XCircle className="mr-1.5 h-4 w-4 text-red-600" />Fail
          </Button>
        </div>
        {pending && (
          <div className="space-y-2">
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder={needsNote ? "What should the seller fix? (required)" : "Note (optional)"} />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => { setPending(null); setNotes("") }}>Cancel</Button>
              <Button size="sm" disabled={(needsNote && notes.trim().length < 5) || actions.setStatus.isPending} onClick={submit}>
                Save as {pending.replace("QC_", "").toLowerCase()}
              </Button>
            </div>
          </div>
        )}
      </div>

      {d.events.length > 0 && (
        <details className="rounded-lg border">
          <summary className="cursor-pointer px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">History ({d.events.length})</summary>
          <ul className="divide-y">
            {d.events.map((e) => (
              <li key={e.id} className="px-3 py-2 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <QcBadge status={e.to_status} score={e.score} />
                  <span className="text-xs text-muted-foreground">{MODE_LABEL[e.mode]}{e.actor_name ? ` · ${e.actor_name}` : ""} · {formatDateTime(e.created_at)}</span>
                </div>
                {e.notes && <p className="mt-1 text-xs text-muted-foreground">{e.notes}</p>}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}

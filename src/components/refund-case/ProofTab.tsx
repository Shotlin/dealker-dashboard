"use client"

import { useState } from "react"
import { ExternalLink, Plus, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { useCaseActions } from "@/hooks/useRefundCase"
import type { CaseEvidence, EvidenceReview, Party, RefundCase } from "@/types/refund-case.types"
import { KIND, ORIGIN_LABEL, PARTY, REVIEW, fmtDateTime } from "./meta"

function Thumb({ e, className }: { e: CaseEvidence; className?: string }) {
  const K = KIND[e.kind]
  return (
    <div className={cn("flex items-center justify-center overflow-hidden rounded-lg border bg-muted", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {e.kind === "IMAGE" ? <img src={e.url} alt={e.title} className="h-full w-full object-cover" loading="lazy" /> : <K.icon className="h-6 w-6 text-muted-foreground" />}
    </div>
  )
}

function ReviewChip({ review }: { review: EvidenceReview }) {
  const R = REVIEW[review]
  return <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium", R.tone)}><R.icon className="h-3 w-3" />{R.short}</span>
}

function EvidenceCard({ e, onOpen }: { e: CaseEvidence; onOpen: () => void }) {
  const K = KIND[e.kind]
  return (
    <button type="button" onClick={onOpen} className="flex w-full gap-3 rounded-lg border bg-card p-2.5 text-left transition-colors hover:bg-muted/40">
      <Thumb e={e} className="h-16 w-16 shrink-0" />
      <span className="min-w-0 flex-1 space-y-1">
        <span className="line-clamp-2 block text-sm font-medium leading-snug">{e.title}</span>
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground"><K.icon className="h-3 w-3" />{K.label}<span>·</span>{ORIGIN_LABEL[e.origin]}</span>
        <ReviewChip review={e.review} />
      </span>
    </button>
  )
}

function Viewer({ e, caseId, open, onClose, locked }: { e: CaseEvidence | null; caseId: string; open: boolean; onClose: () => void; locked: boolean }) {
  const { reviewEvidence, removeEvidence } = useCaseActions(caseId)
  const [note, setNote] = useState("")
  if (!e) return null
  const reviewable = e.origin === "CASE"
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onClose(); setNote("") } }}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="pr-6">{e.title}</DialogTitle>
          <DialogDescription>{PARTY[e.side].label} · {ORIGIN_LABEL[e.origin]}{e.added_by ? ` · ${e.added_by}` : ""}{e.added_at ? ` · ${fmtDateTime(e.added_at)}` : ""}</DialogDescription>
        </DialogHeader>

        <div className="overflow-hidden rounded-lg border bg-muted/40">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {e.kind === "IMAGE" && <img src={e.url} alt={e.title} className="mx-auto max-h-[55vh] object-contain" />}
          {e.kind === "VIDEO" && <video src={e.url} controls className="mx-auto max-h-[55vh] w-full" />}
          {e.kind === "AUDIO" && <div className="p-6"><audio src={e.url} controls className="w-full" /></div>}
          {(e.kind === "DOCUMENT" || e.kind === "INVOICE") && (
            <div className="flex flex-col items-center gap-3 p-8 text-sm text-muted-foreground"><Thumb e={e} className="h-16 w-16" />This file opens in a new tab.</div>
          )}
        </div>
        {e.note && <p className="rounded-lg bg-muted/50 p-3 text-sm">{e.note}</p>}
        <a href={e.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">Open the original file<ExternalLink className="h-3.5 w-3.5" /></a>

        {reviewable && !locked ? (
          <div className="space-y-3 border-t pt-4">
            <div>
              <p className="text-sm font-medium">After looking at this, what does it show?</p>
              <p className="text-xs text-muted-foreground">Your answer is private. It helps whoever decides the case.</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {(["SUPPORTS_CUSTOMER", "SUPPORTS_SELLER", "NOT_USEFUL"] as const).map((rv) => {
                const R = REVIEW[rv]
                return (
                  <Button key={rv} variant="outline" disabled={reviewEvidence.isPending} className={cn("h-auto justify-start gap-2 py-2.5", e.review === rv && R.tone)}
                    onClick={() => reviewEvidence.mutate({ evidenceId: e.id, review: rv, note: note.trim() || undefined })}>
                    <R.icon className="h-4 w-4 shrink-0" />{R.label}
                  </Button>
                )
              })}
            </div>
            <Textarea rows={2} value={note} onChange={(ev) => setNote(ev.target.value)} placeholder={e.review_note ? `Earlier note: ${e.review_note}` : "What did you notice? (optional)"} />
            {e.review !== "UNREVIEWED" && <p className="text-xs text-muted-foreground">Marked “{REVIEW[e.review].label}” by {e.reviewed_by ?? "someone"} on {fmtDateTime(e.reviewed_at)}.</p>}
            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" disabled={removeEvidence.isPending} onClick={() => removeEvidence.mutate(e.id, { onSuccess: onClose })}><Trash2 className="mr-1.5 h-3.5 w-3.5" />Remove this proof</Button>
          </div>
        ) : !reviewable ? (
          <p className="border-t pt-3 text-xs text-muted-foreground">This file came from the order itself, so it can’t be changed. To mark what it shows, add it again as proof using “Add proof”.</p>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

const COLUMNS: { side: Party; empty: string }[] = [
  { side: "CUSTOMER", empty: "Nothing from the customer yet. Ask them for photos or a video, then add it here." },
  { side: "SELLER", empty: "Nothing from the seller yet. Ask what they packed and how." },
  { side: "COURIER", empty: "No courier proof. Tracking appears here when the parcel has a tracking page." },
  { side: "TEAM", empty: "Nothing added by our team yet." },
]

export function ProofTab({ c, onAdd }: { c: RefundCase; onAdd: (side: Party) => void }) {
  const [openId, setOpenId] = useState<string | null>(null)
  const locked = c.request.status !== "PENDING"
  const counts = {
    cust: c.evidence.filter((e) => e.review === "SUPPORTS_CUSTOMER").length,
    sell: c.evidence.filter((e) => e.review === "SUPPORTS_SELLER").length,
    unchecked: c.evidence.filter((e) => e.review === "UNREVIEWED" && e.origin === "CASE").length,
  }
  const open = c.evidence.find((e) => e.id === openId) ?? null

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
        <div>
          <p className="text-base font-semibold">What does the proof say so far?</p>
          <p className="text-sm text-muted-foreground">Open each file, look at it, and mark who it helps.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-800">{counts.cust} help the customer</Badge>
          <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-900">{counts.sell} help the seller</Badge>
          {counts.unchecked > 0 && <Badge variant="outline">{counts.unchecked} still to check</Badge>}
          {!locked && <Button onClick={() => onAdd("CUSTOMER")}><Plus className="mr-1.5 h-4 w-4" />Add proof</Button>}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {COLUMNS.map(({ side, empty }) => {
          const list = c.evidence.filter((e) => e.side === side)
          const P = PARTY[side]
          return (
            <section key={side} className={cn("rounded-xl border border-t-4 bg-card p-4", P.bar)}>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-semibold"><P.icon className="h-4 w-4" />From {P.label.toLowerCase()} <span className="font-normal text-muted-foreground">({list.length})</span></h3>
                {!locked && <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => onAdd(side)}><Plus className="mr-1 h-3 w-3" />Add</Button>}
              </div>
              {list.length === 0 ? <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">{empty}</p> : (
                <div className="space-y-2">{list.map((e) => <EvidenceCard key={e.id} e={e} onOpen={() => setOpenId(e.id)} />)}</div>
              )}
            </section>
          )
        })}
      </div>

      <Viewer e={open} caseId={c.request.id} open={Boolean(open)} onClose={() => setOpenId(null)} locked={locked} />
    </div>
  )
}

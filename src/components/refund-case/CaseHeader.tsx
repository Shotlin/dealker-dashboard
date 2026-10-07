"use client"

import Link from "next/link"
import { ArrowLeft, CalendarClock, Check, MessageCircle, Undo2, UserCog } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useStartConversation } from "@/hooks/useSupport"
import { cn } from "@/lib/utils"
import type { RefundCase } from "@/types/refund-case.types"
import { DecisionButtons } from "./DecisionButtons"
import { CASE_STATUS, deadlineText, fmtDate, fmtDateTime, inr } from "./meta"

const REQUEST_BADGE = {
  PENDING: { label: "Waiting for a decision", cls: "bg-amber-50 text-amber-800 border-amber-200" },
  APPROVED: { label: "Refund approved", cls: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  REJECTED: { label: "Refund rejected", cls: "bg-red-50 text-red-700 border-red-200" },
  CANCELLED: { label: "Customer cancelled", cls: "bg-slate-100 text-slate-600 border-slate-200" },
} as const

/** The four big steps every refund goes through. */
function Steps({ c }: { c: RefundCase }) {
  const s = c.request.status
  const inv = c.investigation.status
  const decided = s !== "PENDING"
  const current = decided ? (s === "APPROVED" ? 3 : 2) : inv === "NOT_STARTED" ? 0 : 1
  const steps = [
    { label: "Request received", sub: fmtDate(c.request.created_at) },
    { label: "We investigate", sub: inv === "NOT_STARTED" ? "Not started" : c.investigation.started_at ? `Since ${fmtDate(c.investigation.started_at)}` : "" },
    { label: s === "REJECTED" ? "Rejected" : s === "CANCELLED" ? "Cancelled" : "Decision", sub: decided ? fmtDate(c.request.resolved_at) : "Approve or reject" },
    { label: "Money returned", sub: s === "APPROVED" ? `${inr(c.request.amount)} ${c.request.refund_to === "wallet" ? "to wallet" : "to original method"}` : "After approval" },
  ]
  return (
    <ol className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {steps.map((st, i) => {
        const done = i < current || (i === 3 && s === "APPROVED")
        const active = i === current && !(i === 3 && s === "APPROVED")
        const bad = i === 2 && (s === "REJECTED" || s === "CANCELLED")
        return (
          <li key={st.label} className="flex items-start gap-2.5">
            <span className={cn("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold",
              bad ? "border-red-400 bg-red-50 text-red-600" : done ? "border-primary bg-primary text-primary-foreground" : active ? "border-primary bg-white text-primary" : "border-border bg-white text-muted-foreground")}>
              {done && !bad ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span className="min-w-0"><span className={cn("block text-sm", (done || active) ? "font-medium" : "text-muted-foreground")}>{st.label}</span><span className="block truncate text-xs text-muted-foreground">{st.sub}</span></span>
          </li>
        )
      })}
    </ol>
  )
}

export function CaseHeader({ c, onOpenChat }: { c: RefundCase; onOpenChat: () => void }) {
  const r = c.request
  const inv = c.investigation
  const startChat = useStartConversation()
  const badge = REQUEST_BADGE[r.status]
  const st = CASE_STATUS[inv.status]
  const what = r.scope === "ALL" ? "the whole order" : `${c.products.filter((p) => p.disputed).length || "some"} item(s)`
  const open = r.status === "PENDING"

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" asChild className="-ml-2"><Link href="/refund-requests"><ArrowLeft className="mr-1.5 h-4 w-4" />All refund requests</Link></Button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <Undo2 className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-semibold tracking-tight">Refund case · {r.order.number}</h1>
            <Badge variant="outline" className={cn("text-xs font-medium", badge.cls)}>{badge.label}</Badge>
            {open && <Badge variant="outline" className={cn("text-xs font-medium", st.tone)}>{st.label}</Badge>}
          </div>
          <p className="max-w-3xl text-base leading-relaxed">
            <b>{r.customer.name ?? "The customer"}</b> {r.source === "ADMIN" ? "was helped by our team to ask" : "asked"} for <b>{inr(r.claimed_amount)}</b> back for <b>{what}</b>. Their reason: <span className="text-muted-foreground">“{r.reason}”</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" disabled={startChat.isPending} onClick={() => startChat.mutate({ refundRequestId: r.id }, { onSuccess: onOpenChat })}>
            <MessageCircle className="mr-1.5 h-4 w-4" />Chat with customer
          </Button>
          <DecisionButtons c={c} />
        </div>
      </div>

      {open && (
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5"><UserCog className="h-4 w-4 text-muted-foreground" />In charge: <b>{inv.owner?.name ?? "Nobody yet"}</b></span>
          <span className={cn("inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5", inv.overdue ? "border-red-300 bg-red-50 text-red-700" : "bg-card")}>
            <CalendarClock className="h-4 w-4" />Deadline: <b>{inv.due_at ? `${fmtDateTime(inv.due_at)} (${deadlineText(inv.hours_left)})` : "not set"}</b>
          </span>
        </div>
      )}

      {r.status === "REJECTED" && r.admin_note && <p className="rounded-lg border bg-muted/40 p-3 text-sm"><b>Message sent to the customer:</b> {r.admin_note}</p>}
      {r.last_error && open && <p className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">Last attempt to send the money failed: {r.last_error}</p>}

      <Card className="shadow-none"><CardContent className="p-4"><Steps c={c} /></CardContent></Card>
    </div>
  )
}

"use client"

import { useState } from "react"
import { Check, Clock, PackageX, Plus, RotateCcw, ShieldCheck, Undo2, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { useOrderReturnActions } from "@/hooks/useOrderReturns"
import { useReturnJourney } from "@/hooks/useReturnJourney"
import { ReturnJourneyPanel } from "./ReturnJourneyPanel"
import type { OrderOverview } from "@/types/order-overview.types"
import { day, dayTime, money } from "./helpers"

type Refund = OrderOverview["problems"]["refunds"][number]

const STATE: Record<string, { label: string; cls: string; icon: React.ElementType; help: string }> = {
  PENDING: { label: "Waiting for your decision", cls: "bg-amber-50 text-amber-800 border-amber-200", icon: Clock, help: "Nothing has been refunded yet." },
  PROCESSING: { label: "Being processed", cls: "bg-amber-50 text-amber-800 border-amber-200", icon: Clock, help: "The refund is being processed." },
  APPROVED: { label: "Approved — money returned", cls: "bg-emerald-50 text-emerald-800 border-emerald-200", icon: ShieldCheck, help: "The customer has been refunded." },
  REJECTED: { label: "Declined", cls: "bg-slate-100 text-slate-700 border-slate-200", icon: X, help: "No money was returned." },
  CANCELLED: { label: "Cancelled", cls: "bg-slate-100 text-slate-700 border-slate-200", icon: X, help: "The customer withdrew this request." },
}

function Step({ done, active, label, sub }: { done: boolean; active?: boolean; label: string; sub?: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2", done ? "border-primary bg-primary text-primary-foreground" : active ? "border-primary bg-white" : "border-border bg-white")}>
        {done && <Check className="h-3 w-3" />}
      </span>
      <span><span className={cn("block text-sm", done || active ? "font-medium" : "text-muted-foreground")}>{label}</span>{sub && <span className="block text-xs text-muted-foreground">{sub}</span>}</span>
    </li>
  )
}

function RefundCard({ r, orderId }: { r: Refund; orderId: string }) {
  const { approve, reject } = useOrderReturnActions()
  const [mode, setMode] = useState<"approve" | "reject" | null>(null)
  const [dest, setDest] = useState<"wallet" | "original">(r.refund_destination === "WALLET" ? "wallet" : "original")
  const [note, setNote] = useState("")
  const st = STATE[r.status] ?? STATE.PENDING
  const open = ["PENDING", "PROCESSING"].includes(r.status)
  const approved = r.status === "APPROVED"
  const closed = ["REJECTED", "CANCELLED"].includes(r.status)
  void orderId
  const journeyQ = useReturnJourney(r.id)
  const qc = journeyQ.data?.qc ?? null
  const refundNow = qc?.price_status === "ACCEPTED" && qc.revised_price != null ? qc.revised_price : r.computed_amount
  const priceBlocked = qc != null && (qc.price_status === "PROPOSED" || qc.price_status === "CLARIFICATION")

  return (
    <div className="space-y-4 rounded-xl border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="flex items-center gap-2 text-base font-semibold"><Undo2 className="h-4 w-4" />{r.scope === "FULL_ORDER" ? "Return of the whole order" : "Return of some items"}</p>
          <p className="text-xs text-muted-foreground">Started by {r.source === "ADMIN" ? "your team" : "the customer"} on {day(r.created_at)}</p>
        </div>
        <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium", st.cls)}><st.icon className="h-3.5 w-3.5" />{st.label}</span>
      </div>

      <div className="rounded-lg bg-muted/50 p-3 text-sm">
        <p className="text-xs font-medium text-muted-foreground">Why the customer wants to return it</p>
        <p className="mt-0.5">“{r.reason}”</p>
      </div>

      {r.evidence && r.evidence.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Photos and video the customer sent</p>
          <div className="flex flex-wrap gap-2">
            {r.evidence.map((e, k) => e.kind === "VIDEO"
              ? <video key={k} src={e.url} controls preload="metadata" className="h-32 rounded-lg border bg-black" />
              : <a key={k} href={e.url} target="_blank" rel="noreferrer"><img src={e.url} alt={`Customer photo ${k + 1}`} className="h-32 rounded-lg border bg-white object-contain" /></a>)}
          </div>
        </div>
      )}

      {r.items && r.items.length > 0 && (
        <ul className="divide-y rounded-lg border text-sm">
          {r.items.map((i, k) => <li key={k} className="flex justify-between gap-3 p-2.5"><span><PackageX className="mr-1.5 inline h-3.5 w-3.5 text-muted-foreground" />{i.quantity} × {i.name}</span><span className="tabular-nums">{money(i.total)}</span></li>)}
        </ul>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Amount to refund</p>
          <p className="text-xl font-semibold tabular-nums">{money(r.resolved_amount ?? refundNow)}</p>
          <p className="text-xs text-muted-foreground">{approved ? `Sent to ${r.refund_destination === "WALLET" ? "the customer’s Dealker wallet (instantly)" : "the original payment method (5–7 working days)"}` : "Goes back to the customer once you approve."}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">What the seller loses</p>
          <p className="text-xl font-semibold tabular-nums">{approved ? money(r.seller_reversal) : "—"}</p>
          <p className="text-xs text-muted-foreground">{approved ? "Taken back from the seller’s balance (their sale minus Dealker’s commission)." : "When approved, the seller’s earnings for these items are reversed."}</p>
        </div>
      </div>

      <ReturnJourneyPanel refundId={r.id} journey={journeyQ.data} open={open} originalPrice={r.computed_amount} />

      <ol className="space-y-3 border-l-2 border-dashed pl-4 [&>li]:relative">
        <Step done label="Return requested" sub={dayTime(r.created_at)} />
        <Step done={approved || closed} active={open} label={open ? "Waiting for your decision" : approved ? "Approved" : r.status === "REJECTED" ? "Declined" : "Cancelled"}
          sub={r.resolved_at ? `${dayTime(r.resolved_at)}${r.resolved_by_name ? ` by ${r.resolved_by_name}` : ""}` : undefined} />
        <Step done={approved} label={approved ? "Money returned to the customer" : "Money returned"} sub={r.refunded_at ? dayTime(r.refunded_at) : undefined} />
      </ol>
      {r.admin_notes && <p className="rounded-lg bg-muted/50 p-3 text-sm"><span className="text-xs font-medium text-muted-foreground">Your team’s note: </span>{r.admin_notes}</p>}

      {open && (
        <div className="space-y-3 border-t pt-4">
          {priceBlocked && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">The refund can be approved once the customer accepts the revised price of {money(qc!.revised_price ?? 0)}.</p>}
          {mode === null && (
            <div className="flex flex-wrap gap-2">
              <Button disabled={priceBlocked} onClick={() => setMode("approve")}><Check className="mr-1.5 h-4 w-4" />Approve & refund {money(refundNow)}</Button>
              <Button variant="outline" className="text-red-600" onClick={() => setMode("reject")}><X className="mr-1.5 h-4 w-4" />Decline</Button>
            </div>
          )}
          {mode === "approve" && (
            <div className="space-y-3 rounded-lg bg-muted/40 p-4">
              <p className="text-sm font-medium">Where should the {money(refundNow)} go?</p>
              <RadioGroup value={dest} onValueChange={(v) => setDest(v as typeof dest)} className="space-y-2">
                {([["wallet", "Dealker wallet", "Instant. The customer can use it on their next order."], ["original", "Original payment method", "Back to the card / UPI they paid with. Takes 5–7 working days."]] as const).map(([v, t, d]) => (
                  <Label key={v} htmlFor={`${r.id}-${v}`} className="flex cursor-pointer items-start gap-3 rounded-lg border bg-white p-3 font-normal has-[:checked]:border-primary">
                    <RadioGroupItem id={`${r.id}-${v}`} value={v} className="mt-1" /><span><span className="block text-sm font-medium">{t}</span><span className="text-xs text-muted-foreground">{d}</span></span>
                  </Label>
                ))}
              </RadioGroup>
              <p className="text-xs text-muted-foreground">Approving also reverses the seller’s earnings for this return and marks the order as refunded. This can’t be undone.</p>
              <div className="flex gap-2">
                <Button disabled={approve.isPending} onClick={() => approve.mutate({ id: r.id, refundTo: dest })}>Confirm refund</Button>
                <Button variant="ghost" onClick={() => setMode(null)}>Back</Button>
              </div>
            </div>
          )}
          {mode === "reject" && (
            <div className="space-y-3 rounded-lg bg-muted/40 p-4">
              <p className="text-sm font-medium">Why are you declining? The customer will see this.</p>
              <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. The return window of 7 days is over." />
              <div className="flex gap-2">
                <Button variant="destructive" disabled={!note.trim() || reject.isPending} onClick={() => reject.mutate({ id: r.id, adminNote: note })}>Decline request</Button>
                <Button variant="ghost" onClick={() => setMode(null)}>Back</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function StartReturnDialog({ d, open, onClose }: { d: OrderOverview; open: boolean; onClose: () => void }) {
  const { create } = useOrderReturnActions()
  const [scope, setScope] = useState<"FULL_ORDER" | "ITEMS">("FULL_ORDER")
  const [picked, setPicked] = useState<string[]>([])
  const [reason, setReason] = useState("")
  const [dest, setDest] = useState<"WALLET" | "RAZORPAY">("WALLET")
  const items = d.sellers.flatMap((s) => s.items.map((i) => ({ ...i, seller: s.vendor.name })))
  const amount = scope === "FULL_ORDER" ? d.payment.breakdown.total : items.filter((i) => picked.includes(i.id)).reduce((t, i) => t + i.subtotal, 0)
  const ready = reason.trim().length >= 3 && (scope === "FULL_ORDER" || picked.length > 0)
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Start a return for this customer</DialogTitle>
          <DialogDescription>Use this when the customer asked you by phone or chat. It appears below as “waiting for your decision”.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <RadioGroup value={scope} onValueChange={(v) => setScope(v as typeof scope)} className="grid grid-cols-2 gap-2">
            {([["FULL_ORDER", "Whole order"], ["ITEMS", "Only some items"]] as const).map(([v, t]) => (
              <Label key={v} htmlFor={`sc-${v}`} className="flex cursor-pointer items-center gap-2 rounded-lg border p-3 font-normal has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                <RadioGroupItem id={`sc-${v}`} value={v} />{t}
              </Label>
            ))}
          </RadioGroup>
          {scope === "ITEMS" && (
            <ul className="divide-y rounded-lg border">
              {items.map((i) => (
                <li key={i.id}>
                  <Label className="flex cursor-pointer items-center gap-3 p-3 font-normal">
                    <Checkbox checked={picked.includes(i.id)} onCheckedChange={(c) => setPicked((p) => (c ? [...p, i.id] : p.filter((x) => x !== i.id)))} />
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{i.name}</span><span className="text-xs text-muted-foreground">{i.quantity} × {money(i.unit_price)} · sold by {i.seller}</span></span>
                    <span className="text-sm tabular-nums">{money(i.subtotal)}</span>
                  </Label>
                </li>
              ))}
            </ul>
          )}
          <div className="space-y-1.5"><Label>Reason *</Label><Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="What did the customer say? e.g. Screen arrived cracked." /></div>
          <div className="space-y-1.5">
            <Label>Refund to</Label>
            <RadioGroup value={dest} onValueChange={(v) => setDest(v as typeof dest)} className="grid grid-cols-2 gap-2">
              {([["WALLET", "Dealker wallet"], ["RAZORPAY", "Original payment"]] as const).map(([v, t]) => (
                <Label key={v} htmlFor={`ds-${v}`} className="flex cursor-pointer items-center gap-2 rounded-lg border p-3 font-normal has-[:checked]:border-primary has-[:checked]:bg-primary/5"><RadioGroupItem id={`ds-${v}`} value={v} />{t}</Label>
              ))}
            </RadioGroup>
          </div>
          <p className="rounded-lg bg-muted/50 p-3 text-sm">Refund amount: <b className="tabular-nums">{money(amount)}</b></p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button disabled={!ready || create.isPending} onClick={() => create.mutate({ orderId: d.order.id, scope, reason: reason.trim(), orderItemIds: scope === "ITEMS" ? picked : undefined, destination: dest }, { onSuccess: onClose })}>Start return</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ReturnsSection({ d }: { d: OrderOverview }) {
  const [starting, setStarting] = useState(false)
  const refunds = d.problems.refunds
  const canStart = refunds.every((r) => !["PENDING", "PROCESSING", "APPROVED"].includes(r.status)) && !["CANCELLED"].includes(d.order.status)
  const pending = refunds.filter((r) => ["PENDING", "PROCESSING"].includes(r.status)).length

  return (
    <Card className={cn("shadow-none", pending > 0 && "border-amber-300")}>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base"><RotateCcw className="h-4 w-4" />Returns & refunds
          {pending > 0 && <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">{pending} need{pending === 1 ? "s" : ""} a decision</Badge>}
        </CardTitle>
        {canStart && <Button size="sm" variant="outline" onClick={() => setStarting(true)}><Plus className="mr-1.5 h-3.5 w-3.5" />Start a return</Button>}
      </CardHeader>
      <CardContent className="space-y-4">
        {refunds.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-8 text-center">
            <Undo2 className="h-7 w-7 text-muted-foreground/60" />
            <p className="text-sm font-medium">No return or refund on this order</p>
            <p className="max-w-sm text-xs text-muted-foreground">If the customer wants to send something back, they ask in the app — or you can start it for them above.</p>
          </div>
        ) : refunds.map((r) => <RefundCard key={r.id} r={r} orderId={d.order.id} />)}
      </CardContent>
      <StartReturnDialog key={starting ? "o" : "c"} d={d} open={starting} onClose={() => setStarting(false)} />
    </Card>
  )
}

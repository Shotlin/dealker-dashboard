"use client"

import { useState } from "react"
import Link from "next/link"
import { Banknote, Check, Clock, Hourglass, Landmark, PauseCircle, PlayCircle, ShieldAlert, Undo2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { useOrderPayout } from "@/hooks/useOrderPayout"
import type { OrderOverview, OverviewSeller } from "@/types/order-overview.types"
import { day, dayTime, money } from "./helpers"

const STATE_STYLE: Record<string, { cls: string; icon: React.ElementType }> = {
  WAITING_DELIVERY: { cls: "bg-slate-100 text-slate-700", icon: Hourglass },
  RETURN_WINDOW: { cls: "bg-amber-50 text-amber-800", icon: Clock },
  READY: { cls: "bg-blue-50 text-blue-700", icon: Banknote },
  PROCESSING: { cls: "bg-indigo-50 text-indigo-700", icon: Landmark },
  PAID: { cls: "bg-emerald-50 text-emerald-700", icon: Check },
  ON_HOLD: { cls: "bg-red-50 text-red-700", icon: PauseCircle },
  REVERSED: { cls: "bg-violet-50 text-violet-700", icon: Undo2 },
}

function Step({ done, active, label, sub }: { done: boolean; active?: boolean; label: string; sub?: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2", done ? "border-primary bg-primary text-primary-foreground" : active ? "border-primary bg-white" : "border-border bg-white")}>{done && <Check className="h-3 w-3" />}</span>
      <span><span className={cn("block text-sm", done || active ? "font-medium" : "text-muted-foreground")}>{label}</span>{sub && <span className="block text-xs text-muted-foreground">{sub}</span>}</span>
    </li>
  )
}

function PayoutCard({ s, d }: { s: OverviewSeller; d: OrderOverview }) {
  const p = s.payout
  const st = STATE_STYLE[p.state]
  const { hold, release, pay, markPaid } = useOrderPayout()
  const [dlg, setDlg] = useState<"hold" | "pay" | "paid" | null>(null)
  const [reason, setReason] = useState("")
  const [utr, setUtr] = useState("")
  const m = s.money
  const delivered = s.status === "DELIVERED" || ["RETURN_WINDOW", "READY", "PROCESSING", "PAID"].includes(p.state)
  const early = p.state === "RETURN_WINDOW"
  void d

  return (
    <div className="space-y-5 rounded-xl border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">{s.number}</p>
          <p className="text-base font-semibold">{s.vendor.name}</p>
        </div>
        <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", st.cls)}><st.icon className="h-3.5 w-3.5" />{p.label}</span>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl bg-muted/50 p-4">
        <div>
          <p className="text-xs text-muted-foreground">{p.state === "PAID" ? "Seller was paid" : p.state === "REVERSED" ? "Seller earns" : "Seller will receive"}</p>
          <p className="text-3xl font-semibold tabular-nums">{p.state === "REVERSED" ? money(0) : money(p.earns)}</p>
        </div>
        <p className="max-w-xs text-sm text-muted-foreground">{p.explanation}{p.state === "RETURN_WINDOW" && p.eligible_on ? ` Becomes payable on ${day(p.eligible_on)}.` : ""}</p>
      </div>

      {p.hold && (
        <p className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span><b>{p.hold.vendor_wide ? "All payments to this seller are on hold" : "Payment on hold"}</b> since {day(p.hold.since)} — “{p.hold.reason}”{p.hold.vendor_wide && <> <Link href="/settlements" className="underline">Manage in Settlements</Link></>}</span></p>
      )}

      {/* How the amount is worked out */}
      <div>
        <p className="mb-2 text-sm font-semibold">How the seller’s amount is worked out</p>
        <dl className="space-y-1.5 rounded-lg border p-3 text-sm">
          <div className="flex justify-between"><dt className="text-muted-foreground">Customer paid the seller’s items</dt><dd className="tabular-nums">{money(m.subtotal)}</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">Dealker commission ({m.commission_percent}%)</dt><dd className="tabular-nums">− {money(m.commission)}</dd></div>
          {m.shipping > 0 && <div className="flex justify-between"><dt className="text-muted-foreground">Delivery cost</dt><dd className="tabular-nums">− {money(m.shipping)}</dd></div>}
          <div className="flex justify-between border-t pt-2 font-semibold"><dt>Seller receives</dt><dd className="tabular-nums">{money(m.payable_to_vendor)}</dd></div>
        </dl>
      </div>

      {/* Progress */}
      <ol className="space-y-3 border-l-2 border-dashed pl-4">
        <Step done={delivered} active={p.state === "WAITING_DELIVERY"} label="Parcel delivered to the customer" sub={s.timestamps.delivered_at ? dayTime(s.timestamps.delivered_at) : undefined} />
        <Step done={["READY", "PROCESSING", "PAID"].includes(p.state)} active={p.state === "RETURN_WINDOW"} label={`Return window (${p.window_days} days) is over`} sub={p.eligible_on && delivered ? `Ends ${day(p.eligible_on)}` : undefined} />
        <Step done={["PROCESSING", "PAID"].includes(p.state)} active={p.state === "READY"} label="Payout created" sub={p.payout ? `${p.payout.number} · ${dayTime(p.payout.created_at)}` : undefined} />
        <Step done={p.state === "PAID"} active={p.state === "PROCESSING"} label="Money sent to the seller’s bank" sub={p.payout?.paid_at ? `${dayTime(p.payout.paid_at)}${p.payout.utr ? ` · reference ${p.payout.utr}` : ""}` : undefined} />
      </ol>

      {/* Ledger */}
      {p.ledger.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-semibold">Entries in the seller’s account for this parcel</p>
          <ul className="divide-y rounded-lg border text-sm">
            {p.ledger.map((l, i) => (
              <li key={i} className="flex items-center justify-between gap-3 p-2.5">
                <span><span className="block">{l.label}</span><span className="text-xs text-muted-foreground">{dayTime(l.at)}</span></span>
                <span className={cn("font-medium tabular-nums", l.amount < 0 ? "text-red-600" : "text-emerald-700")}>{l.amount < 0 ? "−" : "+"} {money(Math.abs(l.amount))}</span>
              </li>
            ))}
          </ul>
          <p className="mt-1 text-xs text-muted-foreground">The seller’s total balance across all orders: <b className="text-foreground">{money(p.vendor_balance)}</b></p>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 border-t pt-3">
        {["READY", "RETURN_WINDOW"].includes(p.state) && <Button size="sm" onClick={() => setDlg("pay")}><Banknote className="mr-1.5 h-3.5 w-3.5" />{early ? "Pay now (before the window ends)" : `Pay seller ${money(p.earns)}`}</Button>}
        {p.state === "PROCESSING" && p.payout && <Button size="sm" onClick={() => { setUtr(""); setDlg("paid") }}><Check className="mr-1.5 h-3.5 w-3.5" />Mark as paid</Button>}
        {p.state === "ON_HOLD" && !p.hold?.vendor_wide && <Button size="sm" variant="outline" disabled={release.isPending} onClick={() => release.mutate(s.id)}><PlayCircle className="mr-1.5 h-3.5 w-3.5" />Release the hold</Button>}
        {["WAITING_DELIVERY", "RETURN_WINDOW", "READY"].includes(p.state) && <Button size="sm" variant="outline" className="text-red-600" onClick={() => { setReason(""); setDlg("hold") }}><PauseCircle className="mr-1.5 h-3.5 w-3.5" />Hold payment</Button>}
        <Button size="sm" variant="ghost" asChild><Link href="/settlements">Seller’s full statement</Link></Button>
      </div>

      <Dialog open={dlg === "hold"} onOpenChange={(o) => !o && setDlg(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Hold the payment for this parcel?</DialogTitle><DialogDescription>The seller won’t be paid for this parcel until you release it. Other parcels are not affected.</DialogDescription></DialogHeader>
          <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why? e.g. Customer complaint under review" />
          <DialogFooter><Button variant="ghost" onClick={() => setDlg(null)}>Cancel</Button>
            <Button variant="destructive" disabled={!reason.trim() || hold.isPending} onClick={() => hold.mutate({ id: s.id, reason }, { onSuccess: () => setDlg(null) })}>Hold payment</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dlg === "pay"} onOpenChange={(o) => !o && setDlg(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Pay {s.vendor.name} {money(p.earns)}?</DialogTitle>
            <DialogDescription>This creates a payout for this parcel and deducts it from the seller’s balance ({money(p.vendor_balance)}). You then send the money from the bank and mark it as paid.</DialogDescription></DialogHeader>
          {early && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">The return window is still open until {day(p.eligible_on)}. If the customer returns the item after you pay, the seller’s balance goes negative.</p>}
          <DialogFooter><Button variant="ghost" onClick={() => setDlg(null)}>Cancel</Button>
            <Button disabled={pay.isPending} onClick={() => pay.mutate({ id: s.id, early }, { onSuccess: () => setDlg(null) })}>{early ? "Pay early" : "Create payout"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dlg === "paid"} onOpenChange={(o) => !o && setDlg(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Mark payout {p.payout?.number} as paid</DialogTitle><DialogDescription>Enter the bank transfer reference (UTR) so there’s a record of the payment.</DialogDescription></DialogHeader>
          <Input value={utr} onChange={(e) => setUtr(e.target.value)} placeholder="UTR / reference number" />
          <DialogFooter><Button variant="ghost" onClick={() => setDlg(null)}>Cancel</Button>
            <Button disabled={!utr.trim() || markPaid.isPending} onClick={() => p.payout && markPaid.mutate({ payoutId: p.payout.id, utr }, { onSuccess: () => setDlg(null) })}>Confirm paid</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function PayoutSection({ d }: { d: OrderOverview }) {
  const parcels = d.sellers
  const paid = parcels.filter((s) => s.payout.state === "PAID").length
  const owed = parcels.filter((s) => !["PAID", "REVERSED"].includes(s.payout.state)).reduce((t, s) => t + s.payout.earns, 0)
  const ready = parcels.filter((s) => s.payout.state === "READY").length
  return (
    <Card className="shadow-none">
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base"><Landmark className="h-4 w-4" />Seller payout
          {ready > 0 && <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">{ready} ready to pay</Badge>}</CardTitle>
        <p className="text-sm text-muted-foreground">{paid} of {parcels.length} paid · still to pay {money(owed)}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">The customer pays Dealker. Dealker keeps its commission and pays each seller their share — after the parcel is delivered and the return window has passed.</p>
        {parcels.length === 0 && <p className="text-sm text-muted-foreground">No sellers on this order yet.</p>}
        {parcels.map((s) => <PayoutCard key={s.id} s={s} d={d} />)}
      </CardContent>
    </Card>
  )
}

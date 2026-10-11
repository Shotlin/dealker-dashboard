"use client"

import { useState } from "react"
import { Banknote, Check, ExternalLink, Eye, Landmark, PackageCheck, RefreshCw, ShieldCheck, Store, Truck, Undo2 } from "lucide-react"
import { toast } from "sonner"
import { cn, formatMoney } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { usePermissions } from "@/hooks/usePermissions"
import { useJourneyAction } from "@/hooks/useSellRequests"
import { journeyApi, type PickupProvider, type SellRequest } from "@/services/sell-requests.service"
import { fmtDateTime } from "./sell-request-ui"

const STAGE_LABEL: Record<string, string> = {
  LISTED: "Collecting offers", OFFER_ACCEPTED: "Offer accepted", PICKUP_REQUESTED: "Pickup requested", PICKUP_SCHEDULED: "Pickup scheduled", PICKED_UP: "Picked up",
  IN_TRANSIT: "In transit", RECEIVED: "Received by buyer", INSPECTING: "Inspection", FINAL_PRICE: "Waiting for customer on new price", PAYOUT_PENDING: "Payout pending",
  PAID: "Paid", RETURNING: "Phone being returned", CLOSED: "Closed",
}
const FUNDING: Record<string, { label: string; tone: string }> = {
  NONE: { label: "Not required", tone: "text-muted-foreground" }, PENDING: { label: "Waiting for the buyer to pay", tone: "text-amber-700" },
  SUBMITTED: { label: "Buyer says paid — confirm receipt", tone: "text-violet-700" }, HELD: { label: "Held by Dealker", tone: "text-emerald-700" },
  REFUNDING: { label: "Refund to buyer pending", tone: "text-amber-700" }, REFUNDED: { label: "Refunded to buyer", tone: "text-muted-foreground" },
}

function Block({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="space-y-2 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2"><h3 className="text-sm font-semibold">{title}</h3>{action}</div>
      {children}
    </section>
  )
}

function RefDialog({ open, title, description, label, confirm, minLength = 6, pending, onClose, onSubmit }: {
  open: boolean; title: string; description: string; label: string; confirm: string; minLength?: number; pending?: boolean; onClose: () => void; onSubmit: (v: string) => void
}) {
  const [v, setV] = useState("")
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setV(""); onClose() } }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader>
        <div className="space-y-1.5"><Label htmlFor="jr-ref">{label}</Label><Input id="jr-ref" value={v} onChange={(e) => setV(e.target.value)} /></div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={pending} onClick={() => (v.trim().length < minLength ? toast.error(`${label} must be at least ${minLength} characters`) : (onSubmit(v.trim()), setV("")))}>{confirm}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function PickupDialog({ open, id, pending, onClose, onSubmit }: { open: boolean; id: string; pending?: boolean; onClose: () => void; onSubmit: (b: { provider: PickupProvider; awb?: string; courierName?: string; trackingUrl?: string }) => void }) {
  const [f, setF] = useState({ provider: "SHIPROCKET" as PickupProvider, awb: "", courierName: "", trackingUrl: "" })
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Arrange pickup</DialogTitle><DialogDescription>Book it in Shiprocket / Porter, then enter the details here so the customer can follow it. Request {id.slice(0, 8)}.</DialogDescription></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>Provider</Label>
            <Select value={f.provider} onValueChange={(v) => setF({ ...f, provider: v as PickupProvider })}><SelectTrigger aria-label="Provider"><SelectValue /></SelectTrigger>
              <SelectContent>{["SHIPROCKET", "PORTER", "BLUEDART", "SELF"].map((p) => <SelectItem key={p} value={p}>{p === "SELF" ? "Own team" : p[0] + p.slice(1).toLowerCase()}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1.5"><Label htmlFor="pk-awb">AWB / tracking no.</Label><Input id="pk-awb" value={f.awb} onChange={(e) => setF({ ...f, awb: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="pk-c">Courier</Label><Input id="pk-c" value={f.courierName} onChange={(e) => setF({ ...f, courierName: e.target.value })} placeholder="Delhivery, Porter…" /></div>
          <div className="space-y-1.5"><Label htmlFor="pk-u">Tracking link</Label><Input id="pk-u" value={f.trackingUrl} onChange={(e) => setF({ ...f, trackingUrl: e.target.value })} placeholder="https://" /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={pending} onClick={() => onSubmit({ provider: f.provider, awb: f.awb || undefined, courierName: f.courierName || undefined, trackingUrl: f.trackingUrl || undefined })}>Save pickup</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Customer's sell-your-phone journey, from the buyer's payment to the customer's payout. */
export function JourneyPanel({ r }: { r: SellRequest }) {
  const j = r.journey
  const { can } = usePermissions()
  const act = useJourneyAction()
  const [dlg, setDlg] = useState<null | "fund" | "pickup" | "paid" | "failed" | "refund">(null)
  const [reveal, setReveal] = useState<Awaited<ReturnType<typeof journeyApi.payoutDetails>> | null>(null)
  if (!j || j.stage === "LISTED") return null
  const finance = can("sell_requests.finance")
  const manage = can("sell_requests.manage")
  const funded = j.vendorPayment?.status
  const run = (c: Parameters<typeof act.mutate>[0], then?: () => void) => act.mutate(c, { onSuccess: then })
  const live = !["PAID", "CLOSED"].includes(j.stage) && !j.ended

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2">
        <p className="text-sm font-semibold">Sale progress</p>
        <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">{STAGE_LABEL[j.stage] ?? j.stage}</span>
      </div>

      <ol className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3" aria-label="Customer steps">
        {j.steps.map((s) => (
          <li key={s.key} className={cn("flex items-center gap-1.5", s.done ? "text-foreground" : s.current ? "font-semibold text-brand-700" : "text-muted-foreground")}>
            <span className={cn("h-2 w-2 rounded-full", s.done ? "bg-emerald-500" : s.current ? "bg-brand-500" : "bg-border")} aria-hidden />{s.label}
          </li>
        ))}
      </ol>

      {j.buyer && (
        <Block title="Buyer">
          <p className="flex items-center gap-1.5 text-sm"><Store className="h-4 w-4 text-muted-foreground" aria-hidden /><b>{j.buyer.name}</b>{j.buyer.phone && <span className="text-muted-foreground">· {j.buyer.phone}</span>}</p>
          {j.buyer.address && <p className="text-xs text-muted-foreground">{j.buyer.address}</p>}
          <p className="text-sm">Agreed price <b className="tabular-nums">{j.agreedPrice != null ? formatMoney(j.agreedPrice) : "—"}</b></p>
        </Block>
      )}

      {j.vendorPayment && j.vendorPayment.status !== "NONE" && (
        <Block title="Buyer's payment" action={finance && funded === "SUBMITTED" ? <Button size="sm" className="h-7" disabled={act.isPending} onClick={() => run({ type: "fundingConfirm", id: r.id })}><ShieldCheck /> Confirm received</Button>
          : finance && funded === "PENDING" ? <Button size="sm" variant="outline" className="h-7" onClick={() => setDlg("fund")}><Banknote /> Record payment</Button> : null}>
          <p className={cn("text-sm font-medium", FUNDING[funded ?? "NONE"].tone)}>{FUNDING[funded ?? "NONE"].label}</p>
          <p className="text-xs text-muted-foreground">{funded === "HELD" ? `${formatMoney(j.vendorPayment.heldAmount ?? 0)} held. The pickup can now be arranged.` : `Amount due ${j.vendorPayment.amountDue != null ? formatMoney(j.vendorPayment.amountDue) : "—"}. Nothing moves until this is confirmed.`}</p>
        </Block>
      )}

      {j.fulfilment && (
        <Block title={j.fulfilment.mode === "PICKUP" ? "Pickup" : "Drop-off at the store"} action={manage && live && j.fulfilment.mode === "PICKUP" && ["PICKUP_REQUESTED", "PICKUP_SCHEDULED"].includes(j.stage) && funded !== "PENDING" && funded !== "SUBMITTED"
          ? <Button size="sm" variant="outline" className="h-7" onClick={() => setDlg("pickup")}><Truck /> {j.pickup ? "Update courier" : "Arrange pickup"}</Button> : null}>
          {j.fulfilment.mode === "PICKUP" && <p className="text-sm">{j.fulfilment.address}{j.fulfilment.pincode ? ` — ${j.fulfilment.pincode}` : ""}<br /><span className="text-xs text-muted-foreground">{j.fulfilment.date} · {j.fulfilment.window}</span></p>}
          {j.fulfilment.note && <p className="text-xs text-muted-foreground">Customer note: {j.fulfilment.note}</p>}
          {j.pickup && (
            <div className="rounded-md bg-muted/50 p-2 text-xs">
              <p><b>{j.pickup.courier ?? j.pickup.provider}</b>{j.pickup.awb && <> · AWB <span className="font-mono">{j.pickup.awb}</span></>} · {j.pickup.status.replace(/_/g, " ").toLowerCase()}</p>
              {j.pickup.trackingUrl && <a href={j.pickup.trackingUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand-700 hover:underline">Courier tracking <ExternalLink className="h-3 w-3" aria-hidden /></a>}
            </div>
          )}
          {manage && live && j.pickup && ["PICKUP_SCHEDULED", "PICKED_UP", "IN_TRANSIT"].includes(j.stage) && (
            <div className="flex flex-wrap gap-2">
              {j.pickup.awb && j.pickup.provider !== "SELF" && <Button size="sm" variant="outline" className="h-7" disabled={act.isPending} onClick={() => run({ type: "pickupSync", id: r.id })}><RefreshCw /> Sync courier</Button>}
              {j.stage === "PICKUP_SCHEDULED" && <Button size="sm" variant="outline" className="h-7" onClick={() => run({ type: "pickupStatus", id: r.id, status: "PICKED_UP" })}>Picked up</Button>}
              {["PICKUP_SCHEDULED", "PICKED_UP"].includes(j.stage) && <Button size="sm" variant="outline" className="h-7" onClick={() => run({ type: "pickupStatus", id: r.id, status: "IN_TRANSIT" })}>In transit</Button>}
              <Button size="sm" variant="outline" className="h-7 border-red-300 text-red-600" onClick={() => run({ type: "pickupStatus", id: r.id, status: "FAILED" })}>Pickup failed</Button>
            </div>
          )}
          {manage && live && ["PICKUP_REQUESTED", "PICKUP_SCHEDULED", "PICKED_UP", "IN_TRANSIT"].includes(j.stage) && funded !== "PENDING" && funded !== "SUBMITTED" && (
            <Button size="sm" className="h-8" disabled={act.isPending} onClick={() => run({ type: "received", id: r.id })}><PackageCheck /> Phone received</Button>
          )}
        </Block>
      )}

      {j.inspection && j.inspection.status !== "AWAITING_EVIDENCE" && (
        <Block title="Final price">
          <p className="text-sm">Agreed <b className="tabular-nums">{j.agreedPrice != null ? formatMoney(j.inspection.originalPrice ?? j.agreedPrice) : "—"}</b>
            {j.inspection.finalValuation != null && <> → after inspection <b className="tabular-nums">{formatMoney(j.inspection.finalValuation)}</b></>}</p>
          <p className="text-xs text-muted-foreground">Customer decision: {j.inspection.customerDecision.toLowerCase()}</p>
        </Block>
      )}

      {j.payout && (
        <Block title="Customer payout" action={finance && j.payout.status === "PROCESSING" ? (
          <div className="flex gap-1.5">
            <Button size="sm" variant="outline" className="h-7" onClick={async () => { try { setReveal(await journeyApi.payoutDetails(r.id)) } catch { toast.error("Could not load the payout details") } }}><Eye /> Details</Button>
            <Button size="sm" className="h-7" onClick={() => setDlg("paid")}><Check /> Mark paid</Button>
          </div>) : null}>
          <p className="text-sm"><b className="tabular-nums">{j.payout.amount != null ? formatMoney(j.payout.amount) : "—"}</b> · {j.payout.display ?? "Method not chosen yet"}</p>
          <p className={cn("text-xs font-medium", j.payout.status === "PAID" ? "text-emerald-700" : j.payout.status === "PROCESSING" ? "text-violet-700" : "text-muted-foreground")}>{j.payout.status === "PENDING" && !j.payout.method ? "Waiting for the customer to choose a method" : j.payout.status.toLowerCase()}{j.payout.paidAt && ` · ${fmtDateTime(j.payout.paidAt)}`}{j.payout.reference && ` · ref ${j.payout.reference}`}</p>
          {finance && j.payout.status === "PROCESSING" && <Button size="sm" variant="ghost" className="h-7 text-red-600" onClick={() => setDlg("failed")}>Transfer failed</Button>}
        </Block>
      )}

      {j.stage === "RETURNING" && manage && (
        <Block title="Return the phone"><p className="text-sm text-muted-foreground">The sale did not go through. Hand the phone back to the customer, then confirm.</p>
          <Button size="sm" variant="outline" disabled={act.isPending} onClick={() => run({ type: "returned", id: r.id })}><Undo2 /> Phone returned to customer</Button></Block>
      )}
      {finance && funded === "REFUNDING" && (
        <Block title="Refund to the buyer" action={<Button size="sm" className="h-7" onClick={() => setDlg("refund")}><Landmark /> Mark refunded</Button>}>
          <p className="text-sm text-muted-foreground">The buyer&apos;s payment is no longer needed and must be returned.</p></Block>
      )}

      {j.payments && j.payments.length > 0 && (
        <Block title="Money movements">
          <ul className="divide-y text-sm">
            {j.payments.map((p) => (
              <li key={p.id} className="flex justify-between gap-3 py-1.5"><span>{{ VENDOR_FUNDING: "Buyer payment", CUSTOMER_PAYOUT: "Customer payout", VENDOR_REFUND: "Buyer refund" }[p.kind]} · {p.method.toLowerCase()} · <span className="text-xs text-muted-foreground">{p.status.toLowerCase()}{p.reference ? ` · ${p.reference}` : ""}</span></span><span className="tabular-nums">{formatMoney(p.amount)}</span></li>
            ))}
          </ul>
        </Block>
      )}

      <RefDialog open={dlg === "fund"} title="Record the buyer's payment" description="Enter the bank / UPI reference for the money you received from the buyer." label="Payment reference (UTR)" confirm="Record" pending={act.isPending}
        onClose={() => setDlg(null)} onSubmit={(ref) => run({ type: "fundingConfirm", id: r.id, method: "BANK", reference: ref }, () => setDlg(null))} />
      <RefDialog open={dlg === "paid"} title="Mark the payout as sent" description="After you have transferred the money, enter the bank's UTR / transaction reference. The customer is notified." label="UTR / reference" confirm="Mark paid" pending={act.isPending}
        onClose={() => setDlg(null)} onSubmit={(ref) => run({ type: "payoutPaid", id: r.id, reference: ref }, () => { setDlg(null); setReveal(null) })} />
      <RefDialog open={dlg === "refund"} title="Mark the buyer refunded" description="Enter the reference of the refund you sent back to the buyer." label="Refund reference" confirm="Mark refunded" pending={act.isPending}
        onClose={() => setDlg(null)} onSubmit={(ref) => run({ type: "refundPaid", id: r.id, reference: ref }, () => setDlg(null))} />
      <PickupDialog open={dlg === "pickup"} id={r.id} pending={act.isPending} onClose={() => setDlg(null)} onSubmit={(b) => run({ type: "pickup", id: r.id, ...b }, () => setDlg(null))} />
      <FailDialog open={dlg === "failed"} pending={act.isPending} onClose={() => setDlg(null)} onSubmit={(reason) => run({ type: "payoutFailed", id: r.id, reason }, () => setDlg(null))} />
      <Dialog open={!!reveal} onOpenChange={(o) => { if (!o) setReveal(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Send the money to</DialogTitle><DialogDescription>Shown to finance only. Viewing is logged.</DialogDescription></DialogHeader>
          {reveal && (
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Method</dt><dd className="font-medium">{reveal.method}</dd></div>
              {reveal.upiId && <div className="flex justify-between"><dt className="text-muted-foreground">UPI ID</dt><dd className="font-mono">{reveal.upiId}</dd></div>}
              {reveal.holderName && <div className="flex justify-between"><dt className="text-muted-foreground">Account holder</dt><dd className="font-medium">{reveal.holderName}</dd></div>}
              {reveal.accountNumber && <div className="flex justify-between"><dt className="text-muted-foreground">Account number</dt><dd className="font-mono">{reveal.accountNumber}</dd></div>}
              {reveal.ifsc && <div className="flex justify-between"><dt className="text-muted-foreground">IFSC</dt><dd className="font-mono">{reveal.ifsc}</dd></div>}
            </dl>
          )}
          <DialogFooter><Button onClick={() => setReveal(null)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function FailDialog({ open, pending, onClose, onSubmit }: { open: boolean; pending?: boolean; onClose: () => void; onSubmit: (reason: string) => void }) {
  const [v, setV] = useState("")
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setV(""); onClose() } }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Transfer failed</DialogTitle><DialogDescription>The customer is asked to check their details and choose again.</DialogDescription></DialogHeader>
        <Textarea value={v} onChange={(e) => setV(e.target.value)} rows={3} placeholder="What went wrong? (e.g. invalid UPI ID)" aria-label="Reason" />
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" disabled={pending} onClick={() => (v.trim() ? onSubmit(v.trim()) : toast.error("A reason is required"))}>Mark failed</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

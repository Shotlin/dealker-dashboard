"use client"

import { useState } from "react"
import { Check, CheckCircle2, Crown, Link2, MessageSquare, MessageSquareMore, Star, X, XCircle } from "lucide-react"
import { toast } from "sonner"
import { cn, formatINR } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { ConditionPill, DeviceThumb, PersonAvatar, StatusBadge, TYPE_META, fmtDateTime } from "./sell-request-ui"
import { EvidenceSection } from "./EvidenceSection"
import { QcPanel } from "./QcPanel"
import { usePermissions } from "@/hooks/usePermissions"
import { useLinkOrder, useRequest, useRequestAction } from "@/hooks/useSellRequests"
import type { RequestKind, SellRequest, SellRequestAction } from "@/services/sell-requests.service"

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-2 py-1.5 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground">{children}</dd>
    </div>
  )
}

const yn = (v: boolean) => (
  <span className={cn("inline-flex items-center gap-1", v ? "text-emerald-600" : "text-red-600")}>
    {v ? <Check className="h-3.5 w-3.5" aria-hidden /> : <X className="h-3.5 w-3.5" aria-hidden />}
    {v ? "Yes" : "No"}
  </span>
)

function QaList({ r }: { r: SellRequest }) {
  const q = r.qa
  const scratch = { NONE: "None", MINOR: "Minor", MAJOR: "Major" }[q.screenScratches]
  return (
    <div className="rounded-lg border bg-muted/30 px-3 py-1">
      <p className="pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Condition checklist</p>
      <dl>
        <Row label="Device age">{q.ageMonths} months</Row>
        <Row label="Screen scratches">{scratch}</Row>
        <Row label="Body dents">{q.bodyDents ? "Yes" : "No"}</Row>
        <Row label="Screen replaced">{q.screenReplaced ? "Yes" : "No"}</Row>
        <Row label="Skin replaced">{q.skinReplaced ? "Yes" : "No"}</Row>
        <Row label="Battery health">{q.batteryHealth}%</Row>
        <Row label="Bill">{yn(q.billAvailable)}</Row>
        <Row label="Box">{yn(q.boxAvailable)}</Row>
        <Row label="Charger">{yn(q.chargerAvailable)}</Row>
      </dl>
    </div>
  )
}

function Offers({ r, canAssign, onAssign, busy }: { r: SellRequest; canAssign: boolean; onAssign: (vendorId: string) => void; busy: boolean }) {
  const best = Math.max(...r.offers.map((o) => o.amount))
  return (
    <div>
      <p className="mb-2 text-sm font-semibold">Vendor offers</p>
      <ul className="space-y-2">
        {r.offers.map((o) => (
          <li key={o.vendorId} className={cn("flex items-center gap-3 rounded-lg border p-2.5", o.status === "ACCEPTED" && "border-emerald-300 bg-emerald-50/60 dark:bg-emerald-950/30")}>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                {o.vendorName}
                {o.amount === best && <Crown className="h-3.5 w-3.5 text-amber-500" aria-label="Best offer" />}
              </p>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden />{o.rating} · {o.city} · {o.distanceKm} km
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold tabular-nums">{formatINR(o.amount)}</p>
              {o.status === "ACCEPTED" ? (
                <span className="text-xs font-medium text-emerald-600">Assigned</span>
              ) : canAssign ? (
                <Button size="sm" variant="outline" className="mt-1 h-7" disabled={busy} onClick={() => onAssign(o.vendorId)}>Assign</Button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Timeline({ events }: { events: SellRequest["timeline"] }) {
  return (
    <ol className="space-y-0">
      {events.map((e, i) => (
        <li key={`${e.label}-${i}`} className="relative flex gap-3 pb-4 last:pb-0">
          {i < events.length - 1 && <span aria-hidden className={cn("absolute left-[9px] top-5 h-full w-px", e.done ? "bg-emerald-400" : "bg-border")} />}
          {e.done ? <CheckCircle2 className="relative h-5 w-5 shrink-0 fill-emerald-500 text-white" aria-hidden /> : <span aria-hidden className="relative h-5 w-5 shrink-0 rounded-full border-2 border-border bg-background" />}
          <div>
            <p className={cn("text-sm font-medium", !e.done && "text-muted-foreground")}>{e.label}</p>
            {e.done && <p className="text-xs text-muted-foreground">{fmtDateTime(e.at)}</p>}
          </div>
        </li>
      ))}
    </ol>
  )
}

type NoteAction = Extract<SellRequestAction, "REJECT" | "REQUEST_INFO">

export function SellRequestDetailPanel({ id, kind }: { id: string | null; kind: RequestKind }) {
  const isExchange = kind === "EXCHANGE"
  const { data: r, isLoading } = useRequest(kind, id)
  const act = useRequestAction(kind)
  const [noteFor, setNoteFor] = useState<NoteAction | null>(null)
  const [note, setNote] = useState("")
  const { can } = usePermissions()
  const [orderNo, setOrderNo] = useState("")
  const link = useLinkOrder()

  if (!id) return <aside className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">{isExchange ? "Select an exchange to see its details." : "Select a request to see its details."}</aside>
  if (isLoading || !r) return <aside className="space-y-3 rounded-xl border bg-card p-4"><Skeleton className="h-6 w-1/2" /><Skeleton className="h-24 w-full" /><Skeleton className="h-64 w-full" /></aside>

  const P = isExchange ? "exchange_requests" : "sell_requests"
  const canQc = can(`${P}.qc`) || can(`${P}.manage`)
  const open = r.status === "PENDING" || r.status === "IN_PROGRESS"
  const run = (action: SellRequestAction, extra?: { note?: string; vendorId?: string }) => act.mutate({ id: r.id, action, ...extra })
  const submitNote = () => {
    if (!noteFor) return
    if (noteFor === "REJECT" && !note.trim()) return toast.error("Add a reason for rejecting")
    run(noteFor, { note })
    setNoteFor(null); setNote("")
  }

  return (
    <aside className="rounded-xl border bg-card shadow-sm" aria-label={isExchange ? "Exchange request details" : "Sell request details"}>
      <header className="flex items-start justify-between gap-2 border-b p-4">
        <div>
          <h2 className="text-base font-semibold">{isExchange ? "Exchange Request Details" : "Sell Request Details"}</h2>
          <p className="mt-1 text-sm font-semibold">{r.code}</p>
          <p className="text-xs text-muted-foreground">Requested on {fmtDateTime(r.createdAt)}</p>
        </div>
        <StatusBadge status={r.status} />
      </header>

      <div className="space-y-4 p-4">
        <div className="flex items-center gap-3">
          <PersonAvatar name={r.customer.name} className="h-11 w-11 text-sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{r.customer.name}</p>
            <p className="text-xs text-muted-foreground">{r.customer.phone}</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => toast.info("Chat opens in Support Chat once messaging is connected")}><MessageSquare /> Chat</Button>
        </div>

        <div className="flex items-center gap-3 rounded-lg border p-3">
          <DeviceThumb category={r.device.category} className="h-14 w-14" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{r.device.model}</p>
            <p className="truncate text-xs text-muted-foreground">{r.device.color} | {r.device.variant}</p>
            <p className="mt-1 text-lg font-bold tabular-nums">{formatINR(r.quote)}</p>
          </div>
          <ConditionPill condition={r.condition} />
        </div>

        <Tabs defaultValue="details">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Request Details</TabsTrigger>
            <TabsTrigger value="customer">Customer Info</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            <dl>
              {!isExchange && <Row label="Request Type">{TYPE_META[r.type].label}</Row>}
              <Row label={isExchange ? "Customer expects" : "Expected Price"}>{formatINR(r.expectedPrice)}</Row>
              <Row label={isExchange ? "Trade-in value" : "System Quote"}>{formatINR(r.quote)}</Row>
              <Row label={isExchange ? "Old device IMEI" : "Device IMEI"}><span className="font-mono text-xs">{r.device.imei}</span></Row>
              <Row label="Description"><span className="font-normal">{r.description || "—"}</span></Row>
              {r.assignedVendor && <Row label="Vendor">{r.assignedVendor}</Row>}
            </dl>

            {r.exchange && (
              <div className="rounded-lg border border-violet-200 bg-violet-50/60 p-3 text-sm dark:bg-violet-950/30">
                <p className="mb-1 font-semibold">New purchase</p>
                <div className="flex justify-between"><span className="text-muted-foreground">New product</span><span>{r.exchange.newProduct}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">New price</span><span>{formatINR(r.exchange.newProductPrice)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Trade-in value</span><span className="text-emerald-600">− {formatINR(r.exchange.tradeInValue)}</span></div>
                <div className="mt-1 flex justify-between border-t pt-1 font-semibold"><span>Customer pays</span><span>{formatINR(r.exchange.payable)}</span></div>
                {r.exchangeOrder ? (
                  <p className="mt-2 flex items-center gap-1.5 rounded-md bg-background/70 p-2 text-xs"><Link2 className="h-3.5 w-3.5 text-violet-600" aria-hidden />Order <b>{r.exchangeOrder.orderNumber}</b> · {r.exchangeOrder.status.replace(/_/g, " ").toLowerCase()}{r.exchangeOrder.total != null && <> · {formatINR(r.exchangeOrder.total)}</>}</p>
                ) : open || r.status === "APPROVED" ? (
                  <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (orderNo.trim()) link.mutate({ id: r.id, orderNumber: orderNo.trim() }, { onSuccess: () => setOrderNo("") }) }}>
                    <Input aria-label="Order number" value={orderNo} onChange={(e) => setOrderNo(e.target.value)} placeholder="Order no. of the new product" className="h-8 bg-background text-xs" />
                    <Button type="submit" size="sm" variant="outline" disabled={link.isPending || !orderNo.trim()}><Link2 /> Link</Button>
                  </form>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">No order can be linked to a {r.status.toLowerCase()} exchange.</p>
                )}
              </div>
            )}

            <QaList r={r} />

            <EvidenceSection r={r} kind={kind} canAdd={canQc} canReview={canQc} />

            <QcPanel r={r} kind={kind} canAct={canQc} />

            <Offers r={r} canAssign={open} busy={act.isPending} onAssign={(vendorId) => run("ASSIGN_VENDOR", { vendorId })} />

            <div className="rounded-lg border p-3">
              <p className="mb-3 text-sm font-semibold">Request Timeline</p>
              <Timeline events={r.timeline} />
            </div>
          </TabsContent>

          <TabsContent value="customer">
            <dl>
              <Row label="Name">{r.customer.name}</Row>
              <Row label="Phone">{r.customer.phone}</Row>
              <Row label="Email">{r.customer.email || "—"}</Row>
              <Row label="City">{r.customer.city}</Row>
              <Row label="Total requests">{r.customer.totalRequests}</Row>
            </dl>
          </TabsContent>

          <TabsContent value="history" className="space-y-2 text-sm">
            <p><span className="text-muted-foreground">Requests from this customer:</span> <b>{r.customer.totalRequests}</b></p>
            <p><span className="text-muted-foreground">Offers received:</span> <b>{r.offers.length}</b></p>
            {r.adminNote ? <p className="rounded-md bg-muted p-2 text-xs"><span className="font-semibold">Admin note:</span> {r.adminNote}</p> : <p className="text-xs text-muted-foreground">No admin notes on this request.</p>}
          </TabsContent>
        </Tabs>

        <div className="space-y-2 rounded-lg border p-3">
          <p className="text-sm font-semibold">Actions</p>
          {open && <Button className="w-full bg-brand-600 hover:bg-brand-700" disabled={act.isPending} onClick={() => run("APPROVE")}><Check /> Approve Request</Button>}
          {r.status === "APPROVED" && (
            <>
              <Button className="w-full bg-brand-600 hover:bg-brand-700" disabled={act.isPending || (isExchange && !r.exchangeOrder)} onClick={() => run("COMPLETE")}><CheckCircle2 /> Mark Completed</Button>
              {isExchange && !r.exchangeOrder && <p className="text-xs text-muted-foreground">Link the order for the new product to complete this exchange.</p>}
            </>
          )}
          {open && <Button variant="outline" className="w-full border-brand-300 text-brand-700" onClick={() => setNoteFor("REQUEST_INFO")}><MessageSquareMore /> Request More Details</Button>}
          {open && <Button variant="outline" className="w-full border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setNoteFor("REJECT")}><XCircle /> Reject Request</Button>}
          <Button variant="outline" className="w-full" onClick={() => toast.info("Messaging is not connected yet")}><MessageSquare /> Send Message</Button>
          {!open && r.status !== "APPROVED" && <p className="text-xs text-muted-foreground">This request is {r.status.toLowerCase().replace("_", " ")}; no further actions.</p>}
        </div>
      </div>

      <Dialog open={!!noteFor} onOpenChange={(o) => { if (!o) { setNoteFor(null); setNote("") } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{noteFor === "REJECT" ? "Reject request" : "Request more details"}</DialogTitle>
            <DialogDescription>{noteFor === "REJECT" ? "The customer is told why their request was rejected." : "Tell the customer what extra information or photos you need."}</DialogDescription>
          </DialogHeader>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} placeholder={noteFor === "REJECT" ? "Reason for rejection" : "e.g. Please upload a clear photo of the back panel"} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteFor(null)}>Cancel</Button>
            <Button variant={noteFor === "REJECT" ? "destructive" : "default"} onClick={submitNote}>{noteFor === "REJECT" ? "Reject" : "Send"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </aside>
  )
}

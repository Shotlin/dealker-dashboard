"use client"

import { useState } from "react"
import { AlertTriangle, Banknote, Check, ClipboardCheck, PackageCheck, Play, Plus, Receipt, RotateCcw, Send, Stethoscope, Truck, UserCheck, Wrench, XCircle } from "lucide-react"
import { toast } from "sonner"
import { cn, formatINR } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { EvidenceUploader } from "@/components/sell-requests/EvidenceUploader"
import { usePermissions } from "@/hooks/usePermissions"
import { useRepair, useRepairAction, useRepairSettings } from "@/hooks/useRepairs"
import { mediaSrc, type EvidenceMedia } from "@/services/sell-requests.service"
import { PROBLEM_LABEL, repairsApi, type Repair, type RepairItem } from "@/services/repairs.service"
import { AssignDialog, DiagnosisDialog, NoteDialog, PaymentDialog, QcDialog, QuoteDialog } from "./RepairDialogs"
import { ChannelPill, RepairStatusBadge, fmtDate, fmtDay } from "./repair-ui"

const STAGES: Array<[string, string]> = [["INTAKE", "Intake"], ["DIAGNOSIS", "Diagnosis"], ["REPAIR_PROGRESS", "Repair progress"], ["FINAL_QC", "Final QC"], ["DELIVERY", "Delivery"], ["DISPUTE", "Dispute"]]
const STAGE_LABEL: Record<string, string> = { CUSTOMER_SUBMISSION: "Customer photos", ...Object.fromEntries(STAGES) }

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-2 py-1 text-sm">
      <dt className="text-muted-foreground">{label}</dt><dd className="min-w-0 break-words font-medium">{children}</dd>
    </div>
  )
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-2 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2"><h3 className="text-sm font-semibold">{title}</h3>{action}</div>
      {children}
    </section>
  )
}

function Evidence({ r, canAdd }: { r: Repair; canAdd: boolean }) {
  const settings = useRepairSettings(canAdd)
  const act = useRepairAction("Evidence added")
  const [open, setOpen] = useState(false)
  const [stage, setStage] = useState("INTAKE")
  const [staged, setStaged] = useState<EvidenceMedia[]>([])
  const [busy, setBusy] = useState(false)
  const groups = new Map<string, Repair["media"]>()
  r.media.forEach((m) => groups.set(m.stage, [...(groups.get(m.stage) ?? []), m]))
  return (
    <Section title={`Photos & video (${r.media.length})`} action={canAdd && <Button size="sm" variant="outline" className="h-7" onClick={() => setOpen(true)}><Plus /> Add</Button>}>
      {r.media.length === 0 && <p className="text-xs text-muted-foreground">Nothing uploaded yet.</p>}
      {Array.from(groups.entries()).map(([s, list]) => (
        <div key={s}>
          <p className="mb-1 text-xs font-medium text-muted-foreground">{STAGE_LABEL[s] ?? s}</p>
          <div className="flex flex-wrap gap-2">
            {list.map((m) => (
              <a key={m.id} href={mediaSrc(m.url)} target="_blank" rel="noreferrer" aria-label={`Open ${m.mediaType === "VIDEO" ? "video" : "photo"} ${m.filename}`}
                className="relative h-16 w-16 overflow-hidden rounded-lg border bg-muted focus-visible:ring-2 focus-visible:ring-ring">
                {m.mediaType === "IMAGE" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mediaSrc(m.url)} alt={m.filename} loading="lazy" className="h-full w-full object-cover" />
                ) : (
                  <><video src={mediaSrc(m.url)} preload="metadata" muted className="h-full w-full object-cover" /><span className="absolute inset-0 flex items-center justify-center bg-black/30"><Play className="h-5 w-5 fill-white text-white" aria-hidden /></span></>
                )}
              </a>
            ))}
          </div>
        </div>
      ))}
      <Dialog open={open} onOpenChange={(o) => { if (!o) { setOpen(false); setStaged([]) } }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader><DialogTitle>Add evidence</DialogTitle><DialogDescription>Evidence stays with this repair permanently.</DialogDescription></DialogHeader>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Evidence stage">
            {STAGES.map(([v, l]) => (
              <button key={v} type="button" role="radio" aria-checked={stage === v} onClick={() => setStage(v)}
                className={cn("rounded-full border px-3 py-1 text-xs font-medium", stage === v ? "border-brand-500 bg-brand-50 text-brand-700" : "hover:bg-muted")}>{l}</button>
            ))}
          </div>
          <EvidenceUploader key={String(open)} kind="SELL" upload={repairsApi.upload} discard={repairsApi.discard} limits={settings.data} onChange={setStaged} onBusyChange={setBusy} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={!staged.length || busy || act.isPending} onClick={() => act.mutate({ type: "attach", id: r.id, mediaIds: staged.map((m) => m.id), stage }, { onSuccess: () => { setOpen(false); setStaged([]) } })}>
              {busy ? "Uploading…" : `Attach ${staged.length || ""} file${staged.length === 1 ? "" : "s"}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Section>
  )
}

type Pending = "reject" | "cancel" | "rejectEstimate" | "fail" | "reopen" | "approveBehalf" | null

export function RepairDetailSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  return (
    <Sheet open={!!id} onOpenChange={(o) => { if (!o) onClose() }}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader className="sr-only"><SheetTitle>Repair details</SheetTitle><SheetDescription>Repair request details and actions</SheetDescription></SheetHeader>
        {id && <RepairDetail id={id} />}
      </SheetContent>
    </Sheet>
  )
}

function RepairDetail({ id }: { id: string }) {
  const { data: r, isLoading, isError } = useRepair(id)
  const { can } = usePermissions()
  const act = useRepairAction()
  const [note, setNote] = useState<Pending>(null)
  const [assign, setAssign] = useState<"accept" | "assign" | null>(null)
  const [quote, setQuote] = useState(false)
  const [qc, setQc] = useState(false)
  const [pay, setPay] = useState(false)
  const [dx, setDx] = useState<RepairItem | null>(null)
  const [deliver, setDeliver] = useState(false)
  const [pick, setPick] = useState<string[]>([])

  if (isLoading) return <div className="space-y-3 p-2"><Skeleton className="h-8 w-1/2" /><Skeleton className="h-32 w-full" /><Skeleton className="h-64 w-full" /></div>
  if (isError || !r) return <p role="alert" className="p-6 text-sm text-red-700">This repair could not be loaded.</p>

  const manage = can("repairs.manage")
  const finance = can("repairs.finance")
  const run = (action: string, body?: Record<string, unknown>, after?: () => void) => act.mutate({ type: "act", id: r.id, action, body }, { onSuccess: after })
  const done = r.status === "COMPLETED"
  const closed = ["REJECTED", "CANCELLED"].includes(r.status)
  const sent = r.quotes.find((q) => q.status === "SENT" || q.status === "APPROVED") ?? r.quotes[0]
  const undelivered = r.items.filter((i) => !i.deliveredAt)
  const startDeliver = () => {
    if (r.channel === "B2B" && undelivered.length > 1) { setPick(undelivered.map((i) => i.id)); setDeliver(true) } else run("deliver")
  }
  const noteCfg: Record<Exclude<Pending, null>, { title: string; label: string; confirm: string; destructive?: boolean; call: (t: string) => void }> = {
    reject: { title: "Reject request", label: "Reason (shown to the customer)", confirm: "Reject", destructive: true, call: (t) => run("reject", { reason: t }) },
    cancel: { title: "Cancel request", label: "Reason", confirm: "Cancel request", destructive: true, call: (t) => run("cancel", { reason: t }) },
    rejectEstimate: { title: "Estimate declined", label: "Reason", confirm: "Decline estimate", destructive: true, call: (t) => run("reject-estimate", { reason: t }) },
    fail: { title: "Device cannot be repaired", label: "What happened?", confirm: "Mark not repairable", destructive: true, call: (t) => run("fail", { reason: t }) },
    reopen: { title: "Warranty claim", label: "Describe the problem", confirm: "Reopen for rework", call: (t) => run("reopen", { reason: t }) },
    approveBehalf: { title: "Approve on the customer’s behalf", label: "Who approved, and how (name / email / PO number)", confirm: "Approve estimate", call: (t) => run("approve-estimate", { note: t }) },
  }

  return (
    <div className="space-y-4 pb-6">
      <header className="pr-8">
        <div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-semibold">{r.code}</h2><ChannelPill channel={r.channel} /><RepairStatusBadge status={r.status} />
          {r.sla.breached && <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700"><AlertTriangle className="h-3 w-3" aria-hidden />SLA breached</span>}
          {r.money.overdue && <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">Payment overdue</span>}</div>
        <p className="text-xs text-muted-foreground">Requested {fmtDate(r.createdAt)} · {r.deviceCount} device{r.deviceCount === 1 ? "" : "s"}{r.deliveredCount > 0 && ` · ${r.deliveredCount} delivered`}</p>
      </header>

      <Section title="Customer">
        <dl>
          <Row label={r.business ? "Contact" : "Name"}>{r.business ? r.business.contactPerson : r.customer.name}</Row>
          <Row label="Phone">{r.customer.phone}</Row>
          {r.business && <>
            <Row label="Business">{r.business.name}</Row><Row label="GSTIN"><span className="font-mono text-xs">{r.business.gstin}</span></Row>
            <Row label="PO reference">{r.business.poReference || "—"}</Row>
            <Row label="Contract">{r.business.contractDiscountPct > 0 ? `${r.business.contractDiscountPct}% discount` : "No discount"} · {r.business.paymentTermsDays > 0 ? `${r.business.paymentTermsDays}-day credit` : "pay before delivery"}</Row>
          </>}
          <Row label="Service">{r.serviceMode === "PICKUP" ? `Pickup — ${r.pickupAddress}` : "Customer drops off"}</Row>
          <Row label="Service centre">{r.serviceCenter ? `${r.serviceCenter}${r.technician ? ` · ${r.technician}` : ""}` : <span className="text-amber-700">Not assigned</span>}</Row>
          {r.description && <Row label="Notes"><span className="font-normal">{r.description}</span></Row>}
          {r.note && <Row label="Decision note"><span className="font-normal">{r.note}</span></Row>}
        </dl>
      </Section>

      <Section title={`Devices (${r.items.length})`}>
        <ul className="divide-y">
          {r.items.map((i) => (
            <li key={i.id} className="flex items-start justify-between gap-3 py-2">
              <div className="min-w-0 text-sm">
                <p className="font-medium">{i.lineNo}. {i.brand} {i.model} {i.imeiSerial && <span className="font-mono text-xs font-normal text-muted-foreground">{i.imeiSerial}</span>}</p>
                <p className="text-xs text-muted-foreground">{PROBLEM_LABEL[i.problemCategory]}{i.problemDescription ? ` — ${i.problemDescription}` : ""} · {i.warrantyStatus === "IN_WARRANTY" ? "In warranty" : i.warrantyStatus === "OUT_OF_WARRANTY" ? "Out of warranty" : "Warranty unknown"}</p>
                {i.diagnosis && <p className="mt-1 rounded bg-muted px-2 py-1 text-xs"><Stethoscope className="mr-1 inline h-3 w-3" aria-hidden />{i.diagnosis}</p>}
                {i.qcPassed === false && i.qcNotes && <p className="mt-1 text-xs text-red-700">QC: {i.qcNotes}</p>}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1 text-xs">
                <span className={cn("rounded-full px-2 py-0.5 font-medium", i.status === "REPAIRED" ? "bg-emerald-50 text-emerald-700" : i.status === "FAILED" ? "bg-red-50 text-red-700" : "bg-muted text-muted-foreground")}>{i.status === "PENDING" ? "Pending" : i.status === "REPAIRED" ? "Repaired" : "Not repairable"}</span>
                {i.deliveredAt && <span className="text-muted-foreground">Delivered {fmtDay(i.deliveredAt)}</span>}
                {manage && ["INSPECTION", "IN_REPAIR"].includes(r.status) && <Button size="sm" variant="outline" className="h-7" onClick={() => setDx(i)}>Diagnose</Button>}
              </div>
            </li>
          ))}
        </ul>
      </Section>

      {sent && (
        <Section title={`Estimate v${sent.version}`} action={<span className={cn("text-xs font-medium", sent.expired ? "text-red-700" : "text-muted-foreground")}>{sent.status === "APPROVED" ? "Approved" : sent.status === "SENT" ? (sent.expired ? "Expired" : `Valid until ${fmtDay(sent.validUntil)}`) : sent.status.toLowerCase()}</span>}>
          <ul className="divide-y text-sm">
            {sent.lines.map((l, n) => (
              <li key={n} className="flex justify-between gap-3 py-1.5"><span className="min-w-0 truncate">{l.description}{l.qty > 1 && <span className="text-muted-foreground"> × {l.qty}</span>}</span><span className="tabular-nums">{formatINR(l.amount ?? l.qty * l.unitPrice)}</span></li>
            ))}
          </ul>
          <dl className="ml-auto grid max-w-xs grid-cols-[1fr_auto] gap-x-6 gap-y-0.5 text-sm">
            <dt className="text-muted-foreground">Subtotal</dt><dd className="text-right tabular-nums">{formatINR(sent.subtotal)}</dd>
            {sent.discountAmount > 0 && <><dt className="text-muted-foreground">Discount ({sent.discountPct}%)</dt><dd className="text-right tabular-nums text-emerald-600">− {formatINR(sent.discountAmount)}</dd></>}
            <dt className="text-muted-foreground">GST ({sent.taxPct}%)</dt><dd className="text-right tabular-nums">{formatINR(sent.taxAmount)}</dd>
            <dt className="border-t pt-1 font-semibold">Total</dt><dd className="border-t pt-1 text-right font-semibold tabular-nums">{formatINR(sent.total)}</dd>
          </dl>
          {sent.note && <p className="text-xs text-muted-foreground">Note: {sent.note}</p>}
        </Section>
      )}

      {r.money.approvedTotal > 0 && (
        <Section title="Payments" action={finance && !closed && <Button size="sm" variant="outline" className="h-7" onClick={() => setPay(true)}><Banknote /> Record</Button>}>
          <dl className="grid grid-cols-2 gap-x-6 sm:grid-cols-4">
            {([["Total", r.money.approvedTotal], ["Paid", r.money.amountPaid], ["Due", r.money.amountDue], ["Advance needed", r.money.advanceRequired]] as const).map(([l, v]) => (
              <div key={l}><dt className="text-xs text-muted-foreground">{l}</dt><dd className={cn("font-semibold tabular-nums", l === "Due" && v > 0 && "text-amber-700")}>{formatINR(v)}</dd></div>
            ))}
          </dl>
          {r.money.dueDate && <p className={cn("text-xs", r.money.overdue ? "font-medium text-red-700" : "text-muted-foreground")}>Due by {fmtDay(r.money.dueDate)}{r.money.overdue && " — overdue"}</p>}
          {r.money.refundable > 0 && <p className="text-xs font-medium text-amber-700">{formatINR(r.money.refundable)} was paid in excess and must be refunded.</p>}
          {r.payments.length > 0 && (
            <ul className="divide-y text-sm">
              {r.payments.map((p) => (
                <li key={p.id} className="flex justify-between gap-3 py-1.5"><span>{p.kind[0] + p.kind.slice(1).toLowerCase()} · {p.method}{p.reference ? ` · ${p.reference}` : ""}<span className="text-xs text-muted-foreground"> · {fmtDate(p.at)}</span></span>
                  <span className={cn("tabular-nums", p.kind === "REFUND" && "text-red-700")}>{p.kind === "REFUND" ? "− " : ""}{formatINR(p.amount)}</span></li>
              ))}
            </ul>
          )}
          {r.settlement && <p className="rounded bg-muted px-2 py-1 text-xs">Platform commission {formatINR(r.settlement.commission)} ({r.settlement.commissionPct}%) · service centre payable {formatINR(r.settlement.vendorPayable)}</p>}
        </Section>
      )}

      {r.warrantyUntil && <p className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 text-sm dark:bg-emerald-950/20">Warranty valid until <b>{fmtDay(r.warrantyUntil)}</b>{r.reopenedCount > 0 && ` · reopened ${r.reopenedCount}×`}{r.reworkCount > 0 && ` · ${r.reworkCount} rework`}</p>}

      <Evidence r={r} canAdd={manage && !closed} />

      {manage && !closed && (
        <Section title="Actions">
          <div className="grid gap-2 sm:grid-cols-2">
            {r.status === "REQUESTED" && <><Button disabled={act.isPending} onClick={() => setAssign("accept")}><Check /> Accept &amp; assign</Button><Button variant="outline" className="border-red-300 text-red-600" onClick={() => setNote("reject")}><XCircle /> Reject</Button></>}
            {r.status === "ACCEPTED" && <Button disabled={act.isPending || !r.serviceCenterId} onClick={() => run("receive")}><PackageCheck /> {r.serviceMode === "PICKUP" ? "Device picked up" : "Device received"}</Button>}
            {["REQUESTED", "ACCEPTED"].includes(r.status) && <Button variant="outline" onClick={() => setNote("cancel")}>Cancel request</Button>}
            {["ACCEPTED", "INSPECTION", "ESTIMATE_APPROVED", "IN_REPAIR"].includes(r.status) && <Button variant="outline" onClick={() => setAssign("assign")}><UserCheck /> {r.serviceCenterId ? "Change service centre" : "Assign service centre"}</Button>}
            {["INSPECTION", "ESTIMATE_SENT"].includes(r.status) && <Button onClick={() => setQuote(true)}><Send /> {r.status === "ESTIMATE_SENT" ? "Revise estimate" : "Send estimate"}</Button>}
            {r.status === "ESTIMATE_SENT" && <><Button variant="outline" onClick={() => setNote("approveBehalf")}><Check /> Approve for customer</Button><Button variant="outline" onClick={() => setNote("rejectEstimate")}>Customer declined</Button></>}
            {r.status === "ESTIMATE_APPROVED" && <><Button disabled={act.isPending} onClick={() => run("start")}><Wrench /> Start repair</Button><Button variant="outline" onClick={() => setNote("rejectEstimate")}>Customer declined</Button></>}
            {r.status === "IN_REPAIR" && <Button disabled={act.isPending} onClick={() => run("send-to-qc")}><ClipboardCheck /> Send to QC</Button>}
            {r.status === "QC_PENDING" && <Button onClick={() => setQc(true)}><ClipboardCheck /> Record final QC</Button>}
            {["INSPECTION", "IN_REPAIR"].includes(r.status) && <Button variant="outline" className="border-red-300 text-red-600" onClick={() => setNote("fail")}>Cannot repair</Button>}
            {["REPAIRED", "ESTIMATE_REJECTED", "FAILED"].includes(r.status) && <Button disabled={act.isPending} onClick={() => run("ready")}><Truck /> Ready for {r.serviceMode === "PICKUP" ? "delivery" : "pickup"}</Button>}
            {r.status === "READY_FOR_DELIVERY" && <Button disabled={act.isPending} onClick={startDeliver}><PackageCheck /> Deliver{undelivered.length < r.items.length ? ` (${undelivered.length} left)` : ""}</Button>}
            {finance && r.money.refundable > 0 && <Button variant="outline" onClick={() => setPay(true)}><Receipt /> Refund excess</Button>}
          </div>
          {r.status === "ESTIMATE_APPROVED" && r.money.amountPaid < r.money.advanceRequired && <p className="text-xs text-amber-700">Advance of {formatINR(r.money.advanceRequired)} is required before repair can start (paid {formatINR(r.money.amountPaid)}).</p>}
          {r.status === "READY_FOR_DELIVERY" && r.money.amountDue > 0 && !(r.business && r.business.paymentTermsDays > 0) && <p className="text-xs text-amber-700">{formatINR(r.money.amountDue)} is due — record the payment (or COD collection) before delivery.</p>}
        </Section>
      )}
      {manage && done && <Section title="Actions"><Button variant="outline" onClick={() => setNote("reopen")}><RotateCcw /> Warranty claim — reopen</Button></Section>}

      <Section title="Timeline">
        <ol className="space-y-2">
          {[...r.timeline].reverse().map((e, i) => (
            <li key={i} className="flex gap-2 text-sm"><span aria-hidden className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" /><div><p>{e.label}</p><p className="text-xs text-muted-foreground">{fmtDate(e.at)}</p></div></li>
          ))}
        </ol>
      </Section>

      {note && <NoteDialog open title={noteCfg[note].title} label={noteCfg[note].label} confirm={noteCfg[note].confirm} destructive={noteCfg[note].destructive} pending={act.isPending} onClose={() => setNote(null)} onSubmit={(t) => { noteCfg[note].call(t); setNote(null) }} />}
      {assign && <AssignDialog open title={assign === "accept" ? "Accept & assign service centre" : "Assign service centre"} confirm={assign === "accept" ? "Accept request" : "Assign"} currentId={r.serviceCenterId} pending={act.isPending}
        onClose={() => setAssign(null)} onSubmit={(vendorId) => { run(assign === "accept" ? "accept" : "assign", { vendorId }); setAssign(null) }} />}
      <QuoteDialog repair={r} open={quote} pending={act.isPending} onClose={() => setQuote(false)} onSubmit={(lines, n) => act.mutate({ type: "quote", id: r.id, lines, note: n }, { onSuccess: () => setQuote(false) })} />
      <QcDialog repair={r} open={qc} pending={act.isPending} onClose={() => setQc(false)} onSubmit={(results) => act.mutate({ type: "qc", id: r.id, results }, { onSuccess: () => setQc(false) })} />
      <PaymentDialog repair={r} open={pay} pending={act.isPending} onClose={() => setPay(false)} onSubmit={(p) => act.mutate({ type: "pay", id: r.id, ...p }, { onSuccess: () => setPay(false) })} />
      <DiagnosisDialog item={dx} pending={act.isPending} onClose={() => setDx(null)} onSubmit={(diagnosis, repairable) => act.mutate({ type: "diagnose", id: r.id, itemId: (dx as RepairItem).id, diagnosis, repairable }, { onSuccess: () => setDx(null) })} />
      <Dialog open={deliver} onOpenChange={setDeliver}>
        <DialogContent>
          <DialogHeader><DialogTitle>Deliver devices</DialogTitle><DialogDescription>Choose what is being handed over now. The repair completes when every device is delivered.</DialogDescription></DialogHeader>
          <ul className="space-y-1.5">
            {undelivered.map((i) => (
              <li key={i.id}><label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-[#4F46E5]" checked={pick.includes(i.id)} onChange={(e) => setPick((c) => (e.target.checked ? [...c, i.id] : c.filter((x) => x !== i.id)))} />{i.lineNo}. {i.brand} {i.model} <span className="text-xs text-muted-foreground">{i.imeiSerial}</span></label></li>
            ))}
          </ul>
          <DialogFooter><Button variant="outline" onClick={() => setDeliver(false)}>Cancel</Button>
            <Button disabled={!pick.length || act.isPending} onClick={() => { if (!pick.length) return toast.error("Choose at least one device"); run("deliver", { itemIds: pick }, () => setDeliver(false)) }}>Deliver {pick.length} device{pick.length === 1 ? "" : "s"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

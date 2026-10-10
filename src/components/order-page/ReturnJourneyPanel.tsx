"use client"

import { useEffect, useState } from "react"
import { ClipboardCheck, ExternalLink, Plus, RefreshCw, Truck, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { useReturnJourneyActions } from "@/hooks/useReturnJourney"
import type { PickupProvider, PickupStatus, QcCheck, QcResult, ReturnJourney } from "@/types/return-journey.types"
import { dayTime, money } from "./helpers"

const SELECT = "h-9 rounded-md border bg-white px-2 text-sm"
const PROVIDERS: { value: PickupProvider; label: string }[] = [
  { value: "SHIPROCKET", label: "Shiprocket" },
  { value: "PORTER", label: "Porter" },
  { value: "BLUEDART", label: "Blue Dart" },
  { value: "SELF", label: "Our own team / other" },
]
const STATUS_LABEL: Record<PickupStatus, string> = {
  PICKUP_SCHEDULED: "Pickup scheduled", PICKED_UP: "Picked up", IN_TRANSIT: "On the way to us",
  RECEIVED: "Received at our centre", FAILED: "Pickup failed", CANCELLED: "Cancelled",
}
const STATUS_STEPS: PickupStatus[] = ["PICKED_UP", "IN_TRANSIT", "RECEIVED", "FAILED"]
const RESULT_LABEL: Record<QcResult, string> = { OK: "OK", MINOR_ISSUE: "Minor issue", FAILED: "Failed" }
const RESULT_CLS: Record<QcResult, string> = {
  OK: "bg-emerald-50 text-emerald-700 border-emerald-200",
  MINOR_ISSUE: "bg-amber-50 text-amber-800 border-amber-200",
  FAILED: "bg-red-50 text-red-700 border-red-200",
}

/** Pickup (Shiprocket / Porter / own team) and quality-check report for one return. */
export function ReturnJourneyPanel({ refundId, journey, open, originalPrice }: { refundId: string; journey: ReturnJourney | undefined; open: boolean; originalPrice: number }) {
  if (!journey) return null
  return (
    <div className="space-y-4">
      <PickupBlock refundId={refundId} journey={journey} open={open} />
      <QcBlock refundId={refundId} journey={journey} open={open} originalPrice={originalPrice} />
    </div>
  )
}

function PickupBlock({ refundId, journey, open }: { refundId: string; journey: ReturnJourney; open: boolean }) {
  const a = useReturnJourneyActions(refundId)
  const p = journey.pickup
  const [editing, setEditing] = useState(false)
  const [provider, setProvider] = useState<PickupProvider>(p?.provider ?? "SHIPROCKET")
  const [awb, setAwb] = useState(p?.awb ?? "")
  const [courier, setCourier] = useState(p?.courier_name ?? "")
  const [url, setUrl] = useState(p?.tracking_url ?? "")
  const [when, setWhen] = useState(p?.scheduled_at ? p.scheduled_at.slice(0, 16) : "")
  const [note, setNote] = useState(p?.note ?? "")
  useEffect(() => { setEditing(false) }, [p?.status, p?.awb])

  const form = (
    <div className="space-y-3 rounded-lg bg-muted/40 p-4">
      <p className="text-xs text-muted-foreground">Book the reverse pickup in your Shiprocket / Porter panel, then note it here. The customer sees it as “Return approved” with a pickup tracker. Status updates come from the courier automatically once its webhook is set up; you can also refresh or set them yourself.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5"><Label>Pickup partner</Label>
          <select className={cn(SELECT, "w-full")} value={provider} onChange={(e) => setProvider(e.target.value as PickupProvider)}>{PROVIDERS.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}</select></div>
        <div className="space-y-1.5"><Label>AWB / tracking number</Label><Input value={awb} onChange={(e) => setAwb(e.target.value)} placeholder="e.g. 14316420011" /></div>
        <div className="space-y-1.5"><Label>Courier name</Label><Input value={courier} onChange={(e) => setCourier(e.target.value)} placeholder="e.g. Delhivery Reverse" /></div>
        <div className="space-y-1.5"><Label>Pickup date &amp; time</Label><Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} /></div>
        <div className="space-y-1.5 sm:col-span-2"><Label>Tracking link (optional)</Label><Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" /></div>
        <div className="space-y-1.5 sm:col-span-2"><Label>Note for the team (optional)</Label><Input value={note} onChange={(e) => setNote(e.target.value)} /></div>
      </div>
      <div className="flex gap-2">
        <Button disabled={a.savePickup.isPending} onClick={() => a.savePickup.mutate({ provider, awb: awb.trim() || undefined, courierName: courier.trim() || undefined, trackingUrl: url.trim() || undefined, scheduledAt: when ? new Date(when).toISOString() : undefined, note: note.trim() || undefined })}>
          {p ? "Save changes" : "Approve return & arrange pickup"}
        </Button>
        {p && <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>}
      </div>
    </div>
  )

  return (
    <div className="space-y-3 rounded-xl border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold"><Truck className="h-4 w-4" />Return pickup</p>
        {p && <Badge variant="outline">{STATUS_LABEL[p.status]}</Badge>}
      </div>
      {!p && !open && <p className="text-sm text-muted-foreground">No pickup was arranged for this return.</p>}
      {!p && open && form}
      {p && !editing && (
        <>
          <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            <div><dt className="inline text-muted-foreground">Partner: </dt><dd className="inline font-medium">{PROVIDERS.find((x) => x.value === p.provider)?.label}{p.courier_name ? ` · ${p.courier_name}` : ""}</dd></div>
            <div><dt className="inline text-muted-foreground">AWB: </dt><dd className="inline font-medium">{p.awb ?? "—"}</dd></div>
            <div><dt className="inline text-muted-foreground">Pickup: </dt><dd className="inline">{p.scheduled_at ? dayTime(p.scheduled_at) : "—"}</dd></div>
            {p.picked_up_at && <div><dt className="inline text-muted-foreground">Picked up: </dt><dd className="inline">{dayTime(p.picked_up_at)}</dd></div>}
            {p.received_at && <div><dt className="inline text-muted-foreground">Received: </dt><dd className="inline">{dayTime(p.received_at)}</dd></div>}
            {p.tracking_url && <div><a className="inline-flex items-center gap-1 text-primary underline" href={p.tracking_url} target="_blank" rel="noreferrer">Courier tracking page<ExternalLink className="h-3 w-3" /></a></div>}
          </dl>
          {p.events.length > 0 && (
            <ul className="space-y-1 border-l-2 border-dashed pl-3 text-xs text-muted-foreground">
              {p.events.map((e, i) => <li key={i}><span className="font-medium text-foreground">{e.status.replace(/_/g, " ").toLowerCase()}</span> · {dayTime(e.at)}{e.note ? ` · ${e.note}` : ""}</li>)}
            </ul>
          )}
          {open && (
            <div className="flex flex-wrap gap-2 pt-1">
              {p.awb && p.provider !== "SELF" && <Button size="sm" variant="outline" disabled={a.sync.isPending} onClick={() => a.sync.mutate()}><RefreshCw className="mr-1.5 h-3.5 w-3.5" />Refresh from courier</Button>}
              {STATUS_STEPS.filter((s) => s !== p.status).map((s) => <Button key={s} size="sm" variant="outline" className={s === "FAILED" ? "text-red-600" : undefined} disabled={a.setStatus.isPending} onClick={() => a.setStatus.mutate({ status: s })}>Mark {STATUS_LABEL[s].toLowerCase()}</Button>)}
              <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>Edit details</Button>
            </div>
          )}
        </>
      )}
      {p && editing && form}
    </div>
  )
}

function QcBlock({ refundId, journey, open, originalPrice }: { refundId: string; journey: ReturnJourney; open: boolean; originalPrice: number }) {
  const a = useReturnJourneyActions(refundId)
  const q = journey.qc
  const initial: QcCheck[] = q?.checks.length ? q.checks : journey.default_parts.map((x) => ({ key: x.key, label: x.label, status: "OK" as QcResult }))
  const [checks, setChecks] = useState<QcCheck[]>(initial)
  const [summary, setSummary] = useState(q?.summary ?? "")
  const [revised, setRevised] = useState(q?.revised_price != null ? String(q.revised_price) : "")
  const [editing, setEditing] = useState(!q)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setEditing(!q && open) }, [q?.inspected_at, open])

  const revisedNum = revised.trim() === "" ? null : Number(revised)
  const priceBad = revisedNum != null && (!Number.isFinite(revisedNum) || revisedNum < 0 || revisedNum > originalPrice)
  const set = (i: number, patch: Partial<QcCheck>) => setChecks((c) => c.map((x, k) => (k === i ? { ...x, ...patch } : x)))

  return (
    <div className="space-y-3 rounded-xl border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold"><ClipboardCheck className="h-4 w-4" />Quality check &amp; price</p>
        {q && <Badge variant="outline">{q.price_status === "PROPOSED" ? "Waiting for the customer" : q.price_status === "ACCEPTED" ? "Customer accepted the new price" : q.price_status === "CLARIFICATION" ? "Customer asked a question" : "Passed — no price change"}</Badge>}
      </div>

      {!q && !open && <p className="text-sm text-muted-foreground">No quality check was recorded for this return.</p>}

      {q && !editing && (
        <>
          <ul className="divide-y rounded-lg border text-sm">
            {q.checks.map((c, i) => <li key={i} className="flex items-center justify-between gap-3 p-2.5"><span>{c.label}{c.note ? <span className="ml-2 text-xs text-muted-foreground">{c.note}</span> : null}</span><span className={cn("rounded-full border px-2 py-0.5 text-xs font-medium", RESULT_CLS[c.status])}>{RESULT_LABEL[c.status]}</span></li>)}
          </ul>
          {q.summary && <p className="rounded-lg bg-muted/50 p-3 text-sm">{q.summary}</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Original price</p><p className="font-semibold tabular-nums">{money(q.original_price)}</p></div>
            <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Price after inspection</p><p className="font-semibold tabular-nums">{money(q.revised_price ?? q.original_price)}</p></div>
          </div>
          {q.price_status === "CLARIFICATION" && q.customer_message && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900"><span className="font-medium">Customer asks: </span>“{q.customer_message}” — answer in the chat, then they can accept.</p>}
          {open && <Button size="sm" variant="outline" onClick={() => { setChecks(q.checks); setSummary(q.summary ?? ""); setRevised(q.revised_price != null ? String(q.revised_price) : ""); setEditing(true) }}>Edit report</Button>}
        </>
      )}

      {open && (editing || (!q)) && (
        <div className="space-y-3 rounded-lg bg-muted/40 p-4">
          <p className="text-xs text-muted-foreground">Check the returned item and mark each part. If it is worse than the customer described, enter a lower refund price — the customer must accept it before any money moves.</p>
          <div className="space-y-2">
            {checks.map((c, i) => (
              <div key={i} className="grid grid-cols-[1fr_auto_auto] items-center gap-2">
                <Input value={c.label} onChange={(e) => set(i, { label: e.target.value })} placeholder="Part" />
                <select className={SELECT} value={c.status} onChange={(e) => set(i, { status: e.target.value as QcResult })}>{(Object.keys(RESULT_LABEL) as QcResult[]).map((s) => <option key={s} value={s}>{RESULT_LABEL[s]}</option>)}</select>
                <Button size="icon" variant="ghost" aria-label="Remove part" onClick={() => setChecks((x) => x.filter((_, k) => k !== i))}><X className="h-4 w-4" /></Button>
              </div>
            ))}
            <Button size="sm" variant="outline" onClick={() => setChecks((x) => [...x, { label: "", status: "OK" }])}><Plus className="mr-1.5 h-3.5 w-3.5" />Add part</Button>
          </div>
          <div className="space-y-1.5"><Label>Note for the customer (optional)</Label><Textarea rows={2} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="e.g. Small scratch on the back panel." /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>Original price</Label><Input disabled value={money(originalPrice)} /></div>
            <div className="space-y-1.5"><Label>Price after inspection (leave empty for no change)</Label><Input inputMode="decimal" value={revised} onChange={(e) => setRevised(e.target.value)} placeholder={String(originalPrice)} />{priceBad && <p className="text-xs text-red-600">Enter an amount between ₹0 and {money(originalPrice)}.</p>}</div>
          </div>
          <div className="flex gap-2">
            <Button disabled={a.saveQc.isPending || priceBad || checks.some((c) => !c.label.trim()) || checks.length === 0} onClick={() => a.saveQc.mutate({ checks: checks.map((c) => ({ ...c, label: c.label.trim() })), summary: summary.trim() || undefined, revisedPrice: revisedNum })}>Save report &amp; notify customer</Button>
            {q && <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>}
          </div>
        </div>
      )}
    </div>
  )
}

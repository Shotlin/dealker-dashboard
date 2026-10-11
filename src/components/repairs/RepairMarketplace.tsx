"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Check, ExternalLink, MapPin, Star, Store, Truck, Zap } from "lucide-react"
import { cn, formatMoney } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useRepairOffers, useRepairTracking } from "@/hooks/useRepairs"
import type { Repair, RepairOffer } from "@/services/repairs.service"
import { fmtDate } from "./repair-ui"

const SORTS: Array<[string, string]> = [["best", "Best match"], ["lowest_price", "Lowest price"], ["nearest", "Nearest"], ["highest_rating", "Top rated"]]

const BADGE: Record<string, { label: string; className: string }> = {
  BEST_DEAL: { label: "Best deal", className: "bg-emerald-50 text-emerald-700" },
  LOWEST_PRICE: { label: "Lowest price", className: "bg-sky-50 text-sky-700" },
  LIVE_QUOTE: { label: "Live quote", className: "bg-indigo-50 text-indigo-700" },
}

const OFFER_STATE: Record<RepairOffer["status"], string> = {
  OPEN: "Open", SELECTED: "Chosen by customer", NOT_SELECTED: "Not chosen", WITHDRAWN: "Withdrawn", EXPIRED: "Expired",
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2"><h3 className="text-sm font-semibold">{title}</h3>{hint && <span className="text-xs text-muted-foreground">{hint}</span>}</div>
      {children}
    </section>
  )
}

function Stars({ value, count }: { value: number | null; count: number }) {
  if (value == null) return <span className="text-xs text-muted-foreground">New</span>
  return <span className="inline-flex items-center gap-0.5 text-xs"><Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden /><b>{value.toFixed(1)}</b><span className="text-muted-foreground">({count})</span></span>
}

/** Quotes from nearby repair shops: what the customer is comparing. */
export function OffersSection({ r }: { r: Repair }) {
  const [sort, setSort] = useState("best")
  const q = useRepairOffers(r.id, sort)
  const offers = q.data?.offers ?? []
  const waiting = r.status === "REQUESTED"
  return (
    <Section title={`Quotes from nearby shops${q.data ? ` (${q.data.count} open)` : ""}`}
      hint={waiting && r.offersCloseAt ? `Vendors can quote until ${fmtDate(r.offersCloseAt)}` : undefined}>
      {waiting && (
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Sort quotes">
          {SORTS.map(([v, l]) => (
            <button key={v} type="button" role="radio" aria-checked={sort === v} onClick={() => setSort(v)}
              className={cn("rounded-full border px-3 py-1 text-xs font-medium", sort === v ? "border-brand-500 bg-brand-50 text-brand-700" : "hover:bg-muted")}>{l}</button>
          ))}
        </div>
      )}
      {q.isLoading && <Skeleton className="h-24 w-full" />}
      {q.isError && <p role="alert" className="text-xs text-red-700">Quotes could not be loaded.</p>}
      {q.data && !offers.length && (
        <p className="text-xs text-muted-foreground">
          {waiting ? "No shop has quoted yet. Shops within range that price this repair are quoted automatically; others can quote by hand." : "No quotes were received."}
        </p>
      )}
      <ul className="space-y-2">
        {offers.map((o) => (
          <li key={o.id} className={cn("rounded-lg border p-3", o.status === "SELECTED" && "border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20", ["NOT_SELECTED", "WITHDRAWN", "EXPIRED"].includes(o.status) && "opacity-60")}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold">
                  <Store className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />{o.vendor.shopName}
                  {(o.badges ?? []).map((b) => <span key={b} className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", BADGE[b].className)}>{b === "LIVE_QUOTE" && <Zap className="mr-0.5 inline h-3 w-3" aria-hidden />}{BADGE[b].label}</span>)}
                </p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  <Stars value={o.vendor.rating} count={o.vendor.ratingCount} />
                  {o.distanceKm != null && <span className="inline-flex items-center gap-0.5"><MapPin className="h-3 w-3" aria-hidden />{o.distanceKm} km</span>}
                  <span>{o.estDaysMin === o.estDaysMax ? `${o.estDaysMax} day${o.estDaysMax === 1 ? "" : "s"}` : `${o.estDaysMin}–${o.estDaysMax} days`}</span>
                  <span>{o.warrantyDays}-day warranty</span>
                  {o.pickupDelivery && <span className="inline-flex items-center gap-0.5"><Truck className="h-3 w-3" aria-hidden />Pickup &amp; delivery</span>}
                </p>
              </div>
              <div className="text-right">
                <p className="text-base font-semibold tabular-nums">{formatMoney(o.total)}</p>
                {o.mrpTotal != null && o.mrpTotal > o.total && <p className="text-xs text-muted-foreground line-through tabular-nums">{formatMoney(o.mrpTotal)}</p>}
                <p className="text-[11px] text-muted-foreground">incl. {o.taxPct}% GST</p>
              </div>
            </div>
            <details className="mt-1.5">
              <summary className="cursor-pointer text-xs text-brand-700">Price breakdown · {OFFER_STATE[o.status]}{o.status === "OPEN" && o.expired ? " (expired)" : ""}</summary>
              <ul className="mt-1 divide-y text-xs">
                {o.lines.map((l, n) => <li key={n} className="flex justify-between gap-3 py-1"><span className="min-w-0 truncate">{l.description}</span><span className="tabular-nums">{formatMoney(l.amount ?? l.qty * l.unitPrice)}</span></li>)}
                <li className="flex justify-between gap-3 py-1 text-muted-foreground"><span>GST ({o.taxPct}%)</span><span className="tabular-nums">{formatMoney(o.taxAmount)}</span></li>
              </ul>
              {o.note && <p className="mt-1 text-xs text-muted-foreground">Note: {o.note}</p>}
              {o.vendor.phone && <p className="mt-1 text-xs text-muted-foreground">Shop phone {o.vendor.phone}</p>}
            </details>
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-muted-foreground">The customer picks an offer in the app. Staff can still assign a service centre directly below.</p>
    </Section>
  )
}

/** Fulfilment choice, appointment and pickup details. */
export function FulfilmentSection({ r }: { r: Repair }) {
  if (!r.fulfilment) return null
  const pickup = r.fulfilment === "PICKUP_DELIVERY"
  return (
    <Section title="How the device travels">
      <p className="flex items-center gap-1.5 text-sm font-medium">{pickup ? <Truck className="h-4 w-4 text-brand-600" aria-hidden /> : <Store className="h-4 w-4 text-brand-600" aria-hidden />}{pickup ? "Pickup & delivery" : "Customer visits the shop"}</p>
      <dl className="text-sm">
        {pickup && <div className="grid grid-cols-[120px_1fr] gap-2 py-0.5"><dt className="text-muted-foreground">Pickup address</dt><dd className="font-medium">{r.pickupAddress}</dd></div>}
        {pickup && <div className="grid grid-cols-[120px_1fr] gap-2 py-0.5"><dt className="text-muted-foreground">Pickup time</dt><dd className="font-medium">{r.pickupSlot ? fmtDate(r.pickupSlot) : "Not scheduled yet"}</dd></div>}
        {!pickup && <div className="grid grid-cols-[120px_1fr] gap-2 py-0.5"><dt className="text-muted-foreground">Appointment</dt><dd className="font-medium">{fmtDate(r.appointmentAt)}</dd></div>}
      </dl>
    </Section>
  )
}

/** The customer's tracking steps, exactly as the app shows them. Status only — no live map. */
export function TrackingSection({ r }: { r: Repair }) {
  const q = useRepairTracking(r.id, !!r.fulfilment)
  if (!r.fulfilment) return null
  if (q.isLoading) return <Skeleton className="h-32 w-full" />
  if (!q.data) return null
  return (
    <Section title="Customer tracking" hint={q.data.closed ? "Closed" : undefined}>
      <ol className="space-y-0">
        {q.data.steps.map((s, i) => (
          <li key={s.key} className="relative flex gap-3 pb-3 last:pb-0">
            {i < q.data.steps.length - 1 && <span aria-hidden className={cn("absolute left-[9px] top-5 h-full w-px", s.done ? "bg-emerald-400" : "bg-border")} />}
            <span aria-hidden className={cn("z-10 mt-0.5 flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-full border-2",
              s.done ? "border-emerald-500 bg-emerald-500 text-white" : s.current ? "border-brand-500 bg-background" : "border-border bg-background")}>
              {s.done ? <Check className="h-3 w-3" /> : s.current ? <span className="h-2 w-2 rounded-full bg-brand-500" /> : null}
            </span>
            <div className="min-w-0">
              <p className={cn("text-sm", s.current ? "font-semibold text-brand-700" : s.done ? "font-medium" : "text-muted-foreground")}>{s.label}</p>
              {s.at && <p className="text-xs text-muted-foreground">{fmtDate(s.at)}</p>}
              {s.meta?.courier && <p className="text-xs text-muted-foreground">Courier: {s.meta.courier}</p>}
              {s.meta?.trackingUrl && <a href={s.meta.trackingUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-brand-700 hover:underline">Courier tracking <ExternalLink className="h-3 w-3" aria-hidden /></a>}
            </div>
          </li>
        ))}
      </ol>
    </Section>
  )
}

export function RatingSection({ r }: { r: Repair }) {
  if (!r.rating) return null
  return (
    <Section title="Customer rating">
      <p className="flex items-center gap-1" aria-label={`${r.rating.stars} out of 5 stars`}>
        {Array.from({ length: 5 }, (_, i) => <Star key={i} className={cn("h-4 w-4", i < r.rating!.stars ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40")} aria-hidden />)}
      </p>
      {r.rating.review && <p className="text-sm">“{r.rating.review}”</p>}
    </Section>
  )
}

/** Pick the pickup time (local time → ISO). */
export function PickupDialog({ open, current, pending, onClose, onSubmit }: { open: boolean; current: string | null; pending?: boolean; onClose: () => void; onSubmit: (slotIso: string) => void }) {
  const [v, setV] = useState("")
  const submit = () => {
    const d = new Date(v)
    if (!v || Number.isNaN(d.getTime())) return toast.error("Choose the pickup date and time")
    if (d.getTime() < Date.now()) return toast.error("Pickup time must be in the future")
    onSubmit(d.toISOString())
  }
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Schedule pickup</DialogTitle><DialogDescription>{current ? `Currently ${fmtDate(current)}.` : "The customer sees this in their tracking."}</DialogDescription></DialogHeader>
        <div className="space-y-1.5"><Label htmlFor="pk-slot">Pickup date &amp; time</Label><Input id="pk-slot" type="datetime-local" value={v} onChange={(e) => setV(e.target.value)} /></div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={pending} onClick={submit}>Schedule</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Out for delivery: optional courier and tracking link (status only, no live location). */
export function OutForDeliveryDialog({ open, pending, onClose, onSubmit }: { open: boolean; pending?: boolean; onClose: () => void; onSubmit: (b: { courier?: string; trackingUrl?: string }) => void }) {
  const [courier, setCourier] = useState("")
  const [url, setUrl] = useState("")
  const submit = () => {
    if (url && !/^https?:\/\//i.test(url)) return toast.error("Tracking link must start with http:// or https://")
    onSubmit({ courier: courier.trim() || undefined, trackingUrl: url.trim() || undefined })
  }
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Out for delivery</DialogTitle><DialogDescription>Add the courier and a tracking link if one exists — the customer sees them as a link, not a live map.</DialogDescription></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label htmlFor="ofd-courier">Courier (optional)</Label><Input id="ofd-courier" value={courier} onChange={(e) => setCourier(e.target.value)} placeholder="Porter, Shiprocket, own rider…" /></div>
          <div className="space-y-1.5"><Label htmlFor="ofd-url">Tracking link (optional)</Label><Input id="ofd-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={pending} onClick={submit}>Mark out for delivery</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

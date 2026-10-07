"use client"

import { useState } from "react"
import { Check, CircleAlert, Copy, ExternalLink, MapPin, PackageCheck, PackageOpen, Plus, RefreshCw, Truck, Undo2, Warehouse } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { useShipmentTracking } from "@/hooks/useShipmentTracking"
import type { OrderOverview, OverviewSeller } from "@/types/order-overview.types"
import { day, dayTime, money } from "./helpers"

const COURIERS = ["Delhivery", "Blue Dart", "DTDC", "Ecom Express", "XpressBees", "Porter", "Seller delivery"]
const PROGRESS: Record<string, number> = { CREATED: 4, ASSIGNING: 4, ASSIGNED: 6, PICKUP_SCHEDULED: 8, PICKED_UP: 25, IN_TRANSIT: 55, OUT_FOR_DELIVERY: 85, DELIVERED: 100, FAILED: 85, RTO: 60, CANCELLED: 0 }
const UPDATE_OPTIONS = [
  ["PICKED_UP", "Picked up from the seller"], ["IN_TRANSIT", "On the way (in transit)"], ["OUT_FOR_DELIVERY", "Out for delivery"],
  ["DELIVERED", "Delivered to the customer"], ["FAILED", "Delivery attempt failed"], ["RTO", "Returning to the seller"], ["CANCELLED", "Shipment cancelled"],
] as const

function eventIcon(status: string) {
  if (status === "DELIVERED") return PackageCheck
  if (status === "OUT_FOR_DELIVERY" || status === "IN_TRANSIT") return Truck
  if (status === "PICKED_UP" || status === "PICKUP_SCHEDULED") return PackageOpen
  if (status === "FAILED" || status === "RTO") return Undo2
  return Warehouse
}

function RouteTrack({ s }: { s: OverviewSeller }) {
  const st = s.shipment!.status
  const pct = PROGRESS[st] ?? 10
  const problem = ["FAILED", "RTO", "CANCELLED"].includes(st)
  return (
    <div className="rounded-xl border p-4">
      <div className="flex items-start justify-between gap-3 text-sm">
        <div className="min-w-0"><p className="text-xs text-muted-foreground">From</p><p className="truncate font-medium">{s.route.from_city ?? "Seller"}</p><p className="truncate text-xs text-muted-foreground">{s.vendor.name}</p></div>
        <div className="shrink-0 text-center text-xs text-muted-foreground">{s.route.distance_km != null ? <><span className="block text-sm font-semibold text-foreground">≈ {s.route.distance_km} km</span>by road</> : "Route"}</div>
        <div className="min-w-0 text-right"><p className="text-xs text-muted-foreground">To</p><p className="truncate font-medium">{s.route.to_city ?? "Customer"}</p><p className="truncate text-xs text-muted-foreground">Customer’s address</p></div>
      </div>
      <div className="relative mx-2 mt-5 h-2 rounded-full bg-muted">
        <div className={cn("h-full rounded-full transition-all", problem ? "bg-red-500" : "bg-primary")} style={{ width: `${pct}%` }} />
        <span className="absolute -left-2 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-primary bg-white"><MapPin className="h-3 w-3 text-primary" /></span>
        <span className={cn("absolute -right-2 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border-2 bg-white", pct === 100 ? "border-primary" : "border-border")}>
          {pct === 100 ? <Check className="h-3 w-3 text-primary" /> : <MapPin className="h-3 w-3 text-muted-foreground" />}
        </span>
        {pct > 0 && pct < 100 && <span className="absolute -top-3 -ml-3.5 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow ring-1 ring-border transition-all" style={{ left: `${pct}%` }}><Truck className={cn("h-4 w-4", problem ? "text-red-500" : "text-primary")} /></span>}
      </div>
      <div className="mt-5 flex justify-between text-[11px] text-muted-foreground"><span>Picked up</span><span>On the way</span><span>Out for delivery</span><span>Delivered</span></div>
    </div>
  )
}

function UpdateDialog({ s, onClose }: { s: OverviewSeller | null; onClose: () => void }) {
  const { addEvent } = useShipmentTracking()
  const [status, setStatus] = useState("IN_TRANSIT")
  const [location, setLocation] = useState("")
  const [note, setNote] = useState("")
  if (!s?.shipment) return null
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Add a tracking update</DialogTitle><DialogDescription>Use this when the courier’s system doesn’t update on its own. The order status follows automatically.</DialogDescription></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5"><Label>What happened?</Label>
            <Select value={status} onValueChange={setStatus}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{UPDATE_OPTIONS.map(([v, t]) => <SelectItem key={v} value={v}>{t}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1.5"><Label>Where? (optional)</Label><Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Pune sorting hub" /></div>
          <div className="space-y-1.5"><Label>Note (optional)</Label><Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></div>
          {status === "DELIVERED" && <p className="rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800">Marking it delivered also closes this parcel, books the seller’s earnings{s.shipment.cod_amount > 0 ? ", and records the cash collected" : ""}.</p>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button disabled={addEvent.isPending} onClick={() => addEvent.mutate({ shipmentId: s.shipment!.id, status, location: location || undefined, note: note || undefined }, { onSuccess: onClose })}>Save update</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CreateDialog({ s, onClose }: { s: OverviewSeller | null; onClose: () => void }) {
  const { create } = useShipmentTracking()
  const [courier, setCourier] = useState("Delhivery")
  const [awb, setAwb] = useState("")
  const [url, setUrl] = useState("")
  const [eta, setEta] = useState("")
  if (!s) return null
  const self = courier === "Seller delivery"
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Create the shipment</DialogTitle><DialogDescription>{s.vendor.name} → customer · {s.items.reduce((n, i) => n + i.quantity, 0)} item(s). Enter the details from the courier booking.</DialogDescription></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5"><Label>Delivery partner</Label>
            <Select value={courier} onValueChange={setCourier}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{COURIERS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
          {!self && <div className="space-y-1.5"><Label>Tracking number (AWB) *</Label><Input value={awb} onChange={(e) => setAwb(e.target.value)} /></div>}
          <div className="space-y-1.5"><Label>Tracking link (optional)</Label><Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" /></div>
          <div className="space-y-1.5"><Label>Expected delivery date</Label><Input type="date" value={eta} onChange={(e) => setEta(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button disabled={create.isPending || (!self && !awb.trim())}
            onClick={() => create.mutate({ sellerOrderId: s.id, provider: self ? "SELF" : "SHIPROCKET", courierName: courier, awb: awb || undefined, trackingUrl: url || undefined, eta: eta || undefined }, { onSuccess: onClose })}>Create shipment</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function TrackingSection({ d }: { d: OrderOverview }) {
  const { refreshFromCourier } = useShipmentTracking()
  const [updating, setUpdating] = useState<OverviewSeller | null>(null)
  const [creating, setCreating] = useState<OverviewSeller | null>(null)
  const parcels = d.sellers.filter((s) => s.status !== "CANCELLED" || s.shipment)
  const shipped = d.sellers.filter((s) => s.shipment)
  const delivered = shipped.filter((s) => s.shipment!.status === "DELIVERED").length
  const moving = shipped.filter((s) => !["DELIVERED", "CANCELLED"].includes(s.shipment!.status)).length
  const copy = (t: string) => { navigator.clipboard?.writeText(t); toast.success("Tracking number copied") }

  return (
    <Card className="shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="flex flex-wrap items-center gap-2 text-base"><Truck className="h-4 w-4" />Shipment tracking
          <span className="text-sm font-normal text-muted-foreground">{shipped.length === 0 ? "No shipments yet" : `${delivered} of ${shipped.length} delivered${moving ? ` · ${moving} on the way` : ""}`}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {parcels.length === 0 && <p className="text-sm text-muted-foreground">There are no parcels to track on this order.</p>}
        {parcels.map((s, idx) => {
          const sh = s.shipment
          if (!sh) return (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed p-4">
              <div><p className="text-sm font-medium">{parcels.length > 1 ? `Parcel ${idx + 1} · ` : ""}{s.vendor.name}</p><p className="text-xs text-muted-foreground">{s.status === "CANCELLED" ? "Cancelled — nothing to ship." : "No delivery partner has been booked for this parcel yet."}</p></div>
              {s.can_create_shipment && <Button size="sm" onClick={() => setCreating(s)}><Plus className="mr-1.5 h-3.5 w-3.5" />Create shipment</Button>}
            </div>
          )
          const late = sh.eta && new Date(sh.eta) < new Date() && !["DELIVERED", "CANCELLED"].includes(sh.status)
          const problem = ["FAILED", "RTO"].includes(sh.status)
          const done = sh.status === "DELIVERED" || sh.status === "CANCELLED"
          return (
            <div key={s.id} className="space-y-4 rounded-xl border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">{parcels.length > 1 ? `Parcel ${idx + 1} · ` : ""}{s.vendor.name}</p>
                  <p className="text-lg font-semibold">{sh.courier ?? sh.provider}</p>
                  <p className="text-xs text-muted-foreground">{sh.provider === "SELF" ? "Delivered by the seller" : `Booked through ${sh.provider.charAt(0) + sh.provider.slice(1).toLowerCase()}`}</p>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className={cn("border-0 text-xs", sh.status === "DELIVERED" ? "bg-emerald-50 text-emerald-700" : problem ? "bg-red-50 text-red-700" : "bg-sky-50 text-sky-700")}>{sh.status_label}</Badge>
                  <p className="mt-1 text-xs text-muted-foreground">{sh.status === "DELIVERED" ? `Delivered ${dayTime(s.timestamps.delivered_at)}` : <>Expected by <span className={cn("font-medium", late ? "text-red-600" : "text-foreground")}>{day(sh.eta ?? s.timestamps.estimated_delivery)}</span>{late ? " · late" : ""}</>}</p>
                </div>
              </div>

              <RouteTrack s={s} />

              <div className="grid gap-3 text-sm sm:grid-cols-3">
                <div className="rounded-lg bg-muted/50 p-3"><p className="text-xs text-muted-foreground">Tracking number</p>
                  <p className="flex items-center gap-1.5 font-mono font-medium">{sh.awb ?? "—"}{sh.awb && <button type="button" onClick={() => copy(sh.awb!)} aria-label="Copy tracking number" className="text-muted-foreground hover:text-foreground"><Copy className="h-3.5 w-3.5" /></button>}</p></div>
                <div className="rounded-lg bg-muted/50 p-3"><p className="text-xs text-muted-foreground">Delivery charge</p><p className="font-medium tabular-nums">{money(sh.charge)}</p></div>
                <div className="rounded-lg bg-muted/50 p-3"><p className="text-xs text-muted-foreground">Cash to collect</p><p className="font-medium tabular-nums">{sh.cod_amount > 0 ? money(sh.cod_amount) : "Nothing — already paid"}</p></div>
              </div>

              {problem && <p className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-800"><CircleAlert className="h-4 w-4" />{sh.status === "RTO" ? "The courier could not deliver and is sending the parcel back to the seller." : "The last delivery attempt failed. Contact the customer or the courier."}</p>}

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Journey so far</p>
                <ol className="space-y-3">
                  {[...sh.events].reverse().map((e, k) => {
                    const Icon = eventIcon(e.status)
                    return (
                      <li key={k} className="flex gap-3">
                        <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full", k === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}><Icon className="h-3.5 w-3.5" /></span>
                        <span className="min-w-0"><span className={cn("block text-sm", k === 0 ? "font-semibold" : "font-medium")}>{e.label}</span>
                          <span className="block text-xs text-muted-foreground">{[e.location, dayTime(e.at)].filter(Boolean).join(" · ")}</span>
                          {e.note && <span className="block text-xs text-muted-foreground">{e.note}</span>}</span>
                      </li>
                    )
                  })}
                </ol>
              </div>

              <div className="flex flex-wrap gap-2 border-t pt-3">
                {sh.tracking_url && <Button size="sm" variant="outline" asChild><a href={sh.tracking_url} target="_blank" rel="noreferrer"><ExternalLink className="mr-1.5 h-3.5 w-3.5" />Track on courier site</a></Button>}
                {!done && <Button size="sm" variant="outline" disabled={refreshFromCourier.isPending} onClick={() => refreshFromCourier.mutate(sh.id)}><RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", refreshFromCourier.isPending && "animate-spin")} />Refresh from courier</Button>}
                {!done && <Button size="sm" onClick={() => setUpdating(s)}><Plus className="mr-1.5 h-3.5 w-3.5" />Add tracking update</Button>}
              </div>
            </div>
          )
        })}
      </CardContent>
      <UpdateDialog key={updating?.id ?? "u"} s={updating} onClose={() => setUpdating(null)} />
      <CreateDialog key={creating?.id ?? "c"} s={creating} onClose={() => setCreating(null)} />
    </Card>
  )
}

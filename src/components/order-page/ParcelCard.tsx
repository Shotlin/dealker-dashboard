"use client"

import { useState } from "react"
import { ArrowRight, Check, ExternalLink, FileText, MapPin, Package, Phone, Star, Store, Truck, Video, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { openInvoice } from "@/hooks/useOrderOverview"
import type { OverviewSeller } from "@/types/order-overview.types"
import { CONDITION, STEPS, StatusPill, day, dayTime, money, stepIndex } from "./helpers"

function Stepper({ status }: { status: string }) {
  if (status === "CANCELLED") return <p className="flex items-center gap-2 rounded-lg bg-slate-100 p-3 text-sm text-slate-700"><XCircle className="h-4 w-4" />This parcel was cancelled before it was delivered.</p>
  const at = stepIndex(status)
  return (
    <ol className="grid grid-cols-3 gap-y-4 sm:grid-cols-6">
      {STEPS.map((s, i) => {
        const done = i < at || (i === at && at === 5)
        const current = i === at && !done
        return (
          <li key={s.key} className="relative flex flex-col items-center text-center">
            {i > 0 && <span className={cn("absolute right-1/2 top-3.5 hidden h-0.5 w-full sm:block", i <= at ? "bg-primary" : "bg-border")} />}
            <span className={cn("relative z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-semibold", done ? "border-primary bg-primary text-primary-foreground" : current ? "border-primary bg-white text-primary ring-4 ring-primary/15" : "border-border bg-white text-muted-foreground")}>
              {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span className={cn("mt-1.5 text-xs font-medium", (done || current) ? "text-foreground" : "text-muted-foreground")}>{s.label}</span>
            <span className="hidden text-[10px] text-muted-foreground sm:block">{s.hint}</span>
          </li>
        )
      })}
    </ol>
  )
}

export function ParcelCard({ s, orderId, index, total }: { s: OverviewSeller; orderId: string; index: number; total: number }) {
  const [zoom, setZoom] = useState<string | null>(null)
  const photos = s.media.filter((m) => m.kind === "IMAGE")
  const video = s.media.find((m) => m.kind === "VIDEO")
  const ship = s.shipment
  const r = s.route

  return (
    <Card className="shadow-none">
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-3 space-y-0 border-b bg-muted/30 py-3">
        <div className="space-y-0.5">
          <CardTitle className="flex items-center gap-2 text-base"><Package className="h-4 w-4" />{total > 1 ? `Parcel ${index + 1} of ${total}` : "Parcel"} <span className="text-sm font-normal text-muted-foreground">· {s.number}</span></CardTitle>
          <p className="text-xs text-muted-foreground">Each seller packs and ships their own items separately.</p>
        </div>
        <StatusPill status={s.status} />
      </CardHeader>

      <CardContent className="space-y-6 p-5">
        <Stepper status={s.status} />

        {/* Who sells it */}
        <section className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold"><Store className="h-4 w-4 text-muted-foreground" />Who is selling this</h3>
          <div className="grid gap-3 rounded-xl border p-4 sm:grid-cols-2">
            <div>
              <p className="text-base font-semibold">{s.vendor.name}</p>
              {s.vendor.legal_name && <p className="text-xs text-muted-foreground">{s.vendor.legal_name}{s.vendor.gstin ? ` · GSTIN ${s.vendor.gstin}` : ""}</p>}
              {s.vendor.rating != null && <p className="mt-1 flex items-center gap-1 text-xs"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />{s.vendor.rating.toFixed(1)} seller rating</p>}
            </div>
            <div className="space-y-1 text-sm">
              {s.vendor.phone && <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-muted-foreground" />{s.vendor.phone}</p>}
              <p className="flex items-start gap-2 text-muted-foreground"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />Ships from {s.pickup.address}</p>
            </div>
          </div>
        </section>

        {/* What is in it */}
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">What’s in this parcel</h3>
          <ul className="divide-y rounded-xl border">
            {s.items.map((i, k) => (
              <li key={k} className="flex items-center gap-3 p-3">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {i.image && <img src={i.image} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{i.name}</p>
                  <p className="text-xs text-muted-foreground">{[i.brand, i.condition && CONDITION[i.condition]].filter(Boolean).join(" · ")}</p>
                </div>
                <p className="text-right text-sm tabular-nums"><span className="text-muted-foreground">{i.quantity} × {money(i.unit_price)}</span><br /><span className="font-semibold">{money(i.subtotal)}</span></p>
              </li>
            ))}
          </ul>
        </section>

        <p className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground"><Truck className="mr-2 inline h-4 w-4" />Where is this parcel? See <b className="text-foreground">Shipment tracking</b> above.</p>

        {/* Papers & proof */}
        <section className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold"><FileText className="h-4 w-4 text-muted-foreground" />Seller’s invoice & packing proof</h3>
          <div className="rounded-xl border p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              {s.invoice ? (
                <>
                  <p className="text-sm">Invoice <span className="font-mono font-medium">{s.invoice.number}</span> — issued by {s.vendor.name}</p>
                  <Button size="sm" variant="outline" onClick={() => (s.invoice?.url ? window.open(s.invoice.url, "_blank") : openInvoice(orderId, s.id))}><FileText className="mr-1.5 h-3.5 w-3.5" />View invoice</Button>
                </>
              ) : <p className="text-sm text-muted-foreground">The seller hasn’t issued an invoice yet.</p>}
            </div>
            {photos.length > 0 ? (
              <div>
                <p className="mb-2 text-xs text-muted-foreground">Photos the seller took while packing — tap to enlarge</p>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {photos.map((m) => (
                    <button key={m.id} type="button" onClick={() => setZoom(m.url)} className="group relative aspect-[4/3] overflow-hidden rounded-lg border bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={m.url} alt={m.caption ?? ""} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                      {m.caption && <span className="absolute inset-x-0 bottom-0 bg-black/55 px-1.5 py-0.5 text-left text-[10px] text-white">{m.caption}</span>}
                    </button>
                  ))}
                </div>
              </div>
            ) : <p className="text-sm text-muted-foreground">The seller hasn’t uploaded packing photos yet.</p>}
            {video && (
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground"><Video className="h-3.5 w-3.5" />Packing video from the seller</p>
                <video src={video.url} controls preload="metadata" className="aspect-video w-full max-w-md rounded-lg border bg-black" />
              </div>
            )}
          </div>
        </section>

        {/* Money */}
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Money for this parcel</h3>
          <dl className="space-y-1.5 rounded-xl border p-4 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">Items sold</dt><dd className="tabular-nums">{money(s.money.subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Dealker commission ({s.money.commission_percent}%)</dt><dd className="tabular-nums">− {money(s.money.commission)}</dd></div>
            {s.money.shipping > 0 && <div className="flex justify-between"><dt className="text-muted-foreground">Delivery cost</dt><dd className="tabular-nums">− {money(s.money.shipping)}</dd></div>}
            <div className="flex justify-between border-t pt-2 font-semibold"><dt>Seller receives</dt><dd className="tabular-nums">{money(s.money.payable_to_vendor)}</dd></div>
            <p className="text-xs text-muted-foreground">Payout status: {({ PENDING: "waiting until delivery", ELIGIBLE: "ready to be paid", PROCESSING: "being paid", PAID: "paid", ON_HOLD: "on hold", REVERSED: "cancelled" } as Record<string, string>)[s.payout_status] ?? s.payout_status.toLowerCase()}</p>
          </dl>
        </section>
      </CardContent>

      <Dialog open={Boolean(zoom)} onOpenChange={(o) => !o && setZoom(null)}>
        <DialogContent className="max-w-3xl p-2">
          <DialogTitle className="sr-only">Packing photo</DialogTitle>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {zoom && <img src={zoom} alt="" className="max-h-[80vh] w-full rounded-lg object-contain" />}
        </DialogContent>
      </Dialog>
    </Card>
  )
}

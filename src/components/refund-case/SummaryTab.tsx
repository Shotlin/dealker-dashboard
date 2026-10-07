"use client"

import { Check, ExternalLink, FileText, Mail, MapPin, MessageSquareQuote, PackageOpen, Phone, Star, Store, Truck, UserRound, Wallet } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { STEPS, stepIndex } from "@/components/order-page/helpers"
import { openInvoice } from "@/hooks/useOrderOverview"
import type { RefundCase } from "@/types/refund-case.types"
import { PARTY, fmtDate, fmtDateTime, inr } from "./meta"

function Section({ icon: Icon, title, hint, children }: { icon: React.ElementType; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <Card className="shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base"><Icon className="h-4 w-4 text-primary" />{title}</CardTitle>
        {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

const Row = ({ k, v, strong }: { k: string; v: React.ReactNode; strong?: boolean }) => (
  <div className="flex items-baseline justify-between gap-3 py-1 text-sm"><span className="text-muted-foreground">{k}</span><span className={cn("text-right tabular-nums", strong && "font-semibold")}>{v}</span></div>
)

export function SummaryTab({ c }: { c: RefundCase }) {
  const r = c.request
  const o = c.overview
  const customerProof = c.evidence.filter((e) => e.side === "CUSTOMER").length
  const deliveredAt = o?.order.delivered_at ?? null
  const daysAfter = deliveredAt ? Math.max(0, Math.round((new Date(r.created_at).getTime() - new Date(deliveredAt).getTime()) / 86400000)) : null
  const disputed = c.products.filter((p) => p.disputed)
  // What the seller would give back: the returned items' value minus Dealker's commission.
  const sellerLoss = (o?.sellers ?? []).reduce((t, s) => t + s.items.filter((i) => r.scope === "ALL" || disputed.some((d) => d.id === i.id)).reduce((x, i) => x + i.subtotal, 0) * (1 - s.money.commission_percent / 100), 0)

  return (
    <div className="space-y-5">
      <Section icon={MessageSquareQuote} title="What the customer is complaining about" hint="In their own words, and what they sent us.">
        <blockquote className={cn("rounded-lg border-l-4 bg-sky-50/60 p-4 text-base leading-relaxed", PARTY.CUSTOMER.bar)}>“{r.reason}”</blockquote>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <Badge variant="outline" className="font-normal">Asked on {fmtDateTime(r.created_at)}</Badge>
          {daysAfter != null && <Badge variant="outline" className="font-normal">{daysAfter === 0 ? "Same day it was delivered" : `${daysAfter} day${daysAfter === 1 ? "" : "s"} after delivery`}</Badge>}
          <Badge variant="outline" className={cn("font-normal", customerProof === 0 && "border-amber-300 bg-amber-50 text-amber-900")}>
            {customerProof === 0 ? "No photos or video from the customer yet" : `${customerProof} photo / video file${customerProof === 1 ? "" : "s"} from the customer`}
          </Badge>
        </div>
      </Section>

      <Section icon={PackageOpen} title="The product" hint={r.scope === "ALL" ? "The customer wants to return everything in this order." : "Only the highlighted items are being returned."}>
        {c.products.length === 0 ? <p className="text-sm text-muted-foreground">We could not load the product list.</p> : (
          <ul className="divide-y rounded-lg border">
            {c.products.map((p) => (
              <li key={p.id} className={cn("flex gap-3 p-3", !p.disputed && "opacity-60")}>
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {p.image ? <img src={p.image} alt={p.name} className="h-full w-full object-cover" /> : <PackageOpen className="m-5 h-6 w-6 text-muted-foreground" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{p.name}</p>
                    {p.disputed && <Badge className="bg-red-50 text-red-700 hover:bg-red-50" variant="outline">Customer wants to return this</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">{[p.brand, p.condition?.replaceAll("_", " ").toLowerCase(), `Qty ${p.quantity}`].filter(Boolean).join(" · ")}</p>
                  {p.seller?.name && <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground"><Store className="h-3 w-3" />Sold by {p.seller.name}</p>}
                </div>
                <p className="shrink-0 text-sm font-semibold tabular-nums">{inr(p.subtotal)}</p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {o && (
        <Section icon={Truck} title="How the order travelled" hint="What happened between the customer paying and now.">
          <div className="space-y-4">
            {o.sellers.map((s) => {
              const idx = stepIndex(s.status)
              return (
                <div key={s.id} className="rounded-lg border p-3">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="flex items-center gap-1.5 text-sm font-medium"><Store className="h-4 w-4 text-amber-600" />{s.vendor.name} <span className="text-xs font-normal text-muted-foreground">· parcel {s.number}</span></p>
                    <div className="flex gap-3 text-xs">
                      {s.shipment?.tracking_url && <a href={s.shipment.tracking_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">Open tracking<ExternalLink className="h-3 w-3" /></a>}
                      {s.invoice && <button type="button" onClick={() => openInvoice(o.order.id, s.id)} className="inline-flex items-center gap-1 text-primary hover:underline"><FileText className="h-3 w-3" />Seller invoice</button>}
                    </div>
                  </div>
                  <ol className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                    {STEPS.map((st, i) => (
                      <li key={st.key} className="text-center">
                        <span className={cn("mx-auto mb-1 flex h-6 w-6 items-center justify-center rounded-full border-2 text-xs", i <= idx ? "border-emerald-500 bg-emerald-500 text-white" : "border-border bg-white text-muted-foreground")}>{i <= idx ? <Check className="h-3.5 w-3.5" /> : i + 1}</span>
                        <span className={cn("block text-[11px] leading-tight", i <= idx ? "font-medium" : "text-muted-foreground")}>{st.label}</span>
                      </li>
                    ))}
                  </ol>
                  <div className="mt-3 grid gap-x-6 sm:grid-cols-2">
                    <Row k="Delivery partner" v={s.shipment ? `${s.shipment.courier ?? s.shipment.provider}${s.shipment.awb ? ` · ${s.shipment.awb}` : ""}` : "Not shipped"} />
                    <Row k="Delivered on" v={s.timestamps.delivered_at ? fmtDateTime(s.timestamps.delivered_at) : "Not delivered"} />
                    <Row k="Promised by" v={fmtDate(s.timestamps.estimated_delivery)} />
                    <Row k="Packing photos / video" v={s.media.length ? `${s.media.length} file${s.media.length === 1 ? "" : "s"}` : <span className="text-amber-700">None uploaded</span>} />
                  </div>
                </div>
              )
            })}
          </div>
        </Section>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Section icon={UserRound} title="The customer">
          <p className="text-base font-medium">{r.customer.name ?? "—"}</p>
          <div className="mt-1 space-y-1 text-sm text-muted-foreground">
            {r.customer.phone && <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" /><a className="hover:underline" href={`tel:${r.customer.phone}`}>{r.customer.phone}</a></p>}
            {r.customer.email && <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" />{r.customer.email}</p>}
            {o?.customer.address && <p className="flex items-start gap-2"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />{[o.customer.address.line1, o.customer.address.city, o.customer.address.state, o.customer.address.pincode].filter(Boolean).join(", ") || "No address"}</p>}
          </div>
          {o && <p className="mt-3 rounded-lg bg-muted/50 p-2.5 text-xs text-muted-foreground">Customer since {fmtDate(o.customer.since)} · {o.customer.orders} order{o.customer.orders === 1 ? "" : "s"} · spent {inr(o.customer.total_spent)}</p>}
        </Section>

        <Section icon={Store} title={c.sellers.length > 1 ? "The sellers" : "The seller"}>
          {c.sellers.length === 0 && <p className="text-sm text-muted-foreground">No seller found for this order.</p>}
          <div className="space-y-3">
            {c.sellers.map((s) => (
              <div key={s.parcel}>
                <p className="flex items-center gap-2 text-base font-medium">{s.name}{s.rating != null && <span className="inline-flex items-center gap-0.5 text-xs font-normal text-amber-600"><Star className="h-3 w-3 fill-current" />{s.rating.toFixed(1)}</span>}</p>
                <div className="mt-1 space-y-1 text-sm text-muted-foreground">
                  {s.legal_name && <p>{s.legal_name}</p>}
                  {s.phone && <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" /><a className="hover:underline" href={`tel:${s.phone}`}>{s.phone}</a></p>}
                  {s.email && <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" />{s.email}</p>}
                  {s.city && <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" />Ships from {s.city}</p>}
                </div>
              </div>
            ))}
          </div>
        </Section>
      </div>

      <Section icon={Wallet} title="The money" hint="What this refund would cost.">
        <div className="grid gap-x-8 sm:grid-cols-2">
          <div>
            <Row k="Customer paid for the order" v={inr(r.order.total)} />
            {r.order.wallet_used > 0 && <Row k="…of which from their wallet" v={inr(r.order.wallet_used)} />}
            <Row k="Refund they are asking for" v={inr(r.claimed_amount)} strong />
          </div>
          <div>
            <Row k="Taken back from the seller" v={inr(sellerLoss)} />
            <p className="text-xs text-muted-foreground">If we approve, this is deducted from the seller’s balance (item price minus Dealker’s commission).</p>
          </div>
        </div>
      </Section>
    </div>
  )
}

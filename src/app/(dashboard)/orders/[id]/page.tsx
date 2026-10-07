"use client"

import Link from "next/link"
import { AlertTriangle, ArrowLeft, Banknote, Boxes, CalendarClock, ShoppingBag, UserRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { PayoutSection } from "@/components/order-page/PayoutSection"
import { ReturnsSection } from "@/components/order-page/ReturnsSection"
import { TrackingSection } from "@/components/order-page/TrackingSection"
import { ParcelCard } from "@/components/order-page/ParcelCard"
import { CustomerCard, InvoiceCard, OffersCard, PaymentCard, ProblemsCard, TimelineCard } from "@/components/order-page/SideCards"
import { StatusPill, dayTime, money, payMethodText } from "@/components/order-page/helpers"
import { useOrderOverview } from "@/hooks/useOrderOverview"

export default function OrderPage({ params }: { params: { id: string } }) {
  const { data: d, isLoading, isError } = useOrderOverview(params.id)

  if (isLoading) return <div className="mx-auto max-w-[1400px] space-y-4"><Skeleton className="h-10 w-72" /><Skeleton className="h-36" /><Skeleton className="h-96" /></div>
  if (isError || !d) return (
    <div className="mx-auto max-w-xl py-20 text-center">
      <p className="text-lg font-semibold">We couldn’t find this order</p>
      <p className="mb-4 text-sm text-muted-foreground">It may have been removed, or the link is wrong.</p>
      <Button asChild><Link href="/orders">Back to orders</Link></Button>
    </div>
  )

  const o = d.order
  const vendors = Array.from(new Set(d.sellers.map((s) => s.vendor.name))).join(" and ")

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" asChild><Link href="/orders"><ArrowLeft className="mr-1.5 h-4 w-4" />All orders</Link></Button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Order {o.number}</h1>
        <StatusPill status={o.status} className="text-sm" />
        <span className="text-sm text-muted-foreground">Placed {dayTime(o.placed_at)}</span>
      </div>

      {/* Plain-language summary */}
      <Card className="border-primary/20 bg-primary/5 shadow-none">
        <CardContent className="space-y-4 p-5">
          <p className="text-base leading-relaxed">
            <b>{d.customer.name}</b> ordered <b>{o.item_count} item{o.item_count === 1 ? "" : "s"}</b> from <b>{vendors || "a seller"}</b> for <b>{money(d.payment.breakdown.total)}</b>.
            {" "}{payMethodText(o.payment_method, d.payment.gateway?.method)}.
          </p>
          <p className="text-sm font-medium">{o.summary}</p>
          {o.cancelled_reason && <p className="text-sm text-muted-foreground">Reason given: “{o.cancelled_reason}”</p>}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { icon: UserRound, k: "Customer", v: d.customer.name ?? "—" },
              { icon: Boxes, k: o.vendor_count > 1 ? "Parcels" : "Parcel", v: `${o.vendor_count} from ${o.vendor_count} seller${o.vendor_count === 1 ? "" : "s"}` },
              { icon: Banknote, k: "Total", v: money(d.payment.breakdown.total) },
              { icon: CalendarClock, k: "Delivered", v: o.delivered_at ? dayTime(o.delivered_at) : "Not yet" },
            ].map(({ icon: Icon, k, v }) => (
              <div key={k} className="flex items-center gap-2.5 rounded-lg bg-white/80 p-3">
                <Icon className="h-4 w-4 text-primary" /><div className="min-w-0"><p className="text-[11px] text-muted-foreground">{k}</p><p className="truncate text-sm font-medium">{v}</p></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {d.attention.length > 0 && (
        <Card className="border-amber-300 bg-amber-50 shadow-none">
          <CardContent className="space-y-1.5 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-amber-900"><AlertTriangle className="h-4 w-4" />Needs your attention</p>
            <ul className="list-disc space-y-1 pl-6 text-sm text-amber-900">{d.attention.map((a, i) => <li key={i}>{a}</li>)}</ul>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-5">
          {d.sellers.length === 0 && (
            <Card className="shadow-none"><CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground"><ShoppingBag className="h-5 w-5" />This order has no seller parcels yet.</CardContent></Card>
          )}
          <TrackingSection d={d} />
          <ReturnsSection d={d} />
          <PayoutSection d={d} />
          {d.sellers.map((s, i) => <ParcelCard key={s.id} s={s} orderId={o.id} index={i} total={d.sellers.length} />)}
        </div>
        <div className="space-y-5">
          <CustomerCard d={d} />
          <PaymentCard d={d} />
          <OffersCard d={d} />
          <ProblemsCard d={d} />
          <InvoiceCard d={d} />
          <TimelineCard d={d} />
        </div>
      </div>
    </div>
  )
}

"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Banknote, CircleAlert, Gift, Headset, Mail, MapPin, MessageCircle, Phone, ReceiptText, Ticket, Wallet } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { useStartConversation } from "@/hooks/useSupport"
import { openInvoice } from "@/hooks/useOrderOverview"
import type { OrderOverview } from "@/types/order-overview.types"
import { day, dayTime, money, payMethodText } from "./helpers"

const initials = (n?: string | null) => (n || "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()

export function CustomerCard({ d }: { d: OrderOverview }) {
  const c = d.customer; const a = c.address
  return (
    <Card className="shadow-none">
      <CardHeader className="pb-3"><CardTitle className="text-base">Who placed this order</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-11 w-11"><AvatarFallback className="bg-primary/10 font-semibold text-primary">{initials(c.name)}</AvatarFallback></Avatar>
          <div><p className="font-semibold">{c.name}</p><p className="text-xs text-muted-foreground">Customer since {day(c.since)} · {c.orders} order{c.orders === 1 ? "" : "s"} · {money(c.total_spent)} spent</p></div>
        </div>
        <div className="space-y-1.5 text-sm">
          {c.phone && <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-muted-foreground" />{c.phone}</p>}
          {c.email && <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-muted-foreground" />{c.email}</p>}
        </div>
        <div className="rounded-lg bg-muted/50 p-3 text-sm">
          <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><MapPin className="h-3.5 w-3.5" />Delivery address</p>
          <p className="font-medium">{a.name ?? c.name}</p>
          <p className="text-muted-foreground">{[a.line1, a.city, a.state, a.pincode].filter(Boolean).join(", ")}</p>
          {a.phone && <p className="text-muted-foreground">Phone: {a.phone}</p>}
        </div>
      </CardContent>
    </Card>
  )
}

function Row({ label, value, strong, muted }: { label: string; value: string; strong?: boolean; muted?: boolean }) {
  return <div className={cn("flex justify-between gap-3 text-sm", strong && "border-t pt-2 font-semibold")}><dt className={muted ? "text-muted-foreground" : ""}>{label}</dt><dd className="tabular-nums">{value}</dd></div>
}

export function PaymentCard({ d }: { d: OrderOverview }) {
  const p = d.payment; const b = p.breakdown
  const paidOnline = Math.max(0, b.total - b.points_value - b.wallet_used)
  return (
    <Card className="shadow-none">
      <CardHeader className="pb-3"><CardTitle className="flex items-center justify-between text-base">How it was paid
        <Badge variant="outline" className={cn("border-0 text-[11px]", p.status === "PAID" ? "bg-emerald-50 text-emerald-700" : p.status === "REFUNDED" ? "bg-violet-50 text-violet-700" : "bg-amber-50 text-amber-700")}>
          {p.status === "PAID" ? "Payment received" : p.status === "REFUNDED" ? "Refunded" : p.status === "PARTIALLY_PAID" ? "Advance paid · balance due" : p.method === "COD" ? "To be collected" : "Payment pending"}</Badge></CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <p className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-sm"><Banknote className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />{payMethodText(p.method, p.gateway?.method, p.plan)}</p>
        <div className="grid grid-cols-3 gap-2 text-center" data-testid="payment-split">
          <div className="rounded-lg border p-2"><p className="text-[11px] text-muted-foreground">Total</p><p className="text-sm font-semibold">{money(p.amount_paid + p.amount_due)}</p></div>
          <div className="rounded-lg border p-2"><p className="text-[11px] text-muted-foreground">Paid</p><p className="text-sm font-semibold text-emerald-600">{money(p.amount_paid)}</p></div>
          <div className={cn("rounded-lg border p-2", p.amount_due > 0 && "border-amber-300 bg-amber-50")}><p className="text-[11px] text-muted-foreground">Remaining</p><p className={cn("text-sm font-semibold", p.amount_due > 0 && "text-amber-700")}>{money(p.amount_due)}</p></div>
        </div>
        {p.plan === "PARTIAL" && <p className="text-xs text-muted-foreground">Partial payment: {money(p.advance_amount)} paid online as advance, {money(p.amount_due || Math.max(0, b.total - p.advance_amount))} to be collected on delivery.</p>}
        {p.plan === "COD" && p.amount_due > 0 && <p className="text-xs text-muted-foreground">Cash on delivery: {money(p.amount_due)} to be collected by the courier.</p>}
        <dl className="space-y-1.5">
          <Row label="Items" value={money(b.items)} muted />
          <Row label="Delivery" value={b.delivery > 0 ? money(b.delivery) : "Free"} muted />
          {b.discount > 0 && <Row label="Discount" value={`− ${money(b.discount)}`} muted />}
          <Row label="Total the customer pays" value={money(b.total)} strong />
          {(b.points_value > 0 || b.wallet_used > 0) && (
            <div className="mt-2 space-y-1.5 rounded-lg border p-3">
              <p className="text-xs font-medium text-muted-foreground">Paid using</p>
              {b.points_value > 0 && <Row label={`Reward points (${b.points_used} pts)`} value={money(b.points_value)} />}
              {b.wallet_used > 0 && <Row label="Dealker wallet" value={money(b.wallet_used)} />}
              <Row label={p.method === "COD" ? "Cash to courier" : "Card / UPI / net banking"} value={money(paidOnline)} />
            </div>
          )}
        </dl>
        {p.gateway?.id && <p className="text-[11px] text-muted-foreground">Payment ID {p.gateway.id} · {dayTime(p.gateway.paid_at)}</p>}
        <p className="text-[11px] text-muted-foreground">GST of {money(b.tax_included)} is already included in the item prices.</p>
      </CardContent>
    </Card>
  )
}

export function OffersCard({ d }: { d: OrderOverview }) {
  const { coupon, cashback, breakdown: b } = d.payment
  const none = !coupon && cashback.length === 0 && b.points_value === 0
  const text = coupon?.details
  return (
    <Card className="shadow-none">
      <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Gift className="h-4 w-4" />Coupons, cashback & points</CardTitle></CardHeader>
      <CardContent className="space-y-3 text-sm">
        {none && <p className="text-muted-foreground">No coupon, cashback or reward points were used on this order.</p>}
        {coupon && (
          <div className="rounded-lg border border-dashed p-3">
            <p className="flex items-center gap-2 font-medium"><Ticket className="h-4 w-4 text-primary" /><span className="font-mono">{coupon.code}</span><span className="ml-auto text-emerald-600">saved {money(coupon.saved)}</span></p>
            {text && <p className="mt-1 text-xs text-muted-foreground">{text.description ?? (text.discount_type === "PERCENTAGE" ? `${Number(text.discount_value)}% off` : `₹${Number(text.discount_value)} off`)}
              {text.max_discount ? ` (up to ${money(Number(text.max_discount))})` : ""}{text.min_order_amount && Number(text.min_order_amount) > 0 ? ` on orders above ${money(Number(text.min_order_amount))}` : ""}.
              {" "}The {text.absorber === "PLATFORM" ? "discount is paid by Dealker" : "seller pays for this discount"}.</p>}
          </div>
        )}
        {b.points_value > 0 && <p className="flex items-center gap-2"><Gift className="h-4 w-4 text-muted-foreground" />Customer used <b>{b.points_used}</b> reward points worth <b>{money(b.points_value)}</b>.</p>}
        {b.wallet_used > 0 && <p className="flex items-center gap-2"><Wallet className="h-4 w-4 text-muted-foreground" />Customer paid <b>{money(b.wallet_used)}</b> from their wallet.</p>}
        {cashback.map((c, i) => (
          <p key={i} className="flex items-center gap-2 rounded-lg bg-emerald-50 p-2.5 text-emerald-800"><Banknote className="h-4 w-4" />Cashback of <b>{money(c.amount)}</b> {c.status === "CREDITED" ? `was added to the customer’s wallet on ${day(c.credited_at)}` : c.status === "PENDING" ? "will be added after delivery" : "was cancelled"}.</p>
        ))}
      </CardContent>
    </Card>
  )
}

export function ProblemsCard({ d }: { d: OrderOverview }) {
  const router = useRouter()
  const start = useStartConversation()
  const { tickets } = d.problems
  const none = tickets.length === 0
  return (
    <Card className="shadow-none">
      <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><CircleAlert className="h-4 w-4" />Support chats</CardTitle></CardHeader>
      <CardContent className="space-y-3 text-sm">
        {none && <p className="text-muted-foreground">No support chats for this order yet.</p>}
        {tickets.map((t) => (
          <Link key={t.id} href={`/support?ticket=${t.id}`} className="flex items-center gap-2 rounded-lg border p-3 hover:bg-muted/50">
            <Headset className="h-4 w-4 text-muted-foreground" /><span className="min-w-0 flex-1"><span className="block truncate font-medium">{t.subject}</span><span className="text-xs text-muted-foreground">{t.ticket_number} · {t.status.replace(/_/g, " ").toLowerCase()}</span></span>
          </Link>
        ))}
        <Button variant="outline" className="w-full" disabled={start.isPending} onClick={() => start.mutate({ orderId: d.order.id }, { onSuccess: (x) => router.push(`/support?ticket=${x.ticket.id}`) })}>
          <MessageCircle className="mr-2 h-4 w-4" />Chat with the customer
        </Button>
      </CardContent>
    </Card>
  )
}

export function InvoiceCard({ d }: { d: OrderOverview }) {
  return (
    <Card className="shadow-none">
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <div><p className="text-sm font-medium">Dealker invoice for the customer</p><p className="text-xs text-muted-foreground">Covers the whole order — all parcels together.</p></div>
        <Button size="sm" variant="outline" onClick={() => openInvoice(d.order.id)}><ReceiptText className="mr-1.5 h-3.5 w-3.5" />View</Button>
      </CardContent>
    </Card>
  )
}

export function TimelineCard({ d }: { d: OrderOverview }) {
  const dot = { order: "bg-primary", shipment: "bg-sky-500", proof: "bg-violet-500", problem: "bg-red-500", support: "bg-amber-500" } as const
  return (
    <Card className="shadow-none">
      <CardHeader className="pb-3"><CardTitle className="text-base">Everything that happened</CardTitle></CardHeader>
      <CardContent>
        <ol className="space-y-4 border-l pl-4">
          {d.timeline.map((t, i) => (
            <li key={i} className="relative">
              <span className={cn("absolute -left-[21px] top-1.5 h-2 w-2 rounded-full", dot[t.kind])} />
              <p className="text-sm font-medium">{t.title}</p>
              {t.detail && <p className="text-xs text-muted-foreground">{t.detail}</p>}
              <p className="text-[11px] text-muted-foreground">{dayTime(t.at)}{t.who ? ` · ${t.who}` : ""}</p>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  )
}

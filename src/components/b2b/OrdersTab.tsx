"use client"

import { useState } from "react"
import { Search, Truck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useB2bMutations, useB2bOrders } from "@/hooks/useB2bAdmin"
import { useDebounce } from "@/hooks/useDebounce"
import { formatINR } from "@/lib/utils"
import type { B2bOrder } from "@/types/b2b.admin.types"
import { OrderStatusBadge, PayState, dateShort } from "./shared"

const ALL = "all"
const STATUSES = ["PENDING_PAYMENT", "PAID", "PACKED", "DISPATCHED", "DELIVERED", "COMPLETED", "DISPUTED", "REFUNDED", "CANCELLED"]

export function ResolveDialog({ order, onClose }: { order: B2bOrder | null; onClose: () => void }) {
  const { resolve } = useB2bMutations()
  const [decision, setDecision] = useState<"RELEASE" | "REFUND" | "PARTIAL">("RELEASE")
  const [qty, setQty] = useState("")
  const [note, setNote] = useState("")
  if (!order) return null
  const q = Number(qty)
  const partialPayable = q > 0 ? Math.round(q * order.unit_price * (1 - order.commission_percent / 100)) : 0
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Resolve dispute · {order.order_number}</DialogTitle>
          <DialogDescription>{order.buyer_name} → {order.seller_name} · {order.quantity} × {order.product_name} · {formatINR(order.subtotal)} held in escrow</DialogDescription>
        </DialogHeader>
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800"><span className="font-medium">Buyer says:</span> {order.dispute_reason}{order.received_quantity != null && ` (received ${order.received_quantity} of ${order.quantity})`}</div>
        <RadioGroup value={decision} onValueChange={(v) => setDecision(v as typeof decision)} className="space-y-2">
          {([["RELEASE", "Release full payment to seller", `Seller receives ${formatINR(order.seller_payable)} after ${order.commission_percent}% commission.`],
             ["PARTIAL", "Release for fewer units, refund the rest", "Use when only part of the order was delivered properly."],
             ["REFUND", "Refund the buyer in full", "The seller is not paid. Escrow returns to the buyer."]] as const).map(([v, t, d]) => (
            <Label key={v} htmlFor={`d-${v}`} className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 font-normal has-[:checked]:border-primary has-[:checked]:bg-primary/5">
              <RadioGroupItem id={`d-${v}`} value={v} className="mt-1" />
              <span><span className="block text-sm font-medium">{t}</span><span className="text-xs text-muted-foreground">{d}</span></span>
            </Label>
          ))}
        </RadioGroup>
        {decision === "PARTIAL" && (
          <div className="space-y-1.5">
            <Label className="text-sm">Units to pay the seller for (1–{order.quantity - 1})</Label>
            <Input type="number" min={1} max={order.quantity - 1} value={qty} onChange={(e) => setQty(e.target.value)} />
            {q > 0 && <p className="text-xs text-muted-foreground">Seller receives {formatINR(partialPayable)} · buyer refunded {formatINR(Math.round((order.quantity - q) * order.unit_price))}</p>}
          </div>
        )}
        <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note for both vendors (optional)…" />
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button disabled={resolve.isPending || (decision === "PARTIAL" && !(q > 0 && q < order.quantity))}
            onClick={() => resolve.mutate({ id: order.id, decision, releaseQuantity: decision === "PARTIAL" ? q : undefined, note }, { onSuccess: onClose })}>
            Confirm decision
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function OrdersTab({ initialStatus = "" }: { initialStatus?: string }) {
  const [status, setStatus] = useState(initialStatus)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [resolving, setResolving] = useState<B2bOrder | null>(null)
  const q = useDebounce(search, 300)
  const { data, isLoading } = useB2bOrders({ status, search: q, page })
  const rows = data?.data ?? []
  const total = data?.pagination.total ?? 0

  return (
    <Card className="shadow-none">
      <div className="flex flex-col gap-2 border-b p-3 sm:flex-row">
        <div className="relative sm:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search order, product, seller or AWB…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <Select value={status || ALL} onValueChange={(v) => { setStatus(v === ALL ? "" : v); setPage(1) }}>
          <SelectTrigger className="sm:w-[190px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <Table>
        <TableHeader><TableRow className="hover:bg-transparent">
          <TableHead>Order</TableHead><TableHead>Buyer → Seller</TableHead><TableHead className="text-right">Qty × price</TableHead>
          <TableHead className="text-right">Amount</TableHead><TableHead className="text-right">Commission</TableHead><TableHead>Payment</TableHead>
          <TableHead>Status</TableHead><TableHead>Shipping</TableHead><TableHead className="w-24" />
        </TableRow></TableHeader>
        <TableBody>
          {isLoading ? Array.from({ length: 6 }).map((_, i) => <TableRow key={i}><TableCell colSpan={9}><Skeleton className="h-10" /></TableCell></TableRow>)
            : rows.length === 0 ? <TableRow><TableCell colSpan={9} className="h-40 text-center text-muted-foreground">No B2B orders match.</TableCell></TableRow>
            : rows.map((o) => (
              <TableRow key={o.id}>
                <TableCell>
                  <p className="text-sm font-medium">{o.order_number}</p>
                  <p className="max-w-[170px] truncate text-xs text-muted-foreground">{o.product_name}</p>
                </TableCell>
                <TableCell className="text-sm"><span className="text-muted-foreground">{o.buyer_name}</span><span className="px-1.5 text-muted-foreground">→</span><span className="font-medium">{o.seller_name}</span></TableCell>
                <TableCell className="text-right text-sm tabular-nums">{o.quantity} × {formatINR(o.unit_price)}</TableCell>
                <TableCell className="text-right font-medium tabular-nums">{formatINR(o.subtotal)}</TableCell>
                <TableCell className="text-right text-xs tabular-nums text-muted-foreground">{formatINR(o.commission_amount)} <span>({o.commission_percent}%)</span></TableCell>
                <TableCell><PayState status={o.payment_status} /></TableCell>
                <TableCell><OrderStatusBadge status={o.status} /></TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {o.awb ? <span className="flex items-center gap-1"><Truck className="h-3 w-3" />{o.courier_name}<br />{o.awb}</span> : "—"}
                  {o.dispatched_at && <span className="block">Sent {dateShort(o.dispatched_at)}</span>}
                </TableCell>
                <TableCell>{o.status === "DISPUTED" && <Button size="sm" variant="outline" onClick={() => setResolving(o)}>Resolve</Button>}</TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
      <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
        <span>{total} order{total === 1 ? "" : "s"}</span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
          <span className="tabular-nums">Page {page} of {Math.max(1, Math.ceil(total / 25))}</span>
          <Button variant="outline" size="sm" disabled={page * 25 >= total} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      </div>
      <ResolveDialog order={resolving} onClose={() => setResolving(null)} />
    </Card>
  )
}

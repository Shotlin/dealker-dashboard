"use client"

/**
 * Auction orders — Winner → Order created → Payment → QC → Shipping →
 * Delivered, for customer (B2C) and vendor lot (B2B) auctions separately.
 */

import { OrdersHubTabs } from "@/components/order-page/OrdersHubTabs"
import { useState } from "react"
import Link from "next/link"
import { CheckCircle2, Circle } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { QueryErrorBlock } from "@/components/shared/query-error-block"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAuctionOrders } from "@/hooks/useAuctions"
import { useDebounce } from "@/hooks/useDebounce"
import { cn, formatINR } from "@/lib/utils"

export default function AuctionOrdersPage() {
  const [audience, setAudience] = useState("B2C")
  const [status, setStatus] = useState("")
  const [q, setQ] = useState("")
  const [page, setPage] = useState(1)
  const search = useDebounce(q, 300)
  const list = useAuctionOrders({ audience, status, q: search, page, limit: 20 })
  const rows = list.data?.data ?? []
  const total = list.data?.pagination.total ?? 0

  return (
    <div className="space-y-6">
      <OrdersHubTabs />
      <PageHeader title="Auction orders" subtitle="What happens after the hammer falls — payment, QC, shipping and delivery, for customer and vendor auctions separately." />
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border p-0.5">
          {[["B2C", "B2C auctions"], ["B2B", "B2B auctions"]].map(([v, l]) => (
            <button key={v} type="button" onClick={() => { setAudience(v); setPage(1) }}
              className={cn("rounded-md px-3 py-1.5 text-xs font-medium", audience === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>{l}</button>
          ))}
        </div>
        <Select value={status || "all"} onValueChange={(v) => { setStatus(v === "all" ? "" : v); setPage(1) }}>
          <SelectTrigger className="h-9 w-[180px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any progress</SelectItem>
            <SelectItem value="AWAITING_PAYMENT">Winner yet to pay</SelectItem>
            <SelectItem value="IN_PROGRESS">Order in progress</SelectItem>
            <SelectItem value="DELIVERED">Delivered</SelectItem>
            <SelectItem value="PROBLEM">Defaulted / cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Input className="h-9 w-[240px] text-xs" placeholder="Search auction, order no…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} />
      </div>

      {list.isError ? <QueryErrorBlock error={list.error} onRetry={() => list.refetch()} /> : (
        <div className="rounded-xl border bg-white">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Auction</TableHead><TableHead>Winner</TableHead><TableHead className="text-right">Won at</TableHead><TableHead>Progress</TableHead><TableHead>Order</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {list.isLoading ? Array.from({ length: 5 }).map((_, i) => <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-12 w-full" /></TableCell></TableRow>)
                : rows.length === 0 ? <TableRow><TableCell colSpan={5} className="h-36 text-center text-muted-foreground">No {audience} auction orders yet.</TableCell></TableRow>
                : rows.map((r) => (
                  <TableRow key={r.id} data-testid="auction-order-row">
                    <TableCell>
                      <Link href={`/auctions/${r.id}`} className="text-sm font-medium hover:underline">{r.title}</Link>
                      <p className="text-xs text-muted-foreground">{r.auction_number}{r.quantity > 1 ? ` · lot of ${r.quantity}` : ""}{r.seller_name ? ` · ${r.seller_name}` : ""}</p>
                    </TableCell>
                    <TableCell className="text-sm">{r.winner_name ?? "—"}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{formatINR(r.winning_bid)}{r.unit_price ? <span className="block text-xs text-muted-foreground">{formatINR(r.unit_price)} / unit</span> : null}</TableCell>
                    <TableCell>
                      <ol className="flex items-center gap-1">
                        {r.stages.map((s) => (
                          <li key={s.key} title={s.label} className="flex items-center gap-1">
                            {s.done ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Circle className={cn("h-4 w-4", s.key === r.current ? "text-amber-500" : "text-slate-300")} />}
                          </li>
                        ))}
                      </ol>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">{r.stages.find((s) => s.key === r.current)?.label ?? "Delivered"}{r.auction_status === "DEFAULTED" ? " · defaulted" : ""}</p>
                    </TableCell>
                    <TableCell>
                      {r.order_id ? (
                        <Link href={`/orders/${r.order_id}`} className="text-sm text-brand-600 hover:underline">{r.order_number}</Link>
                      ) : <Badge variant="outline" className="text-[11px]">Not created</Badge>}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      )}
      {total > 20 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          Page {page} of {Math.ceil(total / 20)}
          <Button variant="ghost" size="sm" disabled={page * 20 >= total} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  )
}

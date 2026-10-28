"use client"

import { useState } from "react"
import { Boxes, Percent, Store, Tags } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ApprovalBadge } from "@/components/listings/badges"
import { useListings, useListingStats, useListingVendors } from "@/hooks/useListings"
import { useDebounce } from "@/hooks/useDebounce"
import { formatINR } from "@/lib/utils"

const PAGE_SIZE = 25

function Stat({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <Card className="shadow-none">
      <CardContent className="flex items-center gap-3 p-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span>
        <div>
          <p className="text-2xl font-semibold tabular-nums leading-tight">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * What vendors can buy from each other in the vendor app's B2B Marketplace: every listing sold on the wholesale
 * channel, with its seller, category, wholesale vs retail price, minimum order and stock.
 */
export function WholesaleShelfTab() {
  const [search, setSearch] = useState("")
  const [vendorId, setVendorId] = useState("")
  const [page, setPage] = useState(1)
  const q = useDebounce(search, 300)
  const { data: stats } = useListingStats()
  const { data: vendors } = useListingVendors()
  const { data, isLoading } = useListings({ channel: "B2B", search: q, vendorId, page, sort: "newest" })
  const rows = data?.data ?? []
  const total = data?.pagination.total ?? 0
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={Tags} label="Wholesale listings" value={String(stats?.b2b_listings ?? "–")} />
        <Stat icon={Store} label="Vendors selling wholesale" value={String(stats?.b2b_vendors ?? "–")} />
        <Stat icon={Boxes} label="Units in stock" value={stats?.b2b_units != null ? stats.b2b_units.toLocaleString("en-IN") : "–"} />
        <Stat icon={Percent} label="Listings with a bulk deal" value={String(stats?.b2b_deals ?? "–")} />
      </div>

      <Card className="shadow-none">
        <div className="flex flex-col gap-2 border-b p-3 sm:flex-row">
          <Input className="sm:w-80" placeholder="Search product, brand, SKU or seller…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
          <Select value={vendorId || "all"} onValueChange={(v) => { setVendorId(v === "all" ? "" : v); setPage(1) }}>
            <SelectTrigger className="sm:w-[240px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sellers</SelectItem>
              {(vendors ?? []).map((v) => <SelectItem key={v.id} value={v.id}>{v.name} ({v.listings})</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Table>
          <TableHeader><TableRow className="hover:bg-transparent">
            <TableHead>Product</TableHead><TableHead>Seller</TableHead><TableHead>Category</TableHead>
            <TableHead className="text-right">Wholesale</TableHead><TableHead className="text-right">Retail</TableHead>
            <TableHead className="text-right">MOQ</TableHead><TableHead className="text-right">Stock</TableHead>
            <TableHead>Deal</TableHead><TableHead>Status</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {isLoading ? Array.from({ length: 6 }).map((_, i) => <TableRow key={i}><TableCell colSpan={9}><Skeleton className="h-10" /></TableCell></TableRow>)
              : rows.length === 0 ? <TableRow><TableCell colSpan={9} className="h-40 text-center text-muted-foreground">No wholesale listings found.</TableCell></TableRow>
              : rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {r.thumbnail_url ? <img src={r.thumbnail_url} alt="" className="h-10 w-10 rounded-md border bg-white object-contain" /> : <span className="h-10 w-10 rounded-md border bg-muted" />}
                      <div className="min-w-0">
                        <p className="max-w-[300px] truncate text-sm font-medium">{r.name}</p>
                        <p className="text-xs text-muted-foreground">{[r.brand, r.sku].filter(Boolean).join(" · ")}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{r.owner_name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.category_name ?? "—"}</TableCell>
                  <TableCell className="text-right text-sm font-medium tabular-nums">{r.wholesale_price != null ? formatINR(r.wholesale_price) : <span className="font-normal text-amber-700">Not priced</span>}</TableCell>
                  <TableCell className="text-right text-sm tabular-nums text-muted-foreground">{r.sell_b2c ? formatINR(r.price) : "—"}</TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{r.min_order_qty ?? 1}</TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{r.stock}</TableCell>
                  <TableCell>{r.b2b_discount_pct ? <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50">{Math.round(r.b2b_discount_pct)}% off</Badge> : <span className="text-xs text-muted-foreground">—</span>}</TableCell>
                  <TableCell>
                    <div className="flex flex-col items-start gap-1">
                      <ApprovalBadge status={r.approval_status} />
                      {r.listing_status !== "ACTIVE" && <span className="text-[11px] text-muted-foreground">{r.listing_status.replace("_", " ").toLowerCase()}</span>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
        <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
          <span>{total} wholesale listing{total === 1 ? "" : "s"}</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
            <span className="tabular-nums">Page {page} of {pages}</span>
            <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

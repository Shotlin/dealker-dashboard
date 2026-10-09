"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { CheckCircle2, Copy, FolderInput, ImageOff, MoreHorizontal, Package, Pause, Play, Plus, Search, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { QcBadge } from "@/components/qc/QcBadge"
import { MoveSectionDialog } from "@/components/merch/MoveSectionDialog"
import { SectionBadge } from "@/components/merch/SectionBadge"
import { ApprovalBadge, ConditionBadge, OwnerBadge, StockCell } from "@/components/listings/badges"
import { ListingDetailSheet } from "@/components/listings/ListingDetailSheet"
import { useCategories } from "@/hooks/useCategories"
import { useDebounce } from "@/hooks/useDebounce"
import { useMerchActions } from "@/hooks/useMerchandising"
import { useListingActions, useListingStats, useListingVendors, useListings } from "@/hooks/useListings"
import { cn, formatINR } from "@/lib/utils"
import type { ListingFilters } from "@/types/listing.types"

const ALL = "all"

function Kpi({ label, value, active, tone, onClick }: { label: string; value?: number; active?: boolean; tone?: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className={cn("rounded-xl border bg-white px-4 py-3 text-left transition-colors hover:bg-muted/40", active && "border-primary ring-1 ring-primary")}>
      <p className={cn("text-2xl font-semibold tabular-nums", tone)}>{value ?? "–"}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </button>
  )
}

function ProductsInner() {
  const router = useRouter()
  const params = useSearchParams()
  const [filters, setFilters] = useState<ListingFilters>({ approval: params.get("approval") || "", owner: (params.get("owner") as ListingFilters["owner"]) || "" })
  const [openId, setOpenId] = useState<string | null>(null)
  const search = useDebounce(filters.search ?? "", 300)
  const effective = { ...filters, search }

  const list = useListings(effective)
  const stats = useListingStats()
  const vendors = useListingVendors()
  const cats = useCategories()
  const actions = useListingActions()
  const merch = useMerchActions()
  const [picked, setPicked] = useState<string[]>([])
  const [moving, setMoving] = useState(false)
  const set = (patch: Partial<ListingFilters>) => setFilters((f) => ({ ...f, ...patch, page: 1 }))
  const s = stats.data
  const rows = list.data?.data ?? []
  const total = list.data?.pagination.total ?? 0
  const page = filters.page ?? 1
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  const allOn = rows.length > 0 && rows.every((r) => picked.includes(r.id))
  const bulk = (action: "APPROVE" | "PAUSE" | "RESUME" | "DELETE") => {
    if (action === "DELETE" && !confirm(`Delete ${picked.length} product${picked.length === 1 ? "" : "s"}?`)) return
    merch.bulk.mutate({ ids: picked, action }, { onSuccess: () => setPicked([]) })
  }
  const hasFilters = Object.entries(filters).some(([k, v]) => k !== "page" && k !== "sort" && v)

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
          <p className="text-sm text-muted-foreground">Every listing on Dealker — added by your team or by vendors. Each listing has its own photos, condition and price.</p>
        </div>
        <Button asChild><Link href="/products/new"><Plus className="mr-1.5 h-4 w-4" />Add product</Link></Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="All listings" value={s?.total} active={!hasFilters} onClick={() => setFilters({})} />
        <Kpi label="Listed by Dealker" value={s?.admin} active={filters.owner === "ADMIN"} onClick={() => set({ owner: "ADMIN", vendorId: "" })} />
        <Kpi label="Listed by vendors" value={s?.vendor} active={filters.owner === "VENDOR"} onClick={() => set({ owner: "VENDOR" })} />
        <Kpi label="Pending review" value={s?.pending} tone="text-amber-600" active={filters.approval === "PENDING"} onClick={() => set({ approval: "PENDING" })} />
        <Kpi label="Used & refurbished" value={s?.used} active={filters.condition === "USED"} onClick={() => set({ condition: "USED" })} />
        <Kpi label="Out of stock" value={s?.out_of_stock} tone="text-red-600" active={filters.stock === "out"} onClick={() => set({ stock: "out" })} />
      </div>

      <Card className="shadow-none">
        <div className="flex flex-col gap-2 border-b p-3 lg:flex-row lg:flex-wrap lg:items-center">
          <div className="relative lg:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search title, brand, SKU or vendor…" value={filters.search ?? ""} onChange={(e) => set({ search: e.target.value })} />
          </div>
          <Select value={filters.owner || ALL} onValueChange={(v) => set({ owner: v === ALL ? "" : (v as "ADMIN" | "VENDOR"), vendorId: "" })}>
            <SelectTrigger className="lg:w-[150px]"><SelectValue placeholder="Listed by" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Listed by: All</SelectItem>
              <SelectItem value="ADMIN">Dealker (admin)</SelectItem>
              <SelectItem value="VENDOR">Vendors</SelectItem>
            </SelectContent>
          </Select>
          {filters.owner !== "ADMIN" && (
            <Select value={filters.vendorId || ALL} onValueChange={(v) => set({ vendorId: v === ALL ? "" : v, owner: v === ALL ? filters.owner : "VENDOR" })}>
              <SelectTrigger className="lg:w-[180px]"><SelectValue placeholder="Vendor" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All vendors</SelectItem>
                {(vendors.data ?? []).map((v) => <SelectItem key={v.id} value={v.id}>{v.name} ({v.listings})</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Select value={filters.condition || ALL} onValueChange={(v) => set({ condition: v === ALL ? "" : v })}>
            <SelectTrigger className="lg:w-[160px]"><SelectValue placeholder="Condition" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Any condition</SelectItem>
              <SelectItem value="NEW">New</SelectItem>
              <SelectItem value="OPEN_BOX">Open box</SelectItem>
              <SelectItem value="REFURBISHED">Refurbished</SelectItem>
              <SelectItem value="USED">Used (any grade)</SelectItem>
              <SelectItem value="USED_LIKE_NEW">Used · Like new</SelectItem>
              <SelectItem value="USED_GOOD">Used · Good</SelectItem>
              <SelectItem value="USED_FAIR">Used · Fair</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.categoryId || ALL} onValueChange={(v) => set({ categoryId: v === ALL ? "" : v })}>
            <SelectTrigger className="lg:w-[160px]"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All categories</SelectItem>
              {(cats.data ?? []).map((c: { id: string; name: string }) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filters.approval || ALL} onValueChange={(v) => set({ approval: v === ALL ? "" : v })}>
            <SelectTrigger className="lg:w-[150px]"><SelectValue placeholder="Review status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Any review status</SelectItem>
              <SelectItem value="PENDING">Pending review</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="REJECTED">Changes needed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.section || ALL} onValueChange={(v) => set({ section: v === ALL ? "" : v })}>
            <SelectTrigger className="lg:w-[160px]"><SelectValue placeholder="Section" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Any section</SelectItem>
              <SelectItem value="NEW_ARRIVAL">New Arrival</SelectItem>
              <SelectItem value="DEAL_OF_THE_DAY">Deal of the Day</SelectItem>
              <SelectItem value="CLEARANCE_SALE">Clearance Sale</SelectItem>
              <SelectItem value="FLASH_SALE">Flash Sale</SelectItem>
              <SelectItem value="FEATURED">Featured</SelectItem>
              <SelectItem value="BEST_SELLER">Best Seller</SelectItem>
              <SelectItem value="NONE">Not in a section</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.qc || ALL} onValueChange={(v) => set({ qc: v === ALL ? "" : v })}>
            <SelectTrigger className="lg:w-[140px]"><SelectValue placeholder="QC" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Any QC status</SelectItem>
              <SelectItem value="QC_PENDING">QC pending</SelectItem>
              <SelectItem value="QC_PASSED">QC passed</SelectItem>
              <SelectItem value="QC_RECHECK">QC recheck</SelectItem>
              <SelectItem value="QC_FAILED">QC failed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.sort || "newest"} onValueChange={(v) => setFilters((f) => ({ ...f, sort: v }))}>
            <SelectTrigger className="lg:w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="price_asc">Price: low to high</SelectItem>
              <SelectItem value="price_desc">Price: high to low</SelectItem>
              <SelectItem value="stock">Lowest stock</SelectItem>
              <SelectItem value="name">Name A–Z</SelectItem>
            </SelectContent>
          </Select>
          {hasFilters && <Button variant="ghost" onClick={() => setFilters({})}>Clear</Button>}
        </div>

        {picked.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b bg-primary/5 px-4 py-2" data-testid="bulk-bar">
            <span className="text-sm font-medium">{picked.length} selected</span>
            <Button size="sm" variant="outline" disabled={merch.bulk.isPending} onClick={() => bulk("APPROVE")}><CheckCircle2 className="mr-1.5 h-4 w-4" />Approve</Button>
            <Button size="sm" variant="outline" disabled={merch.bulk.isPending} onClick={() => bulk("PAUSE")}><Pause className="mr-1.5 h-4 w-4" />Disable</Button>
            <Button size="sm" variant="outline" disabled={merch.bulk.isPending} onClick={() => bulk("RESUME")}><Play className="mr-1.5 h-4 w-4" />Enable</Button>
            <Button size="sm" variant="outline" onClick={() => setMoving(true)}><FolderInput className="mr-1.5 h-4 w-4" />Move to section</Button>
            <Button size="sm" variant="outline" className="text-destructive" disabled={merch.bulk.isPending} onClick={() => bulk("DELETE")}><Trash2 className="mr-1.5 h-4 w-4" />Delete</Button>
            <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setPicked([])}>Clear</Button>
          </div>
        )}
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-10"><Checkbox checked={allOn} onCheckedChange={(v) => setPicked(v ? rows.map((r) => r.id) : [])} aria-label="Select all" /></TableHead>
              <TableHead className="w-[340px]">Product</TableHead>
              <TableHead>Listed by</TableHead>
              <TableHead>Condition</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Review</TableHead>
              <TableHead>QC</TableHead>
              <TableHead>Section</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={10}><Skeleton className="h-12 w-full" /></TableCell></TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={10} className="h-48 text-center text-muted-foreground">
                <Package className="mx-auto mb-2 h-8 w-8 opacity-40" />No products match these filters.
              </TableCell></TableRow>
            ) : rows.map((r) => (
              <TableRow key={r.id} className="cursor-pointer" data-state={picked.includes(r.id) ? "selected" : undefined} onClick={() => setOpenId(r.id)}>
                <TableCell onClick={(e) => e.stopPropagation()}><Checkbox checked={picked.includes(r.id)} onCheckedChange={() => toggle(r.id)} aria-label={`Select ${r.name}`} /></TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
                      {r.thumbnail_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.thumbnail_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                      ) : <ImageOff className="h-4 w-4 text-muted-foreground" />}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{r.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {r.brand ? `${r.brand} · ` : ""}{r.category_name}
                        {r.image_count < 3 && <span className="ml-1 text-amber-600">· {r.image_count} photo{r.image_count === 1 ? "" : "s"}</span>}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell><OwnerBadge type={r.owner_type} name={r.owner_name} /></TableCell>
                <TableCell><ConditionBadge condition={r.condition} /></TableCell>
                <TableCell className="text-right">
                  <p className="text-sm font-medium tabular-nums">{formatINR(r.price)}</p>
                  {r.mrp && r.mrp > r.price && <p className="text-xs text-muted-foreground line-through tabular-nums">{formatINR(r.mrp)}</p>}
                </TableCell>
                <TableCell><StockCell stock={r.stock} status={r.listing_status} /></TableCell>
                <TableCell><ApprovalBadge status={r.approval_status} /></TableCell>
                <TableCell><QcBadge status={r.qc_status} score={r.qc_score} /></TableCell>
                <TableCell><SectionBadge section={r.merch_section} /></TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setOpenId(r.id)}>View details</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push(`/products/${r.id}/edit`)}>Edit</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => merch.duplicate.mutate(r.id)}><Copy className="mr-2 h-4 w-4" />Duplicate</DropdownMenuItem>
                      {r.approval_status !== "APPROVED" && <DropdownMenuItem onClick={() => actions.approve.mutate(r.id)}>Approve</DropdownMenuItem>}
                      <DropdownMenuItem onClick={() => actions.setStatus.mutate({ id: r.id, status: r.listing_status === "PAUSED" ? "ACTIVE" : "PAUSED" })}>
                        {r.listing_status === "PAUSED" ? <><Play className="mr-2 h-4 w-4" />Resume</> : <><Pause className="mr-2 h-4 w-4" />Pause</>}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive" onClick={() => { if (confirm(`Delete “${r.name}”?`)) actions.remove.mutate(r.id) }}>
                        <Trash2 className="mr-2 h-4 w-4" />Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
          <span>{total} listing{total === 1 ? "" : "s"}</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setFilters((f) => ({ ...f, page: page - 1 }))}>Previous</Button>
            <span className="tabular-nums">Page {page} of {Math.max(1, Math.ceil(total / 25))}</span>
            <Button variant="outline" size="sm" disabled={page * 25 >= total} onClick={() => setFilters((f) => ({ ...f, page: page + 1 }))}>Next</Button>
          </div>
        </div>
      </Card>

      <ListingDetailSheet id={openId} onClose={() => setOpenId(null)} />
      <MoveSectionDialog open={moving} ids={picked} onOpenChange={setMoving} onDone={() => setPicked([])} />
    </div>
  )
}

export default function ProductsPage() {
  return <Suspense fallback={null}><ProductsInner /></Suspense>
}

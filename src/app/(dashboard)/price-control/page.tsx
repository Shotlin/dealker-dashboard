"use client"

/**
 * Price & Stock Control — one place to change prices (−1%, −2%, −5%, ₹ off,
 * set price, discount off MRP) or stock for all products or a chosen set
 * (vendor, category, brand, selected, B2B-only, B2C-only). Always preview
 * first; every change is a batch that can be reverted.
 */

import { useEffect, useMemo, useState } from "react"
import { History, Percent, Boxes, Undo2 } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { QueryErrorBlock } from "@/components/shared/query-error-block"
import { PreviewTable } from "@/components/pricing/PreviewTable"
import { describeBatch } from "@/components/pricing/describeBatch"
import { ScopePicker, scopeIsEmpty } from "@/components/pricing/ScopePicker"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useBatchItems, useBatches, usePricingActions } from "@/hooks/usePricing"
import { formatDateTime } from "@/lib/utils"
import type { Batch, Preview, PriceOperation, PriceParams, PriceTarget, PricingScope, Rounding, StockOperation } from "@/services/pricing.service"

const inr = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n)

const OPS: Array<{ key: PriceOperation; label: string; unit: string; hint: string }> = [
  { key: "PERCENT", label: "Change by %", unit: "%", hint: "Negative lowers prices, e.g. −5 is 5% cheaper" },
  { key: "FIXED", label: "Change by ₹", unit: "₹", hint: "Negative lowers each price by this amount" },
  { key: "SET", label: "Set exact price", unit: "₹", hint: "Every selected product gets this price" },
  { key: "DISCOUNT_FROM_MRP", label: "Discount off MRP", unit: "%", hint: "Price becomes MRP minus this discount" },
]
const PRESETS = [-1, -2, -5, -10, 5]

// ── Price tab ─────────────────────────────────────────────────────────
function PriceTab() {
  const { previewPrice, applyPrice } = usePricingActions()
  const [scope, setScope] = useState<PricingScope>({})
  const [op, setOp] = useState<PriceOperation>("PERCENT")
  const [value, setValue] = useState("-5")
  const [target, setTarget] = useState<PriceTarget>("RETAIL")
  const [rounding, setRounding] = useState<Rounding>("NONE")
  const [allowLarge, setAllowLarge] = useState(false)
  const [allowBelowCost, setAllowBelowCost] = useState(false)
  const [note, setNote] = useState("")
  const [preview, setPreview] = useState<Preview | null>(null)

  const params: PriceParams = useMemo(
    () => ({ operation: op, value: Number(value), rounding, target, allowLargeChange: allowLarge, allowBelowCost }),
    [op, value, rounding, target, allowLarge, allowBelowCost],
  )
  // any change to the inputs invalidates the preview
  useEffect(() => { setPreview(null) }, [scope, params])

  const meta = OPS.find((o) => o.key === op)!
  const valid = Number.isFinite(Number(value)) && value.trim() !== "" && Number(value) !== 0 && !scopeIsEmpty(scope)

  return (
    <div className="space-y-5">
      <ScopePicker value={scope} onChange={setScope} />

      <div className="space-y-4 rounded-xl border p-4">
        <div className="flex flex-wrap gap-2">
          {OPS.map((o) => (
            <Button key={o.key} size="sm" variant={op === o.key ? "default" : "outline"}
              onClick={() => { setOp(o.key); setValue(o.key === "PERCENT" ? "-5" : o.key === "DISCOUNT_FROM_MRP" ? "10" : "") }}>{o.label}</Button>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-xs">{meta.label} ({meta.unit})</Label>
            <Input className="h-9" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} aria-label="Adjustment value" />
            <p className="text-xs text-muted-foreground">{meta.hint}</p>
            {op === "PERCENT" && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {PRESETS.map((p) => (
                  <Button key={p} type="button" size="sm" variant={Number(value) === p ? "default" : "outline"} className="h-7 px-2 text-xs" onClick={() => setValue(String(p))}>
                    {p > 0 ? `+${p}` : p}%
                  </Button>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Which price</Label>
            <Select value={target} onValueChange={(v) => setTarget(v as PriceTarget)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="RETAIL">Retail price (B2C)</SelectItem>
                <SelectItem value="WHOLESALE">Wholesale price (B2B)</SelectItem>
                <SelectItem value="BOTH">Both</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Round to</Label>
            <Select value={rounding} onValueChange={(v) => setRounding(v as Rounding)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">Paise (no rounding)</SelectItem>
                <SelectItem value="RUPEE">Nearest ₹1</SelectItem>
                <SelectItem value="TEN">Nearest ₹10</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex flex-wrap gap-6 text-sm">
          <label className="flex items-center gap-2"><Switch checked={allowLarge} onCheckedChange={setAllowLarge} />Allow changes above 50%</label>
          <label className="flex items-center gap-2"><Switch checked={allowBelowCost} onCheckedChange={setAllowBelowCost} />Allow prices below cost</label>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Note (shown in history)</Label>
          <Input className="h-9" placeholder="e.g. Diwali sale" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button disabled={!valid || previewPrice.isPending}
            onClick={() => previewPrice.mutate({ scope, params }, { onSuccess: setPreview })}>
            {previewPrice.isPending ? "Checking…" : "Preview changes"}
          </Button>
          {scopeIsEmpty(scope) && <span className="self-center text-xs text-amber-700">Choose which products first</span>}
        </div>
      </div>

      {preview && (
        <div className="space-y-3 rounded-xl border p-4">
          <PreviewTable preview={preview} />
          <div className="flex justify-end">
            <Button disabled={preview.summary.changed === 0 || applyPrice.isPending}
              onClick={() => {
                if (!window.confirm(`Change ${preview.summary.changed} price${preview.summary.changed === 1 ? "" : "s"}? You can revert this from History.`)) return
                applyPrice.mutate({ scope, params, note: note.trim() || undefined }, { onSuccess: () => setPreview(null) })
              }}>
              {applyPrice.isPending ? "Applying…" : `Apply to ${preview.summary.changed} product${preview.summary.changed === 1 ? "" : "s"}`}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Stock tab ─────────────────────────────────────────────────────────
function StockTab() {
  const { previewStock, applyStock } = usePricingActions()
  const [scope, setScope] = useState<PricingScope>({})
  const [op, setOp] = useState<StockOperation>("ADD")
  const [value, setValue] = useState("")
  const [note, setNote] = useState("")
  const [preview, setPreview] = useState<Preview | null>(null)
  const params = useMemo(() => ({ operation: op, value: Number(value) }), [op, value])
  useEffect(() => { setPreview(null) }, [scope, params])
  const valid = value.trim() !== "" && Number.isInteger(Number(value)) && Number(value) >= 0 && (op === "SET" || Number(value) > 0) && !scopeIsEmpty(scope)

  return (
    <div className="space-y-5">
      <ScopePicker value={scope} onChange={setScope} />
      <div className="space-y-4 rounded-xl border p-4">
        <div className="flex flex-wrap gap-2">
          {([["ADD", "Add stock"], ["SUBTRACT", "Remove stock"], ["SET", "Set stock to"]] as const).map(([k, l]) => (
            <Button key={k} size="sm" variant={op === k ? "default" : "outline"} onClick={() => setOp(k)}>{l}</Button>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Quantity</Label>
            <Input className="h-9" inputMode="numeric" value={value} onChange={(e) => setValue(e.target.value)} aria-label="Stock quantity" />
            <p className="text-xs text-muted-foreground">Used items are single-unit listings and stay at 1. Stock never goes below zero.</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Note (shown in history)</Label>
            <Input className="h-9" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        <Button disabled={!valid || previewStock.isPending} onClick={() => previewStock.mutate({ scope, params }, { onSuccess: setPreview })}>
          {previewStock.isPending ? "Checking…" : "Preview changes"}
        </Button>
      </div>
      {preview && (
        <div className="space-y-3 rounded-xl border p-4">
          <PreviewTable preview={preview} stock />
          <div className="flex justify-end">
            <Button disabled={preview.summary.changed === 0 || applyStock.isPending}
              onClick={() => {
                if (!window.confirm(`Change stock on ${preview.summary.changed} listing${preview.summary.changed === 1 ? "" : "s"}?`)) return
                applyStock.mutate({ scope, params, note: note.trim() || undefined }, { onSuccess: () => setPreview(null) })
              }}>
              {applyStock.isPending ? "Applying…" : `Apply to ${preview.summary.changed} listing${preview.summary.changed === 1 ? "" : "s"}`}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── History tab ───────────────────────────────────────────────────────
function HistoryTab() {
  const [page, setPage] = useState(1)
  const list = useBatches(page)
  const { revert } = usePricingActions()
  const [open, setOpen] = useState<string | null>(null)
  const items = useBatchItems(open)
  const rows = list.data?.data ?? []
  const meta = list.data?.meta

  if (list.isError) return <QueryErrorBlock error={list.error} onRetry={() => list.refetch()} />
  return (
    <div className="space-y-3">
      <div className="rounded-xl border bg-white">
        <Table>
          <TableHeader>
            <TableRow><TableHead>Change</TableHead><TableHead>Listings</TableHead><TableHead>By</TableHead><TableHead>When</TableHead><TableHead>Status</TableHead><TableHead /></TableRow>
          </TableHeader>
          <TableBody>
            {list.isLoading ? Array.from({ length: 4 }).map((_, i) => <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-9 w-full" /></TableCell></TableRow>)
              : rows.length === 0 ? <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground">No bulk changes yet.</TableCell></TableRow>
              : rows.map((b) => (
                <TableRow key={b.id} className="cursor-pointer" onClick={() => setOpen(b.id)}>
                  <TableCell><p className="text-sm font-medium">{describeBatch(b)}</p>{b.note && <p className="text-xs text-muted-foreground">{b.note}</p>}</TableCell>
                  <TableCell className="text-sm">{b.item_count}{b.skipped_count > 0 && <span className="text-xs text-muted-foreground"> · {b.skipped_count} skipped</span>}</TableCell>
                  <TableCell className="text-sm">{b.created_by_name ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDateTime(b.created_at)}</TableCell>
                  <TableCell><Badge variant="outline" className={b.status === "APPLIED" ? "text-emerald-700" : "text-slate-500"}>{b.status === "APPLIED" ? "Applied" : "Reverted"}</Badge></TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {b.status === "APPLIED" && (
                      <Button size="sm" variant="outline" className="h-7 text-xs" disabled={revert.isPending}
                        onClick={() => { if (window.confirm("Undo this change? Products edited since keep their newer value.")) revert.mutate(b.id) }}>
                        <Undo2 className="mr-1 h-3 w-3" />Revert
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          Page {meta.page} of {meta.totalPages}
          <Button variant="ghost" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}
      <Sheet open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-xl">
          <SheetHeader className="border-b px-5 py-4 text-left">
            <SheetTitle className="text-base">{items.data ? describeBatch(items.data.batch) : "Change"}</SheetTitle>
          </SheetHeader>
          <ScrollArea className="min-h-0 flex-1">
            <ul className="divide-y">
              {(items.data?.data ?? []).map((i) => (
                <li key={`${i.listing_id}-${i.field}`} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                  <span className="truncate">{i.name}</span>
                  <span className="shrink-0 tabular-nums text-xs text-muted-foreground">
                    {i.field === "stock_quantity" ? `${i.old_value} → ${i.new_value}` : `${inr(i.old_value)} → ${inr(i.new_value)}`}
                  </span>
                </li>
              ))}
            </ul>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  )
}

export default function PriceControlPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Price & Stock Control" subtitle="Change prices or stock for many products at once. Preview first; every change can be reverted." />
      <Tabs defaultValue="price">
        <TabsList>
          <TabsTrigger value="price"><Percent className="mr-1.5 h-4 w-4" />Prices</TabsTrigger>
          <TabsTrigger value="stock"><Boxes className="mr-1.5 h-4 w-4" />Stock</TabsTrigger>
          <TabsTrigger value="history"><History className="mr-1.5 h-4 w-4" />History</TabsTrigger>
        </TabsList>
        <TabsContent value="price" className="mt-4"><PriceTab /></TabsContent>
        <TabsContent value="stock" className="mt-4"><StockTab /></TabsContent>
        <TabsContent value="history" className="mt-4"><HistoryTab /></TabsContent>
      </Tabs>
    </div>
  )
}

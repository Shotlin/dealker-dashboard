"use client"

/**
 * Commission & Platform Charges — rules by vendor / category / product and
 * channel (B2C / B2B). Resolution: PRODUCT > CATEGORY > VENDOR > GLOBAL,
 * channel-specific before ALL. Includes a live fee calculator:
 * Selling Price → Commission → Platform Charge → Tax → Vendor Net.
 */

import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Pencil, Percent, Plus, Trash2 } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { DataList } from "@/components/shared/data-list"
import { QueryErrorBlock } from "@/components/shared/query-error-block"
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useDeleteCommissionRule, useCommissionRules, useSaveCommissionRule } from "@/hooks/useMoney"
import { useMarketplaceVendors } from "@/hooks/useMarketplace"
import { useCategories } from "@/hooks/useCategories"
import { useDebounce } from "@/hooks/useDebounce"
import { getProducts } from "@/services/products.service"
import { commissionApi } from "@/services/money.service"
import type { CommissionChannel, CommissionRule, CommissionScope } from "@/services/money.service"

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n)

const SCOPES: CommissionScope[] = ["GLOBAL", "VENDOR", "CATEGORY", "PRODUCT"]
const CHANNELS: CommissionChannel[] = ["ALL", "B2C", "B2B"]

function targetLabel(r: CommissionRule) {
  if (r.scope === "GLOBAL") return "Every vendor, category and product"
  if (r.scope === "VENDOR") return r.vendor_name ?? r.vendor_id ?? "—"
  if (r.scope === "CATEGORY") return r.category_name ?? r.category_id ?? "—"
  return r.product_name ?? r.product_id ?? "—"
}

interface Form {
  id?: string
  scope: CommissionScope
  channel: CommissionChannel
  vendorId: string
  categoryId: string
  productId: string
  productName: string
  commissionPct: string
  platformChargeFlat: string
  platformChargePct: string
  taxPct: string
  notes: string
  isActive: boolean
}

const EMPTY: Form = {
  scope: "VENDOR", channel: "ALL", vendorId: "", categoryId: "", productId: "", productName: "",
  commissionPct: "5", platformChargeFlat: "0", platformChargePct: "0", taxPct: "18", notes: "", isActive: true,
}

export default function CommissionPage() {
  const [scope, setScope] = useState("")
  const [channel, setChannel] = useState("")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const debounced = useDebounce(search, 300)
  const rulesQuery = useCommissionRules({ scope, channel, search: debounced, page, limit: 20 })
  const save = useSaveCommissionRule()
  const del = useDeleteCommissionRule()

  const vendorsQuery = useMarketplaceVendors({ limit: 100 })
  const categoriesQuery = useCategories()
  const vendors = vendorsQuery.data?.data ?? []
  const categories = categoriesQuery.data ?? []

  const [form, setForm] = useState<Form | null>(null)
  const [productSearch, setProductSearch] = useState("")
  const debouncedProduct = useDebounce(productSearch, 300)
  const productsQuery = useQuery({
    queryKey: ["money", "product-search", debouncedProduct],
    queryFn: () => getProducts({ search: debouncedProduct, limit: 6 }),
    enabled: form?.scope === "PRODUCT" && debouncedProduct.length >= 2,
  })

  // ── Fee calculator ───────────────────────────────────────────────
  const [calc, setCalc] = useState({ amount: "50000", channel: "B2C" as "B2C" | "B2B", vendorId: "", categoryId: "" })
  const amount = Number(calc.amount)
  const preview = useQuery({
    queryKey: ["money", "commission", "preview", calc],
    queryFn: () =>
      commissionApi.preview({
        vendorId: calc.vendorId || undefined,
        channel: calc.channel,
        items: [{ categoryId: calc.categoryId || undefined, lineTotal: amount }],
      }),
    enabled: Number.isFinite(amount) && amount > 0,
  })

  const num = (v: string) => Number(v)
  const formInvalid = useMemo(() => {
    if (!form) return true
    const target =
      (form.scope === "VENDOR" && !form.vendorId) ||
      (form.scope === "CATEGORY" && !form.categoryId) ||
      (form.scope === "PRODUCT" && !form.productId)
    const pcts = [form.commissionPct, form.platformChargePct, form.taxPct].some((v) => !(num(v) >= 0 && num(v) <= 100))
    return target || pcts || !(num(form.platformChargeFlat) >= 0)
  }, [form])

  const openEdit = (r: CommissionRule) =>
    setForm({
      id: r.id, scope: r.scope, channel: r.channel,
      vendorId: r.vendor_id ?? "", categoryId: r.category_id ?? "", productId: r.product_id ?? "",
      productName: r.product_name ?? "",
      commissionPct: String(r.commission_pct), platformChargeFlat: String(r.platform_charge_flat),
      platformChargePct: String(r.platform_charge_pct), taxPct: String(r.tax_pct),
      notes: r.notes ?? "", isActive: r.is_active,
    })

  const submit = () => {
    if (!form) return
    save.mutate(
      {
        id: form.id,
        scope: form.scope,
        channel: form.channel,
        vendorId: form.scope === "VENDOR" ? form.vendorId : undefined,
        categoryId: form.scope === "CATEGORY" ? form.categoryId : undefined,
        productId: form.scope === "PRODUCT" ? form.productId : undefined,
        commissionPct: num(form.commissionPct),
        platformChargeFlat: num(form.platformChargeFlat),
        platformChargePct: num(form.platformChargePct),
        taxPct: num(form.taxPct),
        notes: form.notes || undefined,
        isActive: form.isActive,
      },
      { onSuccess: () => setForm(null) },
    )
  }

  const rows = rulesQuery.data?.data ?? []
  const meta = rulesQuery.data?.meta

  return (
    <div className="space-y-6">
      <PageHeader
        title="Commission & Platform Charges"
        subtitle="Set what the platform earns per vendor, category or product — separately for B2C and B2B."
      >
        <Button size="sm" onClick={() => setForm({ ...EMPTY })}>
          <Plus className="h-4 w-4 mr-1" /> New rule
        </Button>
      </PageHeader>

      {/* Fee calculator */}
      <div className="rounded-lg border p-4 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Percent className="h-4 w-4 text-brand-500" /> Fee calculator
          <span className="text-xs font-normal text-muted-foreground">uses the live rules below</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Selling price (₹)</Label>
            <Input className="h-9" inputMode="decimal" value={calc.amount} onChange={(e) => setCalc({ ...calc, amount: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Channel</Label>
            <Select value={calc.channel} onValueChange={(v) => setCalc({ ...calc, channel: v as "B2C" | "B2B" })}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="B2C">B2C (vendor → customer)</SelectItem>
                <SelectItem value="B2B">B2B (vendor → vendor)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Vendor (optional)</Label>
            <Select value={calc.vendorId || "none"} onValueChange={(v) => setCalc({ ...calc, vendorId: v === "none" ? "" : v })}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Any vendor</SelectItem>
                {vendors.map((v) => <SelectItem key={v.id} value={v.id}>{v.name ?? v.id.slice(0, 8)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Category (optional)</Label>
            <Select value={calc.categoryId || "none"} onValueChange={(v) => setCalc({ ...calc, categoryId: v === "none" ? "" : v })}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Any category</SelectItem>
                {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        {preview.data && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm" data-testid="fee-chain">
            {[
              ["Selling price", preview.data.sellingPrice, ""],
              ["− Commission", preview.data.commission, `${preview.data.effectiveRate}%`],
              ["− Platform charge", preview.data.platformCharge, ""],
              ["− Tax on fees", preview.data.tax, ""],
              ["= Vendor net", preview.data.vendorNet, ""],
            ].map(([label, value, hint]) => (
              <div key={String(label)} className="rounded-md bg-muted/40 p-3">
                <div className="text-xs text-muted-foreground">{label}</div>
                <div className="font-semibold">{inr(Number(value))}</div>
                {hint ? <div className="text-xs text-muted-foreground">{hint}</div> : null}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Input className="h-9 w-[220px] text-xs" placeholder="Search vendor, category, product…" value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
        <Select value={scope || "all"} onValueChange={(v) => { setScope(v === "all" ? "" : v); setPage(1) }}>
          <SelectTrigger className="h-9 w-[150px] text-xs"><SelectValue placeholder="Scope" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All scopes</SelectItem>
            {SCOPES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={channel || "all"} onValueChange={(v) => { setChannel(v === "all" ? "" : v); setPage(1) }}>
          <SelectTrigger className="h-9 w-[150px] text-xs"><SelectValue placeholder="Channel" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All channels</SelectItem>
            {CHANNELS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {rulesQuery.isLoading ? (
        <LoadingSkeleton variant="table" />
      ) : rulesQuery.isError ? (
        <QueryErrorBlock error={rulesQuery.error} onRetry={() => rulesQuery.refetch()} />
      ) : (
        <DataList
          rows={rows}
          rowKey={(r) => r.id}
          emptyMessage="No commission rules yet. Without a rule a sale pays the shop's legacy commission rate."
          columns={[
            { id: "scope", header: "Scope", cell: (r) => <Badge variant="outline">{r.scope}</Badge> },
            { id: "target", header: "Applies to", cell: (r) => <span className="text-sm font-medium">{targetLabel(r)}</span> },
            { id: "channel", header: "Channel", cell: (r) => <Badge variant="secondary">{r.channel}</Badge> },
            { id: "comm", header: "Commission", cell: (r) => <span className="text-sm">{Number(r.commission_pct)}%</span> },
            {
              id: "charge", header: "Platform charge",
              cell: (r) => (
                <span className="text-sm">
                  {Number(r.platform_charge_pct)}%{Number(r.platform_charge_flat) > 0 ? ` + ${inr(Number(r.platform_charge_flat))}` : ""}
                </span>
              ),
            },
            { id: "tax", header: "Tax on fees", cell: (r) => <span className="text-sm">{Number(r.tax_pct)}%</span> },
            {
              id: "active", header: "Active",
              cell: (r) => (
                <Switch checked={r.is_active} disabled={save.isPending}
                  onCheckedChange={(v) => save.mutate({ id: r.id, isActive: v })} aria-label={`Toggle rule ${r.id}`} />
              ),
            },
            {
              id: "actions", header: "",
              cell: (r) => (
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(r)} aria-label="Edit rule">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" disabled={del.isPending}
                    onClick={() => { if (window.confirm("Delete this rule? Past orders keep their saved fees.")) del.mutate(r.id) }}
                    aria-label="Delete rule">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ),
            },
          ]}
        />
      )}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          Page {meta.page} of {meta.totalPages}
          <Button variant="ghost" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{form?.id ? "Edit rule" : "New commission rule"}</DialogTitle></DialogHeader>
          {form && (
            <div className="space-y-3 py-1">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Scope</Label>
                  <Select value={form.scope} disabled={!!form.id} onValueChange={(v) => setForm({ ...form, scope: v as CommissionScope })}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>{SCOPES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Channel</Label>
                  <Select value={form.channel} onValueChange={(v) => setForm({ ...form, channel: v as CommissionChannel })}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>{CHANNELS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              {form.scope === "VENDOR" && (
                <div className="space-y-1">
                  <Label className="text-xs">Vendor</Label>
                  <Select value={form.vendorId} disabled={!!form.id} onValueChange={(v) => setForm({ ...form, vendorId: v })}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Choose a vendor" /></SelectTrigger>
                    <SelectContent>{vendors.map((v) => <SelectItem key={v.id} value={v.id}>{v.name ?? v.id.slice(0, 8)}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              {form.scope === "CATEGORY" && (
                <div className="space-y-1">
                  <Label className="text-xs">Category</Label>
                  <Select value={form.categoryId} disabled={!!form.id} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Choose a category" /></SelectTrigger>
                    <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              {form.scope === "PRODUCT" && (
                <div className="space-y-1">
                  <Label className="text-xs">Product</Label>
                  {form.productId ? (
                    <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                      <span>{form.productName || form.productId}</span>
                      {!form.id && (
                        <Button size="sm" variant="ghost" onClick={() => setForm({ ...form, productId: "", productName: "" })}>Change</Button>
                      )}
                    </div>
                  ) : (
                    <>
                      <Input className="h-9" placeholder="Search products (min 2 letters)…" value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)} />
                      <div className="max-h-36 overflow-auto rounded-md border">
                        {(productsQuery.data?.products ?? []).map((p) => (
                          <button key={p.id} type="button" className="block w-full px-3 py-1.5 text-left text-sm hover:bg-muted"
                            onClick={() => setForm({ ...form, productId: p.id, productName: p.name })}>
                            {p.name}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Commission %</Label>
                  <Input className="h-9" inputMode="decimal" value={form.commissionPct} onChange={(e) => setForm({ ...form, commissionPct: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Tax on fees % (GST)</Label>
                  <Input className="h-9" inputMode="decimal" value={form.taxPct} onChange={(e) => setForm({ ...form, taxPct: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Platform charge %</Label>
                  <Input className="h-9" inputMode="decimal" value={form.platformChargePct} onChange={(e) => setForm({ ...form, platformChargePct: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Platform charge flat (₹ / order)</Label>
                  <Input className="h-9" inputMode="decimal" value={form.platformChargeFlat} onChange={(e) => setForm({ ...form, platformChargeFlat: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Notes</Label>
                <Input className="h-9" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
              <p className="text-xs text-muted-foreground">
                Most specific rule wins: Product → Category → Vendor → Global. A B2C or B2B rule beats an “ALL” rule in the same scope.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>Cancel</Button>
            <Button disabled={formInvalid || save.isPending} onClick={submit}>
              {save.isPending ? "Saving…" : "Save rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

"use client"

/** Sell & exchange settings: valuation rules, general limits and the accepted-device catalogue. */

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton"
import { QueryErrorBlock } from "@/components/shared/query-error-block"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useDeleteExchangeProgram, useExchangePrograms, useExchangeTypes, useSaveExchangeProgram, useSaveExchangeType, useDeviceBrands, useSaveDeviceBrand, useSaveSellModel, useSellModels, useSellSettings, useUpdateSellSettings } from "@/hooks/useSellRequests"
import { useCategories } from "@/hooks/useCategories"
import { usePermissions } from "@/hooks/usePermissions"
import { formatINR } from "@/lib/utils"
import { uploadImage } from "@/services/uploads.service"
import type { CatalogModel, DeviceCategory, DeviceIcon, ExchangeDeviceType, ExchangeProgram } from "@/services/sell-requests.service"

type RuleMeta = { key: string; label: string; unit: string; hint?: string }

const RULE_GROUPS: Array<{ title: string; rules: RuleMeta[] }> = [
  {
    title: "Device age",
    rules: [
      { key: "ageFreeMonths", label: "Free period", unit: "months", hint: "No age deduction up to this age" },
      { key: "agePctPerMonth", label: "Deduction per month after that", unit: "%" },
      { key: "ageMaxPct", label: "Maximum age deduction", unit: "%" },
    ],
  },
  {
    title: "Condition",
    rules: [
      { key: "notPoweringOn", label: "Does not power on", unit: "%" },
      { key: "minorScratches", label: "Minor screen scratches", unit: "%" },
      { key: "majorScratches", label: "Major screen scratches", unit: "%" },
      { key: "bodyDents", label: "Body dents / damage", unit: "%" },
      { key: "screenReplaced", label: "Screen replaced", unit: "%" },
      { key: "skinReplaced", label: "Skin / back panel replaced", unit: "%" },
    ],
  },
  {
    title: "Battery",
    rules: [
      { key: "batteryHealthFloor", label: "No deduction at or above", unit: "% health" },
      { key: "batteryPctPerPoint", label: "Deduction per point below", unit: "%" },
    ],
  },
  {
    title: "Accessories",
    rules: [
      { key: "noBill", label: "No bill", unit: "%" },
      { key: "noBox", label: "No box", unit: "%" },
      { key: "noCharger", label: "No charger", unit: "%" },
    ],
  },
  {
    title: "Condition grades",
    rules: [
      { key: "excellentMaxPct", label: "Excellent up to", unit: "% deducted", hint: "Total deduction at or below this" },
      { key: "goodMaxPct", label: "Good up to", unit: "% deducted" },
      { key: "fairMaxPct", label: "Fair up to", unit: "% deducted", hint: "Anything above is Poor" },
    ],
  },
]

function NumField({ id, label, unit, hint, value, onChange }: { id: string; label: string; unit?: string; hint?: string; value: number; onChange: (n: number) => void }) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-2">
        <Input id={id} type="number" min={0} step="any" className="h-9 w-28 text-sm" value={Number.isNaN(value) ? "" : value} onChange={(e) => onChange(e.target.value === "" ? NaN : Number(e.target.value))} />
        {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

// ── Valuation + general ────────────────────────────────────────────────

function RulesPanel() {
  const q = useSellSettings()
  const save = useUpdateSellSettings()
  const [rules, setRules] = useState<Record<string, number>>({})
  const [enabled, setEnabled] = useState(true)
  const [maxPct, setMaxPct] = useState(85)
  const [step, setStep] = useState(8)
  const [maxImages, setMaxImages] = useState(8)
  const [ev, setEv] = useState({ maxVideos: 2, maxImageMb: 12, maxVideoMb: 100, qcRequiredForApproval: false })

  useEffect(() => {
    if (!q.data) return
    setRules(q.data.rules); setEnabled(q.data.enabled)
    setMaxPct(q.data.maxTotalDeductionPct); setStep(q.data.variantStepPct); setMaxImages(q.data.maxImages)
    setEv({ maxVideos: q.data.maxVideos, maxImageMb: q.data.maxImageMb, maxVideoMb: q.data.maxVideoMb, qcRequiredForApproval: q.data.qcRequiredForApproval })
  }, [q.data])

  const problems = useMemo(() => {
    const p: string[] = []
    const all = [...Object.values(rules), maxPct, step, maxImages]
    if (all.some((v) => Number.isNaN(v) || v < 0)) p.push("Every value must be a number, zero or more.")
    if (!(rules.excellentMaxPct <= rules.goodMaxPct && rules.goodMaxPct <= rules.fairMaxPct)) p.push("Grade limits must rise: Excellent ≤ Good ≤ Fair.")
    if (maxPct > 100 || step > 50) p.push("Max deduction is at most 100% and variant step at most 50%.")
    if (maxImages > 20) p.push("At most 20 images per request.")
    if (ev.maxVideos > 5) p.push("At most 5 videos per request.")
    if (ev.maxImageMb < 1 || ev.maxImageMb > 25) p.push("Photo size limit must be 1–25 MB.")
    if (ev.maxVideoMb < 5 || ev.maxVideoMb > 500) p.push("Video size limit must be 5–500 MB.")
    return p
  }, [rules, maxPct, step, maxImages, ev])

  if (q.isError) return <QueryErrorBlock error={q.error} onRetry={() => q.refetch()} />
  if (q.isLoading || !q.data) return <LoadingSkeleton variant="stat-card" count={3} />
  const defaults = q.data.defaultRules
  const dirty = JSON.stringify({ rules, enabled, maxPct, step, maxImages, ev }) !== JSON.stringify({ rules: q.data.rules, enabled: q.data.enabled, maxPct: q.data.maxTotalDeductionPct, step: q.data.variantStepPct, maxImages: q.data.maxImages, ev: { maxVideos: q.data.maxVideos, maxImageMb: q.data.maxImageMb, maxVideoMb: q.data.maxVideoMb, qcRequiredForApproval: q.data.qcRequiredForApproval } })

  return (
    <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); if (!problems.length) save.mutate({ enabled, rules, maxTotalDeductionPct: maxPct, variantStepPct: step, maxImages, ...ev }) }}>
      <section className="rounded-xl border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold">General</h2>
        <div className="grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-center gap-2 pb-2"><Switch id="enabled" checked={enabled} onCheckedChange={setEnabled} /><Label htmlFor="enabled">Accept new sell requests</Label></div>
          <NumField id="maxPct" label="Maximum total deduction" unit="%" hint="Quotes never drop below this floor" value={maxPct} onChange={setMaxPct} />
          <NumField id="step" label="Variant step" unit="% per step" hint="Each variant below the top loses this much" value={step} onChange={setStep} />
          <NumField id="maxImages" label="Photos per request" value={maxImages} onChange={setMaxImages} />
        </div>
      </section>

      <section className="rounded-xl border bg-card p-4">
        <h2 className="mb-1 text-sm font-semibold">Photos, video &amp; QC</h2>
        <p className="mb-3 text-xs text-muted-foreground">Limits apply to each evidence stage of a request. The server enforces them; the apps and dashboard read them from here.</p>
        <div className="grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <NumField id="maxVideos" label="Videos per request" value={ev.maxVideos} onChange={(n) => setEv((p) => ({ ...p, maxVideos: n }))} />
          <NumField id="maxImageMb" label="Largest photo" unit="MB" value={ev.maxImageMb} onChange={(n) => setEv((p) => ({ ...p, maxImageMb: n }))} />
          <NumField id="maxVideoMb" label="Largest video" unit="MB" value={ev.maxVideoMb} onChange={(n) => setEv((p) => ({ ...p, maxVideoMb: n }))} />
          <div className="flex items-center gap-2 pb-2"><Switch id="qcGate" checked={ev.qcRequiredForApproval} onCheckedChange={(v) => setEv((p) => ({ ...p, qcRequiredForApproval: v }))} /><Label htmlFor="qcGate">Require QC pass before approval</Label></div>
        </div>
        {ev.qcRequiredForApproval && <p className="mt-2 text-xs text-amber-700">When on, requests cannot be approved until QC passes, and cannot be completed until the customer accepts the final valuation. Requests already in progress will need QC too.</p>}
      </section>

      {RULE_GROUPS.map((g) => (
        <section key={g.title} className="rounded-xl border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold">{g.title}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {g.rules.map((r) => (
              <div key={r.key}>
                <NumField id={r.key} label={r.label} unit={r.unit} hint={r.hint} value={rules[r.key]} onChange={(n) => setRules((p) => ({ ...p, [r.key]: n }))} />
                {rules[r.key] !== defaults[r.key] && <p className="mt-1 text-xs text-amber-600">Default {defaults[r.key]}</p>}
              </div>
            ))}
          </div>
        </section>
      ))}

      {problems.length > 0 && <ul role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{problems.map((p) => <li key={p}>{p}</li>)}</ul>}
      <div className="sticky bottom-0 flex justify-end gap-2 border-t bg-background/95 py-3 backdrop-blur">
        <Button type="button" variant="outline" onClick={() => setRules({ ...defaults })}><RotateCcw /> Reset rules to defaults</Button>
        <Button type="submit" disabled={!dirty || problems.length > 0 || save.isPending}>{save.isPending ? "Saving…" : "Save changes"}</Button>
      </div>
    </form>
  )
}

// ── Catalogue ──────────────────────────────────────────────────────────

const list = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean)

function JourneyPanelSettings() {
  const q = useSellSettings()
  const save = useUpdateSellSettings()
  const [f, setF] = useState<Record<string, number | boolean>>({})
  useEffect(() => {
    if (q.data) setF({
      offerWindowMinutes: q.data.offerWindowMinutes ?? 60, maxOfferRefreshes: q.data.maxOfferRefreshes ?? 3, estimateSpreadPct: q.data.estimateSpreadPct ?? 8,
      requireVendorFunding: q.data.requireVendorFunding ?? true, pickupEnabled: q.data.pickupEnabled ?? true, dropoffEnabled: q.data.dropoffEnabled ?? true,
      payoutWalletEnabled: q.data.payoutWalletEnabled ?? true, payoutUpiEnabled: q.data.payoutUpiEnabled ?? true, payoutBankEnabled: q.data.payoutBankEnabled ?? true,
    })
  }, [q.data])
  if (q.isLoading) return <LoadingSkeleton />
  if (q.isError || !q.data) return <QueryErrorBlock error={q.error} onRetry={() => q.refetch()} />
  const toggles: Array<[string, string, string]> = [
    ["requireVendorFunding", "Buyer pays before pickup", "The buyer's payment is held by Dealkr before the courier is booked, so the customer is always paid."],
    ["pickupEnabled", "Offer home pickup", "Customers can ask for pickup from their address."],
    ["dropoffEnabled", "Offer drop-off at the store", "Customers can bring the phone to the buyer's shop."],
    ["payoutUpiEnabled", "Pay out by UPI", "Finance sends it and marks it paid with the bank reference."],
    ["payoutBankEnabled", "Pay out by bank transfer", "Finance sends it and marks it paid with the bank reference."],
    ["payoutWalletEnabled", "Pay out to the Dealkr wallet", "Instant, but only when the amount fits the wallet balance limit (Settings → Wallet)."],
  ]
  return (
    <div className="space-y-4">
      <section className="rounded-xl border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold">Offers</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <NumField id="jw" label="Offers stay open for" unit="minutes" value={Number(f.offerWindowMinutes)} onChange={(n) => setF({ ...f, offerWindowMinutes: n })} hint="After this the customer can refresh to get new offers." />
          <NumField id="jr" label="Offer refreshes per request" value={Number(f.maxOfferRefreshes)} onChange={(n) => setF({ ...f, maxOfferRefreshes: n })} />
          <NumField id="js" label="Estimate range width" unit="%" value={Number(f.estimateSpreadPct)} onChange={(n) => setF({ ...f, estimateSpreadPct: n })} hint="The ₹ range shown before offers arrive, centred on the system value." />
        </div>
      </section>
      <section className="rounded-xl border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold">Pickup, payment and payout</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {toggles.map(([k, l, h]) => (
            <div key={k} className="flex items-start justify-between gap-3 rounded-lg border px-3 py-2">
              <div><Label htmlFor={k} className="cursor-pointer text-sm font-medium">{l}</Label><p className="text-xs text-muted-foreground">{h}</p></div>
              <Switch id={k} checked={Boolean(f[k])} onCheckedChange={(v) => setF({ ...f, [k]: v })} />
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">UPI and bank payouts are sent by your finance team from <b>Sell Payouts</b> and marked paid with the bank reference. Instant automatic payouts need RazorpayX to be enabled on your Razorpay account.</p>
      </section>
      <div className="flex justify-end"><Button disabled={save.isPending} onClick={() => save.mutate(f as never)}>{save.isPending ? "Saving…" : "Save journey settings"}</Button></div>
    </div>
  )
}

function ModelDialog({ model, open, onClose }: { model: CatalogModel | null; open: boolean; onClose: () => void }) {
  const save = useSaveSellModel()
  const types = useExchangeTypes()
  const [name, setName] = useState("")
  const [category, setCategory] = useState<DeviceCategory>("Smartphone")
  const [brand, setBrand] = useState("")
  const [series, setSeries] = useState("")
  const [variants, setVariants] = useState("")
  const [colors, setColors] = useState("")
  const [price, setPrice] = useState("")
  const [saleEnabled, setSaleEnabled] = useState(true)
  const [repairEnabled, setRepairEnabled] = useState(true)

  useEffect(() => {
    if (!open) return
    setName(model?.name ?? ""); setCategory(model?.category ?? "Smartphone"); setBrand(model?.brand ?? ""); setSeries(model?.series ?? "")
    setVariants(model?.variants.join(", ") ?? ""); setColors(model?.colors.join(", ") ?? "Black, White, Blue, Green, Red, Silver, Gold, Purple, Pink, Grey")
    setPrice(model?.basePrice != null ? String(model.basePrice) : ""); setSaleEnabled(model?.saleEnabled !== false); setRepairEnabled(model?.repairEnabled !== false)
  }, [open, model])

  const v = list(variants), c = list(colors)
  const dup = new Set(v).size !== v.length || new Set(c).size !== c.length
  const valid = name.trim().length > 1 && v.length > 0 && c.length > 0 && (price === "" || Number(price) > 0) && !dup

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{model ? `Edit ${model.name}` : "Add device model"}</DialogTitle>
          <DialogDescription>One catalogue for Sell, Repair, Exchange and the vendor app. Storage sizes feed the storage pickers; repair never forces storage.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="space-y-1.5"><Label htmlFor="mn">Model name</Label><Input id="mn" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label htmlFor="mb">Brand</Label><Input id="mb" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Samsung" /></div>
            <div className="space-y-1.5"><Label htmlFor="ms">Series</Label><Input id="ms" value={series} onChange={(e) => setSeries(e.target.value)} placeholder="Galaxy S Series" /></div>
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={category} onValueChange={(x) => setCategory(x as DeviceCategory)}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{(types.data ?? []).map((t) => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}</SelectContent></Select>
          </div>
          <div className="space-y-1.5"><Label htmlFor="mv">Storage sizes (lowest → highest, comma separated)</Label><Input id="mv" value={variants} onChange={(e) => setVariants(e.target.value)} placeholder="128GB, 256GB, 512GB" /></div>
          <div className="space-y-1.5"><Label htmlFor="mc">Colours (comma separated)</Label><Input id="mc" value={colors} onChange={(e) => setColors(e.target.value)} placeholder="Black, Blue" /></div>
          <div className="space-y-1.5"><Label htmlFor="mp">Base price (₹) — top storage, mint condition. Leave empty when there is no catalogue price: the seller then names his price.</Label><Input id="mp" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, ""))} /></div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm"><Switch checked={saleEnabled} onCheckedChange={setSaleEnabled} /> Sell enabled</label>
            <label className="flex items-center gap-2 text-sm"><Switch checked={repairEnabled} onCheckedChange={setRepairEnabled} /> Repair enabled</label>
          </div>
          {dup && <p role="alert" className="text-xs text-red-600">Storage sizes and colours must each be unique.</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!valid || save.isPending} onClick={() => save.mutate({ id: model?.id, body: { name: name.trim(), category, variants: v, colors: c, basePrice: price === "" ? null : Number(price), brand: brand.trim() || null, series: series.trim() || null, saleEnabled, repairEnabled } }, { onSuccess: onClose })}>
            {save.isPending ? "Saving…" : "Save model"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function BrandsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const q = useDeviceBrands()
  const save = useSaveDeviceBrand()
  const [busy, setBusy] = useState<string | null>(null)
  const upload = async (id: string, file: File) => {
    setBusy(id)
    try { const img = await uploadImage(file, undefined, "icon"); save.mutate({ id, body: { logoUrl: img.url } }) } finally { setBusy(null) }
  }
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Brands</DialogTitle>
          <DialogDescription>Logo, popularity and on/off for every brand. Customers and vendors see these in the Sell, Repair, Exchange and Add-product pickers.</DialogDescription>
        </DialogHeader>
        {q.isLoading ? <LoadingSkeleton variant="stat-card" count={3} /> : (
          <div className="divide-y rounded-lg border">
            {(q.data ?? []).map((b) => (
              <div key={b.id} className="flex items-center gap-3 px-3 py-2">
                <div className="flex h-10 w-20 items-center justify-center rounded bg-muted/40">
                  {b.logoUrl ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={b.logoUrl} alt={b.name} className="max-h-8 max-w-[72px] object-contain" /> : <span className="text-xs text-muted-foreground">No logo</span>}
                </div>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{b.name}</p><p className="text-xs text-muted-foreground">{b.models} models</p></div>
                <label className="cursor-pointer text-xs text-primary hover:underline">
                  {busy === b.id ? "Uploading…" : "Change logo"}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(b.id, f); e.target.value = "" }} />
                </label>
                <label className="flex items-center gap-1.5 text-xs"><Switch checked={b.popular} onCheckedChange={(x) => save.mutate({ id: b.id, body: { popular: x } })} /> Popular</label>
                <label className="flex items-center gap-1.5 text-xs"><Switch checked={b.isActive} onCheckedChange={(x) => save.mutate({ id: b.id, body: { isActive: x } })} /> Shown</label>
              </div>
            ))}
          </div>
        )}
        <DialogFooter><Button variant="outline" onClick={onClose}>Close</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const PAGE = 40

function CataloguePanel() {
  const q = useSellModels()
  const save = useSaveSellModel()
  const [editing, setEditing] = useState<CatalogModel | null>(null)
  const [open, setOpen] = useState(false)
  const [brandsOpen, setBrandsOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [brand, setBrand] = useState("all")
  const [page, setPage] = useState(0)
  const rows = useMemo(() => q.data ?? [], [q.data])
  const brands = useMemo(() => Array.from(new Set(rows.map((m) => m.brand).filter(Boolean) as string[])).sort(), [rows])
  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase()
    return rows.filter((m) => (brand === "all" || m.brand === brand) && (!t || `${m.brand ?? ""} ${m.name} ${m.series ?? ""}`.toLowerCase().includes(t)))
  }, [rows, search, brand])
  useEffect(() => { setPage(0) }, [search, brand])

  if (q.isError) return <QueryErrorBlock error={q.error} onRetry={() => q.refetch()} />
  if (q.isLoading) return <LoadingSkeleton variant="stat-card" count={3} />
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE))
  const shown = filtered.slice(page * PAGE, page * PAGE + PAGE)

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="mr-auto text-sm text-muted-foreground">{rows.filter((m) => m.isActive !== false).length} of {rows.length} models accepted · {brands.length} brands</p>
        <Input className="h-9 w-56" placeholder="Search brand, model, series" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select value={brand} onValueChange={setBrand}><SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All brands</SelectItem>{brands.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent></Select>
        <Button size="sm" variant="outline" onClick={() => setBrandsOpen(true)}>Brands &amp; logos</Button>
        <Button size="sm" onClick={() => { setEditing(null); setOpen(true) }}><Plus /> Add model</Button>
      </div>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full min-w-[900px] text-sm">
          <thead><tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
            {["Brand", "Model", "Series", "Storage", "Base price", "Sell", "Repair", "Accepted", ""].map((h) => <th key={h} className="px-3 py-2.5 font-medium">{h}</th>)}
          </tr></thead>
          <tbody>
            {shown.map((m) => (
              <tr key={m.id} className="border-b last:border-0">
                <td className="px-3 py-2.5">{m.brand ?? "—"}</td>
                <td className="px-3 py-2.5 font-medium">{m.name}</td>
                <td className="px-3 py-2.5 text-xs text-muted-foreground">{m.series ?? "—"}</td>
                <td className="px-3 py-2.5 text-xs">{m.variants.join(" · ")}</td>
                <td className="px-3 py-2.5 tabular-nums">{m.basePrice != null ? formatINR(m.basePrice) : <span className="text-xs text-muted-foreground">Seller sets</span>}</td>
                <td className="px-3 py-2.5"><Switch aria-label={`Sell ${m.name}`} checked={m.saleEnabled !== false} disabled={save.isPending} onCheckedChange={(x) => save.mutate({ id: m.id, body: { saleEnabled: x } })} /></td>
                <td className="px-3 py-2.5"><Switch aria-label={`Repair ${m.name}`} checked={m.repairEnabled !== false} disabled={save.isPending} onCheckedChange={(x) => save.mutate({ id: m.id, body: { repairEnabled: x } })} /></td>
                <td className="px-3 py-2.5"><Switch aria-label={`Accept ${m.name}`} checked={m.isActive !== false} disabled={save.isPending} onCheckedChange={(x) => save.mutate({ id: m.id, body: { isActive: x } })} /></td>
                <td className="px-3 py-2.5 text-right"><Button variant="ghost" size="icon" aria-label={`Edit ${m.name}`} onClick={() => { setEditing(m); setOpen(true) }}><Pencil /></Button></td>
              </tr>
            ))}
            {shown.length === 0 && <tr><td colSpan={9} className="px-3 py-8 text-center text-sm text-muted-foreground">No model matches.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{filtered.length} models</span>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button>
          <span>Page {page + 1} of {pages}</span>
          <Button size="sm" variant="outline" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      </div>
      <ModelDialog model={editing} open={open} onClose={() => setOpen(false)} />
      <BrandsDialog open={brandsOpen} onClose={() => setBrandsOpen(false)} />
    </section>
  )
}

// ── Exchange programmes ────────────────────────────────────────────────

const ICON_CHOICES: DeviceIcon[] = ["phone", "tablet", "laptop", "headphones", "earbuds", "watch", "speaker", "camera", "console", "other"]

function TypeDialog({ type, open, onClose }: { type: ExchangeDeviceType | null; open: boolean; onClose: () => void }) {
  const save = useSaveExchangeType()
  const [f, setF] = useState({ label: "", icon: "other" as DeviceIcon, needsImei: false, hasScreen: false, hasBattery: true, hasCamera: false })
  useEffect(() => {
    if (!open) return
    setF(type ? { label: type.label, icon: type.icon, needsImei: type.needsImei, hasScreen: type.hasScreen, hasBattery: type.hasBattery, hasCamera: type.hasCamera } : { label: "", icon: "other", needsImei: false, hasScreen: false, hasBattery: true, hasCamera: false })
  }, [open, type])
  const flags: Array<[keyof typeof f, string, string]> = [
    ["needsImei", "Has an IMEI", "Phones and tablets: the customer enters a checked IMEI. Otherwise an optional serial number."],
    ["hasScreen", "Has a screen", "Ask about screen scratches and a replaced screen."],
    ["hasBattery", "Has a battery", "Ask about battery condition."],
    ["hasCamera", "Has a camera / fingerprint", "Ask about camera and Face ID / fingerprint faults."],
  ]
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{type ? `Edit ${type.label}` : "Add old-device type"}</DialogTitle>
          <DialogDescription>The kind of device a customer can trade in. The app asks only the questions that make sense for it.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="space-y-1.5"><Label htmlFor="tl">Name</Label><Input id="tl" value={f.label} disabled={!!type} onChange={(e) => setF({ ...f, label: e.target.value })} placeholder="Camera" /></div>
          <div className="space-y-1.5">
            <Label>Icon shown in the app</Label>
            <Select value={f.icon} onValueChange={(x) => setF({ ...f, icon: x as DeviceIcon })}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ICON_CHOICES.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent></Select>
          </div>
          {flags.map(([k, label, hint]) => (
            <div key={k} className="flex items-start gap-3"><Switch id={`f-${k}`} checked={f[k] as boolean} onCheckedChange={(v) => setF({ ...f, [k]: v })} /><div><Label htmlFor={`f-${k}`}>{label}</Label><p className="text-xs text-muted-foreground">{hint}</p></div></div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={f.label.trim().length < 2 || save.isPending} onClick={() => save.mutate({ key: type?.key, body: { ...f, label: f.label.trim() } }, { onSuccess: onClose })}>{save.isPending ? "Saving…" : "Save type"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ProgramDialog({ program, open, onClose }: { program: ExchangeProgram | null; open: boolean; onClose: () => void }) {
  const save = useSaveExchangeProgram()
  const types = useExchangeTypes()
  const cats = useCategories()
  const [name, setName] = useState("")
  const [deviceTypes, setDeviceTypes] = useState<string[]>([])
  const [categoryIds, setCategoryIds] = useState<string[]>([])
  const [pct, setPct] = useState(100)
  const [search, setSearch] = useState("")
  useEffect(() => {
    if (!open) return
    setName(program?.name ?? ""); setDeviceTypes(program?.deviceTypes ?? []); setCategoryIds(program?.categoryIds ?? []); setPct(program?.maxValuePct ?? 100); setSearch("")
  }, [open, program])
  const toggle = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v])
  const all = (cats.data ?? []).filter((c) => c.is_active)
  const name_of = (id: string | null) => all.find((c) => c.id === id)?.name
  const shown = all.filter((c) => !search || c.name.toLowerCase().includes(search.toLowerCase()))
  const valid = name.trim().length > 1 && deviceTypes.length > 0 && categoryIds.length > 0 && pct > 0 && pct <= 100
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{program ? "Edit exchange programme" : "New exchange programme"}</DialogTitle>
          <DialogDescription>Products in the chosen categories show an exchange offer on their page, for the old devices you accept here.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="space-y-1.5"><Label htmlFor="pn">Programme name</Label><Input id="pn" value={name} onChange={(e) => setName(e.target.value)} placeholder="Headphone exchange" /></div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Old devices we accept</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {(types.data ?? []).filter((t) => t.isActive).map((t) => (
                <label key={t.key} className="flex cursor-pointer items-center gap-2 rounded-lg border p-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                  <input type="checkbox" checked={deviceTypes.includes(t.key)} onChange={() => setDeviceTypes((d) => toggle(d, t.key))} />{t.label}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Applies to products in <span className="text-muted-foreground">({categoryIds.length} selected, sub-categories included)</span></legend>
            <Input placeholder="Search categories" value={search} onChange={(e) => setSearch(e.target.value)} />
            <div className="max-h-48 overflow-y-auto rounded-lg border p-1">
              {shown.map((c) => (
                <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted">
                  <input type="checkbox" checked={categoryIds.includes(c.id)} onChange={() => setCategoryIds((d) => toggle(d, c.id))} />
                  <span>{c.name}</span>{c.parent_id && <span className="text-xs text-muted-foreground">in {name_of(c.parent_id) ?? "…"}</span>}
                </label>
              ))}
              {!shown.length && <p className="p-3 text-center text-xs text-muted-foreground">No categories match.</p>}
            </div>
          </fieldset>
          <NumField id="pp" label="Most credit a customer can get" unit="% of the new product's price" hint="₹1,000 headphones at 60% give at most ₹600 off, however valuable the old device." value={pct} onChange={setPct} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!valid || save.isPending} onClick={() => save.mutate({ id: program?.id, body: { name: name.trim(), deviceTypes, categoryIds, maxValuePct: pct } }, { onSuccess: onClose })}>{save.isPending ? "Saving…" : "Save programme"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ExchangeProgramsPanel() {
  const programs = useExchangePrograms()
  const types = useExchangeTypes()
  const save = useSaveExchangeProgram()
  const saveType = useSaveExchangeType()
  const del = useDeleteExchangeProgram()
  const [editing, setEditing] = useState<ExchangeProgram | null>(null)
  const [open, setOpen] = useState(false)
  const [editType, setEditType] = useState<ExchangeDeviceType | null>(null)
  const [typeOpen, setTypeOpen] = useState(false)
  const label = (k: string) => (types.data ?? []).find((t) => t.key === k)?.label ?? k

  if (programs.isError) return <QueryErrorBlock error={programs.error} onRetry={() => programs.refetch()} />
  if (programs.isLoading || types.isLoading) return <LoadingSkeleton variant="stat-card" count={3} />
  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div><h2 className="text-sm font-semibold">Exchange programmes</h2><p className="text-xs text-muted-foreground">Which products can be bought with a trade-in, and which old devices are accepted. A product with no programme shows no exchange.</p></div>
          <Button size="sm" onClick={() => { setEditing(null); setOpen(true) }}><Plus /> New programme</Button>
        </div>
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full min-w-[720px] text-sm">
            <thead><tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">{["Programme", "Accepts", "On products in", "Max credit", "Active", ""].map((h) => <th key={h} className="px-3 py-2.5 font-medium">{h}</th>)}</tr></thead>
            <tbody>
              {(programs.data ?? []).map((p) => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="px-3 py-2.5 font-medium">{p.name}</td>
                  <td className="px-3 py-2.5 text-xs">{p.deviceTypes.map(label).join(", ")}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{p.categories.map((c) => c.name).join(", ") || "—"}{p.products.length ? ` + ${p.products.length} product(s)` : ""}</td>
                  <td className="px-3 py-2.5 tabular-nums">{p.maxValuePct}%</td>
                  <td className="px-3 py-2.5"><Switch aria-label={`Activate ${p.name}`} checked={p.isActive} disabled={save.isPending} onCheckedChange={(v) => save.mutate({ id: p.id, body: { isActive: v } })} /></td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    <Button variant="ghost" size="icon" aria-label={`Edit ${p.name}`} onClick={() => { setEditing(p); setOpen(true) }}><Pencil /></Button>
                    <Button variant="ghost" size="icon" aria-label={`Delete ${p.name}`} disabled={del.isPending} onClick={() => { if (confirm(`Remove “${p.name}”? Products in it will stop showing an exchange offer.`)) del.mutate(p.id) }}><Trash2 /></Button>
                  </td>
                </tr>
              ))}
              {!programs.data?.length && <tr><td colSpan={6} className="px-3 py-8 text-center text-sm text-muted-foreground">No programmes yet — customers see no exchange offer anywhere. Create one to start.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div><h2 className="text-sm font-semibold">Old-device types</h2><p className="text-xs text-muted-foreground">Add a type, then add its models under “Device catalogue” with their typical resale price.</p></div>
          <Button size="sm" variant="outline" onClick={() => { setEditType(null); setTypeOpen(true) }}><Plus /> Add type</Button>
        </div>
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full min-w-[640px] text-sm">
            <thead><tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">{["Type", "Icon", "Asks about", "Accepted", ""].map((h) => <th key={h} className="px-3 py-2.5 font-medium">{h}</th>)}</tr></thead>
            <tbody>
              {(types.data ?? []).map((t) => (
                <tr key={t.key} className="border-b last:border-0">
                  <td className="px-3 py-2.5 font-medium">{t.label}</td>
                  <td className="px-3 py-2.5 text-xs">{t.icon}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{[t.needsImei && "IMEI", t.hasScreen && "screen", t.hasBattery && "battery", t.hasCamera && "camera / fingerprint"].filter(Boolean).join(", ") || "condition only"}</td>
                  <td className="px-3 py-2.5"><Switch aria-label={`Accept ${t.label}`} checked={t.isActive} disabled={saveType.isPending} onCheckedChange={(v) => saveType.mutate({ key: t.key, body: { isActive: v } })} /></td>
                  <td className="px-3 py-2.5 text-right"><Button variant="ghost" size="icon" aria-label={`Edit ${t.label}`} onClick={() => { setEditType(t); setTypeOpen(true) }}><Pencil /></Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <ProgramDialog program={editing} open={open} onClose={() => setOpen(false)} />
      <TypeDialog type={editType} open={typeOpen} onClose={() => setTypeOpen(false)} />
    </div>
  )
}

export default function SellSettingsPage() {
  const { can } = usePermissions()
  return (
    <div className="space-y-5">
      <PageHeader title="Sell & Exchange settings" subtitle="Tune how devices are valued and which models customers can sell.">
        <Button asChild variant="outline" size="sm"><Link href="/sell-requests"><ArrowLeft /> Back to requests</Link></Button>
      </PageHeader>
      {!can("sell_requests.settings") ? (
        <p role="alert" className="rounded-lg border p-6 text-center text-sm text-muted-foreground">You need the “sell_requests.settings” permission to change these.</p>
      ) : (
        <Tabs defaultValue="rules">
          <TabsList><TabsTrigger value="rules">Valuation rules</TabsTrigger><TabsTrigger value="programs">Exchange programmes</TabsTrigger><TabsTrigger value="catalogue">Device catalogue</TabsTrigger><TabsTrigger value="journey">Selling journey</TabsTrigger></TabsList>
          <TabsContent value="rules"><RulesPanel /></TabsContent>
          <TabsContent value="programs"><ExchangeProgramsPanel /></TabsContent>
          <TabsContent value="catalogue"><CataloguePanel /></TabsContent>
          <TabsContent value="journey"><JourneyPanelSettings /></TabsContent>
        </Tabs>
      )}
    </div>
  )
}

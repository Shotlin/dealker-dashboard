"use client"

/** Sell & exchange settings: valuation rules, general limits and the accepted-device catalogue. */

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Pencil, Plus, RotateCcw } from "lucide-react"
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
import { useSaveSellModel, useSellModels, useSellSettings, useUpdateSellSettings } from "@/hooks/useSellRequests"
import { usePermissions } from "@/hooks/usePermissions"
import { formatINR } from "@/lib/utils"
import type { CatalogModel, DeviceCategory } from "@/services/sell-requests.service"

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

function ModelDialog({ model, open, onClose }: { model: CatalogModel | null; open: boolean; onClose: () => void }) {
  const save = useSaveSellModel()
  const [name, setName] = useState("")
  const [category, setCategory] = useState<DeviceCategory>("Smartphone")
  const [variants, setVariants] = useState("")
  const [colors, setColors] = useState("")
  const [price, setPrice] = useState("")

  useEffect(() => {
    if (!open) return
    setName(model?.name ?? ""); setCategory(model?.category ?? "Smartphone")
    setVariants(model?.variants.join(", ") ?? ""); setColors(model?.colors.join(", ") ?? ""); setPrice(model ? String(model.basePrice) : "")
  }, [open, model])

  const v = list(variants), c = list(colors)
  const dup = new Set(v).size !== v.length || new Set(c).size !== c.length
  const valid = name.trim().length > 1 && v.length > 0 && c.length > 0 && Number(price) > 0 && !dup

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{model ? `Edit ${model.name}` : "Add device model"}</DialogTitle>
          <DialogDescription>Customers can only sell models listed here.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="space-y-1.5"><Label htmlFor="mn">Model name</Label><Input id="mn" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={category} onValueChange={(x) => setCategory(x as DeviceCategory)}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="Smartphone">Smartphone</SelectItem><SelectItem value="Tablet">Tablet</SelectItem><SelectItem value="Laptop">Laptop</SelectItem></SelectContent></Select>
          </div>
          <div className="space-y-1.5"><Label htmlFor="mv">Variants (lowest → highest, comma separated)</Label><Input id="mv" value={variants} onChange={(e) => setVariants(e.target.value)} placeholder="128GB, 256GB, 512GB" /></div>
          <div className="space-y-1.5"><Label htmlFor="mc">Colours (comma separated)</Label><Input id="mc" value={colors} onChange={(e) => setColors(e.target.value)} placeholder="Black, Blue" /></div>
          <div className="space-y-1.5"><Label htmlFor="mp">Base price (₹) — top variant, mint condition</Label><Input id="mp" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ""))} /></div>
          {dup && <p role="alert" className="text-xs text-red-600">Variants and colours must each be unique.</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!valid || save.isPending} onClick={() => save.mutate({ id: model?.id, body: { name: name.trim(), category, variants: v, colors: c, basePrice: Number(price) } }, { onSuccess: onClose })}>
            {save.isPending ? "Saving…" : "Save model"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CataloguePanel() {
  const q = useSellModels()
  const save = useSaveSellModel()
  const [editing, setEditing] = useState<CatalogModel | null>(null)
  const [open, setOpen] = useState(false)

  if (q.isError) return <QueryErrorBlock error={q.error} onRetry={() => q.refetch()} />
  if (q.isLoading) return <LoadingSkeleton variant="stat-card" count={3} />
  const rows = q.data ?? []

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{rows.filter((m) => m.isActive !== false).length} of {rows.length} models accepted</p>
        <Button size="sm" onClick={() => { setEditing(null); setOpen(true) }}><Plus /> Add model</Button>
      </div>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full min-w-[700px] text-sm">
          <thead><tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
            {["Model", "Category", "Variants", "Colours", "Base price", "Accepted", ""].map((h) => <th key={h} className="px-3 py-2.5 font-medium">{h}</th>)}
          </tr></thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.id} className="border-b last:border-0">
                <td className="px-3 py-2.5 font-medium">{m.name}</td>
                <td className="px-3 py-2.5">{m.category}</td>
                <td className="px-3 py-2.5 text-xs">{m.variants.join(" · ")}</td>
                <td className="px-3 py-2.5 text-xs text-muted-foreground">{m.colors.join(", ")}</td>
                <td className="px-3 py-2.5 tabular-nums">{formatINR(m.basePrice)}</td>
                <td className="px-3 py-2.5"><Switch aria-label={`Accept ${m.name}`} checked={m.isActive !== false} disabled={save.isPending} onCheckedChange={(v) => save.mutate({ id: m.id, body: { isActive: v } })} /></td>
                <td className="px-3 py-2.5 text-right"><Button variant="ghost" size="icon" aria-label={`Edit ${m.name}`} onClick={() => { setEditing(m); setOpen(true) }}><Pencil /></Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ModelDialog model={editing} open={open} onClose={() => setOpen(false)} />
    </section>
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
          <TabsList><TabsTrigger value="rules">Valuation rules</TabsTrigger><TabsTrigger value="catalogue">Device catalogue</TabsTrigger></TabsList>
          <TabsContent value="rules"><RulesPanel /></TabsContent>
          <TabsContent value="catalogue"><CataloguePanel /></TabsContent>
        </Tabs>
      )}
    </div>
  )
}

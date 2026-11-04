"use client"

import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { ImageOff, Loader2, Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import CategoryTree from "@/components/builder/CategoryTree"
import { useCategories } from "@/hooks/useCategories"
import { useDebounce } from "@/hooks/useDebounce"
import { cn, formatINR } from "@/lib/utils"
import { previewRules, type ProductRules, type RuleSort } from "@/services/merch-sections.service"

const SORTS: Array<{ value: RuleSort; label: string }> = [
  { value: "best_selling", label: "Best selling" },
  { value: "discount", label: "Highest discount" },
  { value: "newest", label: "Newest first" },
  { value: "rating", label: "Top rated" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
]

interface Props {
  rules: ProductRules | undefined
  limit: number
  excludeIds: string[]
  busy: boolean
  /** null clears the rules. */
  onSave: (rules: ProductRules | null) => void
}

const numOrNull = (v: string) => { const n = Number(v); return v.trim() === "" || !Number.isFinite(n) ? null : n }

function NumberField({ label, value, onChange, suffix, placeholder }: { label: string; value: number | null | undefined; onChange: (v: number | null) => void; suffix?: string; placeholder?: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="relative">
        <Input type="number" inputMode="decimal" min={0} className="h-9 pr-8 text-sm" placeholder={placeholder ?? "Any"} value={value ?? ""} onChange={(e) => onChange(numOrNull(e.target.value))} />
        {suffix && <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  )
}

/** Rule builder: filters + sort + per-brand cap with a live preview of what they match. */
export function RulesPanel({ rules, limit, excludeIds, busy, onSave }: Props) {
  const [draft, setDraft] = useState<ProductRules>(rules ?? { sort: "best_selling" })
  const [brandInput, setBrandInput] = useState("")
  const [pickingCats, setPickingCats] = useState(false)
  const cats = useCategories()
  const catName = useMemo(() => new Map((cats.data ?? []).map((c) => [c.id, c.name])), [cats.data])
  const set = (patch: Partial<ProductRules>) => setDraft((d) => ({ ...d, ...patch }))

  const hasFilter = !!(draft.category_ids?.length || draft.brands?.length || draft.min_price != null || draft.max_price != null
    || draft.min_discount != null || draft.min_rating != null || draft.new_within_days != null || draft.max_per_brand != null)
  const dirty = JSON.stringify(draft) !== JSON.stringify(rules ?? { sort: "best_selling" })
  const debounced = useDebounce(JSON.stringify(draft), 400)
  const preview = useQuery({
    queryKey: ["merch", "rules-preview", debounced, limit, excludeIds.join(",")],
    queryFn: () => previewRules(JSON.parse(debounced) as ProductRules, limit, excludeIds),
    enabled: hasFilter,
    staleTime: 15_000,
  })
  const addBrand = () => {
    const b = brandInput.trim()
    if (b && !(draft.brands ?? []).some((x) => x.toLowerCase() === b.toLowerCase())) set({ brands: [...(draft.brands ?? []), b] })
    setBrandInput("")
  }
  const toggleCat = (id: string) => set({ category_ids: (draft.category_ids ?? []).includes(id) ? (draft.category_ids ?? []).filter((c) => c !== id) : [...(draft.category_ids ?? []), id] })

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="space-y-4 rounded-xl border bg-white p-4">
        <p className="text-sm text-muted-foreground">Products matching these rules fill the section after the pinned ones. Leave a filter empty to ignore it.</p>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <NumberField label="Min price" suffix="₹" value={draft.min_price} onChange={(v) => set({ min_price: v })} />
          <NumberField label="Max price" suffix="₹" value={draft.max_price} onChange={(v) => set({ max_price: v })} />
          <NumberField label="Min discount" suffix="%" value={draft.min_discount} onChange={(v) => set({ min_discount: v })} />
          <NumberField label="Min rating" suffix="★" value={draft.min_rating} onChange={(v) => set({ min_rating: v })} />
          <NumberField label="Added in last" suffix="days" value={draft.new_within_days} onChange={(v) => set({ new_within_days: v })} />
          <NumberField label="Max per brand" value={draft.max_per_brand} onChange={(v) => set({ max_per_brand: v })} />
          <div className="col-span-2 space-y-1">
            <Label className="text-xs text-muted-foreground">Sort by</Label>
            <div className="flex flex-wrap gap-1">
              {SORTS.map((s) => (
                <button key={s.value} type="button" onClick={() => set({ sort: s.value })}
                  className={cn("rounded-md border px-2.5 py-1.5 text-xs", (draft.sort ?? "best_selling") === s.value ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Brands</Label>
          <div className="flex flex-wrap items-center gap-1.5">
            {(draft.brands ?? []).map((b) => (
              <span key={b} className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs">{b}<button type="button" aria-label={`Remove ${b}`} onClick={() => set({ brands: (draft.brands ?? []).filter((x) => x !== b) })}><X className="h-3 w-3" /></button></span>
            ))}
            <Input className="h-8 w-40 text-xs" placeholder="Type brand, press Enter" value={brandInput} onChange={(e) => setBrandInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addBrand() } }} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Categories</Label>
          <div className="flex flex-wrap items-center gap-1.5">
            {(draft.category_ids ?? []).map((id) => (
              <span key={id} className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs">{catName.get(id) ?? "Category"}<button type="button" aria-label="Remove category" onClick={() => toggleCat(id)}><X className="h-3 w-3" /></button></span>
            ))}
            <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => setPickingCats((v) => !v)}><Plus className="mr-1 h-3.5 w-3.5" />{pickingCats ? "Done" : "Add category"}</Button>
          </div>
          {pickingCats && <div className="max-h-56 overflow-y-auto rounded-lg border p-2"><CategoryTree selectedIds={draft.category_ids ?? []} onSelect={toggleCat} /></div>}
        </div>

        <div className="flex items-center gap-2 border-t pt-3">
          <Button disabled={busy || !dirty || !hasFilter} onClick={() => onSave(draft)}>{busy ? "Saving…" : "Save rules"}</Button>
          <Button variant="outline" disabled={busy || !rules} onClick={() => { onSave(null); setDraft({ sort: "best_selling" }) }}>Remove rules</Button>
          {dirty && <span className="text-xs text-amber-600">Unsaved changes</span>}
        </div>
      </div>

      <div className="space-y-2 rounded-xl border bg-white p-4">
        <p className="text-sm font-semibold">Live preview</p>
        {!hasFilter ? <p className="text-xs text-muted-foreground">Set at least one filter to see matching products.</p>
          : preview.isLoading ? <p className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" />Matching…</p>
          : preview.isError ? <p className="text-xs text-red-600">Could not load the preview.</p>
          : (
            <>
              <p className={cn("text-xs font-medium", preview.data && preview.data.total === 0 ? "text-red-600" : "text-green-700")}>
                Matches {preview.data?.total ?? 0} product{preview.data?.total === 1 ? "" : "s"} · showing {preview.data?.products.length ?? 0}
              </p>
              <ol className="space-y-1.5">
                {(preview.data?.products ?? []).map((p, i) => (
                  <li key={p.id} className="flex items-center gap-2 rounded-lg border p-1.5">
                    <span className="w-4 text-center text-[11px] tabular-nums text-muted-foreground">{i + 1}</span>
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded border bg-muted">
                      {p.images?.[0] /* eslint-disable-next-line @next/next/no-img-element */ ? <img src={p.images[0]} alt="" className="h-full w-full object-cover" loading="lazy" /> : <ImageOff className="h-3.5 w-3.5 text-muted-foreground" />}
                    </div>
                    <div className="min-w-0"><p className="truncate text-xs font-medium">{p.name}</p><p className="text-[11px] tabular-nums text-muted-foreground">{formatINR(Number(p.sale_price ?? p.price))}{p.brand ? ` · ${p.brand}` : ""}</p></div>
                  </li>
                ))}
              </ol>
            </>
          )}
      </div>
    </div>
  )
}

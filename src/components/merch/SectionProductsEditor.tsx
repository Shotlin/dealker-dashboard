"use client"

import { useMemo, useState } from "react"
import { AlertTriangle, ArrowDown, ArrowUp, EyeOff, ImageOff, Pin, PinOff, Plus, Undo2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn, formatINR } from "@/lib/utils"
import type { DealInfo, MerchSection, ProductRules, ResolvedProduct, ResolvedTab } from "@/services/merch-sections.service"
import { useSaveSectionProducts } from "@/hooks/useMerchSections"
import { AddProductsDialog } from "./AddProductsDialog"
import { RulesPanel } from "./RulesPanel"
import { DealPanel } from "./DealPanel"

const MAX_LIMIT = 12 // HOME_MANIFEST_SECTION_CAP on the backend
const isTabbed = (s: MerchSection) => Array.isArray(s.config?.tabs) && s.config.tabs.length > 0

/** One editable product list: a whole section, or one tab of a tabbed section. */
interface Target {
  products: ResolvedProduct[]
  pinned: string[]
  excluded: string[]
  limit: number | null
  rules?: ProductRules
  /** Deal (promo campaign) that fills this list while it is active. */
  campaignId?: string
  deal?: DealInfo
  /** Keep filling the rest of the list from the section's normal feed. */
  autoFill: boolean
  saveAutoFill: (on: boolean) => void
  /** Cap used for the rules preview (plain sections: the section limit). */
  previewLimit: number
  saveRules: (rules: ProductRules | null) => void
  saveDeal: (campaignId: string | null) => void
  note?: string
  save: (next: { pinned: string[]; excluded: string[]; limit?: number }) => void
}

type Binding = { category_ids?: string[]; tags?: string[]; source?: "category" | "tag" | "manual"; limit?: number; product_ids?: string[]; exclude_ids?: string[]; rules?: ProductRules; campaign_id?: string; auto_fill?: boolean }

function useTarget(section: MerchSection, tabIdx: number, save: ReturnType<typeof useSaveSectionProducts>): Target {
  if (isTabbed(section)) {
    const tabs = section.config.tabs as ResolvedTab[]
    const tab = tabs[Math.min(tabIdx, tabs.length - 1)]
    const at = tabs.indexOf(tab)
    // `products` and `deal` are resolved output only — never write them back into the stored config.
    const editTab = (patch: Partial<ResolvedTab>) =>
      save.mutate({ id: section.id, config: { tabs: tabs.map((t, i) => { const { products: _p, deal: _d, ...stored } = t; return i === at ? { ...stored, ...patch } : stored }) } })
    // A tab with nothing set shows the live feed; keep that feed under the first pinned product.
    const implicit = !(tab.product_ids?.length || tab.rules || tab.campaign_id || tab.chips?.length || tab.category_ids?.length)
    const autoFill = tab.auto_fill ?? implicit
    const without = (key: "rules" | "campaign_id") => {
      const next = tabs.map((t, i) => { const { products: _p, deal: _d, ...stored } = t; if (i === at) delete (stored as Record<string, unknown>)[key]; return stored })
      return next
    }
    return {
      products: tab.products ?? [],
      pinned: tab.product_ids ?? [],
      excluded: tab.exclude_ids ?? [],
      limit: null,
      rules: tab.rules,
      campaignId: tab.campaign_id,
      deal: tab.deal,
      autoFill,
      saveAutoFill: (on) => editTab({ auto_fill: on }),
      previewLimit: 12,
      saveRules: (rules) => (rules ? editTab({ rules }) : save.mutate({ id: section.id, config: { tabs: without("rules") } })),
      saveDeal: (id) => (id ? editTab({ campaign_id: id }) : save.mutate({ id: section.id, config: { tabs: without("campaign_id") } })),
      note: tab.max_price ? `This tab only shows products up to ${formatINR(tab.max_price)}.` : undefined,
      save: ({ pinned, excluded }) => editTab({ product_ids: pinned, exclude_ids: excluded, auto_fill: autoFill }),
    }
  }
  const b = (section.merch_binding ?? {}) as Binding
  const implicitPlain = !(b.product_ids?.length || b.category_ids?.length || b.rules || b.campaign_id)
  const autoFillPlain = b.auto_fill ?? implicitPlain
  const put = (patch: Binding) => {
    const next: Binding = { category_ids: b.category_ids ?? [], tags: b.tags ?? [], source: b.source ?? "manual", limit: b.limit ?? MAX_LIMIT, product_ids: b.product_ids ?? [], exclude_ids: b.exclude_ids ?? [], rules: b.rules, campaign_id: b.campaign_id, auto_fill: autoFillPlain, ...patch }
    // The binding is replaced as a whole, so drop empty optional parts instead of sending nulls.
    if (!next.rules) delete next.rules
    if (!next.campaign_id) delete next.campaign_id
    save.mutate({ id: section.id, merch: next })
  }
  return {
    products: section.products ?? [],
    pinned: b.product_ids ?? [],
    excluded: b.exclude_ids ?? [],
    limit: Math.min(b.limit || MAX_LIMIT, MAX_LIMIT),
    rules: b.rules,
    campaignId: b.campaign_id,
    deal: section.deal,
    autoFill: autoFillPlain,
    saveAutoFill: (on) => put({ auto_fill: on }),
    previewLimit: Math.min(b.limit || MAX_LIMIT, MAX_LIMIT),
    saveRules: (rules) => put({ rules: rules ?? undefined }),
    saveDeal: (id) => put({ campaign_id: id ?? undefined }),
    save: ({ pinned, excluded, limit }) => put({ product_ids: pinned, exclude_ids: excluded, ...(limit ? { limit } : {}) }),
  }
}

export function SectionProductsEditor({ section, tabIdx, hiddenNames }: { section: MerchSection; tabIdx: number; hiddenNames: Record<string, string> }) {
  const saveMut = useSaveSectionProducts()
  const t = useTarget(section, tabIdx, saveMut)
  const [picked, setPicked] = useState<string[]>([])
  const [adding, setAdding] = useState(false)
  const [view, setView] = useState<"products" | "rules" | "deal">("products")
  const shown = useMemo(() => t.products, [t.products])
  const allOn = shown.length > 0 && shown.every((p) => picked.includes(p.id))
  const toggle = (id: string) => setPicked((x) => (x.includes(id) ? x.filter((i) => i !== id) : [...x, id]))
  const busy = saveMut.isPending

  const pin = (ids: string[]) => { t.save({ pinned: [...ids, ...t.pinned.filter((i) => !ids.includes(i))], excluded: t.excluded.filter((i) => !ids.includes(i)) }); setPicked([]) }
  const unpin = (id: string) => t.save({ pinned: t.pinned.filter((i) => i !== id), excluded: t.excluded })
  const hide = (ids: string[]) => { t.save({ pinned: t.pinned.filter((i) => !ids.includes(i)), excluded: Array.from(new Set([...t.excluded, ...ids])) }); setPicked([]) }
  const restore = (id: string) => t.save({ pinned: t.pinned, excluded: t.excluded.filter((i) => i !== id) })
  const add = (ids: string[]) => t.save({ pinned: [...t.pinned, ...ids.filter((i) => !t.pinned.includes(i))], excluded: t.excluded.filter((i) => !ids.includes(i)) })
  const move = (id: string, dir: -1 | 1) => {
    const i = t.pinned.indexOf(id); const j = i + dir
    if (i < 0 || j < 0 || j >= t.pinned.length) return
    const next = [...t.pinned];[next[i], next[j]] = [next[j], next[i]]
    t.save({ pinned: next, excluded: t.excluded })
  }

  const unavailable = t.pinned.length - shown.filter((p) => t.pinned.includes(p.id)).length

  const viewTabs = (
    <div className="flex gap-1 border-b">
      {([["products", `Products (${shown.length})`], ["rules", t.rules ? "Rules · on" : "Rules"], ["deal", t.campaignId ? "Deal · on" : "Deal"]] as const).map(([k, label]) => (
        <button key={k} type="button" onClick={() => setView(k)}
          className={cn("-mb-px border-b-2 px-3 py-2 text-sm font-medium", view === k ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>{label}</button>
      ))}
    </div>
  )

  if (view === "deal") {
    return (
      <div className="space-y-3">
        {viewTabs}
        <DealPanel campaignId={t.campaignId} deal={t.deal} busy={busy} onChange={t.saveDeal} />
      </div>
    )
  }

  if (view === "rules") {
    return (
      <div className="space-y-3">
        {viewTabs}
        <RulesPanel key={JSON.stringify(t.rules ?? null)} rules={t.rules} limit={t.previewLimit} excludeIds={t.excluded} busy={busy} onSave={t.saveRules} />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {viewTabs}
      {t.note && <p className="text-xs text-muted-foreground">{t.note}</p>}
      {unavailable > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {unavailable} pinned product{unavailable > 1 ? "s are" : " is"} out of stock, inactive or not sold in the selected store, so the app hides {unavailable > 1 ? "them" : "it"}.
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => setAdding(true)} disabled={busy}><Plus className="mr-1 h-4 w-4" />Add products</Button>
        {t.limit !== null && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            Show up to
            <Button variant="outline" size="icon" className="h-7 w-7" disabled={busy || t.limit <= 1} onClick={() => t.save({ pinned: t.pinned, excluded: t.excluded, limit: t.limit! - 1 })}>−</Button>
            <span className="w-6 text-center tabular-nums text-foreground">{t.limit}</span>
            <Button variant="outline" size="icon" className="h-7 w-7" disabled={busy || t.limit >= MAX_LIMIT} onClick={() => t.save({ pinned: t.pinned, excluded: t.excluded, limit: t.limit! + 1 })}>+</Button>
          </div>
        )}
        <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground" title="After pinned, deal and rule products, fill the rest from this section's normal feed">
          <Checkbox checked={t.autoFill} disabled={busy} onCheckedChange={(v) => t.saveAutoFill(v === true)} />Fill the rest automatically
        </label>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{picked.length} selected</span>
          <Button size="sm" variant="outline" disabled={!picked.length || busy} onClick={() => pin(picked)}><Pin className="mr-1 h-3.5 w-3.5" />Pin</Button>
          <Button size="sm" variant="outline" disabled={!picked.length || busy} onClick={() => hide(picked)}><EyeOff className="mr-1 h-3.5 w-3.5" />Hide</Button>
        </div>
      </div>

      <div className="rounded-xl border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"><Checkbox checked={allOn} onCheckedChange={(v) => setPicked(v ? shown.map((p) => p.id) : [])} aria-label="Select all" /></TableHead>
              <TableHead className="w-8">#</TableHead>
              <TableHead>Product</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead>Source</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.length === 0 && <TableRow><TableCell colSpan={7} className="h-32 text-center text-sm text-muted-foreground">No products showing. Add products, or this section stays empty in the app.</TableCell></TableRow>}
            {shown.map((p, i) => {
              const isPinned = t.pinned.includes(p.id)
              const price = Number(p.sale_price ?? p.price)
              const mrp = Number(p.price)
              const off = p.sale_price != null && mrp > price ? Math.round((1 - price / mrp) * 100) : 0
              return (
                <TableRow key={p.id} data-state={picked.includes(p.id) ? "selected" : undefined}>
                  <TableCell><Checkbox checked={picked.includes(p.id)} onCheckedChange={() => toggle(p.id)} aria-label={`Select ${p.name}`} /></TableCell>
                  <TableCell className="text-xs tabular-nums text-muted-foreground">{i + 1}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
                        {p.images?.[0]
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={p.images[0]} alt="" className="h-full w-full object-cover" loading="lazy" />
                          : <ImageOff className="h-4 w-4 text-muted-foreground" />}
                      </div>
                      <div className="min-w-0"><p className="max-w-[220px] truncate text-sm font-medium">{p.name}</p><p className="truncate text-xs text-muted-foreground">{p.brand ?? p.category_name ?? ""}</p></div>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right text-sm tabular-nums">
                    {formatINR(price)}
                    {off > 0 && <span className="ml-1.5 rounded bg-rose-50 px-1 text-[11px] font-medium text-rose-600">{off}% OFF</span>}
                  </TableCell>
                  <TableCell className={cn("text-right text-sm tabular-nums", (p.stock_quantity ?? 1) <= 5 && "text-amber-600")}>{p.stock_quantity ?? "—"}</TableCell>
                  <TableCell><Badge variant={isPinned ? "default" : "outline"} className="text-[11px]">{isPinned ? "Pinned" : "Auto"}</Badge></TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-0.5">
                      {isPinned && <>
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Move up" disabled={busy || t.pinned.indexOf(p.id) === 0} onClick={() => move(p.id, -1)}><ArrowUp className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Move down" disabled={busy || t.pinned.indexOf(p.id) === t.pinned.length - 1} onClick={() => move(p.id, 1)}><ArrowDown className="h-3.5 w-3.5" /></Button>
                      </>}
                      <Button variant="ghost" size="icon" className="h-7 w-7" title={isPinned ? "Unpin" : "Pin to top"} disabled={busy} onClick={() => (isPinned ? unpin(p.id) : pin([p.id]))}>{isPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}</Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-600" title="Hide from this section" disabled={busy} onClick={() => hide([p.id])}><EyeOff className="h-3.5 w-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {t.excluded.length > 0 && (
        <div className="rounded-lg border bg-muted/30 px-3 py-2">
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Hidden from this section ({t.excluded.length})</p>
          <div className="flex flex-wrap gap-1.5">
            {t.excluded.map((id) => (
              <button key={id} type="button" disabled={busy} onClick={() => restore(id)} className="flex items-center gap-1 rounded-full border bg-white px-2.5 py-1 text-xs hover:bg-muted">
                <Undo2 className="h-3 w-3" />{hiddenNames[id] ?? id.slice(0, 8)}
              </button>
            ))}
          </div>
        </div>
      )}

      <AddProductsDialog open={adding} existingIds={t.pinned} onOpenChange={setAdding} onAdd={add} />
    </div>
  )
}

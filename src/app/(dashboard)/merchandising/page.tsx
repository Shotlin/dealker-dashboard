"use client"

/**
 * Deals & Merchandising — one place to see every section on a screen and control
 * which products it shows. Look & layout stay in Theme Builder; this page only
 * edits products (pin / hide / add / order). Reads the same resolver the app uses,
 * so the list here is exactly what shoppers see.
 */

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { AlertTriangle, ExternalLink, EyeOff, Layers } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { QueryErrorBlock } from "@/components/shared/query-error-block"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { SectionProductsEditor } from "@/components/merch/SectionProductsEditor"
import { DealsView } from "@/components/merch/DealsView"
import { DealStatusChip, dealTiming } from "@/components/merch/dealUi"
import { getSectionTypeMeta } from "@/components/builder/sectionTypesMeta"
import { useMerchSections } from "@/hooks/useMerchSections"
import { useThemeTabs } from "@/hooks/useThemeTabs"
import { cn } from "@/lib/utils"
import type { MerchSection, MerchStatus } from "@/services/merch-sections.service"

const STATUS_STYLE: Record<MerchStatus, { label: string; cls: string }> = {
  live: { label: "Live", cls: "bg-green-50 text-green-700" },
  empty: { label: "Empty", cls: "bg-red-50 text-red-700" },
  hidden: { label: "Hidden", cls: "bg-slate-100 text-slate-600" },
  static: { label: "Static", cls: "bg-slate-100 text-slate-500" },
}

const labelOf = (s: MerchSection) => {
  const c = s.config as { title?: string; heading?: string; label?: string }
  return c.title || c.heading || c.label || getSectionTypeMeta(s.section_type)?.label || s.section_type
}

export default function MerchandisingPage() {
  const tabsQ = useThemeTabs({ status: "active", audience: "B2C" })
  const tabs = useMemo(() => tabsQ.data ?? [], [tabsQ.data])
  const storeKeys = useMemo(() => Array.from(new Set(tabs.map((t) => t.store_key))), [tabs])
  const [storeKey, setStoreKey] = useState<string | null>(null)
  const [tabId, setTabId] = useState<string | null>(null)
  const [sectionId, setSectionId] = useState<string | null>(null)
  const [tabIdx, setTabIdx] = useState(0)
  const [view, setView] = useState<"sections" | "deals">("sections")

  const activeStore = storeKey ?? storeKeys.find((k) => k === "mobile") ?? storeKeys[0] ?? null
  const storeTabs = useMemo(() => tabs.filter((t) => t.store_key === activeStore), [tabs, activeStore])
  const activeTab = storeTabs.find((t) => t.id === tabId) ?? storeTabs.find((t) => t.key === "all") ?? storeTabs[0] ?? null

  const secQ = useMerchSections(activeTab?.id ?? null)
  const sections = useMemo(() => secQ.data?.sections ?? [], [secQ.data])
  const selected = sections.find((s) => s.id === sectionId) ?? sections.find((s) => s.status !== "static") ?? null
  useEffect(() => setTabIdx(0), [selected?.id])

  const issues = sections.filter((s) => s.status === "empty").length
  const hiddenTotal = selected
    ? selected.merch_binding && (selected.merch_binding as { exclude_ids?: string[] }).exclude_ids?.length || 0
    : 0
  const appTabs = selected && Array.isArray(selected.config.tabs) ? selected.config.tabs : []

  return (
    <div className="space-y-5">
      <PageHeader title="Deals & Merchandising" subtitle="See every section on a screen and control which products it shows. Look & layout stay in Theme Builder." />

      <div className="flex gap-1 border-b">
        {([["sections", "Sections"], ["deals", "Deals"]] as const).map(([k, label]) => (
          <button key={k} type="button" onClick={() => setView(k)}
            className={cn("-mb-px border-b-2 px-4 py-2 text-sm font-medium", view === k ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>{label}</button>
        ))}
      </div>

      {view === "deals" ? <DealsView /> : (
      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)] 2xl:grid-cols-[280px_minmax(0,1fr)_280px]">
        {/* LEFT — screens & sections */}
        <aside className="space-y-3 rounded-xl border bg-white p-3">
          <p className="text-sm font-semibold">Screens & sections</p>
          <div className="flex flex-wrap gap-1">
            {storeKeys.map((k) => (
              <button key={k} type="button" onClick={() => { setStoreKey(k); setTabId(null); setSectionId(null) }}
                className={cn("rounded-md border px-2.5 py-1 text-xs capitalize", k === activeStore ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
                {k.replace(/_/g, " ")}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1">
            {storeTabs.map((t) => (
              <button key={t.id} type="button" onClick={() => { setTabId(t.id); setSectionId(null) }}
                className={cn("rounded-full px-2.5 py-1 text-xs", t.id === activeTab?.id ? "bg-primary/10 font-semibold text-primary" : "bg-muted text-muted-foreground hover:text-foreground")}>
                {t.label}
              </button>
            ))}
          </div>

          {tabsQ.isError && <QueryErrorBlock error={tabsQ.error} onRetry={() => tabsQ.refetch()} />}
          {secQ.isError && <QueryErrorBlock error={secQ.error} onRetry={() => secQ.refetch()} />}
          {(tabsQ.isLoading || secQ.isLoading) && Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}

          <ul className="space-y-1">
            {sections.map((s) => {
              const st = STATUS_STYLE[s.status]
              const active = s.id === selected?.id
              const editable = s.status !== "static"
              return (
                <li key={s.id}>
                  <button type="button" disabled={!editable} onClick={() => setSectionId(s.id)}
                    className={cn("flex w-full items-center gap-2 rounded-lg border-l-2 px-2.5 py-2 text-left", active ? "border-primary bg-primary/5" : "border-transparent hover:bg-muted/60", !editable && "cursor-default opacity-60")}>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{labelOf(s)}</p>
                      <p className="text-xs text-muted-foreground">{editable ? `${s.product_count} product${s.product_count === 1 ? "" : "s"}` : getSectionTypeMeta(s.section_type)?.label ?? "Static"}</p>
                    </div>
                    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", st.cls)}>{st.label}</span>
                    {s.status === "empty" && <AlertTriangle className="h-3.5 w-3.5 text-red-500" />}
                  </button>
                </li>
              )
            })}
            {!secQ.isLoading && sections.length === 0 && <li className="p-4 text-center text-xs text-muted-foreground">No sections on this screen yet. Add them in Theme Builder.</li>}
          </ul>
          {sections.length > 0 && <p className="text-[11px] text-muted-foreground">{sections.length} sections{issues ? ` · ${issues} empty` : ""}</p>}
        </aside>

        {/* CENTER — editor */}
        <main className="min-w-0 space-y-3">
          {!selected ? (
            <div className="flex h-64 items-center justify-center rounded-xl border bg-white text-sm text-muted-foreground">Pick a section on the left.</div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-white px-4 py-3">
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-semibold">{labelOf(selected)}</h2>
                  <p className="text-xs text-muted-foreground">Look & layout are managed in Theme Builder. Products are managed here.</p>
                </div>
                <Badge variant="outline">{getSectionTypeMeta(selected.section_type)?.label ?? selected.section_type}</Badge>
                <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", STATUS_STYLE[selected.status].cls)}>{STATUS_STYLE[selected.status].label}</span>
                {selected.deal && <span className="flex items-center gap-1 text-xs text-muted-foreground">Deal: {selected.deal.name} <DealStatusChip status={selected.deal.status} /> {dealTiming(selected.deal)}</span>}
                <Link href="/theme-tabs" className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">Open Theme Builder <ExternalLink className="h-3 w-3" /></Link>
              </div>

              {appTabs.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {appTabs.map((t, i) => (
                    <button key={i} type="button" onClick={() => setTabIdx(i)}
                      className={cn("rounded-full border px-3 py-1 text-xs font-medium", i === tabIdx ? "border-primary bg-primary text-primary-foreground" : "bg-white text-muted-foreground hover:text-foreground")}>
                      {t.label || `Tab ${i + 1}`} <span className="opacity-70">({t.products?.length ?? 0})</span>
                    </button>
                  ))}
                </div>
              )}

              <SectionProductsEditor key={`${selected.id}-${tabIdx}`} section={selected} tabIdx={tabIdx} hiddenNames={secQ.data?.hidden_names ?? {}} />
            </>
          )}
        </main>

        {/* RIGHT — what the app shows */}
        <aside className="space-y-3 rounded-xl border bg-white p-3 lg:col-span-2 2xl:col-span-1">
          <p className="flex items-center gap-1.5 text-sm font-semibold"><Layers className="h-4 w-4" />As shown in the app</p>
          {selected ? (
            <>
              <p className="text-xs text-muted-foreground">First products in order, exactly as shoppers get them.</p>
              <ol className="space-y-2">
                {((appTabs.length ? appTabs[Math.min(tabIdx, appTabs.length - 1)]?.products : selected.products) ?? []).slice(0, 6).map((p, i) => (
                  <li key={p.id} className="flex items-center gap-2 rounded-lg border p-2">
                    <span className="w-4 text-xs tabular-nums text-muted-foreground">{i + 1}</span>
                    <div className="h-9 w-9 shrink-0 overflow-hidden rounded-md border bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {p.images?.[0] && <img src={p.images[0]} alt="" className="h-full w-full object-cover" loading="lazy" />}
                    </div>
                    <div className="min-w-0"><p className="truncate text-xs font-medium">{p.name}</p><p className="text-xs tabular-nums text-muted-foreground">₹{Number(p.sale_price ?? p.price).toLocaleString("en-IN")}</p></div>
                  </li>
                ))}
              </ol>
              {hiddenTotal > 0 && <p className="flex items-center gap-1 text-xs text-muted-foreground"><EyeOff className="h-3 w-3" />{hiddenTotal} hidden</p>}
              <p className="rounded-lg bg-muted/50 p-2 text-[11px] text-muted-foreground">Changes save instantly and reach the app within about a minute. Rule-based filling, deals with timers and vendor entries are coming next.</p>
            </>
          ) : <p className="text-xs text-muted-foreground">Select a section.</p>}
        </aside>
      </div>
      )}
    </div>
  )
}

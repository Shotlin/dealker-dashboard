"use client"

/** Ad pricing rules & placement — platform only. Changes apply to new clicks immediately. */

import { useEffect, useState } from "react"
import Link from "next/link"
import { PageHeader } from "@/components/shared/PageHeader"
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton"
import { QueryErrorBlock } from "@/components/shared/query-error-block"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { useAdSettings, useUpdateAdSettings } from "@/hooks/useAds"
import type { AdSettings } from "@/services/ads.service"

function Num({ label, hint, value, onChange, step = "1" }: { label: string; hint?: string; value: number; onChange: (n: number) => void; step?: string }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <Input type="number" step={step} value={Number.isNaN(value) ? "" : value} onChange={(e) => onChange(Number(e.target.value))} className="h-9 text-sm" />
      {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
    </label>
  )
}

export default function AdSettingsPage() {
  const q = useAdSettings()
  const save = useUpdateAdSettings()
  const [d, setD] = useState<AdSettings | null>(null)
  useEffect(() => { if (q.data) setD(q.data) }, [q.data])

  if (q.isError) return <QueryErrorBlock error={q.error} onRetry={() => q.refetch()} />
  if (q.isLoading || !d) return <LoadingSkeleton variant="stat-card" count={2} />
  const set = <K extends keyof AdSettings>(k: K, v: AdSettings[K]) => setD({ ...d, [k]: v })

  return (
    <div className="space-y-6">
      <PageHeader title="Ad pricing rules" subtitle="What vendors pay, how many ad slots appear, and the safety limits. Running campaigns pick up changes immediately.">
        <Button asChild variant="outline" size="sm"><Link href="/ads">Back to ads</Link></Button>
      </PageHeader>

      <section className="space-y-4 rounded-xl border bg-card p-4" aria-labelledby="g">
        <div className="flex items-center justify-between">
          <div>
            <h2 id="g" className="text-sm font-semibold">Sponsored ads are {d.enabled ? "ON" : "OFF"}</h2>
            <p className="text-xs text-muted-foreground">Kill-switch: when off, no ads are shown and no clicks are charged. Campaigns and balances are kept.</p>
          </div>
          <Switch checked={d.enabled} onCheckedChange={(v) => set("enabled", v)} aria-label="Ads enabled" />
        </div>
        <div className="flex items-center justify-between border-t pt-4">
          <div>
            <h2 className="text-sm font-semibold">Review new vendor campaigns before they go live</h2>
            <p className="text-xs text-muted-foreground">Recommended — protects shoppers from misleading keywords and products.</p>
          </div>
          <Switch checked={d.campaigns_require_approval} onCheckedChange={(v) => set("campaigns_require_approval", v)} aria-label="Require approval" />
        </div>
      </section>

      <section className="rounded-xl border bg-card p-4" aria-labelledby="p">
        <h2 id="p" className="mb-3 text-sm font-semibold">Pricing</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Num label="Minimum cost per click (₹)" step="0.5" value={d.min_cpc} onChange={(v) => set("min_cpc", v)} hint="Floor price — also what a lone advertiser pays." />
          <Num label="Maximum bid (₹)" step="1" value={d.max_cpc} onChange={(v) => set("max_cpc", v)} hint="Highest bid a vendor may set." />
          <Num label="GST on ad charges (%)" step="0.5" value={d.gst_pct} onChange={(v) => set("gst_pct", v)} hint="Added to each click charge." />
          <Num label="Minimum daily budget (₹)" value={d.min_daily_budget} onChange={(v) => set("min_daily_budget", v)} />
          <Num label="Minimum top-up (₹)" value={d.min_topup} onChange={(v) => set("min_topup", v)} />
          <Num label="Maximum top-up (₹)" value={d.max_topup} onChange={(v) => set("max_topup", v)} />
          <Num label="Low-balance warning (₹)" value={d.low_balance_threshold} onChange={(v) => set("low_balance_threshold", v)} />
        </div>
      </section>

      <section className="rounded-xl border bg-card p-4" aria-labelledby="pl">
        <h2 id="pl" className="mb-3 text-sm font-semibold">Placement &amp; quality</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Num label="Sponsored slots per page" value={d.slots_per_page} onChange={(v) => set("slots_per_page", v)} hint="0 hides all ads." />
          <Num label="First ad position" value={d.first_slot_position} onChange={(v) => set("first_slot_position", v)} hint="0 = very first result." />
          <Num label="Ad spacing (every N results)" value={d.slot_spacing} onChange={(v) => set("slot_spacing", v)} />
          <Num label="Max ads per vendor per page" value={d.max_ads_per_vendor_per_page} onChange={(v) => set("max_ads_per_vendor_per_page", v)} hint="Keeps one seller from filling the page." />
          <Num label="Minimum quality score (0–1)" step="0.05" value={d.min_quality_score} onChange={(v) => set("min_quality_score", v)} hint="Below this an ad is never shown, whatever the bid." />
          <Num label="Attribution window (days)" value={d.attribution_window_days} onChange={(v) => set("attribution_window_days", v)} hint="Orders after a click count as ad sales." />
        </div>
      </section>

      <section className="rounded-xl border bg-card p-4" aria-labelledby="s">
        <h2 id="s" className="mb-3 text-sm font-semibold">Limits &amp; fraud protection</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Num label="Free repeat-click window (min)" value={d.click_dedupe_minutes} onChange={(v) => set("click_dedupe_minutes", v)} hint="Same shopper, same ad: charged once per window." />
          <Num label="Ad link validity (min)" value={d.impression_token_ttl_minutes} onChange={(v) => set("impression_token_ttl_minutes", v)} />
          <Num label="Campaigns per vendor" value={d.max_campaigns_per_vendor} onChange={(v) => set("max_campaigns_per_vendor", v)} />
          <Num label="Products per campaign" value={d.max_products_per_campaign} onChange={(v) => set("max_products_per_campaign", v)} />
          <Num label="Keywords per campaign" value={d.max_keywords_per_campaign} onChange={(v) => set("max_keywords_per_campaign", v)} />
        </div>
      </section>

      <div className="flex gap-2">
        <Button disabled={save.isPending} onClick={() => save.mutate(d)}>Save rules</Button>
        <Button variant="outline" onClick={() => q.data && setD(q.data)}>Reset</Button>
      </div>
    </div>
  )
}

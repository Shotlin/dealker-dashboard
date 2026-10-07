"use client"

/** Auction rules (global defaults + compliance switches) and bidder risk. */

import { useEffect, useState } from "react"
import Link from "next/link"
import { Plus, Trash2 } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { DataList } from "@/components/shared/data-list"
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton"
import { QueryErrorBlock } from "@/components/shared/query-error-block"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useAuctionRisk, useAuctionSettings, useBidderBlock, useUpdateAuctionSettings } from "@/hooks/useAuctions"
import type { AuctionSettings } from "@/services/auctions.service"

function Num({ label, hint, value, onChange, step = "1" }: { label: string; hint?: string; value: number; onChange: (n: number) => void; step?: string }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <Input type="number" step={step} value={Number.isNaN(value) ? "" : value} onChange={(e) => onChange(Number(e.target.value))} className="h-9 text-sm" />
      {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
    </label>
  )
}

export default function AuctionSettingsPage() {
  const settingsQ = useAuctionSettings()
  const risk = useAuctionRisk()
  const save = useUpdateAuctionSettings()
  const block = useBidderBlock()
  const [d, setD] = useState<AuctionSettings | null>(null)
  const [states, setStates] = useState("")

  useEffect(() => {
    if (settingsQ.data) { setD(settingsQ.data); setStates((settingsQ.data.blocked_states ?? []).join(", ")) }
  }, [settingsQ.data])

  if (settingsQ.isLoading || !d) return <LoadingSkeleton variant="stat-card" count={2} />
  if (settingsQ.isError) return <QueryErrorBlock error={settingsQ.error} onRetry={() => settingsQ.refetch()} />
  const set = <K extends keyof AuctionSettings>(k: K, v: AuctionSettings[K]) => setD({ ...d, [k]: v })
  const tiers = d.increment_tiers

  return (
    <div className="space-y-6">
      <PageHeader title="Auction rules & risk" subtitle="Defaults for new auctions (running auctions keep the rules they started with), compliance switches and bidder risk.">
        <Button asChild variant="outline" size="sm"><Link href="/auctions">Back to auctions</Link></Button>
      </PageHeader>

      <section className="space-y-4 rounded-xl border bg-card p-4" aria-labelledby="g">
        <div className="flex items-center justify-between">
          <div>
            <h2 id="g" className="text-sm font-semibold">Auctions are {d.enabled ? "ON" : "OFF"}</h2>
            <p className="text-xs text-muted-foreground">Kill-switch: when off, nobody can register or bid. Running auctions can still be cancelled (fees refunded).</p>
          </div>
          <Switch checked={d.enabled} onCheckedChange={(v) => set("enabled", v)} aria-label="Auctions enabled" />
        </div>

        <h3 className="pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fees</h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Num label="Min fee (₹)" value={Number(d.min_registration_fee)} onChange={(n) => set("min_registration_fee", n)} />
          <Num label="Max fee (₹)" value={Number(d.max_registration_fee)} onChange={(n) => set("max_registration_fee", n)} />
          <Num label="Max fee as % of start price" hint="Keeps the fee a small deposit, not a stake" value={Number(d.fee_max_pct_of_start_price)} onChange={(n) => set("fee_max_pct_of_start_price", n)} />
          <Num label="Refund to losers (%)" hint="100 = fully refundable deposit" value={Number(d.loser_fee_refund_pct)} onChange={(n) => set("loser_fee_refund_pct", n)} />
          <Num label="Vendor share of forfeited fees (%)" value={Number(d.vendor_fee_share_pct)} onChange={(n) => set("vendor_fee_share_pct", n)} />
        </div>

        <h3 className="pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Timing</h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Num label="Anti-snipe window (sec)" value={d.anti_snipe_window_sec} onChange={(n) => set("anti_snipe_window_sec", n)} />
          <Num label="Extend by (sec)" value={d.anti_snipe_extend_sec} onChange={(n) => set("anti_snipe_extend_sec", n)} />
          <Num label="Max extensions" value={d.max_extensions} onChange={(n) => set("max_extensions", n)} />
          <Num label="Winner payment window (hours)" value={d.payment_window_hours} onChange={(n) => set("payment_window_hours", n)} />
          <Num label="Min duration (minutes)" value={d.min_duration_minutes} onChange={(n) => set("min_duration_minutes", n)} />
          <Num label="Max duration (days)" value={d.max_duration_days} onChange={(n) => set("max_duration_days", n)} />
          <Num label="Second-chance rounds" value={d.max_offer_rounds} onChange={(n) => set("max_offer_rounds", n)} />
        </div>

        <h3 className="pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Control & fraud</h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Num label="Strikes before auto-block" value={d.strike_limit} onChange={(n) => set("strike_limit", n)} />
          <Num label="Bids per minute per user" value={d.bid_rate_limit_per_minute} onChange={(n) => set("bid_rate_limit_per_minute", n)} />
          <Num label="Max live auctions per vendor" value={d.max_live_auctions_per_vendor} onChange={(n) => set("max_live_auctions_per_vendor", n)} />
          <div className="flex items-end gap-2 pb-1">
            <Switch checked={d.vendor_auctions_require_approval} onCheckedChange={(v) => set("vendor_auctions_require_approval", v)} aria-label="Vendor auctions need approval" />
            <span className="text-sm">Vendor auctions need approval</span>
          </div>
        </div>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Blocked states (comma-separated) — customers whose default address is here cannot join</span>
          <Input value={states} onChange={(e) => setStates(e.target.value)} placeholder="e.g. telangana, tamil nadu" className="h-9 text-sm" />
        </label>

        <h3 className="pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Bid step tiers (used when an auction has no fixed step)</h3>
        <div className="space-y-2">
          {tiers.map((t, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className="w-12 text-muted-foreground">from ₹</span>
              <Input type="number" className="h-8 w-28" disabled={i === 0} value={t.from} onChange={(e) => set("increment_tiers", tiers.map((x, j) => (j === i ? { ...x, from: Number(e.target.value) } : x)))} aria-label={`Tier ${i + 1} from`} />
              <span className="text-muted-foreground">step ₹</span>
              <Input type="number" className="h-8 w-24" value={t.inc} onChange={(e) => set("increment_tiers", tiers.map((x, j) => (j === i ? { ...x, inc: Number(e.target.value) } : x)))} aria-label={`Tier ${i + 1} step`} />
              {i > 0 && <Button size="icon" variant="ghost" aria-label="Remove tier" onClick={() => set("increment_tiers", tiers.filter((_, j) => j !== i))}><Trash2 /></Button>}
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={() => set("increment_tiers", [...tiers, { from: (tiers.at(-1)?.from ?? 0) + 10000, inc: tiers.at(-1)?.inc ?? 100 }])}><Plus /> Add tier</Button>
        </div>

        <h3 className="pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Consent shown at registration</h3>
        <Textarea rows={3} value={d.consent_text} onChange={(e) => set("consent_text", e.target.value)} />
        <p className="text-xs text-muted-foreground">Have counsel review the fee and no-refund wording before launch — see AUCTION_DESIGN.md §10.</p>

        <Button disabled={save.isPending} onClick={() => save.mutate({ ...d, blocked_states: states.split(",").map((s) => s.trim()).filter(Boolean) })}>
          {save.isPending ? "Saving…" : "Save rules"}
        </Button>
      </section>

      <section className="space-y-3" aria-labelledby="r">
        <h2 id="r" className="text-sm font-semibold">Bidder risk</h2>
        {risk.isLoading ? <LoadingSkeleton variant="table" /> : risk.isError ? <QueryErrorBlock error={risk.error} onRetry={() => risk.refetch()} /> : (
          <>
            <DataList rows={risk.data?.bidders ?? []} rowKey={(r) => r.user_id} emptyMessage="No strikes or blocked bidders." columns={[
              { id: "n", header: "Bidder", cell: (r) => <span className="text-sm">{r.name}<span className="block text-xs text-muted-foreground">{r.phone}</span></span> },
              { id: "s", header: "Strikes", cell: (r) => r.strikes },
              { id: "b", header: "Status", cell: (r) => r.is_blocked ? <span className="text-xs font-semibold text-red-600">Blocked{r.blocked_reason && ` — ${r.blocked_reason}`}</span> : <span className="text-xs">Active</span> },
              { id: "a", header: "", cell: (r) => <Button size="sm" variant="outline" disabled={block.isPending} onClick={() => block.mutate({ userId: r.user_id, block: !r.is_blocked, reason: "Blocked from risk page" })}>{r.is_blocked ? "Unblock" : "Block"}</Button> },
            ]} />
            <div className="grid gap-3 md:grid-cols-3">
              {[
                { t: "Shared IP across bidders", rows: (risk.data?.shared_ip ?? []).map((x) => ({ id: x.auction_id + x.ip, a: x.auction_id, text: `${x.auction_number}: ${x.bidders} bidders on ${x.ip}` })) },
                { t: "Two-bidder duels", rows: (risk.data?.duels ?? []).map((x) => ({ id: x.auction_id, a: x.auction_id, text: `${x.auction_number}: ${x.bid_count} bids between two people` })) },
                { t: "Bidder linked to seller", rows: (risk.data?.seller_linked ?? []).map((x) => ({ id: x.auction_id + x.bidder, a: x.auction_id, text: `${x.auction_number}: ${x.bidder}` })) },
              ].map((c) => (
                <div key={c.t} className="rounded-xl border bg-card p-3">
                  <h3 className="mb-1 text-xs font-semibold">{c.t} <span className="text-muted-foreground">({c.rows.length})</span></h3>
                  {c.rows.length === 0 ? <p className="text-xs text-muted-foreground">None in the last 30 days.</p> : (
                    <ul className="space-y-1 text-xs">{c.rows.map((r) => <li key={r.id}><Link className="underline" href={`/auctions/${r.a}`}>{r.text}</Link></li>)}</ul>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  )
}

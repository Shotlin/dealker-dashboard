"use client"

/**
 * Loyalty & Points — admin-configurable points program (spec §10/§11).
 * No tiers unless the backend implements them; this page renders only what
 * /admin/loyalty actually returns.
 */

import { useEffect, useState } from "react"
import { Sparkles, Clock, Wallet, TrendingUp } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { DataList } from "@/components/shared/data-list"
import { QueryErrorBlock } from "@/components/shared/query-error-block"
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton"
import { StatCard } from "@/components/dashboard/StatCard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { useLoyaltyCustomers, useLoyaltySettings, useLoyaltyStats, useUpdateLoyaltySettings } from "@/hooks/useMarketplace"
import { formatINR, formatShort } from "@/lib/utils"

function NumberField({ label, value, onChange, step = "1" }: { label: string; value: number | string; onChange: (v: number) => void; step?: string }) {
  const [text, setText] = useState(String(value ?? ""))
  useEffect(() => setText(String(value ?? "")), [value])
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <Input type="number" step={step} value={text} onChange={(e) => setText(e.target.value)} onBlur={() => onChange(Number(text))} className="h-9 text-sm" />
    </label>
  )
}

export default function LoyaltyPage() {
  const settingsQuery = useLoyaltySettings()
  const statsQuery = useLoyaltyStats()
  const customersQuery = useLoyaltyCustomers({ page: 1, limit: 20 })
  const save = useUpdateLoyaltySettings()

  const [draft, setDraft] = useState<Record<string, number>>({})

  if (settingsQuery.isLoading || statsQuery.isLoading) return <LoadingSkeleton variant="stat-card" />
  if (settingsQuery.isError || statsQuery.isError) {
    return <QueryErrorBlock error={settingsQuery.error ?? statsQuery.error} onRetry={() => { settingsQuery.refetch(); statsQuery.refetch() }} />
  }

  const settings = settingsQuery.data!
  const stats = statsQuery.data!
  const set = (key: string, value: number) => setDraft((d) => ({ ...d, [key]: value }))
  const value = (key: string, fallback: number) => draft[key] ?? Number((settings as unknown as Record<string, number>)?.[key] ?? fallback)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Loyalty & Points"
        subtitle="Points earning, capped redemption and ledger stats. Points and Wallet stay separate systems."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Active Points" value={formatShort(stats!.activePoints)} icon={<Sparkles className="h-4 w-4 text-brand-500" />} />
        <StatCard label="Pending Points" value={formatShort(stats!.pendingPoints)} icon={<Clock className="h-4 w-4 text-amber-500" />} />
        <StatCard label="Points Liability" value={formatINR(stats!.pointsLiability)} icon={<Wallet className="h-4 w-4 text-blue-500" />} />
        <StatCard label="Redeemed" value={formatShort(stats!.redeemedPoints)} icon={<TrendingUp className="h-4 w-4 text-green-500" />} />
      </div>

      <div className="rounded-lg border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Program Settings</h3>
            <p className="text-xs text-muted-foreground">
              Customers may redeem from 0 up to the cap — the backend re-clamps every request.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Enabled</span>
            <Switch
              checked={settings.enabled}
              onCheckedChange={(v) => save.mutate({ enabled: v })}
              disabled={save.isPending}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <NumberField label="Points earned per ₹1 spent" value={value("points_per_rupee", 0)} step="0.001" onChange={(v) => set("points_per_rupee", v)} />
          <NumberField label="₹ value per point" value={value("point_value", 1)} step="0.01" onChange={(v) => set("point_value", v)} />
          <NumberField label="Max redemption (% of order)" value={value("max_redemption_pct", 20)} step="0.01" onChange={(v) => set("max_redemption_pct", v)} />
          <NumberField label="Min points to redeem" value={value("min_redeemable_points", 50)} onChange={(v) => set("min_redeemable_points", v)} />
          <NumberField label="Max points per order" value={value("max_points_per_order", 0)} onChange={(v) => set("max_points_per_order", v || 0)} />
          <NumberField label="Return-window hold (days)" value={value("return_window_hold_days", 7)} onChange={(v) => set("return_window_hold_days", v)} />
          <NumberField label="Points expiry (days)" value={value("expiry_days", 0)} onChange={(v) => set("expiry_days", v || 0)} />
          <NumberField label="Min order value to earn" value={value("min_order_amount_to_earn", 0)} step="0.01" onChange={(v) => set("min_order_amount_to_earn", v)} />
        </div>

        <Button
          size="sm"
          disabled={save.isPending || Object.keys(draft).length === 0}
          onClick={() =>
            save.mutate({
              points_per_rupee: value("points_per_rupee", 0),
              point_value: value("point_value", 1),
              max_redemption_pct: value("max_redemption_pct", 20),
              min_redeemable_points: value("min_redeemable_points", 50),
              max_points_per_order: value("max_points_per_order", 0) || null,
              return_window_hold_days: value("return_window_hold_days", 7),
              expiry_days: value("expiry_days", 0) || null,
              min_order_amount_to_earn: value("min_order_amount_to_earn", 0),
            })
          }
        >
          {save.isPending ? "Saving…" : "Save settings"}
        </Button>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-2">Customer Points</h3>
        {customersQuery.isLoading ? (
          <LoadingSkeleton variant="table" />
        ) : (
          <DataList<Record<string, unknown>>
            rows={customersQuery.data?.data ?? []}
            rowKey={(r) => String(r.customer_id)}
            emptyMessage="No customers with loyalty accounts yet."
            columns={[
              { id: "name", header: "Customer", cell: (r) => <span className="text-sm font-medium">{String(r.name ?? "")}</span> },
              { id: "phone", header: "Phone", cell: (r) => <span className="text-xs text-muted-foreground">{String(r.phone ?? "")}</span> },
              { id: "available", header: "Available", cell: (r) => <span className="text-sm font-medium">{Number(r.available)}</span> },
              { id: "pending", header: "Pending", cell: (r) => <span className="text-sm">{Number(r.pending)}</span> },
              { id: "redeemed", header: "Redeemed", cell: (r) => <span className="text-sm">{Number(r.redeemed)}</span> },
              {
                id: "last",
                header: "Last Activity",
                cell: (r) => <span className="text-xs text-muted-foreground">{r.last_activity ? new Date(String(r.last_activity)).toLocaleDateString() : "—"}</span>,
              },
            ]}
          />
        )}
      </div>
    </div>
  )
}

"use client"

/**
 * Referral Program — settings + attribution ledger (spec §13). Rewards are
 * never granted before the configured qualification event; the table shows
 * the real status machine (REGISTERED → ORDER_PLACED → QUALIFIED → REWARDED).
 */

import { useEffect, useState } from "react"
import { PageHeader } from "@/components/shared/PageHeader"
import { DataList } from "@/components/shared/data-list"
import { QueryErrorBlock } from "@/components/shared/query-error-block"
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useReferrals, useReferralSettings, useUpdateReferralSettings } from "@/hooks/useMarketplace"

function statusVariant(status: string) {
  if (["REWARDED"].includes(status)) return "secondary" as const
  if (["REJECTED", "REVERSED"].includes(status)) return "destructive" as const
  if (["QUALIFIED"].includes(status)) return "default" as const
  return "outline" as const
}

export default function ReferralsPage() {
  const settingsQuery = useReferralSettings()
  const listQuery = useReferrals({ page: 1, limit: 20 })
  const save = useUpdateReferralSettings()

  const [draft, setDraft] = useState<Record<string, string>>({})

  if (settingsQuery.isLoading) return <LoadingSkeleton variant="stat-card" />
  if (settingsQuery.isError) return <QueryErrorBlock error={settingsQuery.error} onRetry={() => settingsQuery.refetch()} />

  const s = settingsQuery.data!
  const field = (key: string, fallback: string) => draft[key] ?? String((s as unknown as Record<string, unknown>)[key] ?? fallback)
  const setField = (key: string, v: string) => setDraft((d) => ({ ...d, [key]: v }))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Referral Program"
        subtitle="Codes, qualification rules and reward grants. One attribution per new account, self-referral blocked."
      />

      <div className="rounded-lg border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Program Settings</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Enabled</span>
            <Switch checked={s.enabled} onCheckedChange={(v) => save.mutate({ enabled: v })} disabled={save.isPending} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="block space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Referrer reward type</span>
            <Select value={field("referrer_reward_type", "WALLET_CREDIT")} onValueChange={(v) => setField("referrer_reward_type", v)}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["WALLET_CREDIT", "POINTS", "COUPON"].map((t) => (
                  <SelectItem key={t} value={t}>{t.replaceAll("_", " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Referrer reward amount</span>
            <Input value={field("referrer_reward_amount", "100")} onChange={(e) => setField("referrer_reward_amount", e.target.value)} className="h-9 text-sm" />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Referee reward amount</span>
            <Input value={field("referee_reward_amount", "50")} onChange={(e) => setField("referee_reward_amount", e.target.value)} className="h-9 text-sm" />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Minimum first-order value (₹)</span>
            <Input value={field("min_first_order_value", "199")} onChange={(e) => setField("min_first_order_value", e.target.value)} className="h-9 text-sm" />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Qualification event</span>
            <Select value={field("qualification_event", "ORDER_DELIVERED")} onValueChange={(v) => setField("qualification_event", v)}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["ORDER_PLACED", "PAYMENT_CONFIRMED", "ORDER_DELIVERED"].map((t) => (
                  <SelectItem key={t} value={t}>{t.replaceAll("_", " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Max referrals per month</span>
            <Input value={field("max_referrals_per_month", "")} placeholder="No cap" onChange={(e) => setField("max_referrals_per_month", e.target.value)} className="h-9 text-sm" />
          </label>
        </div>

        <Button
          size="sm"
          disabled={save.isPending || Object.keys(draft).length === 0}
          onClick={() =>
            save.mutate({
              referrer_reward_type: field("referrer_reward_type", "WALLET_CREDIT"),
              referrer_reward_amount: Number(field("referrer_reward_amount", "100")),
              referee_reward_amount: Number(field("referee_reward_amount", "50")),
              referee_reward_type: s.referee_reward_type,
              min_first_order_value: Number(field("min_first_order_value", "199")),
              qualification_event: field("qualification_event", "ORDER_DELIVERED"),
              max_referrals_per_month: field("max_referrals_per_month", "") ? Number(field("max_referrals_per_month", "")) : null,
            })
          }
        >
          {save.isPending ? "Saving…" : "Save settings"}
        </Button>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-2">Referrals</h3>
        {listQuery.isLoading ? (
          <LoadingSkeleton variant="table" />
        ) : listQuery.isError ? (
          <QueryErrorBlock error={listQuery.error} onRetry={() => listQuery.refetch()} />
        ) : (
          <DataList
            rows={listQuery.data?.data ?? []}
            rowKey={(r) => r.id}
            emptyMessage="No referrals yet."
            columns={[
              { id: "referrer", header: "Referrer", cell: (r) => <span className="text-sm font-medium">{r.referrer_name}</span> },
              { id: "referred", header: "Referred Customer", cell: (r) => <span className="text-sm">{r.referred_name}</span> },
              { id: "order", header: "Qualifying Order", cell: (r) => <span className="text-xs text-muted-foreground">{r.order_number ?? "—"}</span> },
              { id: "status", header: "Status", cell: (r) => <Badge variant={statusVariant(r.status)}>{r.status}</Badge> },
              { id: "date", header: "Registered", cell: (r) => <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span> },
            ]}
          />
        )}
      </div>
    </div>
  )
}

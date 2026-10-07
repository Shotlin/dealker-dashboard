"use client"

/**
 * Shipping Providers — Shiprocket / Blue Dart / Porter settings + routing
 * rules (spec §20/§45). Credentials are encrypted server-side; this page
 * only toggles providers and manages routing rules. Shiprocket credentials
 * themselves stay on the dedicated Shiprocket settings page.
 */

import { useEffect, useState } from "react"
import { PageHeader } from "@/components/shared/PageHeader"
import { QueryErrorBlock } from "@/components/shared/query-error-block"
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { useSaveShippingRule, useShippingProviders, useShippingRules, useUpdateShippingProvider } from "@/hooks/useMarketplace"

export default function ShippingSettingsPage() {
  const providersQuery = useShippingProviders()
  const rulesQuery = useShippingRules()
  const updateProvider = useUpdateShippingProvider()
  const saveRule = useSaveShippingRule()

  const [rule, setRule] = useState({ name: "", pickup_pincode_prefix: "", delivery_pincode_prefix: "", preferred_provider: "SHIPROCKET", fallback_provider: "BLUEDART" })

  if (providersQuery.isLoading) return <LoadingSkeleton variant="stat-card" />
  if (providersQuery.isError) return <QueryErrorBlock error={providersQuery.error} onRetry={() => providersQuery.refetch()} />

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shipping Providers"
        subtitle="Local delivery via Porter where eligible; national orders fall back through Shiprocket/Blue Dart. A route never fails because one provider is down."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {providersQuery.data?.map((p) => (
          <div key={p.provider} className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">{p.provider}</h3>
                <p className="text-xs text-muted-foreground">
                  {p.configured ? "Credentials configured" : "Credentials pending"}
                  {" · "}{p.mode}
                </p>
              </div>
              <Switch
                checked={p.enabled}
                onCheckedChange={(v) => updateProvider.mutate({ provider: p.provider, enabled: v })}
                disabled={updateProvider.isPending}
              />
            </div>
            {p.last_test_status && (
              <Badge variant={p.last_test_status === "SUCCESS" ? "secondary" : "destructive"}>
                Last test: {p.last_test_status}
              </Badge>
            )}
            {p.provider === "SHIPROCKET" && (
              <p className="text-xs text-muted-foreground">
                API credentials are managed under the dedicated Shiprocket settings screen.
              </p>
            )}
          </div>
        ))}
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-2">Routing Rules</h3>
        <div className="rounded-lg border p-4 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <Input placeholder="Rule name" value={rule.name} onChange={(e) => setRule({ ...rule, name: e.target.value })} className="h-9 text-xs" />
            <Input placeholder="Pickup PIN prefix" value={rule.pickup_pincode_prefix} onChange={(e) => setRule({ ...rule, pickup_pincode_prefix: e.target.value })} className="h-9 text-xs" />
            <Input placeholder="Delivery PIN prefix" value={rule.delivery_pincode_prefix} onChange={(e) => setRule({ ...rule, delivery_pincode_prefix: e.target.value })} className="h-9 text-xs" />
            <Input placeholder="Preferred provider" value={rule.preferred_provider} onChange={(e) => setRule({ ...rule, preferred_provider: e.target.value.toUpperCase() })} className="h-9 text-xs" />
            <Input placeholder="Fallback provider" value={rule.fallback_provider} onChange={(e) => setRule({ ...rule, fallback_provider: e.target.value.toUpperCase() })} className="h-9 text-xs" />
          </div>
          <Button
            size="sm"
            disabled={!rule.name || saveRule.isPending}
            onClick={() => {
              saveRule.mutate(
                { ...rule, pickup_pincode_prefix: rule.pickup_pincode_prefix || null, delivery_pincode_prefix: rule.delivery_pincode_prefix || null },
                { onSuccess: () => setRule({ ...rule, name: "", pickup_pincode_prefix: "", delivery_pincode_prefix: "" }) }
              )
            }}
          >
            {saveRule.isPending ? "Saving…" : "Add rule"}
          </Button>
        </div>

        {rulesQuery.isLoading ? (
          <LoadingSkeleton variant="table" />
        ) : (
          <div className="mt-3 space-y-2">
            {(rulesQuery.data ?? []).map((r) => (
              <div key={r.id} className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm">
                <Badge variant={r.is_active ? "secondary" : "outline"}>P{r.priority}</Badge>
                <span className="font-medium">{r.name}</span>
                <span className="text-xs text-muted-foreground">
                  {r.pickup_pincode_prefix ?? "*"} → {r.delivery_pincode_prefix ?? "*"} : {r.preferred_provider} (fallback {r.fallback_provider})
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

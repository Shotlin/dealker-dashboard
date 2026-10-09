"use client"

/** Automatic QC: which rules run, which are required, their weight and limits. */

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton"
import { QueryErrorBlock } from "@/components/shared/query-error-block"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useQcConfig, useSaveQcConfig } from "@/hooks/useQc"
import type { QcRule, QcSettings } from "@/services/qc.service"

/** Editable limits per rule (numbers only; keyword lists are edited as text). */
const PARAM_FIELDS: Record<string, Array<{ key: string; label: string; kind: "number" | "list" | "bool" }>> = {
  IMEI: [{ key: "categoryKeywords", label: "Applies to categories containing", kind: "list" }],
  IMAGES: [{ key: "minImages", label: "Minimum photos", kind: "number" }],
  INVOICE: [{ key: "requireVerified", label: "Must be verified by an admin", kind: "bool" }, { key: "skipForNew", label: "Skip for new items", kind: "bool" }],
  CONDITION: [{ key: "minNoteLength", label: "Minimum note length (characters)", kind: "number" }],
  PRICE_RANGE: [{ key: "minPctOfMrp", label: "Lowest % of MRP", kind: "number" }, { key: "maxPctOfMrp", label: "Highest % of MRP", kind: "number" }],
  REQUIRED_DOCUMENTS: [{ key: "requireInvoice", label: "Invoice needed", kind: "bool" }, { key: "requireWarranty", label: "Warranty details needed", kind: "bool" }],
  SERIAL_NUMBER: [{ key: "minLength", label: "Minimum length", kind: "number" }],
}

export default function QcSettingsPage() {
  const cfg = useQcConfig()
  const save = useSaveQcConfig()
  const [settings, setSettings] = useState<QcSettings | null>(null)
  const [rules, setRules] = useState<QcRule[]>([])

  useEffect(() => {
    if (cfg.data) { setSettings(cfg.data.settings); setRules(cfg.data.rules) }
  }, [cfg.data])

  if (cfg.isLoading) return <LoadingSkeleton variant="table" />
  if (cfg.isError || !settings) return <QueryErrorBlock error={cfg.error} onRetry={() => cfg.refetch()} />

  const patch = (key: string, p: Partial<QcRule>) => setRules((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)))
  const setParam = (rule: QcRule, k: string, v: unknown) => patch(rule.key, { params: { ...rule.params, [k]: v } })
  const thresholdOk = Number.isInteger(settings.passThreshold) && settings.passThreshold >= 1 && settings.passThreshold <= 100

  return (
    <div className="space-y-6">
      <PageHeader title="Automatic QC rules" subtitle="A product passes when no required rule fails and its score reaches the pass mark.">
        <Button size="sm" variant="outline" asChild><Link href="/qc"><ArrowLeft className="mr-1.5 h-4 w-4" />Back to QC</Link></Button>
        <Button size="sm" disabled={!thresholdOk || save.isPending}
          onClick={() => save.mutate({
            settings,
            rules: rules.map((r) => ({ key: r.key, enabled: r.enabled, required: r.required, weight: Number(r.weight), params: r.params })),
          })}>
          {save.isPending ? "Saving…" : "Save changes"}
        </Button>
      </PageHeader>

      <div className="grid gap-3 rounded-xl border p-4 md:grid-cols-3">
        <label className="flex items-start justify-between gap-3 text-sm">
          <span><span className="font-medium">Run automatically</span><br /><span className="text-xs text-muted-foreground">When a listing or its invoice changes. Never overwrites a manual decision.</span></span>
          <Switch checked={settings.autoQcEnabled} onCheckedChange={(v) => setSettings({ ...settings, autoQcEnabled: v })} />
        </label>
        <div className="space-y-1">
          <Label className="text-sm font-medium">Pass mark (%)</Label>
          <Input className="h-9 w-28" inputMode="numeric" value={settings.passThreshold}
            onChange={(e) => setSettings({ ...settings, passThreshold: Number(e.target.value) })} />
          {!thresholdOk && <p className="text-xs text-red-600">Enter a whole number from 1 to 100</p>}
        </div>
        <label className="flex items-start justify-between gap-3 text-sm">
          <span><span className="font-medium">QC must pass before approval</span><br /><span className="text-xs text-muted-foreground">Listings can only be approved once QC has passed.</span></span>
          <Switch checked={settings.requirePassToPublish} onCheckedChange={(v) => setSettings({ ...settings, requirePassToPublish: v })} />
        </label>
      </div>

      <div className="space-y-3">
        {rules.map((r) => (
          <div key={r.key} className="rounded-xl border p-4" data-testid={`rule-${r.key}`}>
            <div className="flex flex-wrap items-start gap-4">
              <div className="min-w-[220px] flex-1">
                <p className="text-sm font-semibold">{r.label}</p>
                <p className="text-xs text-muted-foreground">{r.description}</p>
              </div>
              <label className="flex items-center gap-2 text-xs">Enabled<Switch checked={r.enabled} onCheckedChange={(v) => patch(r.key, { enabled: v })} /></label>
              <label className="flex items-center gap-2 text-xs">Required<Switch checked={r.required} onCheckedChange={(v) => patch(r.key, { required: v })} /></label>
              <div className="flex items-center gap-2 text-xs">
                Weight
                <Input className="h-8 w-16" inputMode="numeric" value={r.weight}
                  onChange={(e) => patch(r.key, { weight: Number(e.target.value) })} />
              </div>
            </div>
            {r.enabled && (PARAM_FIELDS[r.key] ?? []).length > 0 && (
              <div className="mt-3 grid gap-3 border-t pt-3 md:grid-cols-3">
                {PARAM_FIELDS[r.key].map((f) => (
                  <div key={f.key} className="space-y-1">
                    <Label className="text-xs">{f.label}</Label>
                    {f.kind === "bool" ? (
                      <Switch checked={r.params[f.key] !== false && Boolean(r.params[f.key] ?? true)} onCheckedChange={(v) => setParam(r, f.key, v)} />
                    ) : f.kind === "list" ? (
                      <Input className="h-8" value={((r.params[f.key] as string[]) ?? []).join(", ")}
                        onChange={(e) => setParam(r, f.key, e.target.value.split(",").map((x) => x.trim()).filter(Boolean))} />
                    ) : (
                      <Input className="h-8 w-28" inputMode="decimal" value={String(r.params[f.key] ?? "")}
                        onChange={(e) => setParam(r, f.key, Number(e.target.value))} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

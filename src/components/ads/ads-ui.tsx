"use client"

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { useMarketplaceVendors } from "@/hooks/useMarketplace"
import { useAuthStore } from "@/store/auth.store"
import { cn, formatINR } from "@/lib/utils"
import type { CampaignStatus, DailyPoint } from "@/services/ads.service"

/** Ad prices are in paise-precision rupees (₹2.35 CPC), so unlike `formatINR` this keeps decimals. */
export const rupees = (n: number | null | undefined, digits = 2) =>
  n == null ? "—" : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n)

export const pct = (n: number | null | undefined, digits = 2) => (n == null ? "—" : `${(n * 100).toFixed(digits)}%`)
export const num = (n: number | null | undefined) => (n == null ? "—" : new Intl.NumberFormat("en-IN").format(n))
export const dateShort = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"
export const dateTime = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"

export const STATUS_META: Record<CampaignStatus, { label: string; className: string }> = {
  DRAFT: { label: "Draft", className: "border-slate-300 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200" },
  PENDING_REVIEW: { label: "In review", className: "border-amber-300 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200" },
  ACTIVE: { label: "Running", className: "border-green-300 bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200" },
  PAUSED: { label: "Paused", className: "border-orange-300 bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200" },
  REJECTED: { label: "Rejected", className: "border-red-300 bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200" },
  SUSPENDED: { label: "Suspended", className: "border-red-300 bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200" },
  ENDED: { label: "Ended", className: "border-slate-300 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" },
}

/** Colour is never the only signal: every badge carries text. */
export function CampaignStatusBadge({ status, className }: { status: CampaignStatus; className?: string }) {
  const m = STATUS_META[status] ?? STATUS_META.DRAFT
  return (
    <Badge variant="outline" className={cn("whitespace-nowrap", m.className, className)}>
      {status === "ACTIVE" && <span aria-hidden className="mr-1.5 h-1.5 w-1.5 animate-pulse rounded-full bg-green-600" />}
      {m.label}
    </Badge>
  )
}

export const PAUSE_REASONS: Record<string, string> = {
  OUT_OF_FUNDS: "Paused automatically — your ad wallet ran out of money. Add funds, then resume.",
  MANUAL: "Paused by you.",
}

export const selectClass =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"

/** Admin-only: pick which vendor a campaign / wallet belongs to. */
export function VendorPicker({ value, onChange, label = "Vendor", allowAll = false }: { value: string; onChange: (id: string) => void; label?: string; allowAll?: boolean }) {
  const q = useMarketplaceVendors({ limit: 100 })
  const vendors = q.data?.data ?? []
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <select className={selectClass} value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
        <option value="">{allowAll ? "All vendors" : "Choose a vendor…"}</option>
        {vendors.map((v) => <option key={v.id} value={v.id}>{v.name || v.legal_name || v.id.slice(0, 8)}</option>)}
      </select>
    </label>
  )
}

/** Spend (area) with clicks overlaid in the tooltip. */
export function SpendChart({ data, className }: { data: DailyPoint[]; className?: string }) {
  if (!data.length || data.every((d) => d.spend === 0 && d.clicks === 0 && d.impressions === 0)) {
    return <p className={cn("flex h-48 items-center justify-center text-sm text-muted-foreground", className)}>No ad activity in this period yet.</p>
  }
  return (
    <div className={cn("h-48 text-brand-500", className)} role="img" aria-label="Daily ad spend">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
          <XAxis dataKey="day" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(d: string) => String(d).slice(5, 10)} />
          <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={48} tickFormatter={(v: number) => formatINR(v)} />
          <Tooltip
            formatter={(v, n) => (n === "spend" ? [rupees(Number(v ?? 0)), "Spend"] : [num(Number(v ?? 0)), String(n)])}
            labelFormatter={(l) => String(l).slice(0, 10)}
          />
          <Area type="monotone" dataKey="spend" stroke="currentColor" fill="currentColor" fillOpacity={0.18} />
          <Area type="monotone" dataKey="clicks" stroke="#94a3b8" fill="none" strokeWidth={0} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export function Field({ label, hint, children }: { label: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
    </label>
  )
}

export const ENTRY_LABEL: Record<string, string> = {
  TOPUP_SETTLEMENT: "Top-up from settlement",
  TOPUP_ADMIN: "Top-up (credited by Dealker)",
  PROMO_CREDIT: "Promotional credit",
  CLICK_CHARGE: "Ad click",
  CLICK_REFUND: "Invalid click refund",
  WITHDRAW_SETTLEMENT: "Moved back to settlement",
  ADJUSTMENT: "Adjustment",
}

/** Vendor staff see only their own account; everyone else is platform-side (acts on behalf of a chosen vendor). */
export function useAdsRole() {
  const user = useAuthStore((s) => s.user)
  const isVendor = !!user?.role?.startsWith("VENDOR")
  return { isVendor, isPlatform: !isVendor }
}

/** Confirm dialog that insists on a written reason (reject / suspend / refund / credit). */
export function ReasonDialog({
  open, onOpenChange, title, description, confirmLabel, destructive = false, pending = false, onConfirm,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  title: string
  description?: string
  confirmLabel: string
  destructive?: boolean
  pending?: boolean
  onConfirm: (reason: string) => void
}) {
  const [reason, setReason] = useState("")
  const ok = reason.trim().length >= 3
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) setReason(""); onOpenChange(o) }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (shown to the vendor)" aria-label="Reason" />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant={destructive ? "destructive" : "default"} disabled={!ok || pending} onClick={() => { onConfirm(reason.trim()); setReason("") }}>{confirmLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

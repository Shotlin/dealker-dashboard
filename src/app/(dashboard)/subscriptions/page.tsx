"use client"

/**
 * Subscriptions — Free / Paid / Premium / Unlimited vendors, who is about to
 * expire, plan settings, and each vendor's full timeline.
 */

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { CalendarClock, IndianRupee, Store, TrendingUp } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { QueryErrorBlock } from "@/components/shared/query-error-block"
import { StatCard } from "@/components/dashboard/StatCard"
import { VendorTimelineView } from "@/components/subscriptions/VendorTimelineView"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { useDebounce } from "@/hooks/useDebounce"
import { useSubActions, useSubOverview, useSubPlans, useSubVendor, useSubVendors } from "@/hooks/useSubscriptions"
import { cn, formatDateTime } from "@/lib/utils"
import { TIER_LABEL } from "@/services/subscriptions.service"
import type { Cycle, Plan, SubVendorRow, Tier } from "@/services/subscriptions.service"

const inr = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n)
const TIER_CLS: Record<Tier, string> = {
  FREE: "bg-slate-100 text-slate-700", PAID: "bg-sky-50 text-sky-700", PREMIUM: "bg-violet-50 text-violet-700", UNLIMITED: "bg-amber-50 text-amber-800",
}

function TierBadge({ tier }: { tier: Tier }) {
  return <Badge variant="outline" className={cn("border-0 text-[11px] font-medium", TIER_CLS[tier])}>{TIER_LABEL[tier]}</Badge>
}

function Usage({ used, limit }: { used: number; limit: number | null }) {
  const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0
  return (
    <div className="min-w-[110px]">
      <p className="text-xs tabular-nums">{used} / {limit ?? "∞"}</p>
      {limit !== null && <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted"><div className={cn("h-full", pct >= 90 ? "bg-red-500" : "bg-primary")} style={{ width: `${pct}%` }} /></div>}
    </div>
  )
}

// ── Change plan ──────────────────────────────────────────────────────
function ChangePlanDialog({ vendorId, name, open, onOpenChange }: { vendorId: string; name: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { assign } = useSubActions()
  const plans = useSubPlans()
  const [tier, setTier] = useState<Tier>("PAID")
  const [cycle, setCycle] = useState<Cycle>("MONTHLY")
  const [days, setDays] = useState("30")
  const [amount, setAmount] = useState("")
  const [ref, setRef] = useState("")
  const [notes, setNotes] = useState("")
  const [auto, setAuto] = useState(false)

  useEffect(() => { if (open) { setTier("PAID"); setCycle("MONTHLY"); setDays("30"); setAmount(""); setRef(""); setNotes(""); setAuto(false) } }, [open])

  const plan = plans.data?.find((p) => p.tier === tier)
  const suggested = cycle === "YEARLY" ? plan?.price_yearly : cycle === "MONTHLY" ? plan?.price_monthly : 0
  const paying = tier !== "FREE" && cycle !== "COMPLIMENTARY" && Number(amount === "" ? suggested ?? 0 : amount) > 0
  const valid = tier === "FREE" || (cycle !== "COMPLIMENTARY" ? (!paying || ref.trim().length > 0) : Number(days) >= 1)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change plan · {name}</DialogTitle>
          <DialogDescription>Choosing the current plan renews it and adds time to its end date.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Plan</Label>
              <Select value={tier} onValueChange={(v) => setTier(v as Tier)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["FREE", "PAID", "PREMIUM", "UNLIMITED"] as Tier[]).map((t) => <SelectItem key={t} value={t}>{TIER_LABEL[t]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {tier !== "FREE" && (
              <div className="space-y-1">
                <Label className="text-xs">Billing</Label>
                <Select value={cycle} onValueChange={(v) => setCycle(v as Cycle)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MONTHLY">Monthly{plan ? ` · ${inr(plan.price_monthly)}` : ""}</SelectItem>
                    <SelectItem value="YEARLY">Yearly{plan ? ` · ${inr(plan.price_yearly)}` : ""}</SelectItem>
                    <SelectItem value="COMPLIMENTARY">Complimentary (free)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          {tier !== "FREE" && cycle === "COMPLIMENTARY" && (
            <div className="space-y-1"><Label className="text-xs">Free for how many days</Label><Input className="h-9" inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value)} /></div>
          )}
          {tier !== "FREE" && cycle !== "COMPLIMENTARY" && (
            <>
              <div className="space-y-1">
                <Label className="text-xs">Amount received (₹)</Label>
                <Input className="h-9" inputMode="decimal" placeholder={suggested != null ? String(suggested) : ""} value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Payment reference (UTR / transaction id){paying ? " *" : ""}</Label>
                <Input className="h-9" value={ref} onChange={(e) => setRef(e.target.value)} />
              </div>
              <label className="flex items-center gap-2 text-sm"><Switch checked={auto} onCheckedChange={setAuto} />Auto-renew</label>
            </>
          )}
          <div className="space-y-1"><Label className="text-xs">Note</Label><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!valid || assign.isPending}
            onClick={() => assign.mutate({
              id: vendorId,
              body: {
                tier, cycle: tier === "FREE" ? undefined : cycle,
                days: cycle === "COMPLIMENTARY" ? Number(days) : undefined,
                amountPaid: amount === "" ? undefined : Number(amount),
                paymentRef: ref.trim() || undefined, notes: notes.trim() || undefined, autoRenew: auto,
              },
            }, { onSuccess: () => onOpenChange(false) })}>
            {assign.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Vendor sheet ─────────────────────────────────────────────────────
function VendorSheet({ vendor, onClose }: { vendor: { id: string; name: string } | null; onClose: () => void }) {
  const detail = useSubVendor(vendor?.id ?? null)
  const { extend, cancel } = useSubActions()
  const [changing, setChanging] = useState(false)
  const d = detail.data

  const askReason = (label: string) => window.prompt(label)?.trim() || ""
  return (
    <Sheet open={!!vendor} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-xl">
        <SheetHeader className="border-b px-5 py-4 text-left">
          <SheetTitle className="text-base">{vendor?.name}</SheetTitle>
          {d && <div className="flex flex-wrap items-center gap-2"><TierBadge tier={d.tier} />
            <span className="text-xs text-muted-foreground">{d.expires_at ? `ends ${formatDateTime(d.expires_at)}` : d.tier === "FREE" ? "no expiry" : "no end date"}</span></div>}
        </SheetHeader>
        <ScrollArea className="min-h-0 flex-1">
          {!d ? <div className="p-5"><Skeleton className="h-40 w-full" /></div> : (
            <div className="space-y-6 p-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Listings used</p><div className="mt-1"><Usage used={d.listings_used} limit={d.listing_limit} /></div></div>
                <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Last payment</p><p className="mt-1 text-sm font-medium">{d.amount_paid != null ? inr(d.amount_paid) : "—"}</p></div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => setChanging(true)}>Change plan</Button>
                <Button size="sm" variant="outline" disabled={d.tier === "FREE" || extend.isPending}
                  onClick={() => {
                    const days = Number(window.prompt("Extend by how many days? (1–365)"))
                    if (!days) return
                    const reason = askReason("Reason for the extension")
                    if (reason) extend.mutate({ id: d.id, days, reason })
                  }}>Extend</Button>
                <Button size="sm" variant="outline" className="text-red-600" disabled={d.tier === "FREE" || cancel.isPending}
                  onClick={() => { const reason = askReason("Reason for moving this vendor to Free"); if (reason) cancel.mutate({ id: d.id, reason }) }}>Cancel plan</Button>
              </div>

              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Vendor timeline</h3>
                {vendor && <VendorTimelineView vendorId={vendor.id} />}
              </section>

              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Plan history</h3>
                <ul className="divide-y rounded-lg border text-sm">
                  {d.history.length === 0 && <li className="px-3 py-3 text-muted-foreground">No paid plans yet.</li>}
                  {d.history.map((h) => (
                    <li key={h.id} className="px-3 py-2">
                      <p className="flex flex-wrap items-center gap-2"><TierBadge tier={h.tier} /><span className="text-xs text-muted-foreground">{h.billing_cycle.toLowerCase()} · {h.status.toLowerCase()} · {inr(h.amount_paid)}</span></p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{formatDateTime(h.started_at)}{h.expires_at ? ` → ${formatDateTime(h.expires_at)}` : ""}{h.payment_ref ? ` · ${h.payment_ref}` : ""}{h.cancel_reason ? ` · ${h.cancel_reason}` : ""}</p>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          )}
        </ScrollArea>
        {vendor && <ChangePlanDialog vendorId={vendor.id} name={vendor.name} open={changing} onOpenChange={setChanging} />}
      </SheetContent>
    </Sheet>
  )
}

// ── Plans tab ────────────────────────────────────────────────────────
function PlanCard({ plan }: { plan: Plan }) {
  const { updatePlan } = useSubActions()
  const [pm, setPm] = useState(String(plan.price_monthly))
  const [py, setPy] = useState(String(plan.price_yearly))
  const [lim, setLim] = useState(plan.listing_limit == null ? "" : String(plan.listing_limit))
  const [feat, setFeat] = useState(plan.features.join("\n"))
  const [active, setActive] = useState(plan.is_active)
  useEffect(() => { setPm(String(plan.price_monthly)); setPy(String(plan.price_yearly)); setLim(plan.listing_limit == null ? "" : String(plan.listing_limit)); setFeat(plan.features.join("\n")); setActive(plan.is_active) }, [plan])
  const free = plan.tier === "FREE"; const unlimited = plan.tier === "UNLIMITED"
  return (
    <div className="space-y-3 rounded-xl border p-4" data-testid={`plan-${plan.tier}`}>
      <div className="flex items-center justify-between"><TierBadge tier={plan.tier} /><span className="text-xs text-muted-foreground">{plan.vendor_count} vendor{plan.vendor_count === 1 ? "" : "s"}</span></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><Label className="text-xs">Monthly (₹)</Label><Input className="h-9" inputMode="decimal" disabled={free} value={pm} onChange={(e) => setPm(e.target.value)} /></div>
        <div className="space-y-1"><Label className="text-xs">Yearly (₹)</Label><Input className="h-9" inputMode="decimal" disabled={free} value={py} onChange={(e) => setPy(e.target.value)} /></div>
        <div className="space-y-1"><Label className="text-xs">Listing limit</Label><Input className="h-9" inputMode="numeric" disabled={unlimited} placeholder={unlimited ? "Unlimited" : ""} value={lim} onChange={(e) => setLim(e.target.value)} /></div>
        <label className="flex items-end gap-2 pb-2 text-sm"><Switch checked={active} disabled={free} onCheckedChange={setActive} />Available</label>
      </div>
      <div className="space-y-1"><Label className="text-xs">What's included (one per line)</Label><Textarea rows={4} value={feat} onChange={(e) => setFeat(e.target.value)} /></div>
      <Button size="sm" disabled={updatePlan.isPending}
        onClick={() => updatePlan.mutate({ id: plan.id, body: { priceMonthly: Number(pm), priceYearly: Number(py), listingLimit: unlimited ? null : Number(lim), features: feat.split("\n").map((x) => x.trim()).filter(Boolean), isActive: active } })}>
        Save plan
      </Button>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────
function SubscriptionsInner() {
  const params = useSearchParams()
  const overview = useSubOverview()
  const plans = useSubPlans()
  const [tier, setTier] = useState("")
  const [expiring, setExpiring] = useState(false)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [open, setOpen] = useState<{ id: string; name: string } | null>(null)
  const debounced = useDebounce(search, 300)
  const list = useSubVendors({ tier, expiring: expiring || undefined, search: debounced, page, limit: 25 })
  const o = overview.data

  useEffect(() => {
    const id = params.get("vendor")
    if (id) setOpen({ id, name: params.get("name") || "Vendor" })
  }, [params])

  const rows: SubVendorRow[] = list.data?.data ?? []
  const meta = list.data?.meta

  return (
    <div className="space-y-6">
      <PageHeader title="Subscriptions" subtitle="Free, Paid, Premium and Unlimited vendors — plans, expiry and each vendor's full timeline." />

      {overview.isError ? <QueryErrorBlock error={overview.error} onRetry={() => overview.refetch()} /> : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {(["FREE", "PAID", "PREMIUM", "UNLIMITED"] as Tier[]).map((t) => (
            <button key={t} type="button" onClick={() => { setTier(tier === t ? "" : t); setPage(1) }} className="text-left">
              <StatCard label={`${TIER_LABEL[t]} vendors`} value={o ? String(o.tiers.find((x) => x.tier === t)?.vendors ?? 0) : "—"} icon={<Store className="h-4 w-4 text-brand-500" />}
                className={tier === t ? "ring-1 ring-primary" : ""} />
            </button>
          ))}
          <StatCard label="Expiring in 7 days" value={o ? String(o.expiringSoon) : "—"} icon={<CalendarClock className="h-4 w-4 text-amber-500" />} />
          <StatCard label="Lapsed (back on Free)" value={o ? String(o.lapsed) : "—"} icon={<CalendarClock className="h-4 w-4 text-red-500" />} />
          <StatCard label="Monthly recurring" value={o ? inr(o.mrr) : "—"} icon={<TrendingUp className="h-4 w-4 text-emerald-500" />} />
          <StatCard label="Collected this month" value={o ? inr(o.collectedThisMonth) : "—"} icon={<IndianRupee className="h-4 w-4 text-blue-500" />} />
        </div>
      )}

      <Tabs defaultValue="vendors">
        <TabsList><TabsTrigger value="vendors">Vendors</TabsTrigger><TabsTrigger value="plans">Plans</TabsTrigger></TabsList>

        <TabsContent value="vendors" className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input className="h-9 w-[240px] text-xs" placeholder="Search vendor or email…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
            <Select value={tier || "all"} onValueChange={(v) => { setTier(v === "all" ? "" : v); setPage(1) }}>
              <SelectTrigger className="h-9 w-[150px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All plans</SelectItem>
                {(["FREE", "PAID", "PREMIUM", "UNLIMITED"] as Tier[]).map((t) => <SelectItem key={t} value={t}>{TIER_LABEL[t]}</SelectItem>)}
              </SelectContent>
            </Select>
            <label className="flex items-center gap-2 text-xs"><Switch checked={expiring} onCheckedChange={(v) => { setExpiring(v); setPage(1) }} />Expiring within 7 days</label>
          </div>
          {list.isError ? <QueryErrorBlock error={list.error} onRetry={() => list.refetch()} /> : (
            <div className="rounded-xl border bg-white">
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Vendor</TableHead><TableHead>Plan</TableHead><TableHead>Listings</TableHead><TableHead>Billing</TableHead><TableHead>Ends</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {list.isLoading ? Array.from({ length: 5 }).map((_, i) => <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-10 w-full" /></TableCell></TableRow>)
                    : rows.length === 0 ? <TableRow><TableCell colSpan={5} className="h-32 text-center text-muted-foreground">No vendors match.</TableCell></TableRow>
                    : rows.map((r) => (
                      <TableRow key={r.id} className="cursor-pointer" onClick={() => setOpen({ id: r.id, name: r.name })}>
                        <TableCell><p className="text-sm font-medium">{r.name}</p><p className="text-xs text-muted-foreground">{r.email}</p></TableCell>
                        <TableCell><TierBadge tier={r.tier} /></TableCell>
                        <TableCell><Usage used={r.listings_used} limit={r.listing_limit} /></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{r.billing_cycle ? r.billing_cycle.toLowerCase() : "—"}{r.auto_renew ? " · auto" : ""}</TableCell>
                        <TableCell className="text-xs">
                          {r.expires_at ? <span className={cn(r.days_left != null && r.days_left <= 7 && "font-medium text-amber-700")}>{formatDateTime(r.expires_at)} · {r.days_left}d left</span> : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          )}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              Page {meta.page} of {meta.totalPages}
              <Button variant="ghost" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="plans" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            {plans.isLoading ? <Skeleton className="h-64 w-full" /> : (plans.data ?? []).map((p) => <PlanCard key={p.id} plan={p} />)}
          </div>
        </TabsContent>
      </Tabs>

      <VendorSheet vendor={open} onClose={() => setOpen(null)} />
    </div>
  )
}

export default function SubscriptionsPage() {
  return <Suspense fallback={null}><SubscriptionsInner /></Suspense>
}

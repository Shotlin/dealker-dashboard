"use client"

/**
 * Ad wallet & billing.
 * Vendors: balance, add money from settlement, full statement, "how you're charged".
 * Platform: pick a vendor to see their wallet, credit/adjust, and a table of every vendor wallet.
 */

import { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowDownToLine, ArrowUpFromLine, HandCoins, Landmark, Plus, Receipt, Wallet } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { DataList } from "@/components/shared/data-list"
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton"
import { QueryErrorBlock } from "@/components/shared/query-error-block"
import { StatCard } from "@/components/dashboard/StatCard"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ENTRY_LABEL, Field, VendorPicker, dateTime, rupees, selectClass, useAdsRole } from "@/components/ads/ads-ui"
import { useAdminCredit, useAdRules, useAdStatement, useAdWallet, useTopUp, useVendorWallets, useWithdraw } from "@/hooks/useAds"
import { usePermissions } from "@/hooks/usePermissions"
import { cn } from "@/lib/utils"
import type { LedgerEntry, VendorWalletRow } from "@/services/ads.service"

export default function AdWalletPage() {
  const { can } = usePermissions()
  const { isPlatform, isVendor } = useAdsRole()
  const [vendorId, setVendorId] = useState("")
  const [entryType, setEntryType] = useState("")
  const [page, setPage] = useState(1)
  const [dlg, setDlg] = useState<null | "topup" | "withdraw" | "credit">(null)
  const [wq, setWq] = useState("")

  const target = isPlatform ? vendorId : undefined
  const ready = isVendor || !!vendorId
  const rules = useAdRules()
  const wallet = useAdWallet(target, ready)
  const statement = useAdStatement({ vendorId: target, entryType, page, limit: 20 }, ready)
  const wallets = useVendorWallets({ q: wq, limit: 15 }, isPlatform && can("ads.billing"))

  const w = wallet.data
  const r = rules.data

  return (
    <div className="space-y-6">
      <PageHeader title="Ad wallet & billing" subtitle="Prepaid balance that pays for clicks. Every charge, top-up and refund is listed below.">
        <Button asChild variant="outline" size="sm"><Link href="/ads">Back to ads</Link></Button>
      </PageHeader>

      {isPlatform && (
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-64"><VendorPicker value={vendorId} onChange={(v) => { setVendorId(v); setPage(1) }} label="Vendor" /></div>
          {can("ads.billing") && vendorId && <Button size="sm" variant="outline" onClick={() => setDlg("credit")}><HandCoins /> Credit / adjust</Button>}
        </div>
      )}

      {!ready ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">Choose a vendor to see their wallet and statement — or use the table below.</p>
      ) : wallet.isLoading || !w ? <LoadingSkeleton variant="stat-card" count={4} /> : wallet.isError ? (
        <QueryErrorBlock error={wallet.error} onRetry={() => wallet.refetch()} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Ad wallet" value={rupees(w.balance)} variant="primary" icon={<Wallet className="h-4 w-4 text-white" />} />
            <StatCard label="Settlement balance" value={rupees(w.settlement_balance)} icon={<Landmark className="h-4 w-4 text-blue-500" />} />
            <StatCard label="Spent on ads (lifetime)" value={rupees(w.lifetime_spend, 0)} icon={<Receipt className="h-4 w-4 text-violet-500" />} />
            <StatCard label="Topped up (lifetime)" value={rupees(w.lifetime_topup, 0)} icon={<ArrowDownToLine className="h-4 w-4 text-green-600" />} />
          </div>

          {isVendor && (
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setDlg("topup")}><Plus /> Add money</Button>
              <Button variant="outline" disabled={w.withdrawable <= 0} onClick={() => setDlg("withdraw")}><ArrowUpFromLine /> Move back to settlement</Button>
            </div>
          )}
          {w.low_balance && (
            <p role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
              Low balance — running campaigns commit {rupees(w.daily_commitment, 0)}/day. Campaigns pause automatically when the wallet reaches zero.
            </p>
          )}
        </>
      )}

      <section className="rounded-xl border bg-card p-4" aria-labelledby="how">
        <h2 id="how" className="mb-2 text-sm font-semibold">How you&apos;re charged</h2>
        <ul className="grid gap-x-8 gap-y-1.5 text-sm text-muted-foreground md:grid-cols-2">
          <li>• <strong className="text-foreground">Per click only.</strong> Impressions are free.</li>
          <li>• Each click costs the <strong className="text-foreground">minimum needed to hold your position</strong> — never more than your bid{r && <>, never less than {rupees(r.min_cpc)}</>}.</li>
          <li>• <strong className="text-foreground">GST {r ? `${r.gst_pct}%` : ""}</strong> is added to every click charge and shown on each statement line.</li>
          <li>• Your <strong className="text-foreground">daily budget is a hard cap</strong> (net of GST) — we stop showing the ad once it&apos;s reached.</li>
          <li>• Repeat clicks by the same shopper within a short window, and clicks by your own staff, are free.</li>
          <li>• Clicks Dealker finds invalid are refunded to this wallet, GST included.</li>
        </ul>
      </section>

      {ready && (
        <section className="space-y-3" aria-labelledby="st">
          <div className="flex items-center justify-between">
            <h2 id="st" className="text-sm font-semibold">Statement</h2>
            <select className={cn(selectClass, "!w-56")} value={entryType} onChange={(e) => { setEntryType(e.target.value); setPage(1) }} aria-label="Filter by type">
              <option value="">All activity</option>
              {Object.entries(ENTRY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          {statement.isLoading ? <LoadingSkeleton variant="table" /> : (
            <>
              <DataList<LedgerEntry>
                rows={statement.data?.data ?? []}
                rowKey={(r) => String(r.id)}
                emptyMessage="No transactions yet."
                columns={[
                  { id: "d", header: "Date", cell: (r) => <span className="text-xs text-muted-foreground">{dateTime(r.created_at)}</span> },
                  { id: "t", header: "Type", cell: (r) => (
                    <span className="text-sm">{ENTRY_LABEL[r.entry_type] ?? r.entry_type}
                      {(r.campaign_name || r.reason) && <span className="block max-w-[320px] truncate text-xs text-muted-foreground">{[r.campaign_name, r.reason].filter(Boolean).join(" · ")}</span>}</span>) },
                  { id: "g", header: "GST", cell: (r) => <span className="text-xs tabular-nums text-muted-foreground">{r.tax_amount ? rupees(r.tax_amount) : "—"}</span> },
                  { id: "a", header: "Amount", cell: (r) => <span className={cn("text-sm font-medium tabular-nums", r.amount < 0 ? "text-red-600" : "text-green-700")}>{r.amount > 0 ? "+" : ""}{rupees(r.amount)}</span> },
                  { id: "b", header: "Balance", cell: (r) => <span className="text-sm tabular-nums">{rupees(r.balance_after)}</span> },
                ]}
              />
              {statement.data && statement.data.pagination.total > statement.data.pagination.limit && (
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{statement.data.pagination.total} entries</span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                    <Button size="sm" variant="outline" disabled={page * statement.data.pagination.limit >= statement.data.pagination.total} onClick={() => setPage((p) => p + 1)}>Next</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {isPlatform && can("ads.billing") && (
        <section className="space-y-3" aria-labelledby="all">
          <div className="flex items-center justify-between gap-3">
            <h2 id="all" className="text-sm font-semibold">All vendor wallets</h2>
            <Input value={wq} onChange={(e) => setWq(e.target.value)} placeholder="Search vendor" className="h-9 w-56" aria-label="Search vendors" />
          </div>
          <DataList<VendorWalletRow>
            rows={wallets.data?.data ?? []}
            rowKey={(r) => r.vendor_id}
            emptyMessage="No vendors found."
            columns={[
              { id: "n", header: "Vendor", cell: (r) => <button className="text-left text-sm font-medium hover:underline" onClick={() => setVendorId(r.vendor_id)}>{r.name}</button> },
              { id: "b", header: "Balance", cell: (r) => <span className="text-sm tabular-nums">{rupees(r.balance)}</span> },
              { id: "s", header: "Lifetime spend", cell: (r) => <span className="text-sm tabular-nums">{rupees(r.lifetime_spend, 0)}</span> },
              { id: "t", header: "Lifetime top-ups", cell: (r) => <span className="text-sm tabular-nums">{rupees(r.lifetime_topup, 0)}</span> },
              { id: "c", header: "Running", cell: (r) => <span className="text-sm tabular-nums">{r.active_campaigns}</span> },
            ]}
          />
        </section>
      )}

      {dlg === "topup" && w && r && <TopUpDialog onClose={() => setDlg(null)} wallet={w} gst={r.gst_pct} />}
      {dlg === "withdraw" && w && <WithdrawDialog onClose={() => setDlg(null)} max={w.withdrawable} />}
      {dlg === "credit" && vendorId && <CreditDialog onClose={() => setDlg(null)} vendorId={vendorId} />}
    </div>
  )
}

function TopUpDialog({ onClose, wallet, gst }: { onClose: () => void; wallet: { settlement_balance: number; min_topup: number; max_topup: number }; gst: number }) {
  const topUp = useTopUp()
  const [amount, setAmount] = useState("")
  // One key per dialog open: a double-click or retry can never add the money twice.
  const key = useMemo(() => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now())), [])
  const n = Number(amount)
  const max = Math.min(wallet.settlement_balance, wallet.max_topup)
  const bad = !n || n < wallet.min_topup || n > max
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add money to ad wallet</DialogTitle>
          <DialogDescription>Moves money from your settlement balance ({rupees(wallet.settlement_balance)}). No fee on top-ups — GST ({gst}%) is added per click.</DialogDescription>
        </DialogHeader>
        <Field label="Amount (₹)" hint={`Minimum ${rupees(wallet.min_topup, 0)} · up to ${rupees(max, 0)} now`}>
          <Input type="number" autoFocus value={amount} onChange={(e) => setAmount(e.target.value)} min={wallet.min_topup} step="100" />
        </Field>
        <div className="flex flex-wrap gap-2">
          {[500, 1000, 2500, 5000].filter((x) => x <= max).map((x) => <Button key={x} size="sm" variant="outline" onClick={() => setAmount(String(x))}>{rupees(x, 0)}</Button>)}
        </div>
        {wallet.settlement_balance < wallet.min_topup && <p className="text-xs text-amber-700 dark:text-amber-300">Your settlement balance is below the minimum top-up. Earn from sales first, or ask Dealker support.</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={bad || topUp.isPending} onClick={() => topUp.mutate({ amount: n, key }, { onSuccess: onClose })}>Add {n ? rupees(n, 0) : "money"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function WithdrawDialog({ onClose, max }: { onClose: () => void; max: number }) {
  const withdraw = useWithdraw()
  const [amount, setAmount] = useState(String(max))
  const n = Number(amount)
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move money back to settlement</DialogTitle>
          <DialogDescription>Only unused money you added from your settlement balance can be moved back. Promotional credit stays in the ad wallet.</DialogDescription>
        </DialogHeader>
        <Field label="Amount (₹)" hint={`Up to ${rupees(max)}`}><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} max={max} step="1" /></Field>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!n || n > max || withdraw.isPending} onClick={() => withdraw.mutate(n, { onSuccess: onClose })}>Move {n ? rupees(n) : ""}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CreditDialog({ onClose, vendorId }: { onClose: () => void; vendorId: string }) {
  const credit = useAdminCredit()
  const [amount, setAmount] = useState("")
  const [kind, setKind] = useState<"TOPUP_ADMIN" | "PROMO_CREDIT" | "ADJUSTMENT">("PROMO_CREDIT")
  const [reason, setReason] = useState("")
  const key = useMemo(() => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now())), [])
  const n = Number(amount)
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Credit or adjust ad wallet</DialogTitle>
          <DialogDescription>Recorded in the vendor&apos;s statement with your name and reason.</DialogDescription>
        </DialogHeader>
        <Field label="Type">
          <select className={selectClass} value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
            <option value="PROMO_CREDIT">Promotional credit (platform-funded, not withdrawable)</option>
            <option value="TOPUP_ADMIN">Paid top-up received outside the dashboard</option>
            <option value="ADJUSTMENT">Correction (use a negative amount to deduct)</option>
          </select>
        </Field>
        <Field label="Amount (₹)"><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} step="1" /></Field>
        <Field label="Reason"><Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Launch offer — ₹500 free ad credit" /></Field>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!n || reason.trim().length < 3 || credit.isPending || (kind !== "ADJUSTMENT" && n < 0)}
            onClick={() => credit.mutate({ vendorId, amount: n, kind, reason: reason.trim(), idempotencyKey: key } as never, { onSuccess: onClose })}>Apply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

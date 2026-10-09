"use client"

/**
 * Vendor Wallet — every credit and debit carries a reason, an order
 * reference, who did it and the balance before/after. Backed by the
 * append-only settlement ledger: entries can be added, never edited.
 */

import { useState } from "react"
import Link from "next/link"
import { ArrowDownRight, ArrowUpRight, Landmark, Lock, Plus, Wallet } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { DataList } from "@/components/shared/data-list"
import { QueryErrorBlock } from "@/components/shared/query-error-block"
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton"
import { StatCard } from "@/components/dashboard/StatCard"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  useAddWalletEntry, useVendorWalletOverview, useVendorWalletTxns, useVendorWallets, useWalletReasons,
} from "@/hooks/useMoney"
import { useDebounce } from "@/hooks/useDebounce"
import { formatDateTime } from "@/lib/utils"
import type { VendorWalletRow } from "@/services/money.service"

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n)

const label = (code: string | null) => (code ? code.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase()) : "—")

export default function VendorWalletPage() {
  const overview = useVendorWalletOverview()
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const debounced = useDebounce(search, 300)
  const wallets = useVendorWallets({ search: debounced, page, limit: 20 })
  const [open, setOpen] = useState<VendorWalletRow | null>(null)

  const o = overview.data
  const rows = wallets.data?.data ?? []
  const meta = wallets.data?.meta

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendor Wallet"
        subtitle="Every credit and debit has a reason. Nothing is edited or deleted — corrections are new entries."
      />

      {overview.isError ? (
        <QueryErrorBlock error={overview.error} onRetry={() => overview.refetch()} />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Total Vendor Balance" value={o ? inr(o.totalBalance) : "—"} icon={<Wallet className="h-4 w-4 text-brand-500" />} />
          <StatCard label="Total Credited" value={o ? inr(o.totalCredits) : "—"} icon={<ArrowUpRight className="h-4 w-4 text-green-500" />} />
          <StatCard label="Total Debited" value={o ? inr(o.totalDebits) : "—"} icon={<ArrowDownRight className="h-4 w-4 text-red-500" />} />
          <StatCard label="Vendors on Payout Hold" value={o ? String(o.vendorsOnHold) : "—"} icon={<Lock className="h-4 w-4 text-amber-500" />} />
        </div>
      )}

      <Input className="h-9 w-[260px] text-xs" placeholder="Search vendor…" value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1) }} />

      {wallets.isLoading ? (
        <LoadingSkeleton variant="table" />
      ) : wallets.isError ? (
        <QueryErrorBlock error={wallets.error} onRetry={() => wallets.refetch()} />
      ) : (
        <DataList
          rows={rows}
          rowKey={(r) => r.vendor_id}
          emptyMessage="No vendors yet."
          columns={[
            {
              id: "vendor", header: "Vendor",
              cell: (r) => (
                <button type="button" className="text-sm font-medium text-left hover:underline" onClick={() => setOpen(r)}>
                  {r.business_name}
                </button>
              ),
            },
            { id: "balance", header: "Balance", cell: (r) => <span className="text-sm font-semibold">{inr(r.balance)}</span> },
            { id: "cr", header: "Credited", cell: (r) => <span className="text-sm text-green-600">{inr(r.total_credits)}</span> },
            { id: "dr", header: "Debited", cell: (r) => <span className="text-sm text-red-600">{inr(r.total_debits)}</span> },
            {
              id: "hold", header: "Payouts",
              cell: (r) => (r.on_hold ? <Badge variant="destructive">On hold</Badge> : <Badge variant="outline">Normal</Badge>),
            },
            {
              id: "last", header: "Last activity",
              cell: (r) => <span className="text-xs text-muted-foreground">{r.last_activity ? formatDateTime(r.last_activity) : "—"}</span>,
            },
            {
              id: "go", header: "",
              cell: (r) => <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setOpen(r)}>Open ledger</Button>,
            },
          ]}
        />
      )}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          Page {meta.page} of {meta.totalPages}
          <Button variant="ghost" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}

      <LedgerSheet vendor={open} onClose={() => setOpen(null)} />
    </div>
  )
}

function LedgerSheet({ vendor, onClose }: { vendor: VendorWalletRow | null; onClose: () => void }) {
  const [direction, setDirection] = useState("")
  const [reasonCode, setReasonCode] = useState("")
  const [page, setPage] = useState(1)
  const [adding, setAdding] = useState(false)
  const reasons = useWalletReasons()
  const txns = useVendorWalletTxns(vendor?.vendor_id ?? null, { direction, reasonCode, page, limit: 20 })

  const allReasons = Array.from(new Set([...(reasons.data?.credit ?? []), ...(reasons.data?.debit ?? [])]))
  const rows = txns.data?.data ?? []
  const meta = txns.data?.meta

  return (
    <Sheet open={!!vendor} onOpenChange={(o) => { if (!o) { onClose(); setPage(1); setDirection(""); setReasonCode("") } }}>
      <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2"><Landmark className="h-4 w-4" />{vendor?.business_name}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
            <div>
              <div className="text-xs text-muted-foreground">Current balance</div>
              <div className="text-2xl font-semibold" data-testid="wallet-balance">{inr(txns.data?.vendor.balance ?? vendor?.balance ?? 0)}</div>
            </div>
            <Button size="sm" onClick={() => setAdding(true)}><Plus className="h-4 w-4 mr-1" /> Add entry</Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <Select value={direction || "all"} onValueChange={(v) => { setDirection(v === "all" ? "" : v); setPage(1) }}>
              <SelectTrigger className="h-9 w-[140px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Credits & debits</SelectItem>
                <SelectItem value="CREDIT">Credits only</SelectItem>
                <SelectItem value="DEBIT">Debits only</SelectItem>
              </SelectContent>
            </Select>
            <Select value={reasonCode || "all"} onValueChange={(v) => { setReasonCode(v === "all" ? "" : v); setPage(1) }}>
              <SelectTrigger className="h-9 w-[220px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any reason</SelectItem>
                {allReasons.map((r) => <SelectItem key={r} value={r}>{label(r)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {txns.isLoading ? (
            <LoadingSkeleton variant="table" />
          ) : txns.isError ? (
            <QueryErrorBlock error={txns.error} onRetry={() => txns.refetch()} />
          ) : (
            <DataList
              rows={rows}
              rowKey={(r) => String(r.id)}
              emptyMessage="No wallet activity yet."
              columns={[
                { id: "date", header: "Date", cell: (r) => <span className="text-xs">{formatDateTime(r.created_at)}</span> },
                {
                  id: "type", header: "Type",
                  cell: (r) => <Badge variant={r.type === "CREDIT" ? "secondary" : "outline"}>{r.type}</Badge>,
                },
                {
                  id: "amount", header: "Amount",
                  cell: (r) => (
                    <span className={`text-sm font-medium ${r.type === "CREDIT" ? "text-green-600" : "text-red-600"}`}>
                      {r.type === "CREDIT" ? "+" : "−"}{inr(Math.abs(r.amount))}
                    </span>
                  ),
                },
                {
                  id: "reason", header: "Reason",
                  cell: (r) => (
                    <div>
                      <div className="text-sm">{label(r.reason_code)}</div>
                      {r.reason ? <div className="text-xs text-muted-foreground">{r.reason}</div> : null}
                    </div>
                  ),
                },
                {
                  id: "order", header: "Order",
                  cell: (r) =>
                    r.order_id ? (
                      <Link href={`/orders/${r.order_id}`} className="text-xs text-brand-600 hover:underline">{r.order_number}</Link>
                    ) : <span className="text-xs text-muted-foreground">—</span>,
                },
                { id: "by", header: "By", cell: (r) => <span className="text-xs">{r.actor_name ?? (r.reference_type === "ADMIN_MANUAL" ? "Admin" : "System")}</span> },
                {
                  id: "bal", header: "Balance",
                  cell: (r) => <span className="text-xs text-muted-foreground">{inr(r.balance_before)} → {inr(r.balance_after)}</span>,
                },
              ]}
            />
          )}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              Page {meta.page} of {meta.totalPages}
              <Button variant="ghost" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          )}
        </div>

        {vendor && <AddEntryDialog vendor={vendor} open={adding} onOpenChange={setAdding} />}
      </SheetContent>
    </Sheet>
  )
}

function AddEntryDialog({ vendor, open, onOpenChange }: { vendor: VendorWalletRow; open: boolean; onOpenChange: (o: boolean) => void }) {
  const reasons = useWalletReasons()
  const add = useAddWalletEntry()
  const [direction, setDirection] = useState<"CREDIT" | "DEBIT">("CREDIT")
  const [reasonCode, setReasonCode] = useState("")
  const [reason, setReason] = useState("")
  const [amount, setAmount] = useState("")
  const [orderNumber, setOrderNumber] = useState("")

  const options = (direction === "CREDIT" ? reasons.data?.credit : reasons.data?.debit) ?? []
  const valid = !!reasonCode && reason.trim().length >= 5 && Number(amount) > 0

  const reset = () => { setReasonCode(""); setReason(""); setAmount(""); setOrderNumber("") }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Add wallet entry · {vendor.business_name}</DialogTitle></DialogHeader>
        <div className="space-y-3 py-1">
          <div className="grid grid-cols-2 gap-2">
            {(["CREDIT", "DEBIT"] as const).map((d) => (
              <Button key={d} type="button" variant={direction === d ? "default" : "outline"} size="sm"
                onClick={() => { setDirection(d); setReasonCode("") }}>
                {d === "CREDIT" ? "Credit" : "Debit"}
              </Button>
            ))}
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Reason *</Label>
            <Select value={reasonCode} onValueChange={setReasonCode}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Choose a reason" /></SelectTrigger>
              <SelectContent>{options.map((r) => <SelectItem key={r} value={r}>{label(r)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Amount (₹) *</Label>
            <Input className="h-9" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Order number (optional)</Label>
            <Input className="h-9" placeholder="e.g. MK-100234" value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Explain why * <span className="text-muted-foreground">(saved permanently)</span></Label>
            <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!valid || add.isPending}
            onClick={() =>
              add.mutate(
                { vendorId: vendor.vendor_id, direction, reasonCode, reason: reason.trim(), amount: Number(amount), orderNumber: orderNumber.trim() || undefined },
                { onSuccess: () => { reset(); onOpenChange(false) } },
              )
            }>
            {add.isPending ? "Saving…" : `Record ${direction.toLowerCase()}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

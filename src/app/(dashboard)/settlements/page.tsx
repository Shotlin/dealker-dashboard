"use client"

/**
 * Vendor Settlements — ledger overview + payouts (spec §23). Balances come
 * from the append-only settlement ledger; nothing is fabricated client-side.
 */

import { useState } from "react"
import { TrendingUp, Receipt, Wallet, CreditCard } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { DataList } from "@/components/shared/data-list"
import { QueryErrorBlock } from "@/components/shared/query-error-block"
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton"
import { StatCard } from "@/components/dashboard/StatCard"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useCreatePayout, useMarkPayoutPaid, usePayouts, useSettlementOverview } from "@/hooks/useMarketplace"
import { formatINR } from "@/lib/utils"

export default function SettlementsPage() {
  const overviewQuery = useSettlementOverview()
  const [page, setPage] = useState(1)
  const payoutsQuery = usePayouts({ page, limit: 20 })
  const createPayout = useCreatePayout()
  const markPaid = useMarkPayoutPaid()

  const [payoutDialog, setPayoutDialog] = useState(false)
  const [vendorId, setVendorId] = useState("")
  const [amount, setAmount] = useState("")

  if (overviewQuery.isLoading) return <LoadingSkeleton variant="stat-card" />
  if (overviewQuery.isError) return <QueryErrorBlock error={overviewQuery.error} onRetry={() => overviewQuery.refetch()} />

  const o = overviewQuery.data!

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendor Settlements"
        subtitle="Commission, deductions and payouts. The ledger is authoritative and append-only."
      >
        <Button size="sm" onClick={() => setPayoutDialog(true)}>
          New Payout
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Commission Earned" value={formatINR(o.commissionEarned)} icon={<TrendingUp className="h-4 w-4 text-brand-500" />} />
        <StatCard label="GMV Posted" value={formatINR(o.gmvPosted)} icon={<Receipt className="h-4 w-4 text-blue-500" />} />
        <StatCard label="Total Paid Out" value={formatINR(o.totalPaidOut)} icon={<Wallet className="h-4 w-4 text-green-500" />} />
        <StatCard label="Open Liability" value={formatINR(o.totalLiability)} icon={<CreditCard className="h-4 w-4 text-amber-500" />} />
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-2">Payouts</h3>
        {payoutsQuery.isLoading ? (
          <LoadingSkeleton variant="table" />
        ) : payoutsQuery.isError ? (
          <QueryErrorBlock error={payoutsQuery.error} onRetry={() => payoutsQuery.refetch()} />
        ) : (
          <DataList
            rows={payoutsQuery.data?.data ?? []}
            rowKey={(r) => r.id}
            emptyMessage="No payouts yet."
            columns={[
              { id: "number", header: "Payout", cell: (r) => <span className="text-sm font-medium">{r.payout_number}</span> },
              { id: "vendor", header: "Vendor", cell: (r) => <span className="text-sm">{r.vendor_name ?? r.id.slice(0, 8)}</span> },
              { id: "amount", header: "Amount", cell: (r) => <span className="text-sm font-medium">{formatINR(Number(r.amount))}</span> },
              {
                id: "status",
                header: "Status",
                cell: (r) => (
                  <Badge variant={r.status === "PAID" ? "secondary" : r.status === "FAILED" ? "destructive" : "outline"}>
                    {r.status}
                  </Badge>
                ),
              },
              { id: "utr", header: "UTR", cell: (r) => <span className="text-xs text-muted-foreground">{r.utr_number ?? "—"}</span> },
              {
                id: "actions",
                header: "",
                cell: (r) =>
                  r.status !== "PAID" ? (
                    <Button
                      size="sm" variant="outline" className="h-7 text-xs"
                      disabled={markPaid.isPending}
                      onClick={() => {
                        const utr = window.prompt("UTR / payment reference (optional)") ?? undefined
                        markPaid.mutate({ payoutId: r.id, utrNumber: utr || undefined })
                      }}
                    >
                      Mark Paid
                    </Button>
                  ) : null,
              },
            ]}
          />
        )}
        <div className="flex gap-2 mt-2">
          {page > 1 && <Button variant="ghost" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</Button>}
          {(payoutsQuery.data?.data?.length ?? 0) === 20 && (
            <Button variant="ghost" size="sm" onClick={() => setPage((p) => p + 1)}>Next</Button>
          )}
        </div>
      </div>

      <Dialog open={payoutDialog} onOpenChange={setPayoutDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create vendor payout</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input placeholder="Vendor ID (UUID)" value={vendorId} onChange={(e) => setVendorId(e.target.value)} className="h-9 text-xs" />
            <Input placeholder="Amount (₹, blank = full available balance)" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-9 text-xs" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayoutDialog(false)}>Cancel</Button>
            <Button
              disabled={!vendorId || createPayout.isPending}
              onClick={() =>
                createPayout.mutate(
                  { vendorId, amount: amount ? Number(amount) : undefined },
                  {
                    onSuccess: () => {
                      setPayoutDialog(false)
                      setVendorId("")
                      setAmount("")
                    },
                  }
                )
              }
            >
              {createPayout.isPending ? "Creating…" : "Create payout"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

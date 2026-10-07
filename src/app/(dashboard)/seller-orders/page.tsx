"use client"

/**
 * Seller Orders — the per-vendor sub-orders of marketplace checkouts.
 * Every row is one `seller_orders` record (spec §7); parent order number is
 * shown alongside for traceability.
 */

import { useState } from "react"
import { PageHeader } from "@/components/shared/PageHeader"
import { DataList } from "@/components/shared/data-list"
import { QueryErrorBlock } from "@/components/shared/query-error-block"
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useSellerOrderStatusUpdate, useSellerOrders } from "@/hooks/useMarketplace"
import { formatINR } from "@/lib/utils"
import type { SellerOrderRow } from "@/services/marketplace.service"

const STATUS_TABS = [
  { value: "", label: "All" },
  { value: "ORDER_PLACED", label: "New" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "PACKED", label: "Packed" },
  { value: "READY_TO_SHIP", label: "Ready to Ship" },
  { value: "SHIPPED", label: "Shipped" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "CANCELLED", label: "Cancelled" },
]

const VENDOR_ACTIONS = ["CONFIRMED", "PACKED", "READY_TO_SHIP", "CANCELLED"]

function statusVariant(status: string) {
  if (["DELIVERED", "CLOSED"].includes(status)) return "secondary" as const
  if (["CANCELLED", "RETURNED"].includes(status)) return "destructive" as const
  if (["SHIPPED", "OUT_FOR_DELIVERY"].includes(status)) return "default" as const
  return "outline" as const
}

export default function SellerOrdersPage() {
  const [status, setStatus] = useState("")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [actionRow, setActionRow] = useState<SellerOrderRow | null>(null)
  const [nextStatus, setNextStatus] = useState("CONFIRMED")
  const [reason, setReason] = useState("")

  const { data, isLoading, isError, error, refetch } = useSellerOrders({
    status,
    search,
    page,
    limit: 20,
  })
  const updateStatus = useSellerOrderStatusUpdate()

  const rows = data?.data ?? []
  const total = data?.pagination?.total ?? 0

  return (
    <div className="space-y-4">
      <PageHeader
        title="Seller Orders"
        subtitle="Per-vendor sub-orders created from multi-vendor customer checkouts."
      />

      <div className="flex flex-wrap items-center gap-2">
        <Select value={status || "all"} onValueChange={(v) => { setStatus(v === "all" ? "" : v); setPage(1) }}>
          <SelectTrigger className="w-[180px] h-9 text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_TABS.map((t) => (
              <SelectItem key={t.value || "all"} value={t.value || "all"}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          placeholder="Search order number…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="w-[220px] h-9 text-xs"
        />
        <span className="text-xs text-muted-foreground ml-auto">{total} seller orders</span>
      </div>

      {isLoading ? (
        <LoadingSkeleton variant="table" />
      ) : isError ? (
        <QueryErrorBlock error={error} onRetry={() => refetch()} />
      ) : (
        <DataList<SellerOrderRow>
          rows={rows}
          rowKey={(r) => r.id}
          emptyMessage="No seller orders yet."
          columns={[
            {
              id: "number",
              header: "Seller Order",
              cell: (r) => (
                <div>
                  <p className="font-medium text-sm">{r.seller_order_number}</p>
                  <p className="text-xs text-muted-foreground">Parent: {r.parent_order_number ?? r.order_id}</p>
                </div>
              ),
            },
            {
              id: "vendor",
              header: "Vendor / Shop",
              cell: (r) => (
                <div className="text-sm">
                  <p>{r.vendor_name ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">{r.shop_name ?? "—"}</p>
                </div>
              ),
            },
            { id: "items", header: "Items", cell: (r) => <span className="text-sm">{r.item_count ?? "—"}</span> },
            { id: "subtotal", header: "Subtotal", cell: (r) => <span className="text-sm">{formatINR(Number(r.item_subtotal))}</span> },
            { id: "commission", header: "Commission", cell: (r) => <span className="text-sm">{formatINR(Number(r.commission_amount))}</span> },
            { id: "payable", header: "Payable to Seller", cell: (r) => <span className="text-sm font-medium">{formatINR(Number(r.payable_to_seller))}</span> },
            {
              id: "status",
              header: "Status",
              cell: (r) => <Badge variant={statusVariant(r.status)}>{r.status.replaceAll("_", " ")}</Badge>,
            },
            {
              id: "actions",
              header: "",
              cell: (r) =>
                VENDOR_ACTIONS.includes(r.status) || ["ORDER_PLACED", "CONFIRMED", "PACKED"].includes(r.status) ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => { setActionRow(r); setNextStatus("CONFIRMED"); setReason("") }}
                  >
                    Update
                  </Button>
                ) : null,
            },
          ]}
        />
      )}

      {page > 1 && (
        <Button variant="ghost" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))}>
          Previous page
        </Button>
      )}
      {rows.length === 20 && (
        <Button variant="ghost" size="sm" onClick={() => setPage((p) => p + 1)}>
          Next page
        </Button>
      )}

      <Dialog open={!!actionRow} onOpenChange={(open) => !open && setActionRow(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update {actionRow?.seller_order_number}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Select value={nextStatus} onValueChange={setNextStatus}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {VENDOR_ACTIONS.map((s) => (
                  <SelectItem key={s} value={s}>{s.replaceAll("_", " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {nextStatus === "CANCELLED" && (
              <Input
                placeholder="Cancellation reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="h-9 text-xs"
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionRow(null)}>Cancel</Button>
            <Button
              disabled={updateStatus.isPending}
              onClick={() =>
                actionRow &&
                updateStatus.mutate(
                  { id: actionRow.id, status: nextStatus, reason: reason || undefined },
                  { onSuccess: () => setActionRow(null) }
                )
              }
            >
              {updateStatus.isPending ? "Updating…" : "Update status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

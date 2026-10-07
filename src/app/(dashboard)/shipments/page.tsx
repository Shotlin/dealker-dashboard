"use client"

/**
 * Shipments — marketplace shipments (one per seller order) across all
 * providers. Tracking is refreshed through the backend's provider adapter.
 */

import { useState } from "react"
import { PageHeader } from "@/components/shared/PageHeader"
import { DataList } from "@/components/shared/data-list"
import { QueryErrorBlock } from "@/components/shared/query-error-block"
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useShipments, useTrackShipment } from "@/hooks/useMarketplace"
import type { ShipmentRow } from "@/services/marketplace.service"

function statusVariant(status: string) {
  if (status === "DELIVERED") return "secondary" as const
  if (["CANCELLED", "FAILED", "RTO"].includes(status)) return "destructive" as const
  if (["IN_TRANSIT", "OUT_FOR_DELIVERY", "PICKED_UP"].includes(status)) return "default" as const
  return "outline" as const
}

export default function ShipmentsPage() {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState("")
  const { data, isLoading, isError, error, refetch } = useShipments({ page, limit: 20, status })
  const track = useTrackShipment()

  const rows: ShipmentRow[] = data?.data ?? []

  return (
    <div className="space-y-4">
      <PageHeader
        title="Shipments"
        subtitle="One shipment per seller order. Provider statuses map into internal states — never overwrite them."
      />

      <div className="flex flex-wrap gap-1">
        {["", "CREATED", "ASSIGNED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"].map((s) => (
          <Button
            key={s || "all"} size="sm" variant={status === s ? "default" : "outline"}
            className="h-8 text-xs"
            onClick={() => { setStatus(s); setPage(1) }}
          >
            {s ? s.replaceAll("_", " ") : "All"}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <LoadingSkeleton variant="table" />
      ) : isError ? (
        <QueryErrorBlock error={error} onRetry={() => refetch()} />
      ) : (
        <DataList<ShipmentRow>
          rows={rows}
          rowKey={(r) => r.id}
          emptyMessage="No shipments yet — shipments appear when seller orders are handed to a provider."
          columns={[
            { id: "order", header: "Seller Order", cell: (r) => <span className="text-sm font-medium">{r.seller_order_number ?? r.seller_order_id.slice(0, 8)}</span> },
            { id: "parent", header: "Parent Order", cell: (r) => <span className="text-xs text-muted-foreground">{r.parent_order_number ?? "—"}</span> },
            { id: "provider", header: "Provider", cell: (r) => <Badge variant="outline">{r.provider}</Badge> },
            { id: "awb", header: "AWB / Courier", cell: (r) => (
              <div className="text-sm">
                <p>{r.awb ?? "—"}</p>
                <p className="text-xs text-muted-foreground">{r.courier_name ?? ""}</p>
              </div>
            ) },
            { id: "status", header: "Status", cell: (r) => <Badge variant={statusVariant(r.status)}>{r.status.replaceAll("_", " ")}</Badge> },
            { id: "tracking", header: "Tracking", cell: (r) =>
              r.tracking_url ? (
                <a href={r.tracking_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline">Track</a>
              ) : null },
            {
              id: "actions",
              header: "",
              cell: (r) => (
                <Button
                  size="sm" variant="outline" className="h-7 text-xs"
                  disabled={track.isPending}
                  onClick={() => track.mutate(r.id)}
                >
                  Refresh
                </Button>
              ),
            },
          ]}
        />
      )}

      <div className="flex gap-2">
        {page > 1 && <Button variant="ghost" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</Button>}
        {rows.length === 20 && <Button variant="ghost" size="sm" onClick={() => setPage((p) => p + 1)}>Next</Button>}
      </div>
    </div>
  )
}

"use client"
import { useQuery } from "@tanstack/react-query"
import api from "@/lib/api"
import type { OrderOverview } from "@/types/order-overview.types"

export const useOrderOverview = (id: string) =>
  useQuery({ queryKey: ["order-overview", id], queryFn: () => api.get<{ data: OrderOverview }>(`/admin/order-overview/${id}`).then((r) => r.data.data), refetchInterval: 30_000 })

/** Opens an invoice (HTML) in a new tab — fetched with the admin token. */
export async function openInvoice(orderId: string, sellerOrderId?: string) {
  const res = await api.get(`/admin/order-overview/${orderId}/invoice`, { params: sellerOrderId ? { sellerOrderId } : {}, responseType: "blob" })
  const url = URL.createObjectURL(new Blob([res.data], { type: "text/html" }))
  window.open(url, "_blank")
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

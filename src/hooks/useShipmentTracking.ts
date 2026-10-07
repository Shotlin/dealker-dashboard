"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import api from "@/lib/api"

const errMsg = (e: unknown) => (e as { response?: { data?: { message?: string } } })?.response?.data?.message || "Something went wrong"

export function useShipmentTracking() {
  const qc = useQueryClient()
  const refresh = () => { qc.invalidateQueries({ queryKey: ["order-overview"] }); qc.invalidateQueries({ queryKey: ["orders"] }) }
  return {
    addEvent: useMutation({
      mutationFn: ({ shipmentId, ...b }: { shipmentId: string; status: string; location?: string; note?: string }) => api.post(`/admin/order-overview/shipments/${shipmentId}/event`, b).then((r) => r.data),
      onSuccess: () => { refresh(); toast.success("Tracking updated") }, onError: (e) => toast.error(errMsg(e)),
    }),
    create: useMutation({
      mutationFn: ({ sellerOrderId, ...b }: { sellerOrderId: string; provider: string; courierName: string; awb?: string; trackingUrl?: string; eta?: string }) => api.post(`/admin/order-overview/seller-orders/${sellerOrderId}/shipment`, b).then((r) => r.data),
      onSuccess: () => { refresh(); toast.success("Shipment created") }, onError: (e) => toast.error(errMsg(e)),
    }),
    refreshFromCourier: useMutation({
      mutationFn: (shipmentId: string) => api.post(`/admin/order-overview/shipments/${shipmentId}/refresh`, {}).then((r) => r.data as { changed: boolean; message: string }),
      onSuccess: (r) => { refresh(); r.changed ? toast.success(r.message) : toast.info(r.message) }, onError: (e) => toast.error(errMsg(e)),
    }),
  }
}

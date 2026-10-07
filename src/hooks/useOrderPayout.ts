"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import api from "@/lib/api"

const errMsg = (e: unknown) => (e as { response?: { data?: { message?: string } } })?.response?.data?.message || "Something went wrong"

export function useOrderPayout() {
  const qc = useQueryClient()
  const done = (m: string) => () => { qc.invalidateQueries({ queryKey: ["order-overview"] }); qc.invalidateQueries({ queryKey: ["settlements"] }); toast.success(m) }
  const base = "/admin/order-overview"
  return {
    hold: useMutation({ mutationFn: ({ id, reason }: { id: string; reason: string }) => api.post(`${base}/seller-orders/${id}/payout/hold`, { reason }), onSuccess: done("Payment put on hold"), onError: (e) => toast.error(errMsg(e)) }),
    release: useMutation({ mutationFn: (id: string) => api.post(`${base}/seller-orders/${id}/payout/release`, {}), onSuccess: done("Hold released"), onError: (e) => toast.error(errMsg(e)) }),
    pay: useMutation({ mutationFn: ({ id, early }: { id: string; early?: boolean }) => api.post(`${base}/seller-orders/${id}/payout/pay`, { early }), onSuccess: done("Payout created — mark it paid after the transfer"), onError: (e) => toast.error(errMsg(e)) }),
    markPaid: useMutation({ mutationFn: ({ payoutId, utr }: { payoutId: string; utr: string }) => api.post(`${base}/payouts/${payoutId}/mark-paid`, { utr }), onSuccess: done("Marked as paid"), onError: (e) => toast.error(errMsg(e)) }),
  }
}

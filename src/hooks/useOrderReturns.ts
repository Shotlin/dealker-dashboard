"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { approveRefundRequest, createRefundRequest, rejectRefundRequest } from "@/services/refund-requests.service"

const errMsg = (e: unknown) => (e as { response?: { data?: { message?: string } } })?.response?.data?.message || "Something went wrong"

export function useOrderReturnActions() {
  const qc = useQueryClient()
  const done = (m: string) => () => {
    qc.invalidateQueries({ queryKey: ["order-overview"] })
    qc.invalidateQueries({ queryKey: ["refund-requests"] })
    qc.invalidateQueries({ queryKey: ["support"] })
    toast.success(m)
  }
  return {
    create: useMutation({ mutationFn: createRefundRequest, onSuccess: done("Return started — review it below"), onError: (e) => toast.error(errMsg(e)) }),
    approve: useMutation({ mutationFn: ({ id, refundTo }: { id: string; refundTo: "wallet" | "original" }) => approveRefundRequest(id, { refundTo }), onSuccess: done("Refund approved and money returned"), onError: (e) => toast.error(errMsg(e)) }),
    reject: useMutation({ mutationFn: ({ id, adminNote }: { id: string; adminNote: string }) => rejectRefundRequest(id, { adminNote }), onSuccess: done("Return request declined"), onError: (e) => toast.error(errMsg(e)) }),
  }
}

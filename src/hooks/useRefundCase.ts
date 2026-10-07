"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { refundCaseApi } from "@/services/refund-case.service"
import type { RefundCase } from "@/types/refund-case.types"

const key = (id: string) => ["refund-requests", "case", id] as const
const errMsg = (e: unknown) => (e as { response?: { data?: { message?: string } } })?.response?.data?.message || "Something went wrong. Please try again."

export function useRefundCase(id: string) {
  return useQuery({ queryKey: key(id), queryFn: () => refundCaseApi.get(id), refetchInterval: 15_000 })
}

/** Every case action returns the fresh case file, so we just drop it into the cache. */
export function useCaseActions(id: string) {
  const qc = useQueryClient()
  const accept = (message?: string) => (fresh: RefundCase) => {
    qc.setQueryData(key(id), fresh)
    qc.invalidateQueries({ queryKey: ["refund-requests", "list"] })
    if (message) toast.success(message)
  }
  const onError = (e: unknown) => toast.error(errMsg(e))
  return {
    start: useMutation({ mutationFn: (b: Parameters<typeof refundCaseApi.start>[1]) => refundCaseApi.start(id, b), onSuccess: accept("Investigation started"), onError }),
    patch: useMutation({ mutationFn: (b: Parameters<typeof refundCaseApi.patch>[1]) => refundCaseApi.patch(id, b), onSuccess: accept("Saved"), onError }),
    note: useMutation({ mutationFn: (b: Parameters<typeof refundCaseApi.note>[1]) => refundCaseApi.note(id, b), onSuccess: accept("Note saved"), onError }),
    call: useMutation({ mutationFn: (b: Parameters<typeof refundCaseApi.call>[1]) => refundCaseApi.call(id, b), onSuccess: accept("Call saved to the timeline"), onError }),
    addEvidence: useMutation({ mutationFn: (b: Parameters<typeof refundCaseApi.addEvidence>[1]) => refundCaseApi.addEvidence(id, b), onSuccess: accept("Proof added"), onError }),
    reviewEvidence: useMutation({ mutationFn: (v: { evidenceId: string; review: Parameters<typeof refundCaseApi.reviewEvidence>[2]["review"]; note?: string }) => refundCaseApi.reviewEvidence(id, v.evidenceId, { review: v.review, note: v.note }), onSuccess: accept(), onError }),
    removeEvidence: useMutation({ mutationFn: (evidenceId: string) => refundCaseApi.removeEvidence(id, evidenceId), onSuccess: accept("Proof removed"), onError }),
    setCheck: useMutation({ mutationFn: (v: { key: string; done: boolean; note?: string }) => refundCaseApi.setCheck(id, v.key, { done: v.done, note: v.note }), onSuccess: accept(), onError }),
  }
}

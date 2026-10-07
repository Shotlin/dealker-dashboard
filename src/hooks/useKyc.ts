"use client"

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { kycApi } from "@/services/kyc.admin.service"
import type { KycAction } from "@/types/kyc.types"

const errMsg = (e: unknown) => (e as { response?: { data?: { message?: string } } })?.response?.data?.message || "Something went wrong"

export const useKycSummary = () => useQuery({ queryKey: ["kyc", "summary"], queryFn: kycApi.summary, refetchInterval: 60_000 })
export const useKycList = (p: Record<string, unknown>) => useQuery({ queryKey: ["kyc", "list", p], queryFn: () => kycApi.list(p), placeholderData: keepPreviousData })
export const useKycDetail = (id: string | null) => useQuery({ queryKey: ["kyc", "detail", id], queryFn: () => kycApi.detail(id as string), enabled: Boolean(id) })

export function useKycActions(id: string) {
  const qc = useQueryClient()
  const refresh = () => { qc.invalidateQueries({ queryKey: ["kyc"] }); qc.invalidateQueries({ queryKey: ["marketplace-summary"] }) }
  return {
    review: useMutation({
      mutationFn: (b: { action: KycAction; comments?: string; override?: boolean }) => kycApi.review(id, b),
      onSuccess: (_d, v) => { refresh(); toast.success({ START_REVIEW: "Review started", APPROVE: "Vendor verified", ACTIVATE: "Store is live", REQUEST_CORRECTION: "Sent back to the vendor", REJECT: "Application rejected", SUSPEND: "Vendor suspended", REINSTATE: "Vendor reinstated" }[v.action]) },
      onError: (e) => toast.error(errMsg(e)),
    }),
    reviewDoc: useMutation({
      mutationFn: ({ docId, ...b }: { docId: string; status: "VERIFIED" | "REJECTED" | "PENDING"; reason?: string }) => kycApi.reviewDoc(id, docId, b),
      onSuccess: refresh, onError: (e) => toast.error(errMsg(e)),
    }),
  }
}

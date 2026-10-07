"use client"

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { b2bAdminApi } from "@/services/b2b.admin.service"

const errMsg = (e: unknown) => (e as { response?: { data?: { message?: string } } })?.response?.data?.message || "Something went wrong"

export const useB2bStats = () => useQuery({ queryKey: ["b2b", "stats"], queryFn: b2bAdminApi.stats, refetchInterval: 60_000 })
export const useB2bRequirements = (p: Record<string, unknown>) =>
  useQuery({ queryKey: ["b2b", "requirements", p], queryFn: () => b2bAdminApi.requirements(p), placeholderData: keepPreviousData })
export const useB2bRequirement = (id: string | null) =>
  useQuery({ queryKey: ["b2b", "requirement", id], queryFn: () => b2bAdminApi.requirement(id as string), enabled: Boolean(id) })
export const useB2bOrders = (p: Record<string, unknown>) =>
  useQuery({ queryKey: ["b2b", "orders", p], queryFn: () => b2bAdminApi.orders(p), placeholderData: keepPreviousData })
export const useB2bVendors = () => useQuery({ queryKey: ["b2b", "vendors"], queryFn: b2bAdminApi.vendors, staleTime: 120_000 })
export const useB2bSettings = () => useQuery({ queryKey: ["b2b", "settings"], queryFn: b2bAdminApi.settings })

export function useB2bMutations() {
  const qc = useQueryClient()
  const refresh = () => qc.invalidateQueries({ queryKey: ["b2b"] })
  const ok = (m: string) => () => { refresh(); toast.success(m) }
  return {
    createRequirement: useMutation({ mutationFn: (b: Record<string, unknown>) => b2bAdminApi.createRequirement(b), onSuccess: ok("Requirement posted — eligible vendors notified"), onError: (e) => toast.error(errMsg(e)) }),
    addQuote: useMutation({ mutationFn: ({ id, ...b }: { id: string } & Record<string, unknown>) => b2bAdminApi.addQuote(id, b), onSuccess: ok("Quote saved"), onError: (e) => toast.error(errMsg(e)) }),
    withdrawQuote: useMutation({ mutationFn: (id: string) => b2bAdminApi.withdrawQuote(id), onSuccess: ok("Quote withdrawn"), onError: (e) => toast.error(errMsg(e)) }),
    award: useMutation({ mutationFn: ({ id, selections }: { id: string; selections: { quoteId: string; quantity: number }[] }) => b2bAdminApi.award(id, selections), onSuccess: ok("Order split created — awaiting buyer payment"), onError: (e) => toast.error(errMsg(e)) }),
    pay: useMutation({ mutationFn: ({ id, ...b }: { id: string; method?: string; reference?: string }) => b2bAdminApi.pay(id, b), onSuccess: ok("Payment recorded — held in escrow"), onError: (e) => toast.error(errMsg(e)) }),
    setOrderStatus: useMutation({ mutationFn: ({ id, ...b }: { id: string; status: "PACKED" | "DISPATCHED" | "DELIVERED"; courierName?: string; awb?: string; trackingUrl?: string }) => b2bAdminApi.setOrderStatus(id, b), onSuccess: ok("Order updated"), onError: (e) => toast.error(errMsg(e)) }),
    receive: useMutation({ mutationFn: ({ id, ...b }: { id: string; receivedQuantity?: number; ok?: boolean; note?: string }) => b2bAdminApi.receive(id, b), onSuccess: ok("Receipt recorded"), onError: (e) => toast.error(errMsg(e)) }),
    cancel: useMutation({ mutationFn: ({ id, reason }: { id: string; reason: string }) => b2bAdminApi.cancel(id, reason), onSuccess: ok("Requirement cancelled"), onError: (e) => toast.error(errMsg(e)) }),
    resolve: useMutation({ mutationFn: ({ id, ...b }: { id: string; decision: "RELEASE" | "REFUND" | "PARTIAL"; releaseQuantity?: number; note?: string }) => b2bAdminApi.resolve(id, b), onSuccess: ok("Dispute resolved"), onError: (e) => toast.error(errMsg(e)) }),
    setDefault: useMutation({ mutationFn: (pct: number) => b2bAdminApi.setDefault(pct), onSuccess: ok("Default commission updated"), onError: (e) => toast.error(errMsg(e)) }),
    setVendor: useMutation({ mutationFn: ({ id, percent }: { id: string; percent: number | null }) => b2bAdminApi.setVendor(id, percent), onSuccess: ok("Seller commission updated"), onError: (e) => toast.error(errMsg(e)) }),
  }
}

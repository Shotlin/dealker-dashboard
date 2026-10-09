/** Money core hooks — commission rules + vendor wallet. */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { commissionApi, vendorWalletApi } from "@/services/money.service"
import type { CommissionRuleInput } from "@/services/money.service"

const keys = {
  rules: (f: Record<string, unknown>) => ["money", "commission", "rules", f] as const,
  walletOverview: ["money", "wallet", "overview"] as const,
  wallets: (f: Record<string, unknown>) => ["money", "wallet", "list", f] as const,
  txns: (id: string, f: Record<string, unknown>) => ["money", "wallet", "txns", id, f] as const,
  reasons: ["money", "wallet", "reasons"] as const,
}

const msg = (e: unknown, fallback: string) =>
  (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback

export function useCommissionRules(filters: Record<string, unknown>) {
  return useQuery({
    queryKey: keys.rules(filters),
    queryFn: () => commissionApi.list(filters),
    placeholderData: (prev) => prev,
  })
}

export function useSaveCommissionRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: { id?: string } & Partial<CommissionRuleInput>) =>
      id ? commissionApi.update(id, body) : commissionApi.create(body as CommissionRuleInput),
    onSuccess: (_d, v) => {
      toast.success(v.id ? "Rule updated" : "Rule created")
      qc.invalidateQueries({ queryKey: ["money", "commission"] })
    },
    onError: (e) => toast.error(msg(e, "Could not save the rule")),
  })
}

export function useDeleteCommissionRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => commissionApi.remove(id),
    onSuccess: () => {
      toast.success("Rule deleted")
      qc.invalidateQueries({ queryKey: ["money", "commission"] })
    },
    onError: (e) => toast.error(msg(e, "Could not delete the rule")),
  })
}

export function useVendorWalletOverview() {
  return useQuery({ queryKey: keys.walletOverview, queryFn: () => vendorWalletApi.overview() })
}

export function useVendorWallets(filters: Record<string, unknown>) {
  return useQuery({
    queryKey: keys.wallets(filters),
    queryFn: () => vendorWalletApi.list(filters),
    placeholderData: (prev) => prev,
  })
}

export function useWalletReasons() {
  return useQuery({ queryKey: keys.reasons, queryFn: () => vendorWalletApi.reasons(), staleTime: Infinity })
}

export function useVendorWalletTxns(vendorId: string | null, filters: Record<string, unknown>) {
  return useQuery({
    queryKey: keys.txns(vendorId ?? "", filters),
    queryFn: () => vendorWalletApi.transactions(vendorId!, filters),
    enabled: !!vendorId,
    placeholderData: (prev) => prev,
  })
}

export function useAddWalletEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ vendorId, ...body }: Parameters<typeof vendorWalletApi.addEntry>[1] & { vendorId: string }) =>
      vendorWalletApi.addEntry(vendorId, body),
    onSuccess: () => {
      toast.success("Wallet entry recorded")
      qc.invalidateQueries({ queryKey: ["money", "wallet"] })
    },
    onError: (e) => toast.error(msg(e, "Could not record the entry")),
  })
}

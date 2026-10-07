"use client"

/** Sponsored-ads hooks — TanStack Query bindings. */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { adsApi, apiMessage, type AdSettings, type CreateCampaignInput, type KeywordInput, type MatchType } from "@/services/ads.service"

export const adKeys = {
  all: ["ads"] as const,
  rules: ["ads", "rules"] as const,
  settings: ["ads", "settings"] as const,
  overview: (f: Record<string, unknown>) => ["ads", "overview", f] as const,
  list: (f: Record<string, unknown>) => ["ads", "list", f] as const,
  detail: (id: string) => ["ads", "detail", id] as const,
  report: (id: string, days: number) => ["ads", "report", id, days] as const,
  clicks: (id: string) => ["ads", "clicks", id] as const,
  wallet: (vendorId?: string) => ["ads", "wallet", vendorId ?? "me"] as const,
  statement: (f: Record<string, unknown>) => ["ads", "statement", f] as const,
  wallets: (f: Record<string, unknown>) => ["ads", "wallets", f] as const,
  products: (q: string, vendorId?: string) => ["ads", "products", q, vendorId ?? "me"] as const,
}

export const useAdRules = () => useQuery({ queryKey: adKeys.rules, queryFn: adsApi.rules, staleTime: 60_000 })
export const useAdSettings = () => useQuery({ queryKey: adKeys.settings, queryFn: adsApi.settings })

export const useAdOverview = (filters: { days?: number; vendorId?: string }) =>
  useQuery({ queryKey: adKeys.overview(filters), queryFn: () => adsApi.overview(filters), refetchInterval: 60_000 })

export const useCampaignList = (filters: Record<string, unknown>) =>
  useQuery({ queryKey: adKeys.list(filters), queryFn: () => adsApi.list(filters), placeholderData: (prev) => prev, refetchInterval: 30_000 })

export const useCampaign = (id: string) =>
  useQuery({ queryKey: adKeys.detail(id), queryFn: () => adsApi.get(id), enabled: !!id, refetchInterval: 30_000 })

export const useCampaignReport = (id: string, days: number) =>
  useQuery({ queryKey: adKeys.report(id, days), queryFn: () => adsApi.report(id, days), enabled: !!id })

export const useCampaignClicks = (id: string, enabled: boolean) =>
  useQuery({ queryKey: adKeys.clicks(id), queryFn: () => adsApi.clicks(id), enabled: !!id && enabled })

export const useAdWallet = (vendorId?: string, enabled = true) =>
  useQuery({ queryKey: adKeys.wallet(vendorId), queryFn: () => adsApi.wallet(vendorId), enabled, refetchInterval: 30_000 })

export const useAdStatement = (filters: Record<string, unknown>, enabled = true) =>
  useQuery({ queryKey: adKeys.statement(filters), queryFn: () => adsApi.statement(filters), enabled, placeholderData: (prev) => prev })

export const useVendorWallets = (filters: Record<string, unknown>, enabled: boolean) =>
  useQuery({ queryKey: adKeys.wallets(filters), queryFn: () => adsApi.wallets(filters), enabled, placeholderData: (prev) => prev })

export const useAdProducts = (q: string, vendorId: string | undefined, enabled: boolean) =>
  useQuery({ queryKey: adKeys.products(q, vendorId), queryFn: () => adsApi.products(q, vendorId), enabled, staleTime: 15_000 })

export const useKeywordEstimate = (keyword: string, matchType: MatchType) =>
  useQuery({
    queryKey: ["ads", "estimate", keyword, matchType],
    queryFn: () => adsApi.estimate(keyword, matchType),
    enabled: keyword.trim().length >= 2,
    staleTime: 60_000,
  })

function useAdMutation<TVars, TData>(fn: (v: TVars) => Promise<TData>, opts: { success?: string; error: string }) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      if (opts.success) toast.success(opts.success)
      qc.invalidateQueries({ queryKey: adKeys.all })
    },
    onError: (e) => toast.error(apiMessage(e, opts.error)),
  })
}

export const useCreateCampaign = () =>
  useAdMutation((body: CreateCampaignInput) => adsApi.create(body), { error: "Could not create the campaign" })

export const useUpdateCampaign = (id: string) =>
  useAdMutation((body: Record<string, unknown>) => adsApi.update(id, body), { success: "Campaign updated", error: "Could not update the campaign" })

type ActionName = Parameters<typeof adsApi.action>[1]
const ACTION_TOAST: Record<ActionName, string> = {
  submit: "Submitted", pause: "Campaign paused", resume: "Campaign resumed", end: "Campaign ended",
  approve: "Campaign approved and live", reject: "Campaign rejected", suspend: "Campaign suspended", unsuspend: "Campaign unsuspended",
}
export function useCampaignAction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, name, body }: { id: string; name: ActionName; body?: Record<string, unknown> }) => adsApi.action(id, name, body),
    onSuccess: (data, v) => {
      toast.success(v.name === "submit" && data.status === "PENDING_REVIEW" ? "Submitted for review" : ACTION_TOAST[v.name])
      qc.invalidateQueries({ queryKey: adKeys.all })
    },
    onError: (e) => toast.error(apiMessage(e, "Action failed")),
  })
}

export const useAddProducts = (id: string) =>
  useAdMutation(({ productIds, bidOverride }: { productIds: string[]; bidOverride?: number | null }) => adsApi.addProducts(id, productIds, bidOverride), { success: "Products added", error: "Could not add products" })
export const useUpdateProduct = (id: string) =>
  useAdMutation(({ productId, ...body }: { productId: string; status?: string; bidOverride?: number | null }) => adsApi.updateProduct(id, productId, body), { error: "Could not update the product" })
export const useRemoveProduct = (id: string) =>
  useAdMutation((productId: string) => adsApi.removeProduct(id, productId), { success: "Product removed", error: "Could not remove the product" })
export const useAddKeywords = (id: string) =>
  useAdMutation((keywords: KeywordInput[]) => adsApi.addKeywords(id, keywords), { success: "Keywords added", error: "Could not add keywords" })
export const useUpdateKeyword = (id: string) =>
  useAdMutation(({ keywordId, ...body }: { keywordId: string; status?: string; bid?: number | null }) => adsApi.updateKeyword(id, keywordId, body), { error: "Could not update the keyword" })
export const useRemoveKeyword = (id: string) =>
  useAdMutation((keywordId: string) => adsApi.removeKeyword(id, keywordId), { success: "Keyword removed", error: "Could not remove the keyword" })

export const useTopUp = () =>
  useAdMutation(({ amount, key }: { amount: number; key: string }) => adsApi.topUp(amount, key), { success: "Money added to your ad wallet", error: "Top-up failed" })
export const useWithdraw = () =>
  useAdMutation((amount: number) => adsApi.withdraw(amount), { success: "Moved back to your settlement balance", error: "Withdrawal failed" })
export const useAdminCredit = () =>
  useAdMutation(adsApi.credit, { success: "Wallet updated", error: "Could not update the wallet" })
export const useRefundClick = () =>
  useAdMutation(({ clickId, reason }: { clickId: string; reason: string }) => adsApi.refundClick(clickId, reason), { success: "Click refunded", error: "Could not refund the click" })
export const useUpdateAdSettings = () =>
  useAdMutation((body: Partial<AdSettings>) => adsApi.updateSettings(body), { success: "Ad rules saved", error: "Could not save the rules" })

export { ACTION_TOAST }

/**
 * Marketplace hooks — TanStack Query bindings for Dealker surfaces.
 * Pattern matches the existing services/ + hooks/ layering.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import api from "@/lib/api"
import {
  b2bSupplyApi,
  loyaltyApi,
  marketplaceVendors,
  referralsApi,
  sellerListingsApi,
  sellerOrdersApi,
  settlementsApi,
  shippingApi,
} from "@/services/marketplace.service"
import type { LoyaltySettings, ReferralSettings } from "@/services/marketplace.service"

export const marketplaceKeys = {
  vendors: (filters: Record<string, unknown>) => ["marketplace", "vendors", filters] as const,
  sellerOrders: (filters: Record<string, unknown>) => ["marketplace", "seller-orders", filters] as const,
  sellerListings: (filters: Record<string, unknown>) => ["marketplace", "seller-listings", filters] as const,
  loyaltySettings: ["marketplace", "loyalty", "settings"] as const,
  loyaltyStats: ["marketplace", "loyalty", "stats"] as const,
  loyaltyCustomers: (filters: Record<string, unknown>) => ["marketplace", "loyalty", "customers", filters] as const,
  referralSettings: ["marketplace", "referrals", "settings"] as const,
  referrals: (filters: Record<string, unknown>) => ["marketplace", "referrals", filters] as const,
  settlementOverview: ["marketplace", "settlements", "overview"] as const,
  payouts: (filters: Record<string, unknown>) => ["marketplace", "payouts", filters] as const,
  shippingProviders: ["marketplace", "shipping", "providers"] as const,
  shippingRules: ["marketplace", "shipping", "rules"] as const,
  shipments: (filters: Record<string, unknown>) => ["marketplace", "shipments", filters] as const,
  supplies: (filters: Record<string, unknown>) => ["marketplace", "supplies", filters] as const,
}

// ── Vendors ─────────────────────────────────────────────────────────────

export function useMarketplaceVendors(filters: Record<string, unknown>) {
  return useQuery({
    queryKey: marketplaceKeys.vendors(filters),
    queryFn: () => marketplaceVendors.list(filters),
  })
}

export function useVendorKycAction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, kycStatus }: { id: string; kycStatus: string }) =>
      marketplaceVendors.updateKyc(id, kycStatus),
    onSuccess: (_data, variables) => {
      toast.success(`Vendor KYC marked ${variables.kycStatus}`)
      qc.invalidateQueries({ queryKey: ["marketplace", "vendors"] })
    },
  })
}

// ── Seller orders ───────────────────────────────────────────────────────

export function useSellerOrders(filters: Record<string, unknown>) {
  return useQuery({
    queryKey: marketplaceKeys.sellerOrders(filters),
    queryFn: () => sellerOrdersApi.list(filters),
  })
}

export function useSellerOrderStatusUpdate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: string; reason?: string }) =>
      sellerOrdersApi.updateStatus(id, status, reason),
    onSuccess: () => {
      toast.success("Seller order status updated")
      qc.invalidateQueries({ queryKey: ["marketplace", "seller-orders"] })
    },
  })
}

// ── Seller listings ─────────────────────────────────────────────────────

export function useSellerListings(filters: Record<string, unknown>) {
  return useQuery({
    queryKey: marketplaceKeys.sellerListings(filters),
    queryFn: () => sellerListingsApi.list(filters),
  })
}

export function useListingModeration() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; listingStatus?: string; approvalStatus?: string; reason?: string }) =>
      sellerListingsApi.moderate(id, body),
    onSuccess: () => {
      toast.success("Listing updated")
      qc.invalidateQueries({ queryKey: ["marketplace", "seller-listings"] })
    },
  })
}

// ── Loyalty ─────────────────────────────────────────────────────────────

export function useLoyaltySettings() {
  return useQuery({ queryKey: marketplaceKeys.loyaltySettings, queryFn: () => loyaltyApi.settings() })
}

export function useUpdateLoyaltySettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Partial<LoyaltySettings>) => loyaltyApi.updateSettings(body),
    onSuccess: () => {
      toast.success("Loyalty settings saved")
      qc.invalidateQueries({ queryKey: ["marketplace", "loyalty"] })
    },
  })
}

export function useLoyaltyStats() {
  return useQuery({ queryKey: marketplaceKeys.loyaltyStats, queryFn: () => loyaltyApi.stats() })
}

export function useLoyaltyCustomers(filters: Record<string, unknown>) {
  return useQuery({
    queryKey: marketplaceKeys.loyaltyCustomers(filters),
    queryFn: () => loyaltyApi.customers(filters),
  })
}

// ── Referrals ───────────────────────────────────────────────────────────

export function useReferralSettings() {
  return useQuery({ queryKey: marketplaceKeys.referralSettings, queryFn: () => referralsApi.settings() })
}

export function useUpdateReferralSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Partial<ReferralSettings>) => referralsApi.updateSettings(body),
    onSuccess: () => {
      toast.success("Referral settings saved")
      qc.invalidateQueries({ queryKey: ["marketplace", "referrals"] })
    },
  })
}

export function useReferrals(filters: Record<string, unknown>) {
  return useQuery({
    queryKey: marketplaceKeys.referrals(filters),
    queryFn: () => referralsApi.list(filters),
  })
}

// ── Settlements ─────────────────────────────────────────────────────────

export function useSettlementOverview() {
  return useQuery({ queryKey: marketplaceKeys.settlementOverview, queryFn: () => settlementsApi.overview() })
}

export function usePayouts(filters: Record<string, unknown>) {
  return useQuery({
    queryKey: marketplaceKeys.payouts(filters),
    queryFn: () => settlementsApi.payouts(filters),
  })
}

export function useCreatePayout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ vendorId, ...body }: { vendorId: string; amount?: number; notes?: string }) =>
      settlementsApi.createPayout(vendorId, body),
    onSuccess: () => {
      toast.success("Payout created")
      qc.invalidateQueries({ queryKey: ["marketplace"] })
    },
  })
}

export function useMarkPayoutPaid() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ payoutId, utrNumber }: { payoutId: string; utrNumber?: string }) =>
      settlementsApi.markPayoutPaid(payoutId, utrNumber),
    onSuccess: () => {
      toast.success("Payout marked paid")
      qc.invalidateQueries({ queryKey: ["marketplace"] })
    },
  })
}

// ── Shipping ────────────────────────────────────────────────────────────

export function useShippingProviders() {
  return useQuery({ queryKey: marketplaceKeys.shippingProviders, queryFn: () => shippingApi.providers() })
}

export function useUpdateShippingProvider() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ provider, ...body }: { provider: string; enabled?: boolean; mode?: string }) =>
      shippingApi.updateProvider(provider, body),
    onSuccess: () => {
      toast.success("Provider settings saved")
      qc.invalidateQueries({ queryKey: ["marketplace", "shipping", "providers"] })
    },
  })
}

export function useShippingRules() {
  return useQuery({ queryKey: marketplaceKeys.shippingRules, queryFn: () => shippingApi.rules() })
}

export function useSaveShippingRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => shippingApi.saveRule(body),
    onSuccess: () => {
      toast.success("Shipping rule saved")
      qc.invalidateQueries({ queryKey: ["marketplace", "shipping", "rules"] })
    },
  })
}

export function useShipments(filters: Record<string, unknown>) {
  return useQuery({
    queryKey: marketplaceKeys.shipments(filters),
    queryFn: () => shippingApi.shipments(filters),
  })
}

export function useTrackShipment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (shipmentId: string) => shippingApi.track(shipmentId),
    onSuccess: () => {
      toast.success("Tracking refreshed")
      qc.invalidateQueries({ queryKey: ["marketplace", "shipments"] })
    },
  })
}

// ── B2B supply ──────────────────────────────────────────────────────────

export function useSupplies(filters: Record<string, unknown>) {
  return useQuery({
    queryKey: marketplaceKeys.supplies(filters),
    queryFn: () => b2bSupplyApi.supplies(filters),
  })
}

// ── Dashboard summary (counts for the admin action queue) ───────────────

async function countOf(url: string, params: Record<string, unknown>): Promise<number> {
  const res = await api.get(url, { params: { ...params, limit: 1 } })
  return Number(res.data?.pagination?.total ?? res.data?.data?.pagination?.total ?? 0)
}

export function useMarketplaceSummary() {
  return useQuery({
    queryKey: ["marketplace-summary"],
    queryFn: async () => {
      const [activeVendors, kycPending, listingsPending] = await Promise.all([
        countOf("/vendors", { status: "ACTIVE" }),
        countOf("/vendors", { status: "KYC_SUBMITTED" }),
        countOf("/admin/seller-listings", { approvalStatus: "PENDING" }),
      ])
      return { activeVendors, kycPending, listingsPending }
    },
    refetchInterval: 60_000,
  })
}

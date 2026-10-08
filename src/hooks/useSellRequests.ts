"use client"

/**
 * TanStack Query bindings for the two separate sections (SELL, EXCHANGE).
 * Every key carries the section, so a mutation in one never refetches or touches the other.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  apiMessage,
  requestsApi,
  sellSettingsApi,
  type CreateSellRequestInput,
  type ModelInput,
  type QuoteInput,
  type RequestKind,
  type SellRequestAction,
  type SellRequestFilters,
} from "@/services/sell-requests.service"

export const requestKeys = {
  section: (k: RequestKind) => ["requests", k] as const,
  stats: (k: RequestKind) => ["requests", k, "stats"] as const,
  list: (k: RequestKind, f: SellRequestFilters) => ["requests", k, "list", f] as const,
  detail: (k: RequestKind, id: string) => ["requests", k, "detail", id] as const,
  quote: (k: RequestKind, q: QuoteInput) => ["requests", k, "quote", q] as const,
  models: ["requests", "models"] as const,
  settings: ["requests", "settings"] as const,
}

export const useRequestStats = (kind: RequestKind) =>
  useQuery({ queryKey: requestKeys.stats(kind), queryFn: requestsApi(kind).stats })

export const useRequestList = (kind: RequestKind, filters: SellRequestFilters) =>
  useQuery({
    queryKey: requestKeys.list(kind, filters),
    queryFn: () => requestsApi(kind).list(filters),
    placeholderData: (prev) => prev,
  })

export const useRequest = (kind: RequestKind, id: string | null) =>
  useQuery({
    queryKey: requestKeys.detail(kind, id ?? ""),
    queryFn: () => requestsApi(kind).get(id as string),
    enabled: !!id,
  })

export function useRequestAction(kind: RequestKind) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { id: string; action: SellRequestAction; note?: string; vendorId?: string }) =>
      requestsApi(kind).act(v.id, v.action, { note: v.note, vendorId: v.vendorId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: requestKeys.section(kind) })
      toast.success("Request updated")
    },
    onError: (e) => toast.error(apiMessage(e)),
  })
}

export function useCreateRequest(kind: RequestKind) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateSellRequestInput) => requestsApi(kind).create(input),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: requestKeys.section(kind) })
      toast.success(`${r.code} created`)
    },
    onError: (e) => toast.error(apiMessage(e)),
  })
}

/** EXCHANGE only. */
export function useLinkOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { id: string; orderNumber: string }) => requestsApi("EXCHANGE").linkOrder(v.id, v.orderNumber),
    onSuccess: () => { qc.invalidateQueries({ queryKey: requestKeys.section("EXCHANGE") }); toast.success("Order linked") },
    onError: (e) => toast.error(apiMessage(e)),
  })
}

export const useCatalogModels = (kind: RequestKind) =>
  useQuery({ queryKey: [...requestKeys.models, kind], queryFn: requestsApi(kind).models, staleTime: 5 * 60_000 })

/** Live server-side valuation for the create wizard. */
export const useRequestQuote = (kind: RequestKind, q: QuoteInput, enabled: boolean) =>
  useQuery({
    queryKey: requestKeys.quote(kind, q),
    queryFn: () => requestsApi(kind).quote(q),
    enabled,
    staleTime: 30_000,
  })

// ── shared settings + catalogue (edited from the Sell section) ─────────

export const useSellSettings = () => useQuery({ queryKey: requestKeys.settings, queryFn: sellSettingsApi.settings })

export function useUpdateSellSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: sellSettingsApi.updateSettings,
    onSuccess: () => { qc.invalidateQueries({ queryKey: requestKeys.settings }); toast.success("Settings saved — new quotes use them immediately") },
    onError: (e) => toast.error(apiMessage(e)),
  })
}

export function useSaveSellModel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { id?: string; body: Partial<ModelInput> }) =>
      v.id ? sellSettingsApi.updateModel(v.id, v.body) : sellSettingsApi.createModel(v.body as ModelInput),
    onSuccess: () => { qc.invalidateQueries({ queryKey: requestKeys.models }); toast.success("Model saved") },
    onError: (e) => toast.error(apiMessage(e)),
  })
}

export const useSellModels = () =>
  useQuery({ queryKey: [...requestKeys.models, "admin"], queryFn: requestsApi("SELL").models, staleTime: 60_000 })

export const useUploadSellImages = () =>
  useMutation({ mutationFn: sellSettingsApi.uploadImages, onError: (e) => toast.error(apiMessage(e, "Upload failed")) })

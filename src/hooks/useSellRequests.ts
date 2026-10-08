"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  apiMessage,
  sellRequestsApi,
  type CreateSellRequestInput,
  type ModelInput,
  type QuoteInput,
  type SellRequestAction,
  type SellRequestFilters,
} from "@/services/sell-requests.service"

export const sellRequestKeys = {
  all: ["sell-requests"] as const,
  stats: ["sell-requests", "stats"] as const,
  list: (f: SellRequestFilters) => ["sell-requests", "list", f] as const,
  models: ["sell-requests", "models"] as const,
  quote: (q: QuoteInput) => ["sell-requests", "quote", q] as const,
  detail: (id: string) => ["sell-requests", "detail", id] as const,
}

export const useSellRequestStats = () =>
  useQuery({ queryKey: sellRequestKeys.stats, queryFn: sellRequestsApi.stats })

export const useSellRequestList = (filters: SellRequestFilters) =>
  useQuery({
    queryKey: sellRequestKeys.list(filters),
    queryFn: () => sellRequestsApi.list(filters),
    placeholderData: (prev) => prev,
  })

export const useSellRequest = (id: string | null) =>
  useQuery({
    queryKey: sellRequestKeys.detail(id ?? ""),
    queryFn: () => sellRequestsApi.get(id as string),
    enabled: !!id,
  })

export function useSellRequestAction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { id: string; action: SellRequestAction; note?: string; vendorId?: string }) =>
      sellRequestsApi.act(v.id, v.action, { note: v.note, vendorId: v.vendorId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: sellRequestKeys.all })
      toast.success("Request updated")
    },
    onError: (e) => toast.error(apiMessage(e)),
  })
}

export function useCreateSellRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateSellRequestInput) => sellRequestsApi.create(input),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: sellRequestKeys.all })
      toast.success(`${r.code} created`)
    },
    onError: (e) => toast.error(apiMessage(e)),
  })
}

export const useSellModels = () =>
  useQuery({ queryKey: sellRequestKeys.models, queryFn: sellRequestsApi.models, staleTime: 5 * 60_000 })

/** Live server-side valuation for the create wizard. */
export const useSellQuote = (q: QuoteInput, enabled: boolean) =>
  useQuery({
    queryKey: sellRequestKeys.quote(q),
    queryFn: () => sellRequestsApi.quote(q),
    enabled,
    staleTime: 30_000,
  })

export function useLinkOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { id: string; orderNumber: string }) => sellRequestsApi.linkOrder(v.id, v.orderNumber),
    onSuccess: () => { qc.invalidateQueries({ queryKey: sellRequestKeys.all }); toast.success("Order linked") },
    onError: (e) => toast.error(apiMessage(e)),
  })
}

export const useSellSettings = () => useQuery({ queryKey: ["sell-requests", "settings"], queryFn: sellRequestsApi.settings })

export function useUpdateSellSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: sellRequestsApi.updateSettings,
    onSuccess: () => { qc.invalidateQueries({ queryKey: sellRequestKeys.all }); toast.success("Settings saved — new quotes use them immediately") },
    onError: (e) => toast.error(apiMessage(e)),
  })
}

export function useSaveSellModel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { id?: string; body: Partial<ModelInput> }) =>
      v.id ? sellRequestsApi.updateModel(v.id, v.body) : sellRequestsApi.createModel(v.body as ModelInput),
    onSuccess: () => { qc.invalidateQueries({ queryKey: sellRequestKeys.models }); toast.success("Model saved") },
    onError: (e) => toast.error(apiMessage(e)),
  })
}

export const useUploadSellImages = () =>
  useMutation({ mutationFn: sellRequestsApi.uploadImages, onError: (e) => toast.error(apiMessage(e, "Upload failed")) })

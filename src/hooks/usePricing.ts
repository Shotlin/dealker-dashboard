"use client"

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { pricingApi } from "@/services/pricing.service"

const errMsg = (e: unknown) => (e as { response?: { data?: { message?: string } } })?.response?.data?.message || "Something went wrong"

export const usePricingBrands = () => useQuery({ queryKey: ["pricing", "brands"], queryFn: pricingApi.brands, staleTime: 120_000 })
export const useBatches = (page: number) =>
  useQuery({ queryKey: ["pricing", "batches", page], queryFn: () => pricingApi.batches({ page, limit: 15 }), placeholderData: keepPreviousData })
export const useBatchItems = (id: string | null) =>
  useQuery({ queryKey: ["pricing", "batch", id], queryFn: () => pricingApi.batchItems(id as string), enabled: Boolean(id) })

export function usePricingActions() {
  const qc = useQueryClient()
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["pricing"] })
    qc.invalidateQueries({ queryKey: ["listings"] })
    qc.invalidateQueries({ queryKey: ["merch"] })
  }
  return {
    previewPrice: useMutation({ mutationFn: pricingApi.previewPrice, onError: (e) => toast.error(errMsg(e)) }),
    previewStock: useMutation({ mutationFn: pricingApi.previewStock, onError: (e) => toast.error(errMsg(e)) }),
    applyPrice: useMutation({
      mutationFn: pricingApi.applyPrice,
      onSuccess: (r) => { refresh(); toast.success(`Prices updated on ${r.changed} listing${r.changed === 1 ? "" : "s"}${r.skipped ? ` (${r.skipped} skipped)` : ""}`) },
      onError: (e) => toast.error(errMsg(e)),
    }),
    applyStock: useMutation({
      mutationFn: pricingApi.applyStock,
      onSuccess: (r) => { refresh(); toast.success(`Stock updated on ${r.changed} listing${r.changed === 1 ? "" : "s"}${r.skipped ? ` (${r.skipped} skipped)` : ""}`) },
      onError: (e) => toast.error(errMsg(e)),
    }),
    revert: useMutation({
      mutationFn: pricingApi.revert,
      onSuccess: (r) => { refresh(); toast.success(`Restored ${r.restored} listing${r.restored === 1 ? "" : "s"}${r.conflicts ? `; ${r.conflicts} kept their newer value` : ""}`) },
      onError: (e) => toast.error(errMsg(e)),
    }),
  }
}

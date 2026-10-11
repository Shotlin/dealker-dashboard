"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { apiMessage } from "@/services/sell-requests.service"
import { repairsApi, type BusinessTerms, type CreateRepairInput, type PaymentKind, type PaymentMethod, type QcResult, type QuoteLine, type RepairServiceItem, type RepairSettings, type VendorServiceInput } from "@/services/repairs.service"

export const repairKeys = {
  all: ["repairs"] as const,
  stats: ["repairs", "stats"] as const,
  list: (f: Record<string, unknown>) => ["repairs", "list", f] as const,
  detail: (id: string) => ["repairs", "detail", id] as const,
  settings: ["repairs", "settings"] as const,
  services: ["repairs", "services"] as const,
  terms: ["repairs", "terms"] as const,
  offers: (id: string, sort: string) => ["repairs", "offers", id, sort] as const,
  tracking: (id: string) => ["repairs", "tracking", id] as const,
  vendorServices: (f: Record<string, unknown>) => ["repairs", "vendor-services", f] as const,
}

export const useRepairStats = () => useQuery({ queryKey: repairKeys.stats, queryFn: repairsApi.stats, refetchInterval: 60_000 })
export const useRepairList = (f: Record<string, unknown>) => useQuery({ queryKey: repairKeys.list(f), queryFn: () => repairsApi.list(f), placeholderData: (p) => p })
export const useRepair = (id: string | null) => useQuery({ queryKey: repairKeys.detail(id ?? ""), queryFn: () => repairsApi.get(id as string), enabled: !!id })
export const useRepairSettings = (enabled = true) => useQuery({ queryKey: repairKeys.settings, queryFn: repairsApi.settings, enabled })
export const useRepairServices = () => useQuery({ queryKey: repairKeys.services, queryFn: repairsApi.services, staleTime: 60_000 })
export const useRepairOffers = (id: string | null, sort = "best", enabled = true) =>
  useQuery({ queryKey: repairKeys.offers(id ?? "", sort), queryFn: () => repairsApi.offers(id as string, sort), enabled: !!id && enabled })
export const useRepairTracking = (id: string | null, enabled = true) =>
  useQuery({ queryKey: repairKeys.tracking(id ?? ""), queryFn: () => repairsApi.tracking(id as string), enabled: !!id && enabled })
export const useVendorServices = (f: Record<string, unknown> = {}) => useQuery({ queryKey: repairKeys.vendorServices(f), queryFn: () => repairsApi.vendorServices(f), placeholderData: (p) => p })
export const useBusinessTerms = () => useQuery({ queryKey: repairKeys.terms, queryFn: repairsApi.terms })

/** One mutation hook for every lifecycle call; refreshes every repair list, stat and detail afterwards. */
export type RepairCall =
  | { type: "act"; id: string; action: string; body?: Record<string, unknown> }
  | { type: "diagnose"; id: string; itemId: string; diagnosis: string; repairable: boolean }
  | { type: "quote"; id: string; lines: QuoteLine[]; note?: string }
  | { type: "qc"; id: string; results: QcResult[]; note?: string }
  | { type: "pay"; id: string; kind: PaymentKind; method: PaymentMethod; amount: number; reference?: string; note?: string; idempotencyKey: string }
  | { type: "attach"; id: string; mediaIds: string[]; stage: string; itemId?: string }

export function useRepairAction(success = "Repair updated") {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (c: RepairCall) => {
      switch (c.type) {
        case "act": return repairsApi.act(c.id, c.action, c.body)
        case "diagnose": return repairsApi.diagnose(c.id, c.itemId, { diagnosis: c.diagnosis, repairable: c.repairable })
        case "quote": return repairsApi.quote(c.id, { lines: c.lines, note: c.note })
        case "qc": return repairsApi.qc(c.id, c.results, c.note)
        case "pay": return repairsApi.pay(c.id, c)
        case "attach": return repairsApi.attach(c.id, c.mediaIds, c.stage, c.itemId)
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: repairKeys.all }); toast.success(success) },
    onError: (e) => toast.error(apiMessage(e)),
  })
}

export function useCreateRepair() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (b: CreateRepairInput) => repairsApi.create(b),
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: repairKeys.all }); toast.success(`${r.code} created`) },
    onError: (e) => toast.error(apiMessage(e)),
  })
}

export function useSaveRepairSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (b: Partial<RepairSettings>) => repairsApi.saveSettings(b),
    onSuccess: () => { qc.invalidateQueries({ queryKey: repairKeys.settings }); toast.success("Repair settings saved") },
    onError: (e) => toast.error(apiMessage(e)),
  })
}

export function useSaveRepairService() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { id: string | null; body: Partial<RepairServiceItem> }) => repairsApi.saveService(v.id, v.body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: repairKeys.services }); toast.success("Service saved") },
    onError: (e) => toast.error(apiMessage(e)),
  })
}

export function useSaveBusinessTerms() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (b: Omit<BusinessTerms, "id">) => repairsApi.saveTerms(b),
    onSuccess: () => { qc.invalidateQueries({ queryKey: repairKeys.terms }); toast.success("Business terms saved") },
    onError: (e) => toast.error(apiMessage(e)),
  })
}

export function useSaveVendorService() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { id: string | null; body: VendorServiceInput }) => repairsApi.saveVendorService(v.id, v.body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["repairs", "vendor-services"] }); toast.success("Repair service saved") },
    onError: (e) => toast.error(apiMessage(e)),
  })
}

export function useDeleteVendorService() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => repairsApi.deleteVendorService(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["repairs", "vendor-services"] }); toast.success("Repair service removed") },
    onError: (e) => toast.error(apiMessage(e)),
  })
}

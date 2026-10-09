"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { apiMessage } from "@/services/sell-requests.service"
import { salesInvoicesApi, type InvoiceSettings, type ManualInvoiceInput, type ManualLine } from "@/services/sales-invoices.service"
import { repairKeys } from "@/hooks/useRepairs"

export const salesKeys = {
  all: ["sales-invoices"] as const,
  list: (f: Record<string, unknown>) => ["sales-invoices", "list", f] as const,
  detail: (id: string) => ["sales-invoices", "detail", id] as const,
  settings: ["sales-invoices", "settings"] as const,
  forSource: (t: string, id: string) => ["sales-invoices", "for", t, id] as const,
}

export const useSalesDocs = (f: Record<string, unknown>) => useQuery({ queryKey: salesKeys.list(f), queryFn: () => salesInvoicesApi.list(f), placeholderData: (p) => p })
export const useSalesDoc = (id: string | null) => useQuery({ queryKey: salesKeys.detail(id ?? ""), queryFn: () => salesInvoicesApi.get(id as string), enabled: !!id })
export const useInvoiceSettings = (enabled = true) => useQuery({ queryKey: salesKeys.settings, queryFn: salesInvoicesApi.settings, enabled })

export type SalesCall =
  | { type: "manual"; body: ManualInvoiceInput }
  | { type: "repair"; id: string }
  | { type: "credit"; id: string; reason: string; lines: Array<{ index: number; qty?: number }>; notes?: string }
  | { type: "debit"; id: string; reason: string; lines: ManualLine[]; taxInclusive?: boolean }

export function useSalesAction(success: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (c: SalesCall) => {
      switch (c.type) {
        case "manual": return salesInvoicesApi.issueManual(c.body)
        case "repair": return salesInvoicesApi.issueRepair(c.id)
        case "credit": return salesInvoicesApi.creditNote(c.id, { reason: c.reason, lines: c.lines, notes: c.notes })
        case "debit": return salesInvoicesApi.debitNote(c.id, { reason: c.reason, lines: c.lines, taxInclusive: c.taxInclusive })
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: salesKeys.all }); qc.invalidateQueries({ queryKey: repairKeys.all }); toast.success(success) },
    onError: (e) => toast.error(apiMessage(e)),
  })
}

export function useSaveInvoiceSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (b: Partial<InvoiceSettings>) => salesInvoicesApi.saveSettings(b),
    onSuccess: () => { qc.invalidateQueries({ queryKey: salesKeys.settings }); toast.success("Invoice settings saved") },
    onError: (e) => toast.error(apiMessage(e)),
  })
}

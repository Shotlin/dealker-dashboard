"use client"

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { invoicesApi } from "@/services/invoices.service"
import type { InvoiceForm } from "@/services/invoices.service"

const errMsg = (e: unknown) => (e as { response?: { data?: { message?: string } } })?.response?.data?.message || "Something went wrong"

export const useInvoiceStats = () => useQuery({ queryKey: ["invoices", "stats"], queryFn: invoicesApi.stats, refetchInterval: 60_000 })
export const useInvoices = (filters: Record<string, unknown>) =>
  useQuery({ queryKey: ["invoices", "list", filters], queryFn: () => invoicesApi.list(filters), placeholderData: keepPreviousData })
export const useListingInvoices = (listingId: string | null) =>
  useQuery({ queryKey: ["invoices", "listing", listingId], queryFn: () => invoicesApi.forListing(listingId as string), enabled: Boolean(listingId) })

function useRefresh() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: ["invoices"] })
    qc.invalidateQueries({ queryKey: ["qc"] })
    qc.invalidateQueries({ queryKey: ["listings"] })
  }
}

export function useInvoiceActions() {
  const refresh = useRefresh()
  return {
    upload: useMutation({
      mutationFn: ({ listingId, form, file }: { listingId: string; form: InvoiceForm; file: File }) => invoicesApi.upload(listingId, form, file),
      onSuccess: () => { refresh(); toast.success("Invoice uploaded and linked to the product") },
      onError: (e) => toast.error(errMsg(e)),
    }),
    verify: useMutation({
      mutationFn: (id: string) => invoicesApi.verify(id),
      onSuccess: () => { refresh(); toast.success("Invoice verified and saved permanently") },
      onError: (e) => toast.error(errMsg(e)),
    }),
    reject: useMutation({
      mutationFn: ({ id, reason }: { id: string; reason: string }) => invoicesApi.reject(id, reason),
      onSuccess: () => { refresh(); toast.success("Invoice rejected") },
      onError: (e) => toast.error(errMsg(e)),
    }),
    remove: useMutation({
      mutationFn: (id: string) => invoicesApi.remove(id),
      onSuccess: () => { refresh(); toast.success("Invoice removed") },
      onError: (e) => toast.error(errMsg(e)),
    }),
  }
}

"use client"

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { listingsApi } from "@/services/listings.service"
import type { ListingFilters, ListingInput } from "@/types/listing.types"

const errMsg = (e: unknown) => (e as { response?: { data?: { message?: string } } })?.response?.data?.message || "Something went wrong"

export const useListings = (filters: ListingFilters) =>
  useQuery({ queryKey: ["listings", "list", filters], queryFn: () => listingsApi.list(filters), placeholderData: keepPreviousData })
export const useListingStats = () => useQuery({ queryKey: ["listings", "stats"], queryFn: listingsApi.stats, refetchInterval: 60_000 })
export const useListingVendors = () => useQuery({ queryKey: ["listings", "vendors"], queryFn: listingsApi.vendors, staleTime: 120_000 })
export const useListing = (id: string | null) =>
  useQuery({ queryKey: ["listings", "detail", id], queryFn: () => listingsApi.detail(id as string), enabled: Boolean(id) })

function useRefresh() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: ["listings"] })
}

export function useCreateListing() {
  const refresh = useRefresh()
  return useMutation({ mutationFn: (b: ListingInput) => listingsApi.create(b), onSuccess: () => { refresh(); toast.success("Product listed") }, onError: (e) => toast.error(errMsg(e)) })
}
export function useUpdateListing(id: string) {
  const refresh = useRefresh()
  return useMutation({ mutationFn: (b: ListingInput) => listingsApi.update(id, b), onSuccess: () => { refresh(); toast.success("Listing updated") }, onError: (e) => toast.error(errMsg(e)) })
}
export function useListingActions() {
  const refresh = useRefresh()
  const done = (msg: string) => () => { refresh(); toast.success(msg) }
  return {
    approve: useMutation({ mutationFn: (id: string) => listingsApi.approve(id), onSuccess: done("Listing approved and live"), onError: (e) => toast.error(errMsg(e)) }),
    reject: useMutation({ mutationFn: ({ id, reason }: { id: string; reason: string }) => listingsApi.reject(id, reason), onSuccess: done("Listing sent back to the seller"), onError: (e) => toast.error(errMsg(e)) }),
    setStatus: useMutation({ mutationFn: ({ id, status }: { id: string; status: "ACTIVE" | "PAUSED" }) => listingsApi.setStatus(id, status), onSuccess: done("Listing updated"), onError: (e) => toast.error(errMsg(e)) }),
    remove: useMutation({ mutationFn: (id: string) => listingsApi.remove(id), onSuccess: done("Listing deleted"), onError: (e) => toast.error(errMsg(e)) }),
  }
}

"use client"

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { subscriptionsApi } from "@/services/subscriptions.service"
import type { AssignInput } from "@/services/subscriptions.service"

const errMsg = (e: unknown) => (e as { response?: { data?: { message?: string } } })?.response?.data?.message || "Something went wrong"

export const useSubOverview = () => useQuery({ queryKey: ["subs", "overview"], queryFn: subscriptionsApi.overview })
export const useSubPlans = () => useQuery({ queryKey: ["subs", "plans"], queryFn: subscriptionsApi.plans })
export const useSubVendors = (filters: Record<string, unknown>) =>
  useQuery({ queryKey: ["subs", "vendors", filters], queryFn: () => subscriptionsApi.vendors(filters), placeholderData: keepPreviousData })
export const useSubVendor = (id: string | null) => useQuery({ queryKey: ["subs", "vendor", id], queryFn: () => subscriptionsApi.vendor(id as string), enabled: Boolean(id) })
export const useVendorTimeline = (id: string | null) => useQuery({ queryKey: ["subs", "timeline", id], queryFn: () => subscriptionsApi.timeline(id as string), enabled: Boolean(id) })

export function useSubActions() {
  const qc = useQueryClient()
  const refresh = () => qc.invalidateQueries({ queryKey: ["subs"] })
  return {
    assign: useMutation({
      mutationFn: ({ id, body }: { id: string; body: AssignInput }) => subscriptionsApi.assign(id, body),
      onSuccess: () => { refresh(); toast.success("Subscription updated") },
      onError: (e) => toast.error(errMsg(e)),
    }),
    extend: useMutation({
      mutationFn: ({ id, days, reason }: { id: string; days: number; reason: string }) => subscriptionsApi.extend(id, { days, reason }),
      onSuccess: () => { refresh(); toast.success("Subscription extended") },
      onError: (e) => toast.error(errMsg(e)),
    }),
    cancel: useMutation({
      mutationFn: ({ id, reason }: { id: string; reason: string }) => subscriptionsApi.cancel(id, reason),
      onSuccess: () => { refresh(); toast.success("Vendor moved to the Free plan") },
      onError: (e) => toast.error(errMsg(e)),
    }),
    updatePlan: useMutation({
      mutationFn: ({ id, body }: { id: string; body: Parameters<typeof subscriptionsApi.updatePlan>[1] }) => subscriptionsApi.updatePlan(id, body),
      onSuccess: () => { refresh(); toast.success("Plan saved") },
      onError: (e) => toast.error(errMsg(e)),
    }),
  }
}

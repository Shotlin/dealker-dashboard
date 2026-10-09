"use client"

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { campaignsApi } from "@/services/campaigns.service"
import type { CampaignInput } from "@/services/campaigns.service"

const errMsg = (e: unknown) => (e as { response?: { data?: { message?: string } } })?.response?.data?.message || "Something went wrong"

export const useCampaignOverview = () => useQuery({ queryKey: ["campaigns", "overview"], queryFn: campaignsApi.overview, refetchInterval: 60_000 })
export const useCampaigns = (filters: Record<string, unknown>) =>
  useQuery({ queryKey: ["campaigns", "list", filters], queryFn: () => campaignsApi.list(filters), placeholderData: keepPreviousData })
export const useCampaign = (id: string | null) => useQuery({ queryKey: ["campaigns", "detail", id], queryFn: () => campaignsApi.get(id as string), enabled: Boolean(id) })

export function useCampaignActions() {
  const qc = useQueryClient()
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["campaigns"] })
    qc.invalidateQueries({ queryKey: ["listings"] })
    qc.invalidateQueries({ queryKey: ["merch"] })
    qc.invalidateQueries({ queryKey: ["pricing"] })
  }
  const fail = (e: unknown) => toast.error(errMsg(e))
  return {
    preview: useMutation({ mutationFn: campaignsApi.preview, onError: fail }),
    create: useMutation({ mutationFn: campaignsApi.create, onSuccess: () => { refresh(); toast.success("Campaign saved as a draft") }, onError: fail }),
    update: useMutation({ mutationFn: ({ id, body }: { id: string; body: Partial<CampaignInput> }) => campaignsApi.update(id, body), onSuccess: () => { refresh(); toast.success("Campaign updated") }, onError: fail }),
    schedule: useMutation({ mutationFn: campaignsApi.schedule, onSuccess: () => { refresh(); toast.success("Campaign scheduled — it starts and ends on its own") }, onError: fail }),
    start: useMutation({ mutationFn: campaignsApi.start, onSuccess: (c) => { refresh(); toast.success(`Campaign is live on ${c.listing_count} product${c.listing_count === 1 ? "" : "s"}`) }, onError: fail }),
    end: useMutation({ mutationFn: (id: string) => campaignsApi.end(id), onSuccess: () => { refresh(); toast.success("Campaign ended and prices restored") }, onError: fail }),
    cancel: useMutation({ mutationFn: (id: string) => campaignsApi.cancel(id), onSuccess: () => { refresh(); toast.success("Campaign cancelled") }, onError: fail }),
    remove: useMutation({ mutationFn: campaignsApi.remove, onSuccess: () => { refresh(); toast.success("Campaign deleted") }, onError: fail }),
  }
}

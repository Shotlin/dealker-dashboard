"use client"

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { merchApi } from "@/services/merchandising.service"
import type { SectionKey } from "@/services/merchandising.service"

const errMsg = (e: unknown) => (e as { response?: { data?: { message?: string } } })?.response?.data?.message || "Something went wrong"

export const useMerchOverview = () => useQuery({ queryKey: ["merch", "overview"], queryFn: merchApi.overview })
export const useSectionListings = (section: SectionKey | "NONE", search: string, page: number) =>
  useQuery({ queryKey: ["merch", "section", section, search, page], queryFn: () => merchApi.section(section, { search, page, limit: 25 }), placeholderData: keepPreviousData })

export function useMerchActions() {
  const qc = useQueryClient()
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["merch"] })
    qc.invalidateQueries({ queryKey: ["listings"] })
    qc.invalidateQueries({ queryKey: ["qc"] })
  }
  return {
    move: useMutation({
      mutationFn: merchApi.move,
      onSuccess: (r, v) => { refresh(); toast.success(v.section ? `${r.moved} moved to the section` : `${r.moved} removed from their section`) },
      onError: (e) => toast.error(errMsg(e)),
    }),
    channels: useMutation({
      mutationFn: merchApi.channels,
      onSuccess: (r) => { refresh(); toast.success(`Sales channels updated on ${r.updated}`) },
      onError: (e) => toast.error(errMsg(e)),
    }),
    bulk: useMutation({
      mutationFn: merchApi.bulk,
      onSuccess: (r) => {
        refresh()
        if (r.failed.length) toast.warning(`${r.done} done, ${r.failed.length} failed — ${r.failed[0].name}: ${r.failed[0].reason}`)
        else toast.success(`${r.done} done`)
      },
      onError: (e) => toast.error(errMsg(e)),
    }),
    duplicate: useMutation({
      mutationFn: merchApi.duplicate,
      onSuccess: () => { refresh(); toast.success("Copy created as a paused draft — edit it, then approve") },
      onError: (e) => toast.error(errMsg(e)),
    }),
  }
}

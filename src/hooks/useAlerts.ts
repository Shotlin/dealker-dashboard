"use client"

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { alertsApi } from "@/services/alerts.service"
import type { Severity } from "@/services/alerts.service"

const errMsg = (e: unknown) => (e as { response?: { data?: { message?: string } } })?.response?.data?.message || "Something went wrong"

/** Header badge — polled so new alerts show up without a reload. */
export const useAlertUnread = () => useQuery({ queryKey: ["alerts", "unread"], queryFn: alertsApi.unread, refetchInterval: 20_000, staleTime: 10_000 })
export const useAlerts = (filters: Record<string, unknown>) =>
  useQuery({ queryKey: ["alerts", "list", filters], queryFn: () => alertsApi.list(filters), placeholderData: keepPreviousData, refetchInterval: 30_000 })
export const useAlertSettings = () => useQuery({ queryKey: ["alerts", "settings"], queryFn: alertsApi.settings })

export function useAlertActions() {
  const qc = useQueryClient()
  const refresh = () => qc.invalidateQueries({ queryKey: ["alerts"] })
  return {
    markRead: useMutation({ mutationFn: (ids: number[]) => alertsApi.markRead(ids), onSuccess: refresh, onError: (e) => toast.error(errMsg(e)) }),
    markAllRead: useMutation({ mutationFn: (type?: string) => alertsApi.markAllRead(type), onSuccess: (r) => { refresh(); toast.success(`${r.marked} marked as read`) }, onError: (e) => toast.error(errMsg(e)) }),
    saveSettings: useMutation({
      mutationFn: (changes: Array<{ type: string; enabled?: boolean; severity?: Severity; minAmount?: number | null }>) => alertsApi.saveSettings(changes),
      onSuccess: () => { refresh(); toast.success("Notification settings saved") },
      onError: (e) => toast.error(errMsg(e)),
    }),
  }
}

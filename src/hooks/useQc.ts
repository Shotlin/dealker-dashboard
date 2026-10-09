"use client"

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { qcApi } from "@/services/qc.service"
import type { QcRule, QcSettings, QcStatus } from "@/services/qc.service"

const errMsg = (e: unknown) => (e as { response?: { data?: { message?: string } } })?.response?.data?.message || "Something went wrong"

export const useQcStats = () => useQuery({ queryKey: ["qc", "stats"], queryFn: qcApi.stats, refetchInterval: 60_000 })
export const useQcQueue = (filters: Record<string, unknown>) =>
  useQuery({ queryKey: ["qc", "queue", filters], queryFn: () => qcApi.queue(filters), placeholderData: keepPreviousData })
export const useQcDetail = (id: string | null) =>
  useQuery({ queryKey: ["qc", "detail", id], queryFn: () => qcApi.detail(id as string), enabled: Boolean(id) })
export const useQcConfig = () => useQuery({ queryKey: ["qc", "config"], queryFn: qcApi.config })

function useRefresh() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: ["qc"] })
    qc.invalidateQueries({ queryKey: ["listings"] })
  }
}

export function useQcActions() {
  const refresh = useRefresh()
  return {
    setStatus: useMutation({
      mutationFn: ({ id, status, notes }: { id: string; status: QcStatus; notes?: string }) => qcApi.setStatus(id, status, notes),
      onSuccess: () => { refresh(); toast.success("QC decision saved") },
      onError: (e) => toast.error(errMsg(e)),
    }),
    runAuto: useMutation({
      mutationFn: (id: string) => qcApi.runAuto(id),
      onSuccess: (d) => { refresh(); toast.success(`Automatic QC: ${d.live.status.replace("QC_", "").toLowerCase()} (${d.live.score}%)`) },
      onError: (e) => toast.error(errMsg(e)),
    }),
    runAutoBulk: useMutation({
      mutationFn: (statuses?: QcStatus[]) => qcApi.runAutoBulk(statuses),
      onSuccess: (s) => {
        refresh()
        toast.success(`Checked ${s.processed}: ${s.QC_PASSED} passed, ${s.QC_RECHECK} recheck, ${s.QC_FAILED} failed`)
      },
      onError: (e) => toast.error(errMsg(e)),
    }),
  }
}

export function useSaveQcConfig() {
  const refresh = useRefresh()
  return useMutation({
    mutationFn: (body: { settings?: Partial<QcSettings>; rules?: Array<Partial<QcRule> & { key: string }> }) => qcApi.saveConfig(body),
    onSuccess: () => { refresh(); toast.success("QC settings saved") },
    onError: (e) => toast.error(errMsg(e)),
  })
}

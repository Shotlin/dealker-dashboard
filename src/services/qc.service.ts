/** Product QC — admin API (queue, decisions, automatic rules). */

import api from "@/lib/api"
import type { ApiResponse } from "@/types/api.types"

const clean = (p: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(p).filter(([, v]) => v !== "" && v !== undefined && v !== null))

export type QcStatus = "QC_PENDING" | "QC_PASSED" | "QC_FAILED" | "QC_RECHECK"

export interface QcMeta { page: number; limit: number; total: number; totalPages: number }

export interface QcStats { total: number; pending: number; passed: number; failed: number; recheck: number }

export interface QcQueueRow {
  id: string
  name: string
  brand: string | null
  condition: string
  thumbnail_url: string | null
  imei: string | null
  owner_name: string
  category_name: string | null
  price: number
  approval_status: string
  qc_status: QcStatus
  qc_mode: "MANUAL" | "AUTO" | null
  qc_score: number | null
  qc_notes: string | null
  qc_checked_at: string | null
  invoice_count: number
}

export interface QcRuleResult {
  key: string
  label: string
  required: boolean
  weight: number
  status: "PASS" | "FAIL" | "SKIP"
  detail: string
}

export interface QcEvent {
  id: number
  from_status: QcStatus | null
  to_status: QcStatus
  mode: "MANUAL" | "AUTO" | "RESET"
  score: number | null
  notes: string | null
  created_at: string
  actor_name: string | null
}

export interface QcDetail {
  id: string
  name: string
  brand: string | null
  condition: string
  imei: string | null
  serial_number: string | null
  owner_name: string
  price: number
  mrp: number | null
  approval_status: string
  qc_status: QcStatus
  qc_mode: "MANUAL" | "AUTO" | null
  qc_score: number | null
  qc_notes: string | null
  qc_checked_at: string | null
  qc_checked_by_name: string | null
  events: QcEvent[]
  live: { status: QcStatus; score: number; results: QcRuleResult[]; requiredFailed: string[]; summary: string }
}

export interface QcRule {
  key: string
  label: string
  description: string | null
  enabled: boolean
  required: boolean
  weight: number
  params: Record<string, unknown>
}

export interface QcSettings { autoQcEnabled: boolean; passThreshold: number; requirePassToPublish: boolean }

export const qcApi = {
  stats: () => api.get<ApiResponse<QcStats>>("/admin/qc/stats").then((r) => r.data.data),
  queue: (params: Record<string, unknown>) =>
    api.get<{ data: QcQueueRow[]; meta: QcMeta }>("/admin/qc/listings", { params: clean(params) }).then((r) => r.data),
  detail: (id: string) => api.get<ApiResponse<QcDetail>>(`/admin/qc/listings/${id}`).then((r) => r.data.data),
  setStatus: (id: string, status: QcStatus, notes?: string) =>
    api.post<ApiResponse<QcDetail>>(`/admin/qc/listings/${id}/status`, { status, notes }).then((r) => r.data.data),
  runAuto: (id: string) => api.post<ApiResponse<QcDetail>>(`/admin/qc/listings/${id}/run-auto`).then((r) => r.data.data),
  runAutoBulk: (statuses?: QcStatus[]) =>
    api
      .post<ApiResponse<{ processed: number; QC_PASSED: number; QC_FAILED: number; QC_RECHECK: number; errors: number }>>(
        "/admin/qc/run-auto",
        { statuses },
      )
      .then((r) => r.data.data),
  config: () => api.get<ApiResponse<{ settings: QcSettings; rules: QcRule[] }>>("/admin/qc/config").then((r) => r.data.data),
  saveConfig: (body: { settings?: Partial<QcSettings>; rules?: Array<Partial<QcRule> & { key: string }> }) =>
    api.put<ApiResponse<{ settings: QcSettings; rules: QcRule[] }>>("/admin/qc/config", body).then((r) => r.data.data),
}

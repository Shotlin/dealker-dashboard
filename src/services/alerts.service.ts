/** Notification centre — feed, read state and Notification Control (admin API). */

import api from "@/lib/api"
import type { ApiResponse } from "@/types/api.types"

const clean = (p: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(p).filter(([, v]) => v !== "" && v !== undefined && v !== null && v !== false))

export type Severity = "INFO" | "WARNING" | "CRITICAL"

export interface AlertRow {
  id: number
  type: string
  type_label: string | null
  grp: string | null
  severity: Severity
  title: string
  body: string | null
  link: string | null
  created_at: string
  is_read: boolean
}

export interface AlertSetting { type: string; label: string; grp: string; enabled: boolean; severity: Severity; min_amount: number | null }

export const alertsApi = {
  list: (params: Record<string, unknown>) =>
    api
      .get<{ data: AlertRow[]; meta: { page: number; limit: number; total: number; totalPages: number } }>("/admin/alerts", { params: clean(params) })
      .then((r) => r.data),
  unread: () => api.get<ApiResponse<{ total: number; critical: number }>>("/admin/alerts/unread-count").then((r) => r.data.data),
  markRead: (ids: number[]) => api.post<ApiResponse<{ marked: number }>>("/admin/alerts/read", { ids }).then((r) => r.data.data),
  markAllRead: (type?: string) => api.post<ApiResponse<{ marked: number }>>("/admin/alerts/read-all", { type }).then((r) => r.data.data),
  settings: () => api.get<ApiResponse<AlertSetting[]>>("/admin/alerts/settings").then((r) => r.data.data),
  saveSettings: (changes: Array<{ type: string; enabled?: boolean; severity?: Severity; minAmount?: number | null }>) =>
    api.put<ApiResponse<AlertSetting[]>>("/admin/alerts/settings", { changes }).then((r) => r.data.data),
}

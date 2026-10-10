import api from "@/lib/api"
import type { ApiResponse } from "@/types/api.types"
import type { PickupInput, PickupStatus, QcInput, ReturnJourney, ReturnPolicy } from "@/types/return-journey.types"

const base = "/admin/returns"

export async function getReturnJourney(id: string) {
  const { data } = await api.get<ApiResponse<ReturnJourney>>(`${base}/${id}/journey`)
  return data.data
}

export async function savePickup(id: string, payload: PickupInput) {
  const { data } = await api.put<ApiResponse<ReturnJourney>>(`${base}/${id}/pickup`, payload)
  return data.data
}

export async function setPickupStatus(id: string, status: PickupStatus, note?: string) {
  const { data } = await api.patch<ApiResponse<ReturnJourney>>(`${base}/${id}/pickup/status`, { status, note })
  return data.data
}

export async function syncPickup(id: string) {
  const { data } = await api.post<ApiResponse<ReturnJourney>>(`${base}/${id}/pickup/sync`)
  return data.data
}

export async function saveQc(id: string, payload: QcInput) {
  const { data } = await api.put<ApiResponse<ReturnJourney>>(`${base}/${id}/qc`, payload)
  return data.data
}

export async function getReturnPolicy() {
  const { data } = await api.get<ApiResponse<ReturnPolicy>>(`${base}/settings/policy`)
  return data.data
}

export async function saveReturnPolicy(payload: { windowDays: number; freePickup: boolean; points: { title: string; text: string }[] }) {
  const { data } = await api.put<ApiResponse<ReturnPolicy>>(`${base}/settings/policy`, payload)
  return data.data
}

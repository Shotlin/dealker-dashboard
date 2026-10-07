import api from "@/lib/api"
import type { ApiResponse } from "@/types/api.types"
import type { CasePatch, EvidenceKind, EvidenceReview, Party, RefundCase } from "@/types/refund-case.types"

const base = (id: string) => `/admin/refund-requests/${id}/case`
const unwrap = (r: { data: ApiResponse<RefundCase> }) => r.data.data

export const refundCaseApi = {
  get: (id: string) => api.get<ApiResponse<RefundCase>>(base(id)).then(unwrap),
  start: (id: string, body: { ownerId?: string; dueInDays: number; note?: string }) => api.post<ApiResponse<RefundCase>>(`${base(id)}/start`, body).then(unwrap),
  patch: (id: string, body: CasePatch) => api.patch<ApiResponse<RefundCase>>(base(id), body).then(unwrap),
  note: (id: string, body: { body: string; party?: Party }) => api.post<ApiResponse<RefundCase>>(`${base(id)}/notes`, body).then(unwrap),
  call: (id: string, body: { party: Exclude<Party, "TEAM">; direction: "OUTGOING" | "INCOMING"; outcome: "SPOKE" | "NO_ANSWER"; person?: string; summary: string; minutes?: number; recordingUrl?: string }) =>
    api.post<ApiResponse<RefundCase>>(`${base(id)}/calls`, body).then(unwrap),
  addEvidence: (id: string, body: { side: Party; kind: EvidenceKind; url: string; title: string; note?: string }) =>
    api.post<ApiResponse<RefundCase>>(`${base(id)}/evidence`, body).then(unwrap),
  reviewEvidence: (id: string, evidenceId: string, body: { review: EvidenceReview; note?: string }) =>
    api.patch<ApiResponse<RefundCase>>(`${base(id)}/evidence/${evidenceId}`, body).then(unwrap),
  removeEvidence: (id: string, evidenceId: string) => api.delete<ApiResponse<RefundCase>>(`${base(id)}/evidence/${evidenceId}`).then(unwrap),
  setCheck: (id: string, key: string, body: { done: boolean; note?: string }) => api.put<ApiResponse<RefundCase>>(`${base(id)}/checks/${key}`, body).then(unwrap),
}

/** Uploads a proof file (photo, video, recording or document) and says what kind it is. */
export async function uploadEvidenceFile(file: File, onProgress?: (pct: number) => void): Promise<{ url: string; kind: EvidenceKind }> {
  const isImage = file.type.startsWith("image/")
  const isVideo = file.type.startsWith("video/")
  const isAudio = file.type.startsWith("audio/")
  const form = new FormData()
  form.append(isImage ? "image" : "file", file)
  const endpoint = isImage ? "/uploads/image" : isVideo ? "/uploads/video" : "/uploads/file"
  const { data } = await api.post<ApiResponse<{ url: string }>>(endpoint, form, {
    onUploadProgress: (e) => onProgress?.(e.total ? Math.round((e.loaded / e.total) * 100) : 0),
  })
  return { url: data.data.url, kind: isImage ? "IMAGE" : isVideo ? "VIDEO" : isAudio ? "AUDIO" : /pdf/.test(file.type) ? "INVOICE" : "DOCUMENT" }
}

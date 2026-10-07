import api from "@/lib/api"
import type { KycAction, KycDetail, KycRow, KycSummary } from "@/types/kyc.types"

const clean = (p: Record<string, unknown>) => Object.fromEntries(Object.entries(p).filter(([, v]) => v !== "" && v !== undefined && v !== null && v !== "all"))

export const kycApi = {
  summary: () => api.get<{ data: KycSummary }>("/admin/vendor-kyc/summary").then((r) => r.data.data),
  list: (p: Record<string, unknown>) =>
    api.get<{ data: KycRow[]; pagination: { page: number; limit: number; total: number } }>("/admin/vendor-kyc", { params: clean({ ...p, limit: 20 }) }).then((r) => r.data),
  detail: (id: string) => api.get<{ data: KycDetail }>(`/admin/vendor-kyc/${id}`).then((r) => r.data.data),
  review: (id: string, b: { action: KycAction; comments?: string; override?: boolean }) => api.post<{ data: KycDetail }>(`/admin/vendor-kyc/${id}/review`, b).then((r) => r.data.data),
  reviewDoc: (id: string, docId: string, b: { status: "VERIFIED" | "REJECTED" | "PENDING"; reason?: string }) =>
    api.post<{ data: KycDetail }>(`/admin/vendor-kyc/${id}/documents/${docId}/review`, b).then((r) => r.data.data),
}

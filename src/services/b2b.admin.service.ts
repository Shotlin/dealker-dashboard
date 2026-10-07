import api from "@/lib/api"
import type { B2bOrder, B2bRequirement, B2bRequirementDetail, B2bSettings, B2bStats } from "@/types/b2b.admin.types"

const clean = (p: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(p).filter(([, v]) => v !== "" && v !== undefined && v !== null && v !== "all"))
type Paged<T> = { data: T[]; pagination: { page: number; limit: number; total: number } }

export const b2bAdminApi = {
  stats: () => api.get<{ data: B2bStats }>("/admin/b2b/stats").then((r) => r.data.data),
  requirements: (p: Record<string, unknown>) => api.get<Paged<B2bRequirement>>("/admin/b2b/requirements", { params: clean(p) }).then((r) => r.data),
  requirement: (id: string) => api.get<{ data: B2bRequirementDetail }>(`/admin/b2b/requirements/${id}`).then((r) => r.data.data),
  cancel: (id: string, reason: string) => api.post(`/admin/b2b/requirements/${id}/cancel`, { reason }).then(() => undefined),
  orders: (p: Record<string, unknown>) => api.get<Paged<B2bOrder>>("/admin/b2b/orders", { params: clean(p) }).then((r) => r.data),
  resolve: (id: string, body: { decision: "RELEASE" | "REFUND" | "PARTIAL"; releaseQuantity?: number; note?: string }) =>
    api.post(`/admin/b2b/orders/${id}/resolve`, body).then(() => undefined),
  vendors: () => api.get<{ data: { id: string; name: string }[] }>("/admin/b2b/vendors").then((r) => r.data.data),
  createRequirement: (b: Record<string, unknown>) => api.post("/admin/b2b/requirements", b).then((r) => r.data.data),
  addQuote: (id: string, b: Record<string, unknown>) => api.post(`/admin/b2b/requirements/${id}/quote`, b).then((r) => r.data.data),
  withdrawQuote: (quoteId: string) => api.post(`/admin/b2b/quotes/${quoteId}/withdraw`).then(() => undefined),
  award: (id: string, selections: { quoteId: string; quantity: number }[]) => api.post(`/admin/b2b/requirements/${id}/award`, { selections }).then((r) => r.data.data),
  pay: (id: string, b: { method?: string; reference?: string }) => api.post(`/admin/b2b/requirements/${id}/pay`, b).then((r) => r.data.data),
  setOrderStatus: (id: string, b: { status: "PACKED" | "DISPATCHED" | "DELIVERED"; courierName?: string; awb?: string; trackingUrl?: string }) =>
    api.post(`/admin/b2b/orders/${id}/status`, b).then(() => undefined),
  receive: (id: string, b: { receivedQuantity?: number; ok?: boolean; note?: string }) => api.post(`/admin/b2b/orders/${id}/receive`, b).then(() => undefined),
  settings: () => api.get<{ data: B2bSettings }>("/admin/b2b/settings").then((r) => r.data.data),
  setDefault: (defaultPercent: number) => api.put<{ data: B2bSettings }>("/admin/b2b/settings", { defaultPercent }).then((r) => r.data.data),
  setVendor: (vendorId: string, percent: number | null) =>
    api.put<{ data: B2bSettings }>(`/admin/b2b/vendors/${vendorId}/commission`, { percent }).then((r) => r.data.data),
}

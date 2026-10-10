import api from "@/lib/api";
import type {
  ListingCard,
  ListingDetail,
  ListingFilters,
  ListingInput,
  ListingStats,
} from "@/types/listing.types";

const clean = (p: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(p).filter(
      ([, v]) => v !== "" && v !== undefined && v !== null && v !== "all",
    ),
  );

export const listingsApi = {
  list: (filters: ListingFilters) =>
    api
      .get<{
        data: ListingCard[];
        pagination: { page: number; limit: number; total: number };
      }>("/admin/listings", {
        params: clean({ ...filters, limit: 25 }),
      })
      .then((r) => r.data),
  stats: () =>
    api
      .get<{ data: ListingStats }>("/admin/listings/stats")
      .then((r) => r.data.data),
  vendors: () =>
    api
      .get<{ data: { id: string; name: string; listings: number }[] }>(
        "/admin/listings/vendors",
      )
      .then((r) => r.data.data),
  detail: (id: string) =>
    api
      .get<{ data: ListingDetail }>(`/admin/listings/${id}`)
      .then((r) => r.data.data),
  create: (body: ListingInput) =>
    api
      .post<{ data: ListingDetail }>("/admin/listings", body)
      .then((r) => r.data.data),
  update: (id: string, body: ListingInput) =>
    api
      .patch<{ data: ListingDetail }>(`/admin/listings/${id}`, body)
      .then((r) => r.data.data),
  approve: (id: string) =>
    api.post(`/admin/listings/${id}/approve`).then((r) => r.data.data),
  reject: (id: string, reason: string) =>
    api
      .post(`/admin/listings/${id}/reject`, { reason })
      .then((r) => r.data.data),
  setStatus: (id: string, listingStatus: "ACTIVE" | "PAUSED") =>
    api
      .patch(`/admin/listings/${id}/status`, { listingStatus })
      .then((r) => r.data.data),
  remove: (id: string) =>
    api.delete(`/admin/listings/${id}`).then(() => undefined),
  uploadImages: async (files: File[]) => {
    const fd = new FormData();
    files.forEach((f) => fd.append("file", f));
    const r = await api.post<{ data: { urls: string[] } }>(
      "/uploads/local",
      fd,
      {
        params: { kind: "listing" },
        headers: { "Content-Type": "multipart/form-data" },
      },
    );
    return r.data.data.urls;
  },
};

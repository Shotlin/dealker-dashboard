import api from "@/lib/api"
import type { ApiResponse } from "@/types"

export interface StorefrontStore {
  store_key: string
  label: string
  icon_url: string | null
  sort_order: number
  is_active: boolean
  updated_at: string
}

export type StorefrontStorePatch = Partial<Pick<StorefrontStore, "label" | "icon_url" | "sort_order" | "is_active">>

export async function getStorefrontStores(): Promise<StorefrontStore[]> {
  const { data } = await api.get<ApiResponse<StorefrontStore[]>>("/admin/storefront-stores")
  return data.data
}

export async function updateStorefrontStore(key: string, patch: StorefrontStorePatch): Promise<StorefrontStore> {
  const { data } = await api.put<ApiResponse<StorefrontStore>>(`/admin/storefront-stores/${key}`, patch)
  return data.data
}

/** Uploads one image to local storage and returns its public URL. */
export async function uploadStoreIcon(file: File): Promise<string> {
  const fd = new FormData()
  fd.append("file", file)
  const r = await api.post<{ data: { urls: string[] } }>("/uploads/local", fd, {
    headers: { "Content-Type": "multipart/form-data" },
  })
  const url = r.data.data.urls[0]
  if (!url) throw new Error("Upload failed")
  return url
}

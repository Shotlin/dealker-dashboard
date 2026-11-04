import api from "@/lib/api"
import type { ApiResponse } from "@/types"
import type { SectionManifest } from "@/types/theme.types"

/** A product as the app receives it (output of the shared section resolver). */
export interface ResolvedProduct {
  id: string
  name: string
  brand?: string | null
  price: number | string
  sale_price?: number | string | null
  stock_quantity?: number | null
  images?: string[] | null
  category_name?: string | null
}

export interface ResolvedTab {
  label?: string
  product_ids?: string[]
  exclude_ids?: string[]
  rules?: ProductRules
  campaign_id?: string
  auto_fill?: boolean
  chips?: unknown[]
  category_ids?: string[]
  deal?: DealInfo
  max_price?: number | null
  products?: ResolvedProduct[]
  [key: string]: unknown
}

export type MerchStatus = "live" | "empty" | "hidden" | "static"

/** A deal = a promo campaign (Campaigns page). */
export interface DealInfo {
  id: string
  name: string
  type: string
  status: "DRAFT" | "SCHEDULED" | "ACTIVE" | "ENDED" | "CANCELLED"
  starts_at: string | null
  ends_at: string | null
  discount?: { operation: string; value: number } | null
  product_count: number
}

export interface DealRow extends Omit<DealInfo, "product_count"> {
  listing_count: number
  open_to_vendors: boolean
  entry_deadline: string | null
  min_vendor_tier: "FREE" | "PAID" | "PREMIUM" | "UNLIMITED"
  require_approval: boolean
  max_entries_per_vendor: number | null
  pending_entries: number
  approved_entries: number
  used_in: Array<{ section_id: string; section_type: string; screen: string; tab: string | null }>
}

export interface MerchSection extends Omit<SectionManifest, "config"> {
  deal?: DealInfo
  config: Record<string, unknown> & { tabs?: ResolvedTab[] }
  products?: ResolvedProduct[]
  status: MerchStatus
  product_count: number | null
}

export interface MerchSectionsResponse {
  sections: MerchSection[]
  hidden_names: Record<string, string>
}

export async function getMerchSections(tabId: string): Promise<MerchSectionsResponse> {
  const { data } = await api.get<ApiResponse<MerchSectionsResponse>>(`/admin/merch-sections/${tabId}`)
  return data.data
}

export type RuleSort = "best_selling" | "discount" | "newest" | "price_asc" | "price_desc" | "rating"

/** Filters + sort that fill a section after its pinned products (backend: themes/merch-rules.js). */
export interface ProductRules {
  category_ids?: string[]
  brands?: string[]
  min_price?: number | null
  max_price?: number | null
  min_discount?: number | null
  min_rating?: number | null
  new_within_days?: number | null
  max_per_brand?: number | null
  sort?: RuleSort
}

export interface RulesPreview {
  total: number
  products: ResolvedProduct[]
}

export async function previewRules(rules: ProductRules, limit: number, excludeIds: string[]): Promise<RulesPreview> {
  const { data } = await api.post<ApiResponse<RulesPreview>>("/admin/merch-sections/preview-rules", { rules, limit, exclude_ids: excludeIds })
  return data.data
}

export async function getDeals(): Promise<DealRow[]> {
  const { data } = await api.get<ApiResponse<DealRow[]>>("/admin/merch-sections/deals")
  return data.data
}

export interface DealEntry {
  id: string
  status: "PENDING" | "APPROVED" | "REJECTED"
  reject_reason: string | null
  vendor_id: string
  vendor_name: string
  product_name: string
  thumbnail_url: string | null
  price: number | string
  sale_price: number | string | null
  stock_quantity: number
  /** Name of another live deal that already prices this product (it will be skipped here). */
  busy_in: string | null
  created_at: string
}

export interface VendorEntrySettings {
  open_to_vendors: boolean
  entry_deadline?: string | null
  min_vendor_tier?: "FREE" | "PAID" | "PREMIUM" | "UNLIMITED"
  require_approval?: boolean
  max_entries_per_vendor?: number | null
}

export async function getDealEntries(dealId: string): Promise<DealEntry[]> {
  const { data } = await api.get<ApiResponse<DealEntry[]>>(`/admin/merch-sections/deals/${dealId}/entries`)
  return data.data
}

export async function decideDealEntries(dealId: string, ids: string[], decision: "APPROVED" | "REJECTED", reason?: string) {
  await api.post(`/admin/merch-sections/deals/${dealId}/entries/decide`, { ids, decision, reason })
}

export async function setVendorEntry(dealId: string, settings: VendorEntrySettings) {
  await api.patch(`/admin/merch-sections/deals/${dealId}/vendor-entry`, settings)
}

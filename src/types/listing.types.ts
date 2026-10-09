export type ListingCondition = "NEW" | "OPEN_BOX" | "REFURBISHED" | "USED_LIKE_NEW" | "USED_GOOD" | "USED_FAIR"
export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED"
import type { QcStatus } from "@/services/qc.service"
import type { SectionKey } from "@/services/merchandising.service"

export type ListingStatus = "ACTIVE" | "PAUSED" | "OUT_OF_STOCK"

export interface ListingCard {
  id: string
  product_id: string
  name: string
  brand: string | null
  condition: ListingCondition
  owner_type: "ADMIN" | "VENDOR"
  vendor_id: string | null
  owner_name: string
  category_name: string | null
  category_id: string | null
  thumbnail_url: string | null
  image_count: number
  price: number
  mrp: number | null
  stock: number
  approval_status: ApprovalStatus
  listing_status: ListingStatus
  rejection_reason: string | null
  sold_count: number
  created_at: string
  sku: string | null
  qc_status: QcStatus
  qc_score: number | null
  merch_section: SectionKey | null
  sell_b2c: boolean
  sell_b2b: boolean
}

export interface ListingDetail {
  id: string
  product_id: string
  name: string
  brand: string | null
  description: string | null
  category_id: string | null
  category_name: string | null
  images: string[]
  condition: ListingCondition
  condition_notes: string | null
  usage_duration: string | null
  warranty_info: string | null
  accessories_included: string | null
  battery_health: number | null
  serial_number: string | null
  imei: string | null
  has_invoice: boolean
  qc_status: QcStatus
  qc_score: number | null
  selling_price: number
  mrp: number | null
  stock_quantity: number
  seller_sku: string | null
  handling_time_days: number | null
  cod_eligible: boolean
  nationwide_shipping_enabled: boolean
  local_delivery_enabled: boolean
  weight_grams: number | null
  hsn_code: string | null
  gst_rate: number | null
  return_policy_days: number | null
  specifications: Record<string, string>
  owner_type: "ADMIN" | "VENDOR"
  vendor_id: string | null
  owner_name: string
  approval_status: ApprovalStatus
  listing_status: ListingStatus
  rejection_reason: string | null
  sold_count: number
  created_at: string
}

export interface ListingInput {
  name?: string
  brand?: string
  categoryId?: string
  ownerVendorId?: string
  description?: string
  condition?: ListingCondition
  conditionNotes?: string
  usageDuration?: string
  warrantyInfo?: string
  accessoriesIncluded?: string
  batteryHealth?: number | null
  serialNumber?: string
  imei?: string
  hasInvoice?: boolean
  images?: string[]
  price?: number
  mrp?: number | null
  stock?: number
  sku?: string
  specifications?: Record<string, string>
  handlingTimeDays?: number
  codEligible?: boolean
  nationwide?: boolean
  localDelivery?: boolean
}

export interface ListingStats {
  total: number
  admin: number
  vendor: number
  pending: number
  rejected: number
  used: number
  out_of_stock: number
}

export interface ListingFilters {
  owner?: "ADMIN" | "VENDOR" | ""
  vendorId?: string
  condition?: string
  categoryId?: string
  approval?: string
  qc?: string
  section?: string
  channel?: string
  stock?: string
  status?: string
  search?: string
  sort?: string
  page?: number
}

export const USED_CONDITIONS: ListingCondition[] = ["USED_LIKE_NEW", "USED_GOOD", "USED_FAIR"]
export const isUsed = (c?: ListingCondition | string) => USED_CONDITIONS.includes(c as ListingCondition)

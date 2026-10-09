/**
 * Money core service — commission rules + vendor wallet (admin).
 * Real API only; the ledger and rules live in dealker-backend.
 */

import api from "@/lib/api"
import type { ApiResponse } from "@/types/api.types"

const clean = (p: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(p).filter(([, v]) => v !== "" && v !== undefined && v !== null))

export interface Meta {
  page: number
  limit: number
  total: number
  totalPages: number
}

export type CommissionScope = "GLOBAL" | "VENDOR" | "CATEGORY" | "PRODUCT"
export type CommissionChannel = "ALL" | "B2C" | "B2B"

export interface CommissionRule {
  id: string
  scope: CommissionScope
  channel: CommissionChannel
  vendor_id: string | null
  category_id: string | null
  product_id: string | null
  vendor_name?: string | null
  category_name?: string | null
  product_name?: string | null
  commission_pct: string | number
  platform_charge_flat: string | number
  platform_charge_pct: string | number
  tax_pct: string | number
  is_active: boolean
  notes?: string | null
}

export interface CommissionRuleInput {
  scope: CommissionScope
  channel: CommissionChannel
  vendorId?: string
  categoryId?: string
  productId?: string
  commissionPct: number
  platformChargeFlat: number
  platformChargePct: number
  taxPct: number
  notes?: string
  isActive?: boolean
}

export interface FeePreview {
  channel: "B2C" | "B2B"
  sellingPrice: number
  commission: number
  platformCharge: number
  tax: number
  shippingCharge: number
  vendorNet: number
  effectiveRate: number
}

export const commissionApi = {
  list: (params: Record<string, unknown> = {}) =>
    api
      .get<{ data: CommissionRule[]; meta: Meta }>("/admin/commission/rules", { params: clean(params) })
      .then((r) => r.data),
  create: (body: CommissionRuleInput) =>
    api.post<ApiResponse<CommissionRule>>("/admin/commission/rules", body).then((r) => r.data.data),
  update: (id: string, body: Partial<CommissionRuleInput>) =>
    api.patch<ApiResponse<CommissionRule>>(`/admin/commission/rules/${id}`, body).then((r) => r.data.data),
  remove: (id: string) => api.delete(`/admin/commission/rules/${id}`).then((r) => r.data),
  preview: (body: {
    vendorId?: string
    channel: "B2C" | "B2B"
    items: Array<{ productId?: string; categoryId?: string; lineTotal: number }>
  }) => api.post<ApiResponse<FeePreview>>("/admin/commission/preview", body).then((r) => r.data.data),
}

export interface WalletOverview {
  totalBalance: number
  totalCredits: number
  totalDebits: number
  wallets: number
  vendorsOnHold: number
}

export interface VendorWalletRow {
  vendor_id: string
  business_name: string
  balance: number
  total_credits: number
  total_debits: number
  last_activity: string | null
  on_hold: boolean
}

export interface WalletTxn {
  id: string | number
  created_at: string
  amount: number
  type: "CREDIT" | "DEBIT"
  entry_type: string
  reason_code: string | null
  reason: string | null
  balance_before: number
  balance_after: number
  order_id: string | null
  order_number: string | null
  seller_order_number: string | null
  actor_name: string | null
  reference_type: string | null
}

export interface WalletReasons {
  credit: string[]
  debit: string[]
}

export const vendorWalletApi = {
  overview: () => api.get<ApiResponse<WalletOverview>>("/admin/vendor-wallet/overview").then((r) => r.data.data),
  reasons: () => api.get<ApiResponse<WalletReasons>>("/admin/vendor-wallet/reasons").then((r) => r.data.data),
  list: (params: Record<string, unknown> = {}) =>
    api
      .get<{ data: VendorWalletRow[]; meta: Meta }>("/admin/vendor-wallet", { params: clean(params) })
      .then((r) => r.data),
  transactions: (vendorId: string, params: Record<string, unknown> = {}) =>
    api
      .get<{ data: WalletTxn[]; meta: Meta; vendor: { id: string; businessName: string; balance: number } }>(
        `/admin/vendor-wallet/vendors/${vendorId}/transactions`,
        { params: clean(params) },
      )
      .then((r) => r.data),
  addEntry: (
    vendorId: string,
    body: {
      direction: "CREDIT" | "DEBIT"
      reasonCode: string
      reason: string
      amount: number
      orderNumber?: string
    },
  ) =>
    api
      .post<ApiResponse<{ id: number; balanceBefore: number; balanceAfter: number }>>(
        `/admin/vendor-wallet/vendors/${vendorId}/entries`,
        body,
      )
      .then((r) => r.data.data),
}

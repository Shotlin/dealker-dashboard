export type VendorStatus =
  | "PENDING_ONBOARDING" | "KYC_SUBMITTED" | "UNDER_REVIEW" | "CORRECTION_REQUIRED" | "VERIFIED" | "ACTIVE" | "SUSPENDED" | "DEACTIVATED" | "REJECTED"

export type KycAction = "START_REVIEW" | "APPROVE" | "ACTIVATE" | "REQUEST_CORRECTION" | "REJECT" | "SUSPEND" | "REINSTATE"

export interface KycRow {
  id: string; name: string; email: string; phone: string; status: VendorStatus; is_active: boolean; created_at: string
  legal_name: string | null; gstin: string | null; city: string | null; state: string | null
  docs_total: number; docs_verified: number; docs_rejected: number; listings: number; submitted_at: string | null
}

export interface KycDocument {
  id: string; document_type: string; document_number: string | null; file_url: string | null; file_key: string
  status: "PENDING" | "VERIFIED" | "REJECTED" | "EXPIRED"; rejection_reason: string | null; created_at: string
  reviewed_by_name: string | null; reviewed_at: string | null
}

export interface KycDetail {
  vendor: { id: string; name: string; email: string; phone: string; status: VendorStatus; is_active: boolean; created_at: string }
  profile: {
    legal_name: string | null; gstin: string | null; pan_number: string | null; trade_license_number: string | null; fssai_license: string | null
    address_line1: string | null; address_line2: string | null; city: string | null; state: string | null; pincode: string | null
  } | null
  documents: KycDocument[]
  history: { id: string; action: string; previous_status: string; new_status: string; comments: string | null; reviewer_name: string | null; created_at: string }[]
  shops: { id: string; name: string; city: string; state: string; pincode: string; is_active: boolean; commission_rate: string; seller_rating: string | null; total_orders: number }[]
  team: { name: string | null; phone: string | null; role: string }[]
  stats: { listings: number; orders: number; gmv: number; b2b_orders: number }
  allowedActions: { action: KycAction; needsNote: boolean }[]
}

export interface KycSummary { total: number; byStatus: Record<string, number>; needsReview: number }

/** Command centre — the main dashboard's single data call. */

import api from "@/lib/api"
import type { ApiResponse } from "@/types/api.types"

export type CcPeriod = "today" | "week" | "month" | "year"

export interface Pair { value: number; previous: number; change: number }

export interface CommandCenter {
  period: CcPeriod
  range: { from: string; to: string; previousFrom: string }
  sales: { total: Pair; b2c: Pair; b2b: Pair }
  orders: { total: Pair; pending: { value: number; inPeriod: number }; delivered: Pair; cancelled: Pair; b2bOrders: Pair }
  refunds: Pair & { amount: number; previousAmount: number }
  exchanges: Pair & { completed: number }
  payments: { codOrders: number; partialOrders: number; codValue: number; prepaidShare: number }
  wallets: {
    customer: { balance: number; holders: number; credits: number; debits: number }
    vendor: { balance: number; credits: number; debits: number; vendorsOnHold: number; pendingPayouts: number; pendingPayoutCount: number }
  }
  money: {
    vendorCommission: Pair
    platformCharges: Pair
    tax: { salesTax: number; feeTax: number; total: number; previous: number }
    vendorGross: number
  }
  users: {
    live: { customers: number; staff: number; connections: number }
    retained: { returningBuyers: number; buyers: number; rate: number }
    newCustomers: Pair
    newVendors: Pair
    topBuyers: Array<{ id: string; name: string; phone: string; orders: number; spent: number }>
    topVendors: Array<{ id: string; name: string; orders: number; sales: number }>
  }
  abandoned: {
    b2c: { open: number; openValue: number; detected: number; recovered: number }
    b2b: { count: number; value: number }
  }
  sellOnPhone: Pair & { completed: number; payoutValue: number }
  auctions: { live: number; scheduled: number; awaitingPayment: number; endingSoon: number; pendingApproval: number; winners: number; bids: number; revenue: number }
  campaigns: { active: number; scheduled: number; draft: number; ended: number; cancelled: number; revenue: number; orders: number; customers: number; vendorsInvolved: number }
  subscriptions: {
    tiers: Array<{ tier: string; vendors: number; expiring: number }>
    totalVendors: number; expiringSoon: number; lapsed: number; mrr: number; collectedThisMonth: number; startedThisMonth: number
  }
  alerts: {
    summary: { critical: number; warning: number; info: number; total: number }
    recent: Array<{ id: number; type: string; severity: "INFO" | "WARNING" | "CRITICAL"; title: string; link: string | null; created_at: string }>
  }
}

export const commandCenterApi = {
  get: (period: CcPeriod) =>
    api.get<ApiResponse<CommandCenter>>("/admin/command-center", { params: { period } }).then((r) => r.data.data),
}

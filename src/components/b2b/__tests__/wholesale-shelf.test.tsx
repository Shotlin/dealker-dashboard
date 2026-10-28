import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"
import type { ListingCard } from "@/types/listing.types"

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }))

const api = { list: vi.fn(), stats: vi.fn(), vendors: vi.fn() }
vi.mock("@/services/listings.service", () => ({
  listingsApi: {
    list: (...a: unknown[]) => api.list(...a),
    stats: (...a: unknown[]) => api.stats(...a),
    vendors: (...a: unknown[]) => api.vendors(...a),
  },
}))

import { WholesaleShelfTab } from "../WholesaleShelfTab"

const wrap = (ui: ReactNode) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>)

const card = (o: Partial<ListingCard> = {}): ListingCard => ({
  id: "l1", product_id: "p1", name: "OnePlus Nord 4 5G (8GB/128GB)", brand: "OnePlus", condition: "NEW", owner_type: "VENDOR", vendor_id: "v1", owner_name: "Sai Ram Mobile Distributors",
  category_name: "OnePlus", category_id: "c1", thumbnail_url: null, image_count: 3, price: 29999, mrp: 33599, stock: 90, approval_status: "APPROVED", listing_status: "ACTIVE",
  rejection_reason: null, sold_count: 0, created_at: "", sku: "WS-005", qc_status: "NOT_REQUIRED", qc_score: null, merch_section: null, sell_b2c: true, sell_b2b: true,
  wholesale_price: 26400, min_order_qty: 10, b2b_discount_pct: 12, ...o,
} as ListingCard)

beforeEach(() => {
  vi.clearAllMocks()
  api.stats.mockResolvedValue({ total: 60, admin: 20, vendor: 40, pending: 0, rejected: 0, used: 5, out_of_stock: 1, b2b_listings: 36, b2b_vendors: 6, b2b_units: 5945, b2b_deals: 20 })
  api.vendors.mockResolvedValue([{ id: "v1", name: "Sai Ram Mobile Distributors", listings: 7 }])
  api.list.mockResolvedValue({ data: [card(), card({ id: "l2", name: "Unpriced phone", wholesale_price: null, b2b_discount_pct: null })], pagination: { page: 1, limit: 25, total: 2 } })
})

describe("Wholesale shelf tab", () => {
  it("asks only for the wholesale channel and shows the shelf totals", async () => {
    wrap(<WholesaleShelfTab />)
    expect(await screen.findByText("36")).toBeTruthy() // listings
    expect(screen.getByText("5,945")).toBeTruthy() // units in stock
    expect(screen.getByText("20")).toBeTruthy() // deals
    expect(api.list.mock.calls[0][0]).toMatchObject({ channel: "B2B" })
  })

  it("lists seller, wholesale price, MOQ and the deal; flags a listing with no wholesale price", async () => {
    wrap(<WholesaleShelfTab />)
    await waitFor(() => expect(screen.getByText("OnePlus Nord 4 5G (8GB/128GB)")).toBeTruthy())
    expect(screen.getAllByText("Sai Ram Mobile Distributors").length).toBe(2) // one per row
    expect(screen.getByText(/26,400/)).toBeTruthy()
    expect(screen.getAllByText("10").length).toBe(2) // MOQ of each row
    expect(screen.getByText("12% off")).toBeTruthy()
    expect(screen.getByText("Not priced")).toBeTruthy()
    expect(screen.getByText("2 wholesale listings")).toBeTruthy()
  })
})

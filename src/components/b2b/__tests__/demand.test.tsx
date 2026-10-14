import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"
import type { B2bOrder, DemandInsights } from "@/types/b2b.admin.types"

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }))

const api = { insights: vi.fn(), cancelOrder: vi.fn(), setOrderStatus: vi.fn() }
vi.mock("@/services/b2b.admin.service", () => ({
  b2bAdminApi: {
    insights: (...a: unknown[]) => api.insights(...a),
    cancelOrder: (...a: unknown[]) => api.cancelOrder(...a),
    setOrderStatus: (...a: unknown[]) => api.setOrderStatus(...a),
    stats: vi.fn(), requirements: vi.fn(), requirement: vi.fn(), orders: vi.fn(), vendors: vi.fn().mockResolvedValue([]), settings: vi.fn(),
  },
}))

import { DemandTab } from "../DemandTab"
import { CancelOrderDialog, DispatchDialog } from "../AdminActions"

const wrap = (ui: ReactNode) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>)

const insights = (o: Partial<DemandInsights> = {}): DemandInsights => ({
  days: 30,
  funnel: { posted: 10, quoted: 8, awarded: 5, paid: 4, completed: 2, units_needed: 200, units_awarded: 80, fill_rate: 0.4, urgent: 3, bulk: 6 },
  avgMinutesToFirstOffer: 95,
  reach: { vendors_viewed: 12, views: 61, dismissed: 7 },
  topModels: [{ model: "iphone 15", example: "iPhone 15 128GB", brand: "Apple", requests: 4, units_needed: 120, units_awarded: 60, fill_rate: 0.5, avg_target: 59000, offers: 9, thumbnail_url: null }],
  unserved: [{ id: "r1", requirement_number: "B2B-1042", product_name: "OnePlus 12 256GB", quantity_needed: 30, target_price: 52000, target_price_max: 54000, created_at: new Date(Date.now() - 5 * 3600000).toISOString(),
    response_deadline: new Date(Date.now() + 86400000).toISOString(), status: "OPEN", is_urgent: true, buyer_name: "Mobile World", view_count: 4 }],
  ...o,
})

const order = (o: Partial<B2bOrder> = {}): B2bOrder => ({
  id: "o1", order_number: "B2BO-1001", requirement_id: "r1", product_name: "iPhone 15", seller_name: "Seller A", buyer_name: "Buyer B", quantity: 6, unit_price: 58900, subtotal: 353400,
  commission_percent: 10, commission_amount: 35340, seller_payable: 318060, status: "PAID", payment_status: "ESCROW_HELD", courier_name: null, awb: null, tracking_url: null,
  dispatched_at: null, received_at: null, received_quantity: null, receipt_note: null, released_amount: null, dispute_status: null, dispute_reason: null, dispute_resolution: null,
  created_at: "", payment_method: "WALLET", ...o,
})

beforeAll(() => { Element.prototype.scrollIntoView = vi.fn() })
beforeEach(() => { vi.clearAllMocks(); api.insights.mockResolvedValue(insights()) })

describe("Demand tab", () => {
  it("shows the funnel, fill rate, time to first offer and most requested models", async () => {
    wrap(<DemandTab onOpen={vi.fn()} />)
    expect((await screen.findAllByText("Requests posted")).length).toBeGreaterThan(0)
    expect(screen.getByText("8 of 10 got offers")).toBeInTheDocument()
    expect(screen.getByText("Offer rate").previousElementSibling).toHaveTextContent("80%")
    expect(screen.getByText("Units filled").previousElementSibling).toHaveTextContent("40%")
    expect(screen.getByText("Time to first offer").previousElementSibling).toHaveTextContent("1.6 h") // 95 min
    expect(screen.getByText("iPhone 15 128GB")).toBeInTheDocument()
    expect(screen.getByText("60/120")).toBeInTheDocument()
    expect(api.insights).toHaveBeenCalledWith(30)
  })

  it("lists requests nobody answered and opens one", async () => {
    const onOpen = vi.fn()
    wrap(<DemandTab onOpen={onOpen} />)
    expect(await screen.findByText("OnePlus 12 256GB")).toBeInTheDocument()
    expect(screen.getByText("Urgent")).toBeInTheDocument()
    expect(screen.getByText(/₹52,000\s*–\s*₹54,000/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Open" }))
    expect(onOpen).toHaveBeenCalledWith("r1")
  })

  it("says so when everything has an offer, and when there is no demand yet", async () => {
    api.insights.mockResolvedValue(insights({ unserved: [], topModels: [] }))
    wrap(<DemandTab onOpen={vi.fn()} />)
    expect(await screen.findByText(/Every recent request has at least one offer/)).toBeInTheDocument()
    expect(screen.getByText("No requirements in this period.")).toBeInTheDocument()
  })

  it("explains a load failure instead of showing an empty page", async () => {
    api.insights.mockRejectedValue(new Error("boom"))
    wrap(<DemandTab onOpen={vi.fn()} />)
    expect(await screen.findByText(/Could not load demand insights/)).toBeInTheDocument()
  })
})

describe("Cancel & refund", () => {
  it("needs a reason, and says a wallet payment is refunded to the wallet", async () => {
    api.cancelOrder.mockResolvedValue({ refunded: 353400 })
    const onClose = vi.fn()
    wrap(<CancelOrderDialog order={order()} onClose={onClose} />)
    expect(screen.getByText(/in their Dealker wallet/)).toBeInTheDocument()
    const btn = screen.getByRole("button", { name: "Cancel & refund" })
    expect(btn).toBeDisabled()
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Seller ran out of stock" } })
    expect(btn).toBeEnabled()
    fireEvent.click(btn)
    await waitFor(() => expect(api.cancelOrder).toHaveBeenCalledWith("o1", "Seller ran out of stock"))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it("warns that an admin-recorded payment cannot be refunded automatically", () => {
    wrap(<CancelOrderDialog order={order({ payment_method: "ONLINE" })} onClose={vi.fn()} />)
    expect(screen.getByText(/recorded outside the app/)).toBeInTheDocument()
  })
})

describe("Dispatch dialog", () => {
  it("can schedule a buyer pickup instead of a courier", async () => {
    api.setOrderStatus.mockResolvedValue(undefined)
    wrap(<DispatchDialog order={order()} onClose={vi.fn()} />)
    expect(screen.getByRole("button", { name: "Mark dispatched" })).toBeDisabled() // no AWB yet
    fireEvent.click(screen.getByRole("button", { name: "Buyer pickup" }))
    fireEvent.click(screen.getByRole("button", { name: "Schedule pickup" }))
    await waitFor(() => expect(api.setOrderStatus).toHaveBeenCalled())
    const [id, body] = api.setOrderStatus.mock.calls[0]
    expect(id).toBe("o1")
    expect(body).toMatchObject({ status: "DISPATCHED", fulfilmentType: "PICKUP" })
    expect(typeof body.pickupAt).toBe("string")
    expect(body.awb).toBeUndefined()
  })

  it("courier dispatch still needs the tracking number", async () => {
    api.setOrderStatus.mockResolvedValue(undefined)
    wrap(<DispatchDialog order={order()} onClose={vi.fn()} />)
    fireEvent.change(screen.getAllByRole("textbox")[0], { target: { value: "BD123" } }) // the AWB field is the first input
    fireEvent.click(screen.getByRole("button", { name: "Mark dispatched" }))
    await waitFor(() => expect(api.setOrderStatus).toHaveBeenCalled())
    expect(api.setOrderStatus.mock.calls[0][1]).toMatchObject({ status: "DISPATCHED", courierName: "Delhivery", awb: "BD123" })
  })
})

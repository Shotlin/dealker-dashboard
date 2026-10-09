"use client"

/** Sell Requests — customers selling an old device. (Exchanges live in their own section.) */

import { OrdersHubTabs } from "@/components/order-page/OrdersHubTabs"
import { RequestsPage } from "@/components/sell-requests/RequestsPage"

export default function SellRequestsPage() {
  return (
    <div className="space-y-4">
      <OrdersHubTabs />
      <RequestsPage kind="SELL" />
    </div>
  )
}

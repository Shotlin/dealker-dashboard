"use client"

/** Exchange Requests — customers buying a new device and trading in the old one. (Sell requests live in their own section.) */

import { OrdersHubTabs } from "@/components/order-page/OrdersHubTabs"
import { RequestsPage } from "@/components/sell-requests/RequestsPage"

export default function ExchangeRequestsPage() {
  return (
    <div className="space-y-4">
      <OrdersHubTabs />
      <RequestsPage kind="EXCHANGE" />
    </div>
  )
}

"use client"

/** Exchange Requests — customers buying a new device and trading in the old one. (Sell requests live in their own section.) */

import { RequestsPage } from "@/components/sell-requests/RequestsPage"

export default function ExchangeRequestsPage() {
  return <RequestsPage kind="EXCHANGE" />
}

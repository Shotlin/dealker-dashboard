import { redirect } from "next/navigation"

export default function SellerListingsRedirect() {
  redirect("/products?approval=PENDING")
}

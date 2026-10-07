"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ListingForm } from "@/components/listings/ListingForm"

export default function NewListingPage() {
  return (
    <div className="space-y-5">
      <div className="mx-auto flex max-w-4xl items-center gap-3">
        <Button variant="ghost" size="icon" asChild><Link href="/products" aria-label="Back"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Add product</h1>
          <p className="text-sm text-muted-foreground">Add a product for Dealker or on behalf of a vendor — goes live immediately. Listings that vendors add themselves wait for your approval.</p>
        </div>
      </div>
      <ListingForm />
    </div>
  )
}

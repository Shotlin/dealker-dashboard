"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ListingForm } from "@/components/listings/ListingForm"
import { useListing } from "@/hooks/useListings"

export default function EditListingPage({ params }: { params: { id: string } }) {
  const { data, isLoading, isError } = useListing(params.id)
  return (
    <div className="space-y-5">
      <div className="mx-auto flex max-w-4xl items-center gap-3">
        <Button variant="ghost" size="icon" asChild><Link href="/products" aria-label="Back"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Edit product</h1>
          <p className="text-sm text-muted-foreground">{data?.owner_type === "VENDOR" ? `Listed by ${data.owner_name}` : "Listed by Dealker"}</p>
        </div>
      </div>
      {isLoading ? (
        <div className="mx-auto max-w-4xl space-y-4"><Skeleton className="h-48" /><Skeleton className="h-64" /></div>
      ) : isError || !data ? (
        <p className="mx-auto max-w-4xl text-sm text-muted-foreground">Listing not found.</p>
      ) : (
        <ListingForm key={data.id} initial={data} />
      )}
    </div>
  )
}

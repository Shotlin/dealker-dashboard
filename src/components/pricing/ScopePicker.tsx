"use client"

/**
 * "Which products?" — everything, or narrowed by vendor, category, brand,
 * who listed it, sales channel, or hand-picked products. Nothing is changed
 * unless a scope is chosen (the server refuses an empty one).
 */

import { useState } from "react"
import { X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useCategories } from "@/hooks/useCategories"
import { useDebounce } from "@/hooks/useDebounce"
import { useListingVendors, useListings } from "@/hooks/useListings"
import { usePricingBrands } from "@/hooks/usePricing"
import type { PricingScope } from "@/services/pricing.service"

const ANY = "any"

function Chips({ items, onRemove }: { items: Array<{ id: string; label: string }>; onRemove: (id: string) => void }) {
  if (!items.length) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((i) => (
        <Badge key={i.id} variant="secondary" className="gap-1 pr-1 text-xs font-normal">
          {i.label}
          <button type="button" aria-label={`Remove ${i.label}`} onClick={() => onRemove(i.id)} className="rounded p-0.5 hover:bg-black/10"><X className="h-3 w-3" /></button>
        </Badge>
      ))}
    </div>
  )
}

export function scopeIsEmpty(s: PricingScope) {
  return !s.all && !(s.vendorIds?.length || s.categoryIds?.length || s.brands?.length || s.listingIds?.length || s.owner || s.channel)
}

export function ScopePicker({ value, onChange }: { value: PricingScope; onChange: (s: PricingScope) => void }) {
  const vendors = useListingVendors()
  const cats = useCategories()
  const brands = usePricingBrands()
  const [find, setFind] = useState("")
  const q = useDebounce(find, 300)
  const found = useListings({ search: q })
  const [names, setNames] = useState<Record<string, string>>({})

  const set = (p: Partial<PricingScope>) => onChange({ ...value, ...p })
  const add = (key: "vendorIds" | "categoryIds" | "brands" | "listingIds", v: string) => {
    if (!v || (value[key] ?? []).includes(v)) return
    set({ [key]: [...(value[key] ?? []), v], all: false })
  }
  const drop = (key: "vendorIds" | "categoryIds" | "brands" | "listingIds", v: string) => set({ [key]: (value[key] ?? []).filter((x) => x !== v) })

  const vendorName = (id: string) => (vendors.data ?? []).find((v) => v.id === id)?.name ?? id.slice(0, 8)
  const catName = (id: string) => (cats.data ?? []).find((c: { id: string; name: string }) => c.id === id)?.name ?? id.slice(0, 8)

  return (
    <div className="space-y-4 rounded-xl border p-4" data-testid="scope-picker">
      <label className="flex items-center justify-between gap-3 text-sm">
        <span><span className="font-medium">All products</span><br /><span className="text-xs text-muted-foreground">Every listing on the platform</span></span>
        <Switch checked={!!value.all} onCheckedChange={(v) => onChange(v ? { all: true } : {})} aria-label="All products" />
      </label>

      {!value.all && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Vendor</Label>
            <Select value={ANY} onValueChange={(v) => v !== ANY && add("vendorIds", v)}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Add a vendor" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>Add a vendor…</SelectItem>
                {(vendors.data ?? []).map((v) => <SelectItem key={v.id} value={v.id}>{v.name} ({v.listings})</SelectItem>)}
              </SelectContent>
            </Select>
            <Chips items={(value.vendorIds ?? []).map((id) => ({ id, label: vendorName(id) }))} onRemove={(id) => drop("vendorIds", id)} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Category</Label>
            <Select value={ANY} onValueChange={(v) => v !== ANY && add("categoryIds", v)}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Add a category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>Add a category…</SelectItem>
                {(cats.data ?? []).map((c: { id: string; name: string }) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Chips items={(value.categoryIds ?? []).map((id) => ({ id, label: catName(id) }))} onRemove={(id) => drop("categoryIds", id)} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Brand</Label>
            <Select value={ANY} onValueChange={(v) => v !== ANY && add("brands", v)}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Add a brand" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>Add a brand…</SelectItem>
                {(brands.data ?? []).map((b) => <SelectItem key={b.brand} value={b.brand}>{b.brand} ({b.listings})</SelectItem>)}
              </SelectContent>
            </Select>
            <Chips items={(value.brands ?? []).map((b) => ({ id: b, label: b }))} onRemove={(id) => drop("brands", id)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Listed by</Label>
              <Select value={value.owner ?? ANY} onValueChange={(v) => set({ owner: v === ANY ? null : (v as "ADMIN" | "VENDOR") })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY}>Anyone</SelectItem>
                  <SelectItem value="ADMIN">Dealker only</SelectItem>
                  <SelectItem value="VENDOR">Vendors only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Sold to</Label>
              <Select value={value.channel ?? ANY} onValueChange={(v) => set({ channel: v === ANY ? null : (v as "B2C" | "B2B") })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY}>Any channel</SelectItem>
                  <SelectItem value="B2C">B2C only (customers)</SelectItem>
                  <SelectItem value="B2B">B2B only (vendors)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-xs">Specific products</Label>
            <Input className="h-9" placeholder="Search a product to add…" value={find} onChange={(e) => setFind(e.target.value)} />
            {q.length >= 2 && (
              <div className="max-h-36 overflow-auto rounded-md border">
                {(found.data?.data ?? []).slice(0, 8).map((l) => (
                  <button key={l.id} type="button" className="flex w-full items-center justify-between px-3 py-1.5 text-left text-sm hover:bg-muted"
                    onClick={() => { setNames((n) => ({ ...n, [l.id]: l.name })); add("listingIds", l.id); setFind("") }}>
                    <span className="truncate">{l.name}</span><span className="ml-2 shrink-0 text-xs text-muted-foreground">{l.owner_name}</span>
                  </button>
                ))}
                {found.data && found.data.data.length === 0 && <p className="px-3 py-2 text-xs text-muted-foreground">No match</p>}
              </div>
            )}
            <Chips items={(value.listingIds ?? []).map((id) => ({ id, label: names[id] ?? id.slice(0, 8) }))} onRemove={(id) => drop("listingIds", id)} />
          </div>
        </div>
      )}
    </div>
  )
}

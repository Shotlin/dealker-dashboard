"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { ImageOff, Loader2, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useDebounce } from "@/hooks/useDebounce"
import { formatINR } from "@/lib/utils"
import { getProducts } from "@/services/products.service"

interface Props {
  open: boolean
  /** Already in the section — shown ticked and disabled. */
  existingIds: string[]
  onOpenChange: (open: boolean) => void
  onAdd: (ids: string[]) => void
}

/** Search the catalogue and pick products to pin into a section (same product search the builder uses). */
export function AddProductsDialog({ open, existingIds, onOpenChange, onAdd }: Props) {
  const [search, setSearch] = useState("")
  const [picked, setPicked] = useState<string[]>([])
  const debounced = useDebounce(search, 300)
  const { data, isFetching } = useQuery({
    queryKey: ["merch", "product-search", debounced],
    queryFn: () => getProducts({ page: 1, limit: 20, search: debounced, status: "active" }),
    enabled: open,
    staleTime: 30_000,
  })
  const rows = data?.products ?? []
  const close = (v: boolean) => { if (!v) { setPicked([]); setSearch("") } onOpenChange(v) }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>Add products to this section</DialogTitle></DialogHeader>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search product, brand or SKU…" value={search} onChange={(e) => setSearch(e.target.value)} autoFocus />
          {isFetching && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
        </div>
        <div className="max-h-80 divide-y overflow-y-auto rounded-lg border">
          {rows.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">{isFetching ? "Searching…" : "No products found."}</p>}
          {rows.map((p) => {
            const already = existingIds.includes(p.id)
            const on = already || picked.includes(p.id)
            return (
              <label key={p.id} className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-muted/50">
                <Checkbox checked={on} disabled={already} onCheckedChange={() => setPicked((x) => (x.includes(p.id) ? x.filter((i) => i !== p.id) : [...x, p.id]))} />
                <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
                  {p.images?.[0]
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={p.images[0]} alt="" className="h-full w-full object-cover" loading="lazy" />
                    : <ImageOff className="h-4 w-4 text-muted-foreground" />}
                </div>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{p.name}</p><p className="truncate text-xs text-muted-foreground">{p.brand ?? p.category_name ?? ""}</p></div>
                <span className="text-sm tabular-nums">{formatINR(Number(p.sale_price ?? p.price))}</span>
                {already && <span className="text-[11px] text-muted-foreground">Added</span>}
              </label>
            )
          })}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => close(false)}>Cancel</Button>
          <Button disabled={!picked.length} onClick={() => { onAdd(picked); close(false) }}>Add {picked.length || ""} product{picked.length === 1 ? "" : "s"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

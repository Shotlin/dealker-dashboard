"use client"

import { useRef, useState } from "react"
import { Loader2, Upload } from "lucide-react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { PageHeader } from "@/components/shared/PageHeader"
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  getStorefrontStores,
  updateStorefrontStore,
  uploadStoreIcon,
  type StorefrontStore,
} from "@/services/storefront-stores.service"

function StoreRow({ store }: { store: StorefrontStore }) {
  const qc = useQueryClient()
  const [label, setLabel] = useState(store.label)
  const [sort, setSort] = useState(String(store.sort_order))
  const fileRef = useRef<HTMLInputElement>(null)

  const save = useMutation({
    mutationFn: (patch: Parameters<typeof updateStorefrontStore>[1]) => updateStorefrontStore(store.store_key, patch),
    onSuccess: () => {
      toast.success("Store saved")
      qc.invalidateQueries({ queryKey: ["storefront-stores"] })
    },
    onError: () => toast.error("Could not save store"),
  })
  const upload = useMutation({
    mutationFn: async (file: File) => save.mutateAsync({ icon_url: await uploadStoreIcon(file) }),
    onError: () => toast.error("Icon upload failed"),
  })

  const dirty = label.trim() !== store.label || Number(sort) !== store.sort_order

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-4 p-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border bg-white">
          {store.icon_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={store.icon_url} alt={store.label} className="h-12 w-12 object-contain" />
          ) : (
            <span className="text-xs text-slate-400">No icon</span>
          )}
        </div>
        <div className="min-w-[200px] flex-1 space-y-1">
          <div className="text-[11px] uppercase tracking-wide text-slate-400">{store.store_key}</div>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={100} />
        </div>
        <div className="w-24 space-y-1">
          <div className="text-[11px] uppercase tracking-wide text-slate-400">Order</div>
          <Input type="number" min={0} value={sort} onChange={(e) => setSort(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={store.is_active} onCheckedChange={(is_active) => save.mutate({ is_active })} />
          <span className="text-sm text-slate-600">{store.is_active ? "Shown" : "Hidden"}</span>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) upload.mutate(f)
            e.target.value = ""
          }}
        />
        <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={upload.isPending}>
          {upload.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
          Icon
        </Button>
        <Button
          type="button"
          disabled={!dirty || !label.trim() || save.isPending}
          onClick={() => save.mutate({ label: label.trim(), sort_order: Number(sort) })}
        >
          Save
        </Button>
      </CardContent>
    </Card>
  )
}

export default function StorefrontStoresPage() {
  const { data, isLoading } = useQuery({ queryKey: ["storefront-stores"], queryFn: getStorefrontStores })
  return (
    <div className="space-y-6">
      <PageHeader
        title="Stores"
        subtitle="The store tiles at the top of the customer app home (name, icon, order, visibility). Colours are edited in the Theme builder."
      />
      {isLoading ? (
        <LoadingSkeleton />
      ) : (
        <div className="space-y-3">{(data ?? []).map((s) => <StoreRow key={s.store_key} store={s} />)}</div>
      )}
    </div>
  )
}

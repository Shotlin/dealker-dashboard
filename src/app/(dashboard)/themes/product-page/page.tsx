"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, GripVertical, Loader2, Lock, RotateCcw, Save } from "lucide-react"
import { toast } from "sonner"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { PageHeader } from "@/components/shared/PageHeader"
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import {
  getProductPageLayout,
  saveProductPageLayout,
  type ProductPageBlock,
  type ProductPageCatalogItem,
} from "@/services/product-page.service"

const HINTS: Record<string, string> = {
  gallery: "Photos, swipe + thumbnails",
  title_price: "Name, rating, seller, price, delivery facts",
  condition: "Grade selector, skin, battery, usage — used items only",
  qc: "Dealkr QC score card that opens the full report — used items only",
  in_box: "Accessories and invoice that come with the device",
  highlights: "Key selling points",
  specs: "Product details table",
  description: "About this item",
  vendor: "Seller card with View shop",
  similar: "Similar products rail",
}

function Row({
  block,
  item,
  onToggle,
}: {
  block: ProductPageBlock
  item: ProductPageCatalogItem
  onToggle: (v: boolean) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.key,
    disabled: item.locked,
  })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-3 rounded-xl border bg-card p-3 ${isDragging ? "z-10 shadow-lg" : ""} ${
        block.visible ? "" : "opacity-60"
      }`}
    >
      {item.locked ? (
        <Lock className="size-4 text-muted-foreground" aria-label="Always shown" />
      ) : (
        <button
          type="button"
          className="cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
          aria-label={`Drag ${item.label}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>
      )}
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{item.label}</div>
        <div className="truncate text-xs text-muted-foreground">{HINTS[item.key] ?? ""}</div>
      </div>
      <Switch
        checked={block.visible}
        disabled={item.locked}
        onCheckedChange={onToggle}
        aria-label={`Show ${item.label}`}
      />
    </div>
  )
}

export default function ProductPageBuilder() {
  const router = useRouter()
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ["product-page-layout"], queryFn: getProductPageLayout })
  const [blocks, setBlocks] = useState<ProductPageBlock[]>([])
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (data) {
      setBlocks(data.blocks)
      setDirty(false)
    }
  }, [data])

  const save = useMutation({
    mutationFn: () => saveProductPageLayout(blocks),
    onSuccess: (res) => {
      qc.setQueryData(["product-page-layout"], res)
      toast.success("Product page saved — the app picks it up on next open")
      setDirty(false)
    },
    onError: () => toast.error("Could not save the layout"),
  })

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const catalog = new Map((data?.catalog ?? []).map((c) => [c.key, c]))

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    setBlocks((prev) => {
      const from = prev.findIndex((b) => b.key === active.id)
      const to = prev.findIndex((b) => b.key === over.id)
      return from < 0 || to < 0 ? prev : arrayMove(prev, from, to)
    })
    setDirty(true)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Product page"
        subtitle="Drag blocks to reorder the customer product page. Switch a block off to hide it."
      >
        <Button variant="outline" onClick={() => router.push("/themes")}>
          <ArrowLeft className="mr-2 size-4" /> Themes
        </Button>
        <Button
          variant="outline"
          disabled={!data}
          onClick={() => {
            if (data) {
              setBlocks(data.catalog.map((c) => ({ key: c.key, visible: true })))
              setDirty(true)
            }
          }}
        >
          <RotateCcw className="mr-2 size-4" /> Reset order
        </Button>
        <Button disabled={!dirty || save.isPending} onClick={() => save.mutate()}>
          {save.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
          Save
        </Button>
      </PageHeader>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Blocks, top to bottom</CardTitle>
          <CardDescription>
            Used-device blocks (Condition, QC report) only appear for used / refurbished / open-box products.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <LoadingSkeleton />
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={blocks.map((b) => b.key)} strategy={verticalListSortingStrategy}>
                {blocks.map((b) => {
                  const item = catalog.get(b.key)
                  if (!item) return null
                  return (
                    <Row
                      key={b.key}
                      block={b}
                      item={item}
                      onToggle={(v) => {
                        setBlocks((prev) => prev.map((x) => (x.key === b.key ? { ...x, visible: v } : x)))
                        setDirty(true)
                      }}
                    />
                  )
                })}
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

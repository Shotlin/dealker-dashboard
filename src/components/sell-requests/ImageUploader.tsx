"use client"

import { useRef } from "react"
import { ImagePlus, Loader2, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { useUploadSellImages } from "@/hooks/useSellRequests"

const MAX_BYTES = 5 * 1024 * 1024
const TYPES = ["image/jpeg", "image/png", "image/webp"]

/** Uploads straight away; the parent only holds the resulting URLs. */
export function ImageUploader({ value, onChange, max = 8 }: { value: string[]; onChange: (urls: string[]) => void; max?: number }) {
  const input = useRef<HTMLInputElement>(null)
  const upload = useUploadSellImages()

  const pick = (files: FileList | null) => {
    if (!files?.length) return
    const room = max - value.length
    const list = Array.from(files)
    if (list.length > room) toast.error(`You can add ${room} more image${room === 1 ? "" : "s"} (max ${max})`)
    const ok = list.slice(0, Math.max(0, room)).filter((f) => {
      if (!TYPES.includes(f.type)) { toast.error(`${f.name}: only JPG, PNG or WebP`); return false }
      if (f.size > MAX_BYTES) { toast.error(`${f.name}: larger than 5 MB`); return false }
      return true
    })
    if (!ok.length) return
    upload.mutate(ok, { onSuccess: (urls) => onChange([...value, ...urls]) })
    if (input.current) input.current.value = ""
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {value.map((u, i) => (
          <div key={u} className="group relative h-16 w-16 overflow-hidden rounded-lg border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={u} alt={`Device photo ${i + 1}`} className="h-full w-full object-cover" />
            <button type="button" aria-label={`Remove photo ${i + 1}`} onClick={() => onChange(value.filter((x) => x !== u))}
              className="absolute right-0.5 top-0.5 rounded-full bg-black/70 p-0.5 text-white opacity-0 focus:opacity-100 group-hover:opacity-100">
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        {value.length < max && (
          <Button type="button" variant="outline" className="h-16 w-16 flex-col gap-0.5 border-dashed p-0 text-xs" disabled={upload.isPending} onClick={() => input.current?.click()}>
            {upload.isPending ? <Loader2 className="animate-spin" /> : <ImagePlus />}
            {upload.isPending ? "" : "Add"}
          </Button>
        )}
      </div>
      <input ref={input} type="file" multiple accept={TYPES.join(",")} className="sr-only" aria-label="Upload device photos" onChange={(e) => pick(e.target.files)} />
      <p className="text-xs text-muted-foreground">Front, back and any damage. JPG/PNG/WebP, up to 5 MB each ({value.length}/{max}).</p>
    </div>
  )
}

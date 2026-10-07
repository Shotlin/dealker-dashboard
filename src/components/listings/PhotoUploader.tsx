"use client"

import { useRef, useState } from "react"
import { ArrowLeft, ArrowRight, ImagePlus, Loader2, Star, X } from "lucide-react"
import { toast } from "sonner"
import { listingsApi } from "@/services/listings.service"
import { cn } from "@/lib/utils"

const MAX = 8

export function PhotoUploader({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  const upload = async (files: FileList | null) => {
    if (!files?.length) return
    const room = MAX - value.length
    const picked = Array.from(files).slice(0, room)
    if (files.length > room) toast.info(`Only ${MAX} photos allowed — added the first ${room}`)
    setBusy(true)
    try {
      const urls = await listingsApi.uploadImages(picked)
      onChange([...value, ...urls])
    } catch (e) {
      toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || "Upload failed")
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ""
    }
  }

  const move = (i: number, d: number) => {
    const next = [...value]
    const j = i + d
    if (j < 0 || j >= next.length) return
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {value.map((src, i) => (
          <div key={src} className={cn("group relative aspect-square overflow-hidden rounded-xl border bg-muted", i === 0 && "ring-2 ring-primary")}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
            {i === 0 && (
              <span className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground">
                <Star className="h-3 w-3" />Cover
              </span>
            )}
            <button type="button" aria-label="Remove photo" onClick={() => onChange(value.filter((_, k) => k !== i))}
              className="absolute right-1.5 top-1.5 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100">
              <X className="h-3.5 w-3.5" />
            </button>
            <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1 bg-gradient-to-t from-black/60 to-transparent p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
              <button type="button" aria-label="Move left" disabled={i === 0} onClick={() => move(i, -1)} className="rounded bg-white/90 p-1 disabled:opacity-40"><ArrowLeft className="h-3 w-3" /></button>
              <button type="button" aria-label="Move right" disabled={i === value.length - 1} onClick={() => move(i, 1)} className="rounded bg-white/90 p-1 disabled:opacity-40"><ArrowRight className="h-3 w-3" /></button>
            </div>
          </div>
        ))}
        {value.length < MAX && (
          <button type="button" onClick={() => input.current?.click()} disabled={busy}
            className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed text-muted-foreground transition-colors hover:border-primary hover:text-primary">
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
            <span className="text-xs font-medium">{busy ? "Uploading…" : "Add photos"}</span>
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => upload(e.target.files)} />
      <p className={cn("text-xs", value.length < 3 ? "text-amber-600" : "text-muted-foreground")}>
        {value.length}/{MAX} photos · at least 3 required · JPG, PNG or WebP up to 5 MB · the first photo is the cover. Show the exact item you are selling.
      </p>
    </div>
  )
}

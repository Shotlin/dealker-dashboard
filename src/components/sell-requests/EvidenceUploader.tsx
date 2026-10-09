"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { AlertCircle, CheckCircle2, ImagePlus, Loader2, RotateCcw, Video, X } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useSellSettings } from "@/hooks/useSellRequests"
import { evidenceApi, uploadErrorMessage, type EvidenceMedia, type RequestKind } from "@/services/sell-requests.service"

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"]
const VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"]
const ACCEPT = [...IMAGE_TYPES, ...VIDEO_TYPES].join(",")
const FALLBACK = { maxImages: 8, maxVideos: 2, maxImageMb: 12, maxVideoMb: 100 }

type Item = {
  key: string
  file: File
  preview: string
  media: "IMAGE" | "VIDEO"
  status: "uploading" | "done" | "error"
  progress: number
  result?: EvidenceMedia
  error?: string
}

const mb = (n: number) => `${(n / 1048576).toFixed(n < 10485760 ? 1 : 0)} MB`

/**
 * Photos + QC video for a request. Each file uploads on its own (own progress, own retry), is checked
 * for type and size here for instant feedback, and re-checked by the server from the file's real bytes.
 * The parent only receives the files that finished uploading.
 */
export function EvidenceUploader({
  kind,
  onChange,
  onBusyChange,
}: {
  kind: RequestKind
  onChange: (done: EvidenceMedia[]) => void
  onBusyChange?: (busy: boolean) => void
}) {
  const settings = useSellSettings()
  const limits = settings.data ?? FALLBACK
  const [items, setItems] = useState<Item[]>([])
  const input = useRef<HTMLInputElement>(null)
  const aborts = useRef(new Map<string, AbortController>())
  const itemsRef = useRef<Item[]>([])
  itemsRef.current = items

  const patch = useCallback((key: string, p: Partial<Item>) => setItems((cur) => cur.map((i) => (i.key === key ? { ...i, ...p } : i))), [])

  const start = useCallback((item: Item) => {
    const ctl = new AbortController()
    aborts.current.set(item.key, ctl)
    patch(item.key, { status: "uploading", progress: 0, error: undefined })
    evidenceApi(kind)
      .upload(item.file, { signal: ctl.signal, onProgress: (progress) => patch(item.key, { progress }) })
      .then((result) => patch(item.key, { status: "done", progress: 100, result }))
      .catch((err) => {
        if (ctl.signal.aborted) return
        patch(item.key, { status: "error", error: uploadErrorMessage(err) })
      })
      .finally(() => aborts.current.delete(item.key))
  }, [kind, patch])

  useEffect(() => {
    onChange(items.filter((i) => i.status === "done" && i.result).map((i) => i.result as EvidenceMedia))
    onBusyChange?.(items.some((i) => i.status === "uploading"))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items])

  useEffect(() => () => {
    aborts.current.forEach((c) => c.abort())
    itemsRef.current.forEach((i) => URL.revokeObjectURL(i.preview))
  }, [])

  const pick = (files: FileList | null) => {
    if (!files?.length) return
    let images = items.filter((i) => i.media === "IMAGE").length
    let videos = items.filter((i) => i.media === "VIDEO").length
    const accepted: Item[] = []
    for (const f of Array.from(files)) {
      const isImage = IMAGE_TYPES.includes(f.type)
      const isVideo = VIDEO_TYPES.includes(f.type)
      if (/heic|heif/i.test(f.type) || /\.(heic|heif)$/i.test(f.name)) { toast.error(`${f.name}: HEIC photos aren't supported — set the camera to "Most Compatible" or export as JPG`); continue }
      if (!isImage && !isVideo) { toast.error(`${f.name}: use JPG, PNG or WebP photos, or an MP4, MOV or WebM video`); continue }
      if (isImage && f.size > limits.maxImageMb * 1048576) { toast.error(`${f.name}: photos can be up to ${limits.maxImageMb} MB (this one is ${mb(f.size)})`); continue }
      if (isVideo && f.size > limits.maxVideoMb * 1048576) { toast.error(`${f.name}: videos can be up to ${limits.maxVideoMb} MB (this one is ${mb(f.size)})`); continue }
      if (isImage && images >= limits.maxImages) { toast.error(`You can add up to ${limits.maxImages} photos`); continue }
      if (isVideo && videos >= limits.maxVideos) { toast.error(limits.maxVideos === 0 ? "Videos are turned off" : `You can add up to ${limits.maxVideos} video${limits.maxVideos === 1 ? "" : "s"}`); continue }
      if (isImage) images++; else videos++
      accepted.push({ key: `${Date.now()}-${Math.random().toString(36).slice(2)}`, file: f, preview: URL.createObjectURL(f), media: isImage ? "IMAGE" : "VIDEO", status: "uploading", progress: 0 })
    }
    if (input.current) input.current.value = ""
    if (!accepted.length) return
    setItems((cur) => [...cur, ...accepted])
    accepted.forEach(start)
  }

  const remove = (item: Item) => {
    aborts.current.get(item.key)?.abort()
    if (item.result) evidenceApi(kind).discard(item.result.id).catch(() => { /* swept server-side after 24 h */ })
    URL.revokeObjectURL(item.preview)
    setItems((cur) => cur.filter((i) => i.key !== item.key))
  }

  const photos = items.filter((i) => i.media === "IMAGE").length
  const videos = items.filter((i) => i.media === "VIDEO").length

  return (
    <div className="space-y-3">
      {items.length > 0 && (
        <ul className="space-y-2" aria-label="Selected files">
          {items.map((i) => (
            <li key={i.key} className={cn("flex items-center gap-3 rounded-lg border p-2", i.status === "error" && "border-red-300 bg-red-50/60 dark:bg-red-950/20")}>
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
                {i.media === "IMAGE" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={i.preview} alt="" className="h-full w-full object-cover" />
                ) : (
                  <video src={i.preview} muted preload="metadata" className="h-full w-full object-cover" aria-label={`Preview of ${i.file.name}`} />
                )}
                {i.media === "VIDEO" && <Video className="absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded bg-black/60 p-0.5 text-white" aria-hidden />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{i.file.name}</p>
                <p className="text-xs text-muted-foreground">{i.media === "VIDEO" ? "QC video" : "Photo"} · {mb(i.file.size)}</p>
                {i.status === "uploading" && (
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={i.progress} aria-label={`Uploading ${i.file.name}`}>
                    <div className="h-full bg-brand-600 transition-[width]" style={{ width: `${i.progress}%` }} />
                  </div>
                )}
                {i.status === "error" && <p role="alert" className="mt-1 flex items-start gap-1 text-xs text-red-700"><AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />{i.error}</p>}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {i.status === "uploading" && <span className="flex items-center gap-1 text-xs tabular-nums text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />{i.progress}%</span>}
                {i.status === "done" && <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-label="Uploaded" />}
                {i.status === "error" && <Button type="button" size="sm" variant="outline" className="h-7" onClick={() => start(i)}><RotateCcw /> Retry</Button>}
                <Button type="button" size="icon" variant="ghost" className="h-7 w-7" aria-label={`Remove ${i.file.name}`} onClick={() => remove(i)}><X /></Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" onClick={() => input.current?.click()} disabled={photos >= limits.maxImages && videos >= limits.maxVideos}>
          <ImagePlus /> Add photos or video
        </Button>
        <input ref={input} type="file" multiple accept={ACCEPT} className="sr-only" aria-label="Add device photos or a QC video" onChange={(e) => pick(e.target.files)} />
        <p className="text-xs text-muted-foreground">
          Photos {photos}/{limits.maxImages} · up to {limits.maxImageMb} MB each · Video {videos}/{limits.maxVideos} · up to {limits.maxVideoMb} MB
        </p>
      </div>
      <p className="text-xs text-muted-foreground">Show the front, back, screen on, and any damage. A short video of the device powering on and the IMEI screen speeds up QC.</p>
    </div>
  )
}

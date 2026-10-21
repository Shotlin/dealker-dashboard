"use client"

import { useEffect, useRef, useState } from "react"

/** Width of the iPhone the app is designed against (points). */
export const APP_POINTS = 402

/**
 * Lays its children out at the app's 402pt width and zooms them to fit the
 * parent, so any preview authored in app points/design units is proportional
 * to the real app at every preview size.
 */
export function ZoomTo402({
  children,
  background,
}: {
  children: React.ReactNode
  background?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(1)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setZoom(el.clientWidth > 0 ? el.clientWidth / APP_POINTS : 1)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return (
    <div ref={ref} style={{ width: "100%", background }}>
      <div style={{ width: APP_POINTS, zoom, fontFamily: "Poppins, system-ui, sans-serif" }}>{children}</div>
    </div>
  )
}

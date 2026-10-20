/* eslint-disable @next/next/no-img-element */

import { memo } from "react"
import { cn } from "@/lib/utils"
import type { PreviewProps } from "./index"
import styles from "../MobilePreviewFrame.module.css"
import { stealString, stealTabs } from "../stealDeals"

const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN")

/** Mirrors the app's StealDealsSection: title, price tabs, chips, product rail. */
function StealDealsPreview({ section, isSelected, onClick, products }: PreviewProps) {
  const config = section.config as Record<string, unknown>
  const s = (k: string) => stealString(config, k)
  const tabs = stealTabs(config)
  const accent = s("accent_color")
  const soft = s("accent_soft_color")
  const text = s("text_color")
  const muted = s("muted_color")
  const first = tabs[0]
  const items = (products ?? []).slice(0, 3)

  return (
    <button
      type="button"
      className={cn(styles.sectionSlot, styles.sectionSlotHover, isSelected && styles.sectionSlotSelected)}
      onClick={onClick}
      aria-pressed={isSelected}
    >
      <div style={{ padding: "6px 8px" }}>
        <div style={{ background: s("bg_color"), borderRadius: 14, padding: "10px 0", color: text, textAlign: "left" }}>
          <div style={{ padding: "0 10px", fontSize: 14, fontWeight: 800 }}>{s("title")}</div>
          {s("subtitle") && (
            <div style={{ padding: "4px 10px 0", fontSize: 9, color: muted, display: "flex", gap: 6, alignItems: "center" }}>
              {s("subtitle")}
              <span style={{ flex: 1, height: 1, background: muted, opacity: 0.25 }} />
            </div>
          )}

          <div style={{ display: "flex", margin: "10px 0 0", padding: "0 10px", borderBottom: `1.5px solid ${accent}`, height: 42, alignItems: "stretch" }}>
            {tabs.slice(0, 4).map((t, i) => {
              const active = i === 0
              const iconTab = !!t.icon_url || !t.sub_label
              return (
                <div
                  key={i}
                  style={{
                    flex: "0 0 25%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    border: active ? `1.5px solid ${accent}` : "none",
                    borderBottom: "none",
                    borderRadius: "10px 10px 0 0",
                    background: active ? soft : "transparent",
                    color: active ? accent : text,
                    marginBottom: -1.5,
                  }}
                >
                  {iconTab ? (
                    <>
                      {t.icon_url ? <img src={t.icon_url} alt="" style={{ width: 18, height: 18, objectFit: "contain" }} /> : <span style={{ fontSize: 14 }}>🔥</span>}
                      <span style={{ fontSize: 8, fontWeight: 700 }}>{t.label}</span>
                    </>
                  ) : (
                    <>
                      <span style={{ fontSize: 15, fontWeight: 800, lineHeight: 1 }}>{t.label}</span>
                      <span style={{ fontSize: 7.5, color: active ? accent : muted }}>{t.sub_label}</span>
                    </>
                  )}
                </div>
              )
            })}
          </div>

          <div style={{ display: "flex", gap: 5, padding: "8px 10px 0", overflow: "hidden" }}>
            <span style={{ border: `1.2px solid ${accent}`, background: soft, color: accent, borderRadius: 9, fontSize: 8.5, fontWeight: 800, padding: "5px 8px" }}>
              ▦ {s("all_label")}
            </span>
            {(first?.chips ?? []).slice(0, 3).map((c, i) => (
              <span key={i} style={{ border: "1px solid #E2E2E2", borderRadius: 9, fontSize: 8, fontWeight: 700, padding: "3px 7px", display: "flex", gap: 4, alignItems: "center", whiteSpace: "nowrap" }}>
                {c.image_url && <img src={c.image_url} alt="" style={{ width: 16, height: 16, borderRadius: 4, objectFit: "cover" }} />}
                {c.label || "Category"}
              </span>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8, padding: "10px 10px 0" }}>
            {[0, 1, 2].map((i) => {
              const p = items[i]
              const price = p ? (p.sale_price ?? p.price) : null
              return (
                <div key={i} style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ aspectRatio: "1", background: "#F6F6F6", borderRadius: 7, position: "relative", overflow: "hidden" }}>
                    {p?.thumbnail_url && <img src={p.thumbnail_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                    <span style={{ position: "absolute", right: 3, bottom: 4, width: 20, height: 20, borderRadius: 5, border: `1.2px solid ${accent}`, background: "#fff", color: accent, fontSize: 14, lineHeight: "17px", textAlign: "center", fontWeight: 700 }}>+</span>
                  </div>
                  <div style={{ marginTop: 5 }}>
                    <span style={{ background: s("price_badge_color"), color: "#fff", borderRadius: 4, fontSize: 9, fontWeight: 800, padding: "2px 5px", boxShadow: `1px 1.5px 0 ${s("price_badge_shadow_color")}` }}>
                      {price != null ? inr(price) : "₹—"}
                    </span>
                  </div>
                  <div style={{ fontSize: 8.5, fontWeight: 700, marginTop: 5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {p?.name ?? "Product"}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
      <div style={{ padding: "0 12px 8px", fontSize: 10, color: "#64748b", textAlign: "left" }}>
        {tabs.length} tab{tabs.length === 1 ? "" : "s"}. Products come from each tab&apos;s chips and pinned products — the
        preview shows the section&apos;s product source as sample photos.
      </div>
    </button>
  )
}

export default memo(StealDealsPreview)

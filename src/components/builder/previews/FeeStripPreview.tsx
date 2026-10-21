"use client"

/* eslint-disable @next/next/no-img-element */

import { memo, useEffect, useState } from "react"
import { Ticket, BadgePercent } from "lucide-react"
import { cn } from "@/lib/utils"
import { DEFAULT_HOME_LOOK } from "@/types/theme.types"
import type { PreviewProps } from "./index"
import styles from "../MobilePreviewFrame.module.css"

const FALLBACK_ASPECT_RATIO = 336 / 74
/** The app lays sections out in 914px design units on a 402pt screen (.h = 874/812, .r = 1.07). */
const K = 402 / 914
const H = 874 / 812
const MIN_STRIP_HEIGHT = 40 * H
const MAX_STRIP_HEIGHT = 140 * H

function FeeStripPreview({
  section,
  isSelected,
  onClick,
  themeData,
  onChromeRegionClick,
}: PreviewProps) {
  const config = section.config as Record<string, unknown>
  const imageUrl = typeof config.image_url === "string" ? config.image_url : null
  const containerColor =
    typeof config.container_color === "string"
      ? config.container_color
      : "#BFEFFF"
  const isBankOffer = section.section_type === "bank_offers"
  const bankOfferImages = Array.isArray(config.image_urls)
    ? (config.image_urls as string[])
        .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
        .slice(0, 10)
    : imageUrl
      ? [imageUrl]
      : []
  const [aspectRatio, setAspectRatio] = useState(FALLBACK_ASPECT_RATIO)
  const text = typeof config.text === "string" && config.text.trim()
    ? config.text.trim()
    : isBankOffer
    ? "10% Instant Bank Offer"
    : "₹0 Platform Fee • ₹0 Delivery Fee"
  const visible = config.visible !== false
  const look = { ...DEFAULT_HOME_LOOK, ...(themeData?.sections.homeLook ?? {}) }
  const feeLines = Array.isArray(config.lines)
    ? (config.lines as unknown[]).filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    : []
  const feeTitle = typeof config.title === "string" ? config.title.replace(/ /g, "") : ""
  const feeFootnote = typeof config.footnote === "string" ? config.footnote : ""
  const isFeeCard = !isBankOffer && feeLines.length > 0

  useEffect(() => {
    if (!imageUrl) {
      setAspectRatio(FALLBACK_ASPECT_RATIO)
      return
    }

    let cancelled = false
    const image = new window.Image()

    image.onload = () => {
      if (cancelled || !image.naturalWidth || !image.naturalHeight) return
      setAspectRatio(image.naturalWidth / image.naturalHeight)
    }

    image.onerror = () => {
      if (cancelled) return
      setAspectRatio(FALLBACK_ASPECT_RATIO)
    }

    image.src = imageUrl

    return () => {
      cancelled = true
    }
  }, [imageUrl])

  if (!visible && !imageUrl) return null

  return (
    <button
      type="button"
      className={cn(
        styles.sectionSlot,
        styles.sectionSlotHover,
        isSelected && styles.sectionSlotSelected
      )}
      onClick={onClick}
      aria-pressed={isSelected}
    >
      <div style={{ padding: isBankOffer ? "6px 5px 2px" : "0" }}>
        {isBankOffer && bankOfferImages.length > 0 ? (
          <div
            style={{
              display: "flex",
              gap: 14,
              overflowX: "auto",
              padding: "6px 12px 2px",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            {bankOfferImages.map((offerImage, index) => (
              <div
                key={`${section.id}-bank-offer-${index}`}
                style={{
                  flex: "0 0 336px",
                  height: 74,
                  overflow: "hidden",
                  borderRadius: 16,
                  background: "#f2f8ff",
                }}
              >
                <img
                  src={offerImage}
                  alt={`Bank Offer ${index + 1}`}
                  style={{
                    display: "block",
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    objectPosition: "left center",
                  }}
                />
              </div>
            ))}
          </div>
        ) : isFeeCard ? (
          <div style={{ padding: `${14 * K}px ${22 * K}px ${10 * K}px`, position: "relative" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: look.feeCardColor,
                color: look.feeCardTextColor,
                borderRadius: 22 * K,
                padding: `${14 * K}px ${18 * K}px ${6 * K}px ${26 * K}px`,
                fontFamily: "Poppins, system-ui, sans-serif",
              }}
            >
              {feeTitle && (
                <div style={{ width: 240 * K, flexShrink: 0, fontSize: 84 * K, fontWeight: 900, letterSpacing: -4 * K, lineHeight: 1, whiteSpace: "nowrap" }}>{feeTitle}</div>
              )}
              <div style={{ width: 22 * K, flexShrink: 0 }} />
              <div style={{ display: "flex", flex: 1, minWidth: 0, alignItems: "flex-start", gap: 16 * K }}>
                {[feeLines.filter((_, i) => i % 2 === 0), feeLines.filter((_, i) => i % 2 === 1)].map((col, ci) => (
                  <div key={ci} style={{ flex: 1, minWidth: 0 }}>
                    {col.map((line, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 * K, paddingBottom: 10 * K }}>
                        <span style={{ width: 26 * K, height: 26 * K, flexShrink: 0, borderRadius: 999, background: look.feeCardCheckColor, color: look.feeCardColor, fontSize: 18 * K, lineHeight: 1, display: "grid", placeItems: "center" }}>✓</span>
                        <span style={{ fontSize: 20 * K, fontWeight: 500, lineHeight: 1.1, whiteSpace: "nowrap" }}>{line}</span>
                      </div>
                    ))}
                    {ci === 1 && feeFootnote && (
                      <div style={{ fontSize: 15 * K, lineHeight: 1.2, opacity: 0.75 }}>{feeFootnote}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            {onChromeRegionClick && (
              <span
                role="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onChromeRegionClick("fee_card")
                }}
                style={{ position: "absolute", top: 0, right: 12, background: "rgba(59,130,246,0.92)", color: "#fff", fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 999, cursor: "pointer" }}
              >
                Card colors
              </span>
            )}
          </div>
        ) : imageUrl ? (
          /* App: rounded card inset 22 design-px from the edges, sized to the image's own
             shape (clamped 40..140 .h), artwork covers the card. */
          <div style={{ padding: `${10 * H}px ${22 * K}px ${4 * H}px` }}>
            <div
              style={{
                height: Math.min(MAX_STRIP_HEIGHT, Math.max(MIN_STRIP_HEIGHT, (402 - 44 * K) / aspectRatio)),
                width: "100%",
                overflow: "hidden",
                borderRadius: 16 * 1.072,
                background: containerColor,
              }}
            >
              <img
                src={imageUrl}
                alt="Strip"
                style={{ display: "block", width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }}
              />
            </div>
          </div>
        ) : (
          /* Exact Flutter match: #1C9A38 green, ticket icon, bold white text */
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              height: 42,
              padding: "0 16px",
              borderRadius: 14,
              background: isBankOffer
                ? "linear-gradient(135deg, #0f766e, #14b8a6)"
                : "#1C9A38",
              color: "#ffffff",
            }}
          >
            {isBankOffer ? (
              <BadgePercent size={17} strokeWidth={2.2} style={{ flexShrink: 0 }} />
            ) : (
              <Ticket size={17} strokeWidth={2.2} style={{ flexShrink: 0 }} />
            )}
            <span
              style={{
                flex: 1,
                fontSize: 13,
                fontWeight: 700,
                lineHeight: 1.1,
              }}
            >
              {text}
            </span>
          </div>
        )}
      </div>
    </button>
  )
}

export default memo(FeeStripPreview)

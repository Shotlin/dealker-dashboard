/* eslint-disable @next/next/no-img-element */
"use client"

import { memo } from "react"
import { cn } from "@/lib/utils"
import { useBanners } from "@/hooks/useBanners"
import { DEFAULT_HOME_LOOK } from "@/types/theme.types"
import type { PreviewProps } from "./index"
import styles from "../MobilePreviewFrame.module.css"

function CarouselPreview({
  section,
  isSelected,
  onClick,
  themeData,
  onChromeRegionClick,
}: PreviewProps) {
  const config = section.config as Record<string, unknown>
  const bannerSource =
    typeof config.banner_source === "string" ? config.banner_source : "system"
  const customImages = Array.isArray(config.images)
    ? (config.images as string[]).filter((u: string) => typeof u === "string" && u.trim())
    : []
  const singleImage =
    typeof config.image_url === "string" && config.image_url.trim()
      ? config.image_url
      : null
  const borderRadius =
    typeof config.border_radius === "number" ? config.border_radius : 18

  // In system mode, show the actual system banners in the simulation
  const { data: systemBanners = [] } = useBanners()
  const activeBanners = systemBanners
    .filter((b) => b.is_active && b.image_url)
    .sort((a, b) => a.sort_order - b.sort_order)
    .slice(0, 5)
    .map((b) => b.image_url)

  // Resolve which images to show in the preview
  const allImages: string[] =
    bannerSource === "custom"
      ? customImages.length > 0
        ? customImages
        : singleImage
          ? [singleImage]
          : []
      : // system mode: show actual system banner images if available
        activeBanners.length > 0
        ? activeBanners
        : []

  const isPromo = section.section_type === "promo_carousel"
  const hasImages = allImages.length > 0
  const look = { ...DEFAULT_HOME_LOOK, ...(themeData?.sections.homeLook ?? {}) }

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
      <div style={{ padding: "8px 10px" }}>
        {hasImages ? (
          <div>
            {isPromo ? (
              /* Dealker hero: black phone-bezel frame, dots overlaid bottom-right (matches the app). */
              <div
                style={{
                  position: "relative",
                  background: look.heroFrameColor,
                  borderRadius: 22,
                  padding: 6,
                  aspectRatio: "870 / 382",
                }}
              >
                <img
                  src={allImages[0]}
                  alt="Promo Banner"
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", borderRadius: 16 }}
                />
                {allImages.length > 1 && (
                  <div style={{ position: "absolute", right: 16, bottom: 14, display: "flex", gap: 6 }}>
                    {allImages.map((_, i) => (
                      <span
                        key={`hd-${i}`}
                        style={{
                          width: 9,
                          height: 9,
                          borderRadius: 999,
                          border: `1.5px solid ${look.heroDotColor}`,
                          background: i === 0 ? look.heroDotColor : "transparent",
                        }}
                      />
                    ))}
                  </div>
                )}
                {onChromeRegionClick && (
                  <span
                    role="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onChromeRegionClick("hero_frame")
                    }}
                    style={{
                      position: "absolute",
                      top: 10,
                      left: 10,
                      background: "rgba(59,130,246,0.92)",
                      color: "#fff",
                      fontSize: 9,
                      fontWeight: 700,
                      padding: "2px 7px",
                      borderRadius: 999,
                      cursor: "pointer",
                    }}
                  >
                    Frame colors
                  </span>
                )}
              </div>
            ) : (
            <div
              style={{
                borderRadius,
                overflow: "hidden",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                position: "relative",
              }}
            >
              <img
                src={allImages[0]}
                alt="Carousel"
                style={{ width: "100%", height: 140, objectFit: "cover", display: "block" }}
              />
            </div>
            )}

            {/* Pagination dots */}
            {!isPromo && allImages.length > 1 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: 6,
                  marginTop: 8,
                }}
              >
                {allImages.map((_, index) => (
                  <div
                    key={`dot-${index}`}
                    style={{
                      width: index === 0 ? 16 : 6,
                      height: 6,
                      borderRadius: 999,
                      background: index === 0 ? "#e67e22" : "#d5d5d5",
                      transition: "width 0.18s ease",
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Placeholder when no images configured yet */
          <div>
            <div
              style={{
                height: isPromo ? 160 : 140,
                borderRadius,
                background: "linear-gradient(135deg, #e2e8f0, #f1f5f9, #e2e8f0)",
                display: "grid",
                placeItems: "center",
                boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
              }}
            >
              <div
                style={{
                  textAlign: "center",
                  color: "#94a3b8",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {isPromo ? (bannerSource === "custom" ? "Custom Banners" : "System Banners") : "Carousel"}
                <div style={{ fontSize: 10, fontWeight: 500, marginTop: 4, color: "#b0b8c8" }}>
                  {isPromo
                    ? bannerSource === "custom"
                      ? "Upload images in the editor"
                      : "From /banners page"
                    : "Add images via config"}
                </div>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 6,
                marginTop: 8,
              }}
            >
              {[0, 1, 2].map((index) => (
                <div
                  key={`dot-${index}`}
                  style={{
                    width: index === 0 ? 16 : 6,
                    height: 6,
                    borderRadius: 999,
                    background: index === 0 ? "#e67e22" : "#d5d5d5",
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </button>
  )
}

export default memo(CarouselPreview)

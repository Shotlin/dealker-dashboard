/* eslint-disable @next/next/no-img-element */

import { memo } from "react";
import { cn } from "@/lib/utils";
import type { PreviewProps } from "./index";
import styles from "../MobilePreviewFrame.module.css";
import { brandCards, brandString } from "../topBrands";

/** Mirrors the app's TopBrandsSection (arched brand cards). */
function TopBrandsPreview({ section, isSelected, onClick }: PreviewProps) {
  const config = section.config as Record<string, unknown>;
  const s = (k: string) => brandString(config, k);
  const cards = brandCards(config);

  return (
    <button
      type="button"
      className={cn(
        styles.sectionSlot,
        styles.sectionSlotHover,
        isSelected && styles.sectionSlotSelected,
      )}
      onClick={onClick}
      aria-pressed={isSelected}
    >
      <div style={{ padding: "6px 8px" }}>
        <div
          style={{
            background: s("bg_color"),
            borderRadius: 14,
            padding: "10px 0",
            color: s("text_color"),
            textAlign: "left",
          }}
        >
          <div style={{ padding: "0 10px", fontSize: 13, fontWeight: 800 }}>
            {s("title")}
          </div>
          <div
            style={{
              display: "flex",
              gap: 8,
              padding: "8px 10px 0",
              overflow: "hidden",
            }}
          >
            {cards.slice(0, 3).map((c, i) => (
              <div
                key={i}
                style={{
                  flex: "0 0 38%",
                  aspectRatio: "1 / 1.35",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    top: "18%",
                    borderRadius: 16,
                    border: `1.5px solid ${s("border_bottom_color")}`,
                    background: `linear-gradient(${s("fill_top_color")}, ${s("fill_bottom_color")})`,
                    overflow: "hidden",
                  }}
                >
                  {c.image_url && (
                    <img
                      src={c.image_url}
                      alt=""
                      style={{
                        position: "absolute",
                        left: "15%",
                        width: "70%",
                        top: "8%",
                        height: "52%",
                        objectFit: "contain",
                      }}
                    />
                  )}
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      bottom: 0,
                      height: "26%",
                      background: s("band_color"),
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {c.logo_url ? (
                      <img
                        src={c.logo_url}
                        alt=""
                        style={{
                          maxWidth: "70%",
                          maxHeight: "80%",
                          objectFit: "contain",
                        }}
                      />
                    ) : (
                      <b style={{ fontSize: 11 }}>{c.brand_name}</b>
                    )}
                  </div>
                </div>
                <div
                  style={{
                    position: "absolute",
                    left: "22%",
                    right: "22%",
                    top: 0,
                    height: "26%",
                    borderRadius: "40px 40px 0 0",
                    border: `1.5px solid ${s("border_top_color")}`,
                    borderBottom: "none",
                    background: s("fill_top_color"),
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </button>
  );
}

export default memo(TopBrandsPreview);

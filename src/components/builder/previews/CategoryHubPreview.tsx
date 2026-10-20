/* eslint-disable @next/next/no-img-element */

import { memo } from "react";
import { cn } from "@/lib/utils";
import type { PreviewProps } from "./index";
import styles from "../MobilePreviewFrame.module.css";
import { hubString, hubTabs } from "../categoryHub";

/** Mirrors the app's CategoryHubSection (first tab only). */
function CategoryHubPreview({ section, isSelected, onClick }: PreviewProps) {
  const config = section.config as Record<string, unknown>;
  const s = (k: string) => hubString(config, k);
  const tabs = hubTabs(config);
  const first = tabs[0];

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
            color: s("text_color"),
            textAlign: "left",
            paddingBottom: 8,
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 12,
              padding: "0 10px",
              borderBottom: `1px solid ${s("muted_color")}33`,
              height: 26,
              alignItems: "flex-end",
            }}
          >
            {tabs.slice(0, 5).map((t, i) => (
              <span
                key={i}
                style={{
                  fontSize: 9,
                  fontWeight: 800,
                  paddingBottom: 4,
                  borderBottom:
                    i === 0
                      ? `3px solid ${s("indicator_color")}`
                      : "3px solid transparent",
                  color: i === 0 ? s("indicator_color") : s("text_color"),
                }}
              >
                {t.label}
              </span>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6, padding: "8px 10px 0" }}>
            {[0, 1, 2].map((i) => {
              const t = first?.tiles[i];
              return (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: 52,
                    borderRadius: 8,
                    border: `1px solid ${s("tile_border_color")}`,
                    background: `linear-gradient(#fff, ${s("tile_color")})`,
                    padding: 4,
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <div style={{ fontSize: 7.5, fontWeight: 800 }}>
                    {t?.title || "Tile"}
                  </div>
                  {t?.image_url && (
                    <img
                      src={t.image_url}
                      alt=""
                      style={{
                        position: "absolute",
                        bottom: 2,
                        left: "20%",
                        width: "60%",
                        height: "55%",
                        objectFit: "contain",
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 10px 0",
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 800 }}>
              {first?.grid_title || "Category grid"}
            </span>
            {s("see_all_label") && (
              <span
                style={{
                  fontSize: 8,
                  fontWeight: 800,
                  color: s("accent_color"),
                  border: `1px solid ${s("accent_color")}44`,
                  borderRadius: 6,
                  padding: "2px 6px",
                }}
              >
                {s("see_all_label")} ›
              </span>
            )}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 5,
              padding: "6px 10px 0",
            }}
          >
            {[0, 1, 2, 3].map((i) => {
              const g = first?.grid[i];
              return (
                <div key={i} style={{ textAlign: "center" }}>
                  <div
                    style={{
                      aspectRatio: "1",
                      background: s("tile_color"),
                      borderRadius: 7,
                      overflow: "hidden",
                    }}
                  >
                    {g?.image_url && (
                      <img
                        src={g.image_url}
                        alt=""
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "contain",
                        }}
                      />
                    )}
                  </div>
                  <div style={{ fontSize: 7, marginTop: 2 }}>
                    {g?.label || "Category"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </button>
  );
}

export default memo(CategoryHubPreview);

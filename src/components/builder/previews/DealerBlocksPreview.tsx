/* eslint-disable @next/next/no-img-element */

import { memo, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { PreviewProps } from "./index";
import styles from "../MobilePreviewFrame.module.css";
import {
  blockValue,
  isDealerBlock,
  type DealerBlockType,
} from "../dealerBlocks";

const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

function DealerBlocksPreview({
  section,
  isSelected,
  onClick,
  products,
}: PreviewProps) {
  if (!isDealerBlock(section.section_type)) return null;
  const type: DealerBlockType = section.section_type;
  const config = section.config as Record<string, unknown>;
  const v = (key: string) => blockValue(config, type, key);
  const items = (products ?? []).slice(0, 3);

  let body: ReactNode = null;

  if (type === "live_auction") {
    body = (
      <div
        style={{
          background: v("bg_color"),
          color: v("text_color"),
          borderRadius: 14,
          padding: 7,
        }}
      >
        <div
          style={{
            background: `linear-gradient(90deg, ${v("header_bg_color")}, #fff)`,
            borderRadius: 10,
            padding: "6px 8px",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span style={{ fontSize: 18, color: v("button_color") }}>⚖</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 900, lineHeight: 1.1 }}>
              {v("title")}{" "}
              <span
                style={{
                  background: v("live_color"),
                  color: "#fff",
                  borderRadius: 99,
                  fontSize: 7,
                  padding: "1px 5px",
                }}
              >
                ▶ LIVE
              </span>
            </div>
            <div style={{ fontSize: 8, opacity: 0.85 }}>{v("subtitle")}</div>
          </div>
          <span
            style={{ fontSize: 8.5, fontWeight: 800, color: v("button_color") }}
          >
            {v("view_all_label")}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            gap: 6,
            marginTop: 6,
            alignItems: "flex-start",
          }}
        >
          <div
            style={{
              width: 52,
              height: 54,
              borderRadius: 9,
              background: v("header_bg_color"),
              display: "grid",
              placeItems: "center",
              fontSize: 22,
            }}
          >
            📱
          </div>
          <div style={{ flex: 11, fontSize: 8.5 }}>
            <span
              style={{
                background: v("live_color"),
                color: "#fff",
                borderRadius: 3,
                fontSize: 6.5,
                padding: "0 4px",
              }}
            >
              ◆ LIVE
            </span>
            <div style={{ fontWeight: 800, fontSize: 9.5, lineHeight: 1.15 }}>
              Sample auction product
            </div>
            <div style={{ opacity: 0.7, fontSize: 8 }}>Highest Bid</div>
            <div style={{ fontWeight: 900, fontSize: 14, lineHeight: 1.1 }}>
              {inr(68400)}
            </div>
            <span
              style={{
                background: v("winning_color"),
                color: "#fff",
                borderRadius: 99,
                padding: "1px 6px",
                fontSize: 7.5,
              }}
            >
              You are Winning
            </span>
          </div>
          <div style={{ flex: 8, fontSize: 8, paddingTop: 22 }}>
            <div style={{ opacity: 0.7 }}>Bid Increment</div>
            <div style={{ fontWeight: 900, fontSize: 11 }}>{inr(500)}</div>
          </div>
          <div style={{ flex: 9, textAlign: "right", fontSize: 8.5 }}>
            <div style={{ color: v("live_color"), fontWeight: 800 }}>
              ⏱ 12m 36s left
            </div>
            <div
              style={{
                marginTop: 8,
                background: `linear-gradient(90deg, ${v("button_color")}, #3B82F6)`,
                color: "#fff",
                borderRadius: 9,
                padding: "6px 4px",
                fontWeight: 800,
                textAlign: "center",
              }}
            >
              {v("button_label")}
            </div>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginTop: 6,
            fontSize: 8,
          }}
        >
          <span>👥 42 bids</span>
          <div
            style={{
              flex: 1,
              height: 4,
              borderRadius: 99,
              background: "#0001",
            }}
          >
            <div
              style={{
                width: "78%",
                height: "100%",
                borderRadius: 99,
                background: v("button_color"),
              }}
            />
          </div>
          <span style={{ opacity: 0.65, fontWeight: 700 }}>
            Reserve not met
          </span>
        </div>
      </div>
    );
  } else if (type === "deal_of_day") {
    const p = items[0];
    const price = p ? (p.sale_price ?? p.price) : 45999;
    const mrp = p ? p.price : 69999;
    const off = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
    body = (
      <div
        style={{
          background: v("bg_color"),
          color: v("text_color"),
          borderRadius: 14,
          padding: 8,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 12,
            fontWeight: 900,
          }}
        >
          <span>⚡ {v("title")}</span>
          <span style={{ fontSize: 10 }}>
            ⏱ 10:29:45{" "}
            <span style={{ opacity: 0.6, fontWeight: 600 }}>Left Today</span>
          </span>
        </div>
        <div
          style={{
            marginTop: 6,
            background: v("card_color"),
            borderRadius: 12,
            padding: 8,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div
            style={{
              width: 50,
              height: 50,
              display: "grid",
              placeItems: "center",
            }}
          >
            {p?.thumbnail_url ? (
              <img
                src={p.thumbnail_url}
                alt=""
                style={{
                  maxWidth: "100%",
                  maxHeight: "100%",
                  objectFit: "contain",
                }}
              />
            ) : (
              <span style={{ fontSize: 26 }}>📱</span>
            )}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 800 }}>
              {p?.name ?? "Deal product"}
            </div>
            <div style={{ fontSize: 12, fontWeight: 900 }}>
              {inr(price)}{" "}
              <span
                style={{
                  fontSize: 9,
                  opacity: 0.4,
                  textDecoration: "line-through",
                }}
              >
                {inr(mrp)}
              </span>
            </div>
          </div>
          {off > 0 && (
            <span
              style={{
                background: v("off_color"),
                color: "#fff",
                borderRadius: 99,
                fontSize: 9,
                fontWeight: 800,
                padding: "3px 7px",
              }}
            >
              {off}% OFF
            </span>
          )}
          <span
            style={{
              background: v("button_color"),
              color: "#fff",
              borderRadius: 8,
              fontSize: 9,
              fontWeight: 800,
              padding: "6px 9px",
            }}
          >
            {v("button_label")}
          </span>
        </div>
      </div>
    );
  } else if (type === "mega_sale") {
    const chips = Array.isArray(config.items)
      ? (config.items as Array<Record<string, unknown>>).slice(0, 4)
      : [];
    body = (
      <div
        style={{
          background: v("bg_color"),
          color: v("text_color"),
          borderRadius: 14,
          padding: 8,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <div style={{ minWidth: 92 }}>
          <div style={{ fontSize: 15, fontWeight: 900, lineHeight: 1 }}>
            {v("title")}
          </div>
          <div style={{ fontSize: 10, fontWeight: 800 }}>{v("subtitle")}</div>
        </div>
        <div style={{ display: "flex", gap: 5, flex: 1 }}>
          {(chips.length
            ? chips
            : [
                { label: "Mobile" },
                { label: "Laptop" },
                { label: "Accessories" },
              ]
          ).map((c, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                background: v("chip_color"),
                borderRadius: 9,
                padding: "4px 2px",
                textAlign: "center",
                fontSize: 8,
                fontWeight: 700,
              }}
            >
              {typeof c.image_url === "string" && c.image_url ? (
                <img
                  src={c.image_url}
                  alt=""
                  style={{ height: 18, display: "block", margin: "0 auto 2px" }}
                />
              ) : null}
              {String(c.label ?? "")}
            </div>
          ))}
        </div>
      </div>
    );
  } else if (type === "exchange_sell") {
    body = (
      <div>
        <div
          style={{
            background: v("bg_color"),
            color: v("text_color"),
            borderRadius: 12,
            padding: "8px 10px",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ fontSize: 22 }}>📱</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 900 }}>{v("title")}</div>
            <div style={{ fontSize: 8.5 }}>{v("subtitle")}</div>
          </div>
          <span
            style={{
              background: v("button_color"),
              color: v("button_text_color"),
              borderRadius: 8,
              fontSize: 9,
              fontWeight: 800,
              padding: "6px 9px",
            }}
          >
            {v("button_label")}
          </span>
        </div>
        <div
          style={{
            marginTop: 5,
            background: v("trust_bg_color"),
            color: v("text_color"),
            borderRadius: 10,
            padding: 6,
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 4,
          }}
        >
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{ fontSize: 7.5, textAlign: "center" }}>
              <div style={{ fontWeight: 800 }}>🛡 {v(`trust_${i}_title`)}</div>
              <div style={{ opacity: 0.6 }}>{v(`trust_${i}_sub`)}</div>
            </div>
          ))}
        </div>
      </div>
    );
  } else {
    const card = (title: string, list: typeof items) => (
      <div
        style={{
          flex: 1,
          background: v("bg_color"),
          color: v("text_color"),
          borderRadius: 12,
          padding: 6,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 9,
            fontWeight: 800,
          }}
        >
          <span>{title}</span>
          <span style={{ fontSize: 7.5 }}>{v("view_all_label")}</span>
        </div>
        <div style={{ display: "flex", gap: 3, marginTop: 4 }}>
          {(list.length ? list : [null, null, null]).map((p, i) => (
            <div key={i} style={{ flex: 1, fontSize: 7, textAlign: "center" }}>
              <div
                style={{ height: 28, display: "grid", placeItems: "center" }}
              >
                {p?.thumbnail_url ? (
                  <img
                    src={p.thumbnail_url}
                    alt=""
                    style={{
                      maxHeight: "100%",
                      maxWidth: "100%",
                      objectFit: "contain",
                    }}
                  />
                ) : (
                  <span style={{ fontSize: 16 }}>📦</span>
                )}
              </div>
              <div
                style={{
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {p?.name ?? "Product"}
              </div>
              <div style={{ fontWeight: 800 }}>
                {p ? inr(p.sale_price ?? p.price) : "₹—"}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
    body = (
      <div style={{ display: "flex", gap: 6 }}>
        {card(v("left_title"), items)}
        {card(v("right_title"), items)}
      </div>
    );
  }

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
      <div style={{ padding: "6px 10px" }}>{body}</div>
    </button>
  );
}

export default memo(DealerBlocksPreview);

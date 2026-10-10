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
    // Every size is a share of the section width (1448 px reference), like the app.
    const u = (px: number) => `${(px / 1448) * 100}cqw`;
    const bgImage = v("bg_image_url");
    const cards = items.length ? items : [null, null];
    body = (
      <div
        style={{
          containerType: "inline-size",
          position: "relative",
          width: "100%",
          aspectRatio: "1448 / 1540",
          background: bgImage
            ? `url(${bgImage}) top center / 100% auto no-repeat ${v("header_bg_color")}`
            : `linear-gradient(135deg, ${v("header_bg_color")}, #0d0d4a)`,
          overflow: "hidden",
        }}
      >
        {!bgImage && (
          <div
            style={{
              position: "absolute",
              left: u(60),
              top: u(70),
              color: v("header_text_color"),
              fontSize: u(88),
              fontWeight: 900,
              lineHeight: 1,
              whiteSpace: "nowrap",
            }}
          >
            {v("title")}
          </div>
        )}
        <div
          style={{
            position: "absolute",
            right: u(28),
            top: u(128),
            height: u(112),
            display: "flex",
            alignItems: "center",
            padding: `0 ${u(10)}`,
            borderRadius: 999,
            background: `${v("timer_bg_color")}8c`,
            border: `${u(1.5)} solid ${v("timer_border_color")}40`,
          }}
        >
          <div
            style={{
              height: u(98),
              display: "flex",
              alignItems: "center",
              gap: u(22),
              padding: `0 ${u(30)}`,
              borderRadius: 999,
              background: v("timer_bg_color"),
              border: `${u(3)} solid ${v("timer_border_color")}`,
              color: v("timer_text_color"),
            }}
          >
            <span style={{ fontSize: u(54), lineHeight: 1 }}>⏱</span>
            <div style={{ lineHeight: 1.05 }}>
              <div style={{ fontSize: u(25), opacity: 0.85 }}>
                {v("ends_label")}
              </div>
              <div style={{ fontSize: u(40), fontWeight: 900 }}>06:31:56</div>
            </div>
          </div>
          <div
            style={{
              width: u(2),
              height: u(62),
              margin: `0 ${u(18)}`,
              background: `${v("timer_border_color")}4d`,
            }}
          />
          <div
            style={{
              height: u(82),
              display: "flex",
              alignItems: "center",
              padding: `0 ${u(26)}`,
              borderRadius: 999,
              background: v("view_all_bg_color"),
              color: v("view_all_text_color"),
              fontSize: u(36),
              fontWeight: 800,
              whiteSpace: "nowrap",
            }}
          >
            {v("view_all_label")}
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            left: u(45),
            right: u(45),
            top: u(285),
            height: u(1225),
            borderRadius: u(46),
            background: v("panel_color"),
            boxShadow: "0 10px 30px rgba(0,0,0,.12)",
            display: "flex",
            gap: u(33),
            padding: u(29),
            overflow: "hidden",
          }}
        >
          {cards.map((p, i) => {
            const price = p ? (p.sale_price ?? p.price) : 0;
            const mrp = p ? p.price : 0;
            const off = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
            return (
              <div
                key={i}
                style={{
                  flex: "0 0 auto",
                  width: u(869),
                  height: u(1167),
                  borderRadius: u(40),
                  background: "#fff",
                  boxShadow: "0 4px 14px rgba(0,0,0,.08)",
                  padding: u(50),
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div style={{ flex: 1, display: "grid", placeItems: "center" }}>
                  {p?.thumbnail_url ? (
                    <img
                      src={p.thumbnail_url}
                      alt=""
                      style={{ maxWidth: "80%", maxHeight: "100%", objectFit: "contain" }}
                    />
                  ) : (
                    <span style={{ fontSize: u(300) }}>📱</span>
                  )}
                </div>
                <div style={{ fontSize: u(58), fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {p?.name ?? "Deal product"}
                </div>
                <div style={{ fontSize: u(66), fontWeight: 900, margin: `${u(12)} 0 ${u(24)}` }}>
                  {p ? inr(price) : "₹0"}{" "}
                  {off > 0 && (
                    <span style={{ fontSize: u(40), color: "#16a34a" }}>{off}% OFF</span>
                  )}
                </div>
                <div
                  style={{
                    height: u(150),
                    borderRadius: u(34),
                    background: v("grab_button_color"),
                    color: "#fff",
                    display: "grid",
                    placeItems: "center",
                    fontSize: u(56),
                    fontWeight: 700,
                  }}
                >
                  🛒 {v("button_label")}
                </div>
              </div>
            );
          })}
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
      {type === "live_auction" && (
        <div style={{ padding: "0 12px 8px", fontSize: 10, color: "#64748b", textAlign: "left" }}>
          Home shows up to {Math.max(1, Math.min(12, Number(v("max_auctions")) || 4))} live auctions (swipe
          sideways) + a “View all” tile that opens the Auctions screen.
        </div>
      )}
    </button>
  );
}

export default memo(DealerBlocksPreview);

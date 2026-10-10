"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ThemeColorPicker } from "@/components/themes/ThemeColorPicker"
import { ThemeImageUploader } from "@/components/themes/ThemeImageUploader"
import {
  DEALER_BLOCK_FIELDS,
  blockValue,
  type DealerBlockType,
} from "../dealerBlocks"

interface DealerBlockEditorProps {
  type: DealerBlockType
  config: Record<string, unknown>
  onChange: (config: Record<string, unknown>) => void
}

/** Generic editor for the home-design blocks: text, colour and date fields. */
export default function DealerBlockEditor({ type, config, onChange }: DealerBlockEditorProps) {
  const patch = (key: string, value: string) => onChange({ ...config, [key]: value })

  return (
    <div className="space-y-4">
      {DEALER_BLOCK_FIELDS[type].map((field) => {
        const value = blockValue(config, type, field.key)
        if (field.kind === "color") {
          return (
            <ThemeColorPicker
              key={field.key}
              label={field.label}
              value={value || "#FFFFFF"}
              onChange={(hex) => patch(field.key, hex)}
            />
          )
        }
        if (field.kind === "number") {
          return (
            <div key={field.key} className="space-y-2">
              <Label className="text-xs font-medium text-slate-600">{field.label}</Label>
              <Input
                type="number"
                min={1}
                max={12}
                value={value}
                onChange={(e) => {
                  const n = Math.round(Number(e.target.value))
                  onChange({ ...config, [field.key]: Number.isFinite(n) && n > 0 ? Math.min(12, n) : 1 })
                }}
              />
              {field.hint && <p className="text-xs text-slate-500">{field.hint}</p>}
            </div>
          )
        }
        if (field.kind === "image") {
          return (
            <ThemeImageUploader
              key={field.key}
              label={field.label}
              kind="banner"
              hint={field.hint}
              value={value || null}
              onChange={(url) => patch(field.key, url ?? "")}
            />
          )
        }
        return (
          <div key={field.key} className="space-y-2">
            <Label className="text-xs font-medium text-slate-600">{field.label}</Label>
            <Input
              type={field.kind === "datetime" ? "datetime-local" : "text"}
              value={field.kind === "datetime" && value ? value.slice(0, 16) : value}
              placeholder={field.placeholder}
              onChange={(e) =>
                patch(
                  field.key,
                  field.kind === "datetime" && e.target.value
                    ? new Date(e.target.value).toISOString()
                    : e.target.value
                )
              }
            />
          </div>
        )
      })}
      {type === "live_auction" && (
        <p className="text-xs text-slate-500">
          Shows the live auctions that end soonest, from Auctions. Visible to everyone, including guests; bidding needs a login.
        </p>
      )}
      {type === "deal_of_day" && (
        <p className="text-xs text-slate-500">
          Each Deal of the Day has its own background, end time and products. Pick the products under “Product source” (leave it empty to show the store&apos;s current deals — then two sections would show the same ones). You can add several of these to any store or tab.
        </p>
      )}
      {type === "recent_recommended" && (
        <p className="text-xs text-slate-500">
          “Recently Viewed” uses the customer&apos;s own history; “Recommended” uses the product source (default: trending).
        </p>
      )}
    </div>
  )
}

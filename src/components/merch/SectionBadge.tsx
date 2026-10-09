import { Badge } from "@/components/ui/badge"
import { SECTION_LABELS } from "@/services/merchandising.service"
import type { SectionKey } from "@/services/merchandising.service"

export function SectionBadge({ section, endsAt }: { section: SectionKey | null; endsAt?: string | null }) {
  if (!section) return <span className="text-xs text-muted-foreground">—</span>
  const expired = !!endsAt && new Date(endsAt).getTime() < Date.now()
  return (
    <Badge variant="outline" className={`border-0 text-[11px] font-medium ${expired ? "bg-slate-100 text-slate-500" : "bg-violet-50 text-violet-700"}`}>
      {SECTION_LABELS[section]}{expired ? " · ended" : ""}
    </Badge>
  )
}

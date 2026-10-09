import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { QcStatus } from "@/services/qc.service"

export const QC_META: Record<QcStatus, { label: string; cls: string }> = {
  QC_PENDING: { label: "QC pending", cls: "bg-slate-100 text-slate-700" },
  QC_PASSED: { label: "QC passed", cls: "bg-emerald-50 text-emerald-700" },
  QC_FAILED: { label: "QC failed", cls: "bg-red-50 text-red-700" },
  QC_RECHECK: { label: "QC recheck", cls: "bg-amber-50 text-amber-700" },
}

export function QcBadge({ status, score }: { status: QcStatus; score?: number | null }) {
  const m = QC_META[status]
  return (
    <Badge variant="outline" className={cn("border-0 text-[11px] font-medium", m.cls)}>
      {m.label}
      {score != null && status !== "QC_PENDING" ? ` · ${score}%` : ""}
    </Badge>
  )
}

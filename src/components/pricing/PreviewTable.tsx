import { Badge } from "@/components/ui/badge"
import type { Preview } from "@/services/pricing.service"

const inr = (n: number | null) => (n == null ? "—" : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n))
const FIELD = { sale_price: "Selling price", wholesale_price: "Wholesale price", stock_quantity: "Stock" } as const

export function PreviewTable({ preview, stock }: { preview: Preview; stock?: boolean }) {
  const s = preview.summary
  return (
    <div className="space-y-3" data-testid="preview">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50">{s.changed} will change</Badge>
        {s.skipped > 0 && <Badge variant="outline" className="text-amber-700">{s.skipped} skipped</Badge>}
        <span className="text-muted-foreground">{s.listings} listing{s.listings === 1 ? "" : "s"} matched</span>
      </div>
      {s.skipped > 0 && (
        <ul className="space-y-0.5 text-xs text-muted-foreground">
          {Object.entries(s.skipReasons).map(([reason, n]) => <li key={reason}>{n} × {reason}</li>)}
        </ul>
      )}
      <div className="max-h-[360px] overflow-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-muted/60 text-xs text-muted-foreground">
            <tr><th className="px-3 py-2 text-left">Product</th><th className="px-3 py-2 text-left">Field</th><th className="px-3 py-2 text-right">Now</th><th className="px-3 py-2 text-right">After</th></tr>
          </thead>
          <tbody className="divide-y">
            {preview.sample.map((r) => (
              <tr key={`${r.id}-${r.field}`} className={r.skip ? "bg-amber-50/40" : ""}>
                <td className="max-w-[260px] truncate px-3 py-1.5">{r.name}{r.brand ? <span className="text-xs text-muted-foreground"> · {r.brand}</span> : null}</td>
                <td className="px-3 py-1.5 text-xs text-muted-foreground">{FIELD[r.field]}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{stock ? (r.old ?? "—") : inr(r.old)}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">
                  {r.skip ? <span className="text-xs text-amber-700">{r.skip}</span>
                    : <span className="font-medium">{stock ? r.new : inr(r.new)}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {preview.truncated && <p className="text-xs text-muted-foreground">Showing the first 100 rows — the change applies to all {s.changed}.</p>}
    </div>
  )
}

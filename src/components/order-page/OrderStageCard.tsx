"use client"

/**
 * The 9-stage order timeline. With the `orders.override` permission an admin
 * can move a stage forward by hand — always with a written reason that is kept.
 */

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { CheckCircle2, Circle, Lock, ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { usePermissions } from "@/hooks/usePermissions"
import { cn, formatDateTime } from "@/lib/utils"
import { orderStagesApi } from "@/services/order-stages.service"
import type { OrderStage } from "@/services/order-stages.service"

export function OrderStageCard({ orderId }: { orderId: string }) {
  const qc = useQueryClient()
  const { can } = usePermissions()
  const allowed = can("orders.override")
  const { data, isLoading } = useQuery({ queryKey: ["order-stages", orderId], queryFn: () => orderStagesApi.get(orderId) })
  const [target, setTarget] = useState<OrderStage | null>(null)
  const [reason, setReason] = useState("")
  const override = useMutation({
    mutationFn: ({ stage, why }: { stage: string; why: string }) => orderStagesApi.override(orderId, stage, why),
    onSuccess: () => {
      toast.success("Stage updated")
      setTarget(null); setReason("")
      qc.invalidateQueries({ queryKey: ["order-stages", orderId] })
      qc.invalidateQueries({ queryKey: ["order-overview"] })
      qc.invalidateQueries({ queryKey: ["orders"] })
    },
    onError: (e) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || "Could not update the stage"),
  })

  return (
    <Card className="shadow-none" data-testid="order-stage-card">
      <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base">Order stages{!allowed && <Lock className="h-3.5 w-3.5 text-muted-foreground" aria-label="View only" />}</CardTitle></CardHeader>
      <CardContent>
        {isLoading || !data ? <Skeleton className="h-48 w-full" /> : (
          <ol className="space-y-0">
            {data.stages.map((s, i) => (
              <li key={s.key} data-testid={`order-stage-${s.key}`} data-done={s.done} className="relative flex gap-3 pb-3 last:pb-0">
                {i < data.stages.length - 1 && <span className={cn("absolute left-[9px] top-5 h-full w-px", s.done ? "bg-emerald-300" : "bg-border")} />}
                {s.done ? <CheckCircle2 className="relative z-10 mt-0.5 h-5 w-5 shrink-0 bg-white text-emerald-600" /> : <Circle className={cn("relative z-10 mt-0.5 h-5 w-5 shrink-0 bg-white", s.current ? "text-amber-500" : "text-slate-300")} />}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={cn("text-sm font-medium", !s.done && !s.current && "text-muted-foreground")}>{s.label}</p>
                    {s.override && <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 text-[10px] font-medium text-amber-700"><ShieldAlert className="h-3 w-3" />set by admin</span>}
                    {allowed && s.canOverride && (
                      <Button size="sm" variant="outline" className="ml-auto h-6 px-2 text-[11px]" onClick={() => setTarget(s)}>Mark done</Button>
                    )}
                  </div>
                  {s.detail && <p className="text-xs text-muted-foreground">{s.detail}</p>}
                  {s.override && <p className="text-xs text-muted-foreground">“{s.override.reason}” — {s.override.by ?? "admin"}, {formatDateTime(s.override.at)}</p>}
                  {allowed && s.blocked && !s.done && <p className="text-[11px] text-amber-700">{s.blocked}</p>}
                </div>
              </li>
            ))}
          </ol>
        )}
        {data?.terminal && <p className="mt-3 rounded-lg bg-muted/50 p-2 text-xs text-muted-foreground">This order is {data.status.toLowerCase()}, so its stages are locked.</p>}
      </CardContent>

      <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mark “{target?.label}” as done</DialogTitle>
            <DialogDescription>This moves the real order forward (never backward) and is recorded with your name and reason.</DialogDescription>
          </DialogHeader>
          <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why are you overriding this stage? (required)" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)}>Cancel</Button>
            <Button disabled={reason.trim().length < 5 || override.isPending} onClick={() => target && override.mutate({ stage: target.key, why: reason.trim() })}>
              {override.isPending ? "Saving…" : "Confirm override"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

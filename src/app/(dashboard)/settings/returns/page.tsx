"use client"

/**
 * Returns policy — how many days a customer has to start a return, whether pickup is free, and the rules
 * shown on the app's "Our Return Policy" screen (dealker-backend /api/v1/admin/returns/settings/policy).
 * The window is enforced: a customer cannot start a return after it closes.
 */

import { useEffect, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Loader2, Plus, Save, X } from "lucide-react"
import { toast } from "sonner"

import { PageHeader } from "@/components/shared/PageHeader"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { getReturnPolicy, saveReturnPolicy } from "@/services/return-journey.service"

const errMsg = (e: unknown) => (e as { response?: { data?: { message?: string } } })?.response?.data?.message || "Something went wrong"

export default function ReturnsPolicyPage() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ["return-policy"], queryFn: getReturnPolicy })
  const [days, setDays] = useState("7")
  const [free, setFree] = useState(true)
  const [points, setPoints] = useState<{ title: string; text: string }[]>([])
  useEffect(() => {
    if (!data) return
    setDays(String(data.window_days)); setFree(data.free_pickup); setPoints(data.points)
  }, [data])

  const daysNum = Number(days)
  const daysOk = Number.isInteger(daysNum) && daysNum >= 1 && daysNum <= 90
  const pointsOk = points.every((p) => p.title.trim() && p.text.trim())
  const save = useMutation({
    mutationFn: () => saveReturnPolicy({ windowDays: daysNum, freePickup: free, points: points.map((p) => ({ title: p.title.trim(), text: p.text.trim() })) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["return-policy"] }); toast.success("Returns policy saved") },
    onError: (e) => toast.error(errMsg(e)),
  })
  const set = (i: number, patch: Partial<{ title: string; text: string }>) => setPoints((p) => p.map((x, k) => (k === i ? { ...x, ...patch } : x)))

  return (
    <div className="space-y-6">
      <PageHeader title="Returns policy" subtitle="The return window and the rules customers see in the app." />
      {isLoading ? <Skeleton className="h-64 w-full" /> : (
        <>
          <Card>
            <CardHeader><CardTitle>Return window</CardTitle><CardDescription>Counted from the delivery date. After it closes the app hides the Return button and the server refuses new requests.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="max-w-xs space-y-1.5"><Label htmlFor="days">Days to return (1–90)</Label><Input id="days" inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value)} />{!daysOk && <p className="text-xs text-red-600">Enter a whole number from 1 to 90.</p>}</div>
              <div className="flex items-center gap-3"><Switch id="free" checked={free} onCheckedChange={setFree} /><Label htmlFor="free">Pickup is free for eligible orders</Label></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Rules shown to customers</CardTitle><CardDescription>Short points on the “Our Return Policy” screen, in this order.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              {points.map((p, i) => (
                <div key={i} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[220px_1fr_auto]">
                  <Input value={p.title} onChange={(e) => set(i, { title: e.target.value })} placeholder="Title" maxLength={80} />
                  <Textarea rows={2} value={p.text} onChange={(e) => set(i, { text: e.target.value })} placeholder="Explain the rule in one or two sentences" maxLength={240} />
                  <Button size="icon" variant="ghost" aria-label="Remove rule" onClick={() => setPoints((x) => x.filter((_, k) => k !== i))}><X className="h-4 w-4" /></Button>
                </div>
              ))}
              {points.length < 12 && <Button variant="outline" size="sm" onClick={() => setPoints((x) => [...x, { title: "", text: "" }])}><Plus className="mr-1.5 h-3.5 w-3.5" />Add rule</Button>}
            </CardContent>
          </Card>
          <Button disabled={!daysOk || !pointsOk || save.isPending} onClick={() => save.mutate()}>{save.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Save policy</Button>
        </>
      )}
    </div>
  )
}

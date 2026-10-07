"use client"

import { useEffect, useState } from "react"
import { Percent } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useB2bMutations, useB2bSettings } from "@/hooks/useB2bAdmin"

function VendorRow({ v, def }: { v: { id: string; name: string; override: number | null; orders: number }; def: number }) {
  const { setVendor } = useB2bMutations()
  const [val, setVal] = useState(v.override != null ? String(v.override) : "")
  useEffect(() => setVal(v.override != null ? String(v.override) : ""), [v.override])
  const changed = (val === "" ? null : Number(val)) !== v.override
  return (
    <TableRow>
      <TableCell className="font-medium">{v.name}</TableCell>
      <TableCell className="tabular-nums text-muted-foreground">{v.orders}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Input type="number" min={0} max={50} step="0.5" className="h-8 w-24" placeholder={`${def} (default)`} value={val} onChange={(e) => setVal(e.target.value)} />
          <span className="text-sm text-muted-foreground">%</span>
        </div>
      </TableCell>
      <TableCell className="text-right">
        {changed && <Button size="sm" disabled={setVendor.isPending} onClick={() => setVendor.mutate({ id: v.id, percent: val === "" ? null : Number(val) })}>Save</Button>}
      </TableCell>
    </TableRow>
  )
}

export function SettingsTab() {
  const { data, isLoading } = useB2bSettings()
  const { setDefault } = useB2bMutations()
  const [pct, setPct] = useState("")
  useEffect(() => { if (data) setPct(String(data.defaultPercent)) }, [data])
  if (isLoading || !data) return <Skeleton className="h-64" />
  return (
    <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <Card className="h-fit shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Percent className="h-4 w-4" />Default commission</CardTitle>
          <CardDescription>Charged to the <strong>seller</strong> on every vendor-to-vendor order, deducted when escrow is released.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Input type="number" min={0} max={50} step="0.5" value={pct} onChange={(e) => setPct(e.target.value)} className="w-28" />
            <span className="text-sm text-muted-foreground">% of order value</span>
          </div>
          <Button disabled={setDefault.isPending || Number(pct) === data.defaultPercent} onClick={() => setDefault.mutate(Number(pct))}>Save default</Button>
          <p className="text-xs text-muted-foreground">Applies to new awards only. Orders already awarded keep the rate they were created with.</p>
        </CardContent>
      </Card>
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Seller-specific rates</CardTitle>
          <CardDescription>Give a seller a different commission. Leave blank to use the default.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow className="hover:bg-transparent"><TableHead>Seller</TableHead><TableHead>B2B orders</TableHead><TableHead>Commission</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>{data.vendors.map((v) => <VendorRow key={v.id} v={v} def={data.defaultPercent} />)}</TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

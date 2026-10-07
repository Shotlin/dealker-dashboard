"use client"

import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { STATUS_CONFIG, type OrderStatus } from "@/lib/constants"
import { formatINR, formatRelativeTime } from "@/lib/utils"
import type { RecentOrder } from "@/types/dashboard.types"

export function RecentOrders({ data, isLoading }: { data?: RecentOrder[]; isLoading?: boolean }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div className="space-y-1.5">
          <CardTitle>Recent orders</CardTitle>
          <CardDescription>Latest orders across the marketplace</CardDescription>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/orders">
            View all <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : !data?.length ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            No orders yet — they will appear here as customers check out.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="hidden sm:table-cell">Items</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="hidden text-right md:table-cell">Placed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((o) => {
                const s = STATUS_CONFIG[o.status as OrderStatus] ?? { label: o.status || "Unknown", bg: "#F3F4F6", text: "#6B7280" }
                return (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium">
                      <Link href={`/orders/${o.id}`} className="hover:underline">#{o.order_number}</Link>
                    </TableCell>
                    <TableCell className="max-w-[160px] truncate">{o.customer_name}</TableCell>
                    <TableCell className="hidden sm:table-cell tabular-nums">{o.item_count}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-0 text-[11px]" style={{ backgroundColor: s.bg, color: s.text }}>
                        {s.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{formatINR(o.total_amount)}</TableCell>
                    <TableCell className="hidden text-right text-xs text-muted-foreground md:table-cell">
                      {formatRelativeTime(o.created_at)}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

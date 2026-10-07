"use client"

import Link from "next/link"
import { useState } from "react"
import { Camera, ClipboardCheck, FileSearch, History, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AddProofDialog } from "@/components/refund-case/AddProofDialog"
import { CaseHeader } from "@/components/refund-case/CaseHeader"
import { CaseSidebar } from "@/components/refund-case/CaseSidebar"
import { DecideTab } from "@/components/refund-case/DecideTab"
import { LogCallDialog, NoteDialog } from "@/components/refund-case/LogCallDialog"
import { ProofTab } from "@/components/refund-case/ProofTab"
import { SummaryTab } from "@/components/refund-case/SummaryTab"
import { TalksTab } from "@/components/refund-case/TalksTab"
import { TimelineTab } from "@/components/refund-case/TimelineTab"
import { useRefundCase } from "@/hooks/useRefundCase"
import type { Party } from "@/types/refund-case.types"

type TabKey = "summary" | "proof" | "talks" | "timeline" | "decide"

export default function RefundCasePage({ params }: { params: { id: string } }) {
  const { data: c, isLoading, isError } = useRefundCase(params.id)
  const [tab, setTab] = useState<TabKey>("summary")
  const [proofSide, setProofSide] = useState<Party | null>(null)
  const [callOpen, setCallOpen] = useState(false)
  const [noteOpen, setNoteOpen] = useState(false)

  if (isLoading) return <div className="mx-auto max-w-[1400px] space-y-4"><Skeleton className="h-10 w-72" /><Skeleton className="h-24" /><Skeleton className="h-96" /></div>
  if (isError || !c) return (
    <div className="mx-auto max-w-xl py-20 text-center">
      <p className="text-lg font-semibold">We couldn’t find this refund request</p>
      <p className="mb-4 text-sm text-muted-foreground">It may have been removed, or the link is wrong.</p>
      <Button asChild><Link href="/refund-requests">Back to refund requests</Link></Button>
    </div>
  )

  const doneChecks = c.checks.filter((k) => k.done).length
  const tabs: { key: TabKey; label: string; icon: React.ElementType; count?: string }[] = [
    { key: "summary", label: "What happened", icon: FileSearch },
    { key: "proof", label: "Proof", icon: Camera, count: String(c.evidence.length) },
    { key: "talks", label: "Chats & calls", icon: MessageCircle, count: String(c.conversations.reduce((n, v) => n + v.messages.length, 0) + c.timeline.filter((t) => t.type === "CALL").length) },
    { key: "timeline", label: "Timeline", icon: History, count: String(c.timeline.length) },
    { key: "decide", label: "Check & decide", icon: ClipboardCheck, count: `${doneChecks}/${c.checks.length}` },
  ]

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-5">
      <CaseHeader c={c} onOpenChat={() => setTab("talks")} />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)} className="min-w-0">
          <TabsList className="mb-4 h-auto w-full justify-start gap-1 overflow-x-auto bg-muted/60 p-1">
            {tabs.map(({ key, label, icon: Icon, count }) => (
              <TabsTrigger key={key} value={key} className="gap-1.5 px-3 py-2 text-sm">
                <Icon className="h-4 w-4" />{label}
                {count && <span className="rounded-full bg-background px-1.5 text-[11px] tabular-nums text-muted-foreground">{count}</span>}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="summary" className="mt-0"><SummaryTab c={c} /></TabsContent>
          <TabsContent value="proof" className="mt-0"><ProofTab c={c} onAdd={setProofSide} /></TabsContent>
          <TabsContent value="talks" className="mt-0"><TalksTab c={c} onCall={() => setCallOpen(true)} onNote={() => setNoteOpen(true)} /></TabsContent>
          <TabsContent value="timeline" className="mt-0"><TimelineTab c={c} /></TabsContent>
          <TabsContent value="decide" className="mt-0"><DecideTab c={c} onGoTab={setTab} /></TabsContent>
        </Tabs>

        <aside><CaseSidebar c={c} onAddProof={() => setProofSide("CUSTOMER")} onLogCall={() => setCallOpen(true)} onAddNote={() => setNoteOpen(true)} /></aside>
      </div>

      <LogCallDialog c={c} open={callOpen} onOpenChange={setCallOpen} key={callOpen ? "call-open" : "call-closed"} />
      <NoteDialog caseId={c.request.id} open={noteOpen} onOpenChange={setNoteOpen} />
      <AddProofDialog caseId={c.request.id} open={proofSide !== null} onOpenChange={(o) => !o && setProofSide(null)} defaultSide={proofSide ?? "CUSTOMER"} key={proofSide ?? "proof-closed"} />
    </div>
  )
}

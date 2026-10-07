import {
  BadgeCheck, Ban, Box, CircleHelp, ClipboardCheck, FileText, Film, Headphones, Image as ImageIcon, MessageCircle, NotebookPen, PackageCheck,
  PhoneCall, Receipt, Scale, ShieldCheck, Store, Trash2, Truck, UserRound, Users, Undo2, Lock, Flag, Timer, UserCog, Search, type LucideIcon,
} from "lucide-react"
import type { CaseStatus, EvidenceKind, EvidenceReview, Party, Verdict } from "@/types/refund-case.types"

/** Who a piece of information belongs to. Same colours everywhere so people learn them once. */
export const PARTY: Record<Party, { label: string; short: string; icon: LucideIcon; chip: string; dot: string; bar: string }> = {
  CUSTOMER: { label: "The customer", short: "Customer", icon: UserRound, chip: "bg-sky-50 text-sky-800 border-sky-200", dot: "bg-sky-500", bar: "border-sky-300" },
  SELLER: { label: "The seller", short: "Seller", icon: Store, chip: "bg-amber-50 text-amber-900 border-amber-200", dot: "bg-amber-500", bar: "border-amber-300" },
  COURIER: { label: "The delivery partner", short: "Courier", icon: Truck, chip: "bg-violet-50 text-violet-800 border-violet-200", dot: "bg-violet-500", bar: "border-violet-300" },
  TEAM: { label: "Our team", short: "Our team", icon: Users, chip: "bg-slate-100 text-slate-700 border-slate-200", dot: "bg-slate-500", bar: "border-slate-300" },
}

export const CASE_STATUS: Record<CaseStatus, { label: string; help: string; tone: string }> = {
  NOT_STARTED: { label: "Not looked at yet", help: "Nobody has started checking this request.", tone: "bg-slate-100 text-slate-700 border-slate-200" },
  OPEN: { label: "We are investigating", help: "Someone on our team is checking what really happened.", tone: "bg-blue-50 text-blue-800 border-blue-200" },
  WAITING_CUSTOMER: { label: "Waiting for the customer", help: "We asked the customer for something and are waiting.", tone: "bg-sky-50 text-sky-800 border-sky-200" },
  WAITING_SELLER: { label: "Waiting for the seller", help: "We asked the seller for something and are waiting.", tone: "bg-amber-50 text-amber-900 border-amber-200" },
  READY_TO_DECIDE: { label: "Ready for a decision", help: "We have enough proof. Time to approve or reject.", tone: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  DECIDED: { label: "Decision made", help: "This case is closed.", tone: "bg-slate-100 text-slate-700 border-slate-200" },
}
/** Statuses a person can pick by hand. */
export const PICKABLE_STATUS: Exclude<CaseStatus, "NOT_STARTED" | "DECIDED">[] = ["OPEN", "WAITING_CUSTOMER", "WAITING_SELLER", "READY_TO_DECIDE"]

export const VERDICT: Record<Verdict, { label: string; help: string; icon: LucideIcon; tone: string }> = {
  CUSTOMER_RIGHT: { label: "The customer is right", help: "The problem is real. The refund should be given.", icon: UserRound, tone: "border-sky-300 bg-sky-50 text-sky-900" },
  SELLER_RIGHT: { label: "The seller is right", help: "The item was fine. The refund should be refused.", icon: Store, tone: "border-amber-300 bg-amber-50 text-amber-900" },
  PARTLY_BOTH: { label: "Both are partly right", help: "Something went wrong on both sides.", icon: Scale, tone: "border-violet-300 bg-violet-50 text-violet-900" },
}

export const KIND: Record<EvidenceKind, { label: string; icon: LucideIcon }> = {
  IMAGE: { label: "Photo", icon: ImageIcon },
  VIDEO: { label: "Video", icon: Film },
  AUDIO: { label: "Call recording", icon: Headphones },
  INVOICE: { label: "Invoice", icon: Receipt },
  DOCUMENT: { label: "Document", icon: FileText },
}

export const REVIEW: Record<EvidenceReview, { label: string; short: string; tone: string; icon: LucideIcon }> = {
  UNREVIEWED: { label: "Not checked yet", short: "Not checked", tone: "bg-slate-100 text-slate-600 border-slate-200", icon: CircleHelp },
  SUPPORTS_CUSTOMER: { label: "Helps the customer", short: "Helps customer", tone: "bg-sky-50 text-sky-800 border-sky-200", icon: UserRound },
  SUPPORTS_SELLER: { label: "Helps the seller", short: "Helps seller", tone: "bg-amber-50 text-amber-900 border-amber-200", icon: Store },
  NOT_USEFUL: { label: "Not useful", short: "Not useful", tone: "bg-slate-100 text-slate-500 border-slate-200", icon: Ban },
}

export const ORIGIN_LABEL: Record<string, string> = {
  CASE: "Added by our team",
  PACKING: "Seller’s packing proof",
  INVOICE: "Seller’s invoice",
  TRACKING: "Courier tracking",
  CHAT: "Sent in chat",
}

/** Icon + colour for each timeline row. */
export function timelineIcon(type: string): { icon: LucideIcon; tone: string } {
  switch (type) {
    case "REQUEST_CREATED": return { icon: Undo2, tone: "bg-red-50 text-red-600 border-red-200" }
    case "INVESTIGATION_STARTED": return { icon: Search, tone: "bg-blue-50 text-blue-700 border-blue-200" }
    case "STATUS_CHANGED": return { icon: Flag, tone: "bg-blue-50 text-blue-700 border-blue-200" }
    case "OWNER_CHANGED": return { icon: UserCog, tone: "bg-slate-100 text-slate-700 border-slate-200" }
    case "DEADLINE_CHANGED": return { icon: Timer, tone: "bg-slate-100 text-slate-700 border-slate-200" }
    case "NOTE": return { icon: NotebookPen, tone: "bg-yellow-50 text-yellow-700 border-yellow-200" }
    case "CALL": return { icon: PhoneCall, tone: "bg-emerald-50 text-emerald-700 border-emerald-200" }
    case "EVIDENCE_ADDED": return { icon: ImageIcon, tone: "bg-indigo-50 text-indigo-700 border-indigo-200" }
    case "EVIDENCE_REVIEWED": return { icon: ShieldCheck, tone: "bg-indigo-50 text-indigo-700 border-indigo-200" }
    case "EVIDENCE_REMOVED": return { icon: Trash2, tone: "bg-slate-100 text-slate-600 border-slate-200" }
    case "CHECK_DONE": return { icon: ClipboardCheck, tone: "bg-emerald-50 text-emerald-700 border-emerald-200" }
    case "CHECK_UNDONE": return { icon: ClipboardCheck, tone: "bg-slate-100 text-slate-600 border-slate-200" }
    case "FINDINGS_SAVED": return { icon: Scale, tone: "bg-violet-50 text-violet-700 border-violet-200" }
    case "APPROVED": return { icon: BadgeCheck, tone: "bg-emerald-100 text-emerald-700 border-emerald-300" }
    case "REJECTED": return { icon: Ban, tone: "bg-red-50 text-red-600 border-red-200" }
    case "CHAT": return { icon: MessageCircle, tone: "bg-sky-50 text-sky-700 border-sky-200" }
    case "shipment": return { icon: Truck, tone: "bg-violet-50 text-violet-700 border-violet-200" }
    case "proof": return { icon: PackageCheck, tone: "bg-amber-50 text-amber-800 border-amber-200" }
    case "support": return { icon: MessageCircle, tone: "bg-sky-50 text-sky-700 border-sky-200" }
    case "problem": return { icon: Undo2, tone: "bg-red-50 text-red-600 border-red-200" }
    default: return { icon: Box, tone: "bg-slate-100 text-slate-600 border-slate-200" }
  }
}

export const PrivateBadge = () => (
  <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/5 px-2 py-0.5 text-[10px] font-medium text-slate-600"><Lock className="h-3 w-3" />Only our team sees this</span>
)

export const fmtDate = (s: string | null | undefined) => (s ? new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—")
export const fmtDateTime = (s: string | null | undefined) => (s ? new Date(s).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "—")
export const inr = (n: number | null | undefined) => `₹${Number(n ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`

/** "3 days left", "5 hours left", "2 days late" */
export function deadlineText(hoursLeft: number | null): string {
  if (hoursLeft == null) return "No deadline"
  const abs = Math.abs(hoursLeft)
  const span = abs >= 48 ? `${Math.round(abs / 24)} days` : abs >= 1 ? `${abs} hour${abs === 1 ? "" : "s"}` : "less than an hour"
  return hoursLeft < 0 ? `${span} late` : `${span} left`
}

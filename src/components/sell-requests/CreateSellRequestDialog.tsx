"use client"

import { useState } from "react"
import { ArrowLeft, ArrowRight, Check } from "lucide-react"
import { cn, formatINR } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ConditionPill } from "./sell-request-ui"
import { EvidenceUploader } from "./EvidenceUploader"
import { apiMessage, type EvidenceMedia } from "@/services/sell-requests.service"
import { useCatalogModels, useCreateRequest, useRequestQuote } from "@/hooks/useSellRequests"
import { DEFAULT_QA, isValidImei, type DeviceQA, type RequestKind, type Scratches, type SellRequestType } from "@/services/sell-requests.service"

const STEPS = ["Device", "Condition", "Photos & video", "Review"] as const

function Toggle({ id, label, checked, onChange }: { id: string; label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-lg border px-3 py-2">
      <Label htmlFor={id} className="cursor-pointer text-sm font-normal">{label}</Label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  )
}

export function CreateSellRequestDialog({ kind, open, onOpenChange, onCreated }: { kind: RequestKind; open: boolean; onOpenChange: (o: boolean) => void; onCreated?: (id: string) => void }) {
  const isExchange = kind === "EXCHANGE"
  const create = useCreateRequest(kind)
  const [step, setStep] = useState(0)
  const [type, setType] = useState<SellRequestType>(isExchange ? "EXCHANGE" : "SELL_TO_AB")
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const models = useCatalogModels(kind)
  const catalog = (models.data ?? []).filter((m) => m.isActive !== false)
  const [modelName, setModelName] = useState("")
  const cat = catalog.find((m) => m.name === modelName) ?? catalog[0]
  const model = cat?.name ?? ""
  const [variantSel, setVariant] = useState("")
  const [colorSel, setColor] = useState("")
  const variant = cat?.variants.includes(variantSel) ? variantSel : cat?.variants[0] ?? ""
  const color = cat?.colors.includes(colorSel) ? colorSel : cat?.colors[0] ?? ""
  const [imei, setImei] = useState("")
  const [qa, setQa] = useState<DeviceQA>(DEFAULT_QA)
  const [expected, setExpected] = useState("")
  const [newProduct, setNewProduct] = useState("")
  const [newPrice, setNewPrice] = useState("")
  const [orderNo, setOrderNo] = useState("")
  const [evidence, setEvidence] = useState<EvidenceMedia[]>([])
  const [uploading, setUploading] = useState(false)
  const [evidenceKey, setEvidenceKey] = useState(0)

  const quote = useRequestQuote(kind, { model, variant, color, qa }, open && step === 3 && !!cat)
  const result = quote.data
  const set = <K extends keyof DeviceQA>(k: K, v: DeviceQA[K]) => setQa((p) => ({ ...p, [k]: v }))

  const imeiOk = isValidImei(imei)
  const phoneOk = /^\+?\d[\d ]{9,13}$/.test(phone.trim())
  const exchangeOk = !isExchange || (newProduct.trim() && Number(newPrice) > 0)
  const step0Ok = name.trim().length > 1 && phoneOk && imeiOk && exchangeOk

  const reset = () => { setStep(0); setImei(""); setQa(DEFAULT_QA); setExpected(""); setName(""); setPhone(""); setNewProduct(""); setNewPrice(""); setOrderNo(""); setType(isExchange ? "EXCHANGE" : "SELL_TO_AB"); setEvidence([]); setEvidenceKey((k) => k + 1) }

  const onModel = (v: string) => { setModelName(v); setVariant(""); setColor("") }

  const submit = () =>
    create.mutate(
      {
        type, customer: { name: name.trim(), phone: phone.trim() }, model, variant, color, imei, qa,
        expectedPrice: Number(expected) || result?.quote || 0, mediaIds: evidence.map((m) => m.id),
        exchange: isExchange ? { newProduct: newProduct.trim(), newProductPrice: Number(newPrice) } : undefined,
        orderNumber: isExchange && orderNo.trim() ? orderNo.trim() : undefined,
      },
      { onSuccess: (r) => { onOpenChange(false); reset(); onCreated?.(r.id) } },
    )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isExchange ? "Create Exchange Request" : "Create Sell Request"}</DialogTitle>
          <DialogDescription>{isExchange ? "The customer is buying a new device and trading in the old one. Capture the old device, ask the condition questions, and get its trade-in value." : "Capture the device, ask the condition questions, and get an instant valuation."}</DialogDescription>
        </DialogHeader>

        <ol className="flex items-center gap-2 text-sm" aria-label="Progress">
          {STEPS.map((s, i) => (
            <li key={s} className="flex flex-1 items-center gap-2">
              <span className={cn("flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold", i < step ? "bg-emerald-500 text-white" : i === step ? "bg-brand-600 text-white" : "bg-muted text-muted-foreground")}>
                {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <span className={cn(i === step ? "font-semibold" : "text-muted-foreground")}>{s}</span>
              {i < STEPS.length - 1 && <span aria-hidden className="h-px flex-1 bg-border" />}
            </li>
          ))}
        </ol>

        {step === 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {!isExchange && (
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Request type</Label>
                <div className="grid grid-cols-2 gap-2">
                  {([["SELL_TO_AB", "Sell to AB"], ["BUY_NOW", "Buy Now"]] as const).map(([v, l]) => (
                    <button key={v} type="button" onClick={() => setType(v)} aria-pressed={type === v}
                      className={cn("rounded-lg border px-3 py-2 text-sm font-medium", type === v ? "border-brand-500 bg-brand-50 text-brand-700" : "hover:bg-muted")}>{l}</button>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-1.5"><Label htmlFor="cn">Customer name</Label><Input id="cn" value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="cp">Phone</Label><Input id="cp" inputMode="tel" placeholder="+91 98765 43210" value={phone} onChange={(e) => setPhone(e.target.value)} aria-invalid={!!phone && !phoneOk} /></div>
            <div className="space-y-1.5">
              <Label>Model</Label>
              <Select value={model} onValueChange={onModel} disabled={!catalog.length}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{catalog.map((m) => <SelectItem key={m.name} value={m.name}>{m.name}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-1.5">
              <Label>Variant</Label>
              <Select value={variant} onValueChange={setVariant}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{cat?.variants.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-1.5">
              <Label>Colour</Label>
              <Select value={color} onValueChange={setColor}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{cat?.colors.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="imei">IMEI number</Label>
              <Input id="imei" inputMode="numeric" maxLength={15} placeholder="15 digits (dial *#06#)" value={imei} onChange={(e) => setImei(e.target.value.replace(/\D/g, ""))} aria-invalid={imei.length === 15 && !imeiOk} />
              {imei.length === 15 && !imeiOk && <p className="text-xs text-red-600">This IMEI fails the checksum — re-check the number.</p>}
              {imeiOk && <p className="text-xs text-emerald-600">IMEI looks valid.</p>}
            </div>
            {isExchange && (
              <fieldset className="grid gap-4 rounded-lg border border-violet-200 bg-violet-50/40 p-3 sm:col-span-2 sm:grid-cols-2 dark:bg-violet-950/20">
                <legend className="px-1 text-xs font-semibold text-violet-700">New device being purchased</legend>
                <div className="space-y-1.5"><Label htmlFor="np">New product</Label><Input id="np" value={newProduct} onChange={(e) => setNewProduct(e.target.value)} placeholder="iPhone 15 (128GB)" /></div>
                <div className="space-y-1.5"><Label htmlFor="npp">New product price (₹)</Label><Input id="npp" inputMode="numeric" value={newPrice} onChange={(e) => setNewPrice(e.target.value.replace(/\D/g, ""))} /></div>
                <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="ord">Order number (if already placed) — optional</Label><Input id="ord" value={orderNo} onChange={(e) => setOrderNo(e.target.value)} placeholder="Linked now, or later from the request" /></div>
              </fieldset>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="age">How old is the device? (months)</Label>
              <Input id="age" type="number" min={0} max={120} value={qa.ageMonths} onChange={(e) => set("ageMonths", Math.max(0, Number(e.target.value) || 0))} />
            </div>
            <div className="space-y-1.5">
              <Label>Any scratches on screen?</Label>
              <Select value={qa.screenScratches} onValueChange={(v) => set("screenScratches", v as Scratches)}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="NONE">No scratches</SelectItem><SelectItem value="MINOR">Minor scratches</SelectItem><SelectItem value="MAJOR">Deep / major scratches</SelectItem></SelectContent></Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="bat">Battery health: {qa.batteryHealth}%</Label>
              <input id="bat" type="range" min={50} max={100} value={qa.batteryHealth} onChange={(e) => set("batteryHealth", Number(e.target.value))} className="w-full accent-[#4F46E5]" />
            </div>
            <Toggle id="q1" label="Device powers on & works" checked={qa.powersOn} onChange={(v) => set("powersOn", v)} />
            <Toggle id="q2" label="Dents / body damage" checked={qa.bodyDents} onChange={(v) => set("bodyDents", v)} />
            <Toggle id="q3" label="Screen has been replaced" checked={qa.screenReplaced} onChange={(v) => set("screenReplaced", v)} />
            <Toggle id="q4" label="Skin / back panel replaced" checked={qa.skinReplaced} onChange={(v) => set("skinReplaced", v)} />
            <Toggle id="q5" label="Original bill available" checked={qa.billAvailable} onChange={(v) => set("billAvailable", v)} />
            <Toggle id="q6" label="Original box available" checked={qa.boxAvailable} onChange={(v) => set("boxAvailable", v)} />
            <Toggle id="q7" label="Original charger available" checked={qa.chargerAvailable} onChange={(v) => set("chargerAvailable", v)} />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-2">
            <Label>Photos and QC video</Label>
            <EvidenceUploader key={evidenceKey} kind={kind} onChange={setEvidence} onBusyChange={setUploading} />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            {quote.isError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{apiMessage(quote.error, "Could not calculate a valuation")}</p>}
            {quote.isLoading && <p className="text-sm text-muted-foreground">Calculating valuation…</p>}
            {result && (
              <>
                <div className="rounded-xl border bg-gradient-to-br from-brand-50 to-white p-4 dark:from-brand-900/30 dark:to-transparent">
                  <p className="text-sm text-muted-foreground">{model} · {variant} · {color}</p>
                  <div className="mt-1 flex items-center gap-3">
                    <p className="text-3xl font-bold tabular-nums">{formatINR(result.quote)}</p>
                    <ConditionPill condition={result.condition} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">Base {formatINR(result.base)}</p>
                </div>
                {result.deductions.length > 0 ? (
                  <ul className="divide-y rounded-lg border text-sm">
                    {result.deductions.map((d) => (<li key={d.label} className="flex justify-between px-3 py-1.5"><span>{d.label}</span><span className="text-red-600">− {d.pct}%</span></li>))}
                  </ul>
                ) : <p className="text-sm text-emerald-600">No deductions — device is in mint condition.</p>}
                {isExchange && <p className="rounded-lg border border-violet-200 bg-violet-50/60 p-3 text-sm dark:bg-violet-950/30">Customer pays <b>{formatINR(Math.max(0, Number(newPrice) - result.quote))}</b> for {newProduct} after trade-in.</p>}
              </>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="exp">Customer's expected price (₹) — optional</Label>
              <Input id="exp" inputMode="numeric" placeholder={result ? String(result.quote) : ""} value={expected} onChange={(e) => setExpected(e.target.value.replace(/\D/g, ""))} />
            </div>
            <p className="text-xs text-muted-foreground">
              Evidence attached: {evidence.filter((m) => m.mediaType === "IMAGE").length} photo(s), {evidence.filter((m) => m.mediaType === "VIDEO").length} video(s).
              {evidence.length === 0 && " QC cannot start until at least one photo or video is added."}
            </p>
            <p className="text-xs text-muted-foreground">On submit, the request opens to vendors, who place their offers.</p>
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="ghost" onClick={() => (step === 0 ? onOpenChange(false) : setStep(step - 1))}>{step === 0 ? "Cancel" : <><ArrowLeft /> Back</>}</Button>
          {step < 3
            ? <Button disabled={(step === 0 && !step0Ok) || (step === 2 && uploading)} onClick={() => setStep(step + 1)}>{step === 2 && uploading ? "Uploading…" : <>Next <ArrowRight /></>}</Button>
            : <Button disabled={create.isPending || !result || uploading} onClick={submit}>{create.isPending ? "Submitting…" : "Submit request"}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

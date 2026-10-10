"use client"

/**
 * Ola Maps — paste, test and switch on the Ola Maps API key that powers the customer app's
 * "use my location", address search and map picker (dealker-backend /api/v1/admin/ola-maps-settings).
 * The key is stored encrypted and is never shown again, only its last 4 characters.
 */

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { CheckCircle2, Loader2, MapPin, XCircle } from "lucide-react"
import { toast } from "sonner"

import { PageHeader } from "@/components/shared/PageHeader"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { olaMapsSettingsService } from "@/services/ola-maps-settings.service"

function errorMessage(error: unknown): string {
  const resp = (error as { response?: { data?: { message?: string } } })?.response
  if (resp?.data?.message) return resp.data.message
  return error instanceof Error ? error.message : "Something went wrong"
}

export default function OlaMapsSettingsPage() {
  const qc = useQueryClient()
  const [apiKey, setApiKey] = useState("")

  const { data, isLoading } = useQuery({
    queryKey: ["ola-maps-settings"],
    queryFn: () => olaMapsSettingsService.get(),
  })

  const test = useMutation({
    mutationFn: () => olaMapsSettingsService.test(apiKey.trim()),
    onSuccess: (r) => (r.success ? toast.success(r.message) : toast.error(r.message)),
    onError: (e) => toast.error(errorMessage(e)),
  })

  const save = useMutation({
    mutationFn: (payload: { apiKey?: string; isEnabled?: boolean }) => olaMapsSettingsService.save(payload),
    onSuccess: (r) => {
      qc.setQueryData(["ola-maps-settings"], r.settings)
      setApiKey("")
      if (r.test && !r.test.success) toast.error(`Saved, but not enabled: ${r.test.message}`)
      else toast.success("Ola Maps settings saved")
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ola Maps"
        subtitle="Powers “Use my current location”, address search and the map picker in the customer app."
      />
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" /> API key
          </CardTitle>
          <CardDescription>
            Create a project at maps.olakrutrim.com, copy its API key and paste it here. A new key is tested live
            before it is switched on; the app picks it up within a minute, no release needed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {isLoading || !data ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <>
              <div className="flex items-center gap-2 text-sm">
                {data.isEnabled ? (
                  <><CheckCircle2 className="h-4 w-4 text-green-600" /> Active{data.maskedKey ? ` — key ${data.maskedKey}` : ""}</>
                ) : (
                  <><XCircle className="h-4 w-4 text-muted-foreground" /> {data.configured ? "Key saved but switched off" : "Not configured — location search is off in the app"}</>
                )}
              </div>
              {data.lastTestedAt && (
                <p className="text-xs text-muted-foreground">
                  Last test: {data.lastTestStatus === "SUCCESS" ? "passed" : "failed"} — {data.lastTestMessage} (
                  {new Date(data.lastTestedAt).toLocaleString()})
                </p>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="ola-key">{data.configured ? "Replace API key" : "API key"}</Label>
                <Input
                  id="ola-key"
                  type="password"
                  autoComplete="off"
                  value={apiKey}
                  placeholder={data.configured ? "Leave empty to keep the current key" : "Paste your Ola Maps API key"}
                  onChange={(e) => setApiKey(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="outline" disabled={!apiKey.trim() || test.isPending} onClick={() => test.mutate()}>
                  {test.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Test key
                </Button>
                <Button
                  disabled={!apiKey.trim() || save.isPending}
                  onClick={() => save.mutate({ apiKey: apiKey.trim(), isEnabled: true })}
                >
                  {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save &amp; enable
                </Button>
              </div>
              {data.configured && (
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="text-sm font-medium">Enable Ola Maps in the app</p>
                    <p className="text-xs text-muted-foreground">Switching off hides map search; saved addresses keep working.</p>
                  </div>
                  <Switch
                    checked={data.isEnabled}
                    disabled={save.isPending}
                    onCheckedChange={(v) => save.mutate({ isEnabled: v })}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

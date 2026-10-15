import { LockIcon } from "@phosphor-icons/react/ssr"
import type { Metadata } from "next"
import { Page, PageHeader, Section } from "@/components/app/page"
import { AddProviderKeyForm } from "@/components/providers/add-provider-key-form"
import { ProviderKeyList } from "@/components/providers/provider-key-list"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { providerKeyOption } from "@/lib/provider-display"
import { listProviderKeys } from "@/server/db/queries/provider-keys"
import { env } from "@/server/env"
import { requireUser } from "@/server/session"

export const metadata: Metadata = {
  title: "AI providers · Ace",
}

export default async function ProvidersPage() {
  const user = await requireUser()
  const keys = await listProviderKeys(user.id)
  const rows = keys.map((key) => ({
    ...providerKeyOption(key),
    usedBy: key.usedBy,
  }))

  return (
    <Page className="max-w-180 gap-10">
      <PageHeader
        title="AI providers"
        description="Your teammates think using your own AI account. Add a key here, then pick it in each teammate's settings."
      />
      <Section id="s-keys" title="Your keys">
        {rows.length > 0 && <ProviderKeyList rows={rows} />}
        <Alert role="note">
          <LockIcon weight="duotone" />
          <AlertDescription>
            Keys are stored encrypted and used only while your teammates work.
            They never go onto a teammate's computer.
          </AlertDescription>
        </Alert>
      </Section>
      <Section id="s-add" title="Add a key">
        <AddProviderKeyForm
          allowCustom={env.ALLOW_CUSTOM_BASE_URL}
          labelledBy="s-add"
        />
      </Section>
    </Page>
  )
}

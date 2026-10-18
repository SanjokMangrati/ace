"use client"

import type { Control, FieldPath, FieldValues } from "react-hook-form"
import { SegmentedField } from "@/components/form/segmented-field"
import { TextField } from "@/components/form/text-field"
import { PROVIDER_LABELS, PROVIDERS, type Provider } from "@/lib/models"

export function ProviderKeyFields<TValues extends FieldValues>({
  control,
  names,
  provider,
  allowCustom,
  onProviderChange,
}: {
  control: Control<TValues>
  names: {
    provider: FieldPath<TValues>
    baseUrl: FieldPath<TValues>
    apiKey: FieldPath<TValues>
  }
  provider: Provider
  allowCustom: boolean
  onProviderChange?: (provider: Provider) => void
}) {
  const custom = provider === "openai_compatible"
  const options = PROVIDERS.filter(
    (item) => allowCustom || item !== "openai_compatible"
  ).map((item) => ({ value: item, label: PROVIDER_LABELS[item] }))

  return (
    <>
      <SegmentedField
        control={control}
        name={names.provider}
        label="Provider"
        options={options}
        onValueChange={onProviderChange}
      />
      {custom && (
        <TextField
          control={control}
          name={names.baseUrl}
          label="Server address"
          type="url"
          autoComplete="off"
          spellCheck={false}
          placeholder="https://ai.your-company.example/v1"
        />
      )}
      <TextField
        control={control}
        name={names.apiKey}
        label="API key"
        type="password"
        autoComplete="off"
        spellCheck={false}
        placeholder="Paste your key"
        description={
          custom
            ? "Only if your server asks for one."
            : `Copy it from your ${PROVIDER_LABELS[provider]} account settings.`
        }
      />
    </>
  )
}

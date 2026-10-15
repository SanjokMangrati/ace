"use client"

import { useId, useState } from "react"
import {
  type Control,
  Controller,
  type FieldPath,
  type FieldValues,
} from "react-hook-form"
import { FieldError } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

function format(value: unknown, decimals: number) {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toFixed(decimals)
    : ""
}

function parse(text: string) {
  const trimmed = text.trim()
  return trimmed === "" ? Number.NaN : Number(trimmed)
}

function SentenceInput({
  id,
  labelledBy,
  value,
  decimals,
  invalid,
  inputRef,
  onChange,
  onBlur,
}: {
  id: string
  labelledBy: string
  value: unknown
  decimals: number
  invalid: boolean
  inputRef: React.Ref<HTMLInputElement>
  onChange: (value: number) => void
  onBlur: () => void
}) {
  const [text, setText] = useState(() => format(value, decimals))
  const [lastValue, setLastValue] = useState(value)

  if (!Object.is(value, lastValue)) {
    setLastValue(value)
    if (!Object.is(parse(text), value)) setText(format(value, decimals))
  }

  return (
    <Input
      ref={inputRef}
      id={id}
      aria-labelledby={labelledBy}
      inputMode={decimals > 0 ? "decimal" : "numeric"}
      value={text}
      aria-invalid={invalid}
      className="w-24 text-right tabular-nums"
      onChange={(event) => {
        setText(event.target.value)
        onChange(parse(event.target.value))
      }}
      onBlur={() => {
        const parsed = parse(text)
        if (Number.isFinite(parsed)) {
          setText(parsed.toFixed(decimals))
        }
        onBlur()
      }}
    />
  )
}

export function NumberSentenceField<TValues extends FieldValues>({
  control,
  name,
  before,
  after,
  decimals = 0,
}: {
  control: Control<TValues>
  name: FieldPath<TValues>
  before: string
  after: string
  decimals?: number
}) {
  const beforeId = useId()
  const afterId = useId()

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <div
          data-slot="field"
          data-invalid={fieldState.invalid}
          className="flex flex-col gap-1.5"
        >
          <div className="flex flex-wrap items-center gap-2.5">
            <label id={beforeId} htmlFor={field.name}>
              {before}
            </label>
            <SentenceInput
              id={field.name}
              labelledBy={`${beforeId} ${afterId}`}
              value={field.value}
              decimals={decimals}
              invalid={fieldState.invalid}
              inputRef={field.ref}
              onChange={field.onChange}
              onBlur={field.onBlur}
            />
            <span id={afterId}>{after}</span>
          </div>
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </div>
      )}
    />
  )
}

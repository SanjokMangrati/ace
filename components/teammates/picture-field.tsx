"use client"

import { CameraIcon } from "@phosphor-icons/react/ssr"
import { useId, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldTitle } from "@/components/ui/field"
import {
  PICTURE_MAX_BYTES,
  PICTURE_SIZE_MESSAGE,
  PICTURE_TYPE_MESSAGE,
  PICTURE_TYPES,
} from "@/lib/bot-schemas"

export function checkPicture(file: File) {
  if (!(PICTURE_TYPES as readonly string[]).includes(file.type)) {
    return PICTURE_TYPE_MESSAGE
  }
  if (file.size > PICTURE_MAX_BYTES) return PICTURE_SIZE_MESSAGE
  return null
}

export function PictureField({
  hasPicture,
  error,
  onPick,
  onRemove,
}: {
  hasPicture: boolean
  error: string | null
  onPick: (file: File) => void
  onRemove: () => void
}) {
  const labelId = useId()
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <Field data-invalid={error !== null}>
      <FieldTitle id={labelId}>Picture</FieldTitle>
      <div className="flex flex-wrap items-center gap-4">
        <input
          ref={inputRef}
          type="file"
          accept={PICTURE_TYPES.join(",")}
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ""
            if (file) onPick(file)
          }}
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          aria-describedby={labelId}
          onClick={() => inputRef.current?.click()}
        >
          <CameraIcon weight="duotone" data-icon="inline-start" />
          Upload a picture
        </Button>
        {hasPicture && (
          <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
            Remove picture
          </Button>
        )}
      </div>
      {error && <FieldError>{error}</FieldError>}
    </Field>
  )
}

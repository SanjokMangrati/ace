"use client"

import { CameraIcon } from "@phosphor-icons/react/ssr"
import { useId, useRef } from "react"
import { TeammateAvatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldTitle } from "@/components/ui/field"
import {
  PICTURE_MAX_BYTES,
  PICTURE_SIZE_MESSAGE,
  PICTURE_TYPE_MESSAGE,
  PICTURE_TYPES,
} from "@/lib/bot-schemas"

export function checkPicture(file: File) {
  if (!PICTURE_TYPES.some((type) => type === file.type)) {
    return PICTURE_TYPE_MESSAGE
  }
  if (file.size > PICTURE_MAX_BYTES) return PICTURE_SIZE_MESSAGE
  return null
}

export function PictureField({
  botId,
  name,
  picture,
  error,
  onPick,
  onRemove,
}: {
  botId: string
  name: string
  picture: string | null
  error: string | null
  onPick: (file: File) => void
  onRemove: () => void
}) {
  const labelId = useId()
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <Field data-invalid={error !== null}>
      <div className="flex items-center gap-3">
        <TeammateAvatar botId={botId} name={name} picture={picture} size="lg" />
        <div className="flex flex-col gap-1">
          <FieldTitle id={labelId}>Picture</FieldTitle>
          <div className="flex items-center gap-1">
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
              {picture ? "Replace" : "Upload a picture"}
            </Button>
            {picture && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-describedby={labelId}
                onClick={onRemove}
              >
                Remove
              </Button>
            )}
          </div>
        </div>
      </div>
      {error && <FieldError>{error}</FieldError>}
    </Field>
  )
}

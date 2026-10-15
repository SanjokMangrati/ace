import {
  CalendarCheckIcon,
  MagnifyingGlassIcon,
  PenNibIcon,
  ReceiptIcon,
} from "@phosphor-icons/react/ssr"
import { PickCard } from "@/components/ui/pick-card"
import { Tile } from "@/components/ui/tile"
import { TEAMMATE_PRESETS, type TeammatePreset } from "@/lib/teammate-presets"

const looks: Record<
  TeammatePreset["id"],
  { color: "grape" | "sky" | "mint" | "peach"; Icon: typeof PenNibIcon }
> = {
  researcher: { color: "grape", Icon: MagnifyingGlassIcon },
  writer: { color: "sky", Icon: PenNibIcon },
  planner: { color: "mint", Icon: CalendarCheckIcon },
  bookkeeper: { color: "peach", Icon: ReceiptIcon },
}

export function PresetPicker({
  selected,
  onPick,
}: {
  selected: TeammatePreset["id"] | undefined
  onPick: (preset: TeammatePreset) => void
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {TEAMMATE_PRESETS.map((preset) => {
        const { color, Icon } = looks[preset.id]
        return (
          <PickCard
            key={preset.id}
            pressed={selected === preset.id}
            onClick={() => onPick(preset)}
            media={
              <Tile color={color}>
                <Icon weight="duotone" />
              </Tile>
            }
            title={preset.name}
            description={preset.job}
          />
        )
      })}
    </div>
  )
}

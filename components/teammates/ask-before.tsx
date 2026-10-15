"use client"

import {
  CursorClickIcon,
  FileTextIcon,
  FloppyDiskIcon,
  InfoIcon,
  LightbulbIcon,
  TerminalWindowIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react/ssr"
import { type Control, Controller, useWatch } from "react-hook-form"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { List, ListRowText } from "@/components/ui/list"
import { Switch } from "@/components/ui/switch"
import { Tile, type TileColor } from "@/components/ui/tile"
import type { TeammateFormInput, ToolGroup } from "@/lib/bot-schemas"
import { cn } from "@/lib/utils"

const tools: {
  tool: ToolGroup
  title: string
  example: string
  color: TileColor
  Icon: typeof TerminalWindowIcon
}[] = [
  {
    tool: "shell",
    title: "Runs commands on its computer",
    example: "Like installing a program",
    color: "lime",
    Icon: TerminalWindowIcon,
  },
  {
    tool: "files_write",
    title: "Creates or changes files",
    example: "Like saving a report",
    color: "sky",
    Icon: FloppyDiskIcon,
  },
  {
    tool: "computer",
    title: "Clicks and types on its screen",
    example: "Like filling in a form on a website",
    color: "peach",
    Icon: CursorClickIcon,
  },
  {
    tool: "files_read",
    title: "Opens and reads files",
    example: "Like a spreadsheet you gave it",
    color: "grape",
    Icon: FileTextIcon,
  },
  {
    tool: "notes",
    title: "Saves something to remember",
    example: "Like how you like your reports",
    color: "sun",
    Icon: LightbulbIcon,
  },
  {
    tool: "handoff",
    title: "Passes the task to another teammate",
    example: "Only in group chats",
    color: "bubblegum",
    Icon: UsersThreeIcon,
  },
]

const rowClassName = "flex cursor-pointer items-center gap-3.5 px-4.5 py-3.5"

export function AskBefore({
  control,
  name,
  nameInSentence,
}: {
  control: Control<TeammateFormInput>
  name: string
  nameInSentence: string
}) {
  const fullAuto = useWatch({ control, name: "fullAuto" })

  return (
    <>
      <List>
        <label htmlFor="fullAuto" className={rowClassName}>
          <ListRowText title="Work without asking" />
          <Controller
            control={control}
            name="fullAuto"
            render={({ field }) => (
              <Switch
                id="fullAuto"
                checked={field.value}
                onCheckedChange={field.onChange}
                inputRef={field.ref}
                aria-label="Work without asking"
              />
            )}
          />
        </label>
      </List>
      <div className="text-body-strong">Ask me before {name}…</div>
      <List>
        {tools.map(({ tool, title, example, color, Icon }) => (
          <label
            key={tool}
            htmlFor={`askBefore.${tool}`}
            className={cn(rowClassName, "has-data-disabled:cursor-not-allowed")}
          >
            <Tile color={color}>
              <Icon weight="duotone" />
            </Tile>
            <ListRowText title={title} description={example} />
            <Controller
              control={control}
              name={`askBefore.${tool}`}
              render={({ field }) => (
                <Checkbox
                  id={`askBefore.${tool}`}
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  inputRef={field.ref}
                  disabled={fullAuto}
                  aria-label={title}
                />
              )}
            />
          </label>
        ))}
      </List>
      {fullAuto && (
        <p className="text-small text-ink-3">
          These are skipped while {nameInSentence} works without asking.
        </p>
      )}
      <Alert role="note">
        <InfoIcon weight="duotone" />
        <AlertDescription>
          <b>Some things always need you.</b> {name} always asks before paying
          for something, sharing your private files or passwords, or deleting
          things outside its own folders, even when it works without asking.
        </AlertDescription>
      </Alert>
    </>
  )
}

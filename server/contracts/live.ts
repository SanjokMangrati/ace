export function liveWith(...names: string[]) {
  return (
    process.env.LIVE_CONTRACTS === "1" &&
    names.every((name) => Boolean(process.env[name]))
  )
}

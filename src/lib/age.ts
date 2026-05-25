export function relativeAge(iso: string, now: number = Date.now()): string {
  const ms = now - new Date(iso).getTime()
  const min = 60_000
  const hour = 60 * min
  const day = 24 * hour
  if (ms < hour) return `${Math.max(1, Math.floor(ms / min)).toString()}m`
  if (ms < day) return `${Math.floor(ms / hour).toString()}h`
  if (ms < 30 * day) return `${Math.floor(ms / day).toString()}d`
  return `${Math.floor(ms / (30 * day)).toString()}mo`
}

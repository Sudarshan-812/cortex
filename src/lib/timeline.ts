export function buildDailyTimeline(dates: string[]): { date: string; count: number }[] {
  if (dates.length === 0) return []
  const counts = new Map<string, number>()
  for (const d of dates) {
    const day = d.slice(0, 10)
    counts.set(day, (counts.get(day) ?? 0) + 1)
  }
  const sorted = [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  if (sorted.length < 2) return sorted.map(([date, count]) => ({ date, count }))
  const result: { date: string; count: number }[] = []
  const start = new Date(sorted[0][0])
  const end = new Date(sorted[sorted.length - 1][0])
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().slice(0, 10)
    result.push({ date: key, count: counts.get(key) ?? 0 })
  }
  return result
}

/** Cumulative running total, useful for sparklines that should trend upward like a corpus size. */
export function cumulative(timeline: { date: string; count: number }[]): number[] {
  let running = 0
  return timeline.map(t => (running += t.count))
}

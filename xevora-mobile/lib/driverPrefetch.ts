import { supabase } from './supabase'

export function weekRangeMonSun() {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? 6 : day - 1
  const monday = new Date(now)
  monday.setDate(now.getDate() - diff)
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  return { monday, sunday }
}

/** Same queries as driver home warm-up; resolves when data is fetched */
export async function prefetchDriverHomeData(workerId: string): Promise<void> {
  const { monday, sunday } = weekRangeMonSun()
  const [a, b, c] = await Promise.all([
    supabase
      .from('shifts')
      .select(
        'id, clock_in, clock_out, status, total_hours, created_at, meal_breaks, clients(abbreviation)'
      )
      .eq('worker_id', workerId)
      .is('clock_out', null)
      .order('clock_in', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('shifts')
      .select(
        'id, clock_in, clock_out, status, total_hours, created_at, meal_breaks, clients(abbreviation)'
      )
      .eq('worker_id', workerId)
      .order('created_at', { ascending: false })
      .limit(3),
    supabase
      .from('shifts')
      .select(
        'clock_in, clock_out, meal_breaks, total_hours, regular_hours, ot_hours'
      )
      .eq('worker_id', workerId)
      .gte('clock_in', monday.toISOString())
      .lte('clock_in', sunday.toISOString()),
  ])
  if (a.error) throw a.error
  if (b.error) throw b.error
  if (c.error) throw c.error
}

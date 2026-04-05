import type { MealBreak } from './payroll'

export type MealPhase = 'working' | 'on_break'

export function getOpenMealBreak(mealBreaks: MealBreak[] | null | undefined): MealBreak | null {
  const list = mealBreaks ?? []
  const last = list[list.length - 1]
  if (last && !last.end) return last
  return null
}

export function getShiftMealPhase(
  mealBreaks: MealBreak[] | null | undefined
): MealPhase {
  return getOpenMealBreak(mealBreaks) ? 'on_break' : 'working'
}

export function appendMealStart(mealBreaks: MealBreak[] | null | undefined): MealBreak[] {
  const list = [...(mealBreaks ?? [])]
  const start = new Date().toISOString()
  list.push({ start, end: null })
  return list
}

export function closeLastOpenMeal(mealBreaks: MealBreak[] | null | undefined): MealBreak[] {
  const list = [...(mealBreaks ?? [])]
  for (let i = list.length - 1; i >= 0; i--) {
    const m = list[i]!
    if (!m.end) {
      list[i] = { ...m, end: new Date().toISOString() }
      break
    }
  }
  return list
}

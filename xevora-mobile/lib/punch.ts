import { supabase } from './supabase'
import * as Location from 'expo-location'

async function getLocation() {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync()
    if (status !== 'granted') return null
    
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    })
    
    return {
      lat: location.coords.latitude,
      lng: location.coords.longitude,
    }
  } catch (error) {
    console.error('Error getting location:', error)
    return null
  }
}

function calculateShiftHours(clockIn: Date, clockOut: Date, mealBreaks: any[]) {
  let totalMinutes = (clockOut.getTime() - clockIn.getTime()) / 1000 / 60
  
  if (mealBreaks && mealBreaks.length > 0) {
    for (const brk of mealBreaks) {
      if (brk.start && brk.end) {
        const breakMinutes = (new Date(brk.end).getTime() - new Date(brk.start).getTime()) / 1000 / 60
        totalMinutes -= breakMinutes
      }
    }
  }
  
  return { totalMinutes }
}

export async function clockIn(workerId: string, clientId: string, companyId: string) {
  const location = await getLocation()
  
  const { data, error } = await supabase.from('shifts').insert({
    worker_id: workerId,
    client_id: clientId,
    company_id: companyId,
    clock_in: new Date().toISOString(),
    clock_in_lat: location?.lat,
    clock_in_lng: location?.lng,
    gps_verified: !!location,
    status: 'active',
    meal_breaks: [],
  }).select().single()
  
  if (error) throw error
  return data
}

export async function takeMeal(shiftId: string) {
  const { data: shift, error: fetchError } = await supabase
    .from('shifts')
    .select('meal_breaks')
    .eq('id', shiftId)
    .single()
  
  if (fetchError) throw fetchError
  
  const breaks = shift?.meal_breaks || []
  breaks.push({ start: new Date().toISOString(), end: null })
  
  const { data, error } = await supabase
    .from('shifts')
    .update({ meal_breaks: breaks })
    .eq('id', shiftId)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function endMeal(shiftId: string) {
  const { data: shift, error: fetchError } = await supabase
    .from('shifts')
    .select('meal_breaks')
    .eq('id', shiftId)
    .single()
  
  if (fetchError) throw fetchError
  
  const breaks = (shift?.meal_breaks || []).map((b: any) =>
    b.end === null ? { ...b, end: new Date().toISOString() } : b
  )
  
  const { data, error } = await supabase
    .from('shifts')
    .update({ meal_breaks: breaks })
    .eq('id', shiftId)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function clockOut(shiftId: string, clockIn: string, mealBreaks: any[]) {
  const location = await getLocation()
  const now = new Date()
  const totalMinutes = calculateShiftHours(
    new Date(clockIn),
    now,
    mealBreaks
  ).totalMinutes
  
  const { data, error } = await supabase
    .from('shifts')
    .update({
      clock_out: now.toISOString(),
      clock_out_lat: location?.lat,
      clock_out_lng: location?.lng,
      status: 'completed',
      total_hours: totalMinutes / 60,
    })
    .eq('id', shiftId)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export { getLocation, calculateShiftHours }

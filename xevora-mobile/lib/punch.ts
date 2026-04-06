import { supabase } from './supabase'
import * as Location from 'expo-location'
import { Alert } from 'react-native'

type LocationResult = {
  lat: number
  lng: number
  accuracy: number
} | null

type LocationError = {
  type: 'permission_denied' | 'timeout' | 'low_accuracy' | 'error'
  message: string
}

async function getLocation(): Promise<{ location: LocationResult; error?: LocationError }> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync()
    if (status !== 'granted') {
      return {
        location: null,
        error: {
          type: 'permission_denied',
          message: 'Location permission is required to clock in. Please enable location services in your device settings.',
        },
      }
    }
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('GPS timeout')), 10000)
    })
    
    const locationPromise = Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    })
    
    const location = await Promise.race([locationPromise, timeoutPromise])
    
    const accuracy = location.coords.accuracy || 999
    
    if (accuracy > 100) {
      return {
        location: {
          lat: location.coords.latitude,
          lng: location.coords.longitude,
          accuracy,
        },
        error: {
          type: 'low_accuracy',
          message: `GPS accuracy is low (${Math.round(accuracy)}m). Punch will be recorded but may be flagged for review.`,
        },
      }
    }
    
    return {
      location: {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
        accuracy,
      },
    }
  } catch (error: any) {
    if (error.message === 'GPS timeout') {
      return {
        location: null,
        error: {
          type: 'timeout',
          message: 'GPS location timed out after 10 seconds. Please ensure you have a clear view of the sky and try again.',
        },
      }
    }
    
    return {
      location: null,
      error: {
        type: 'error',
        message: `Failed to get location: ${error.message || 'Unknown error'}`,
      },
    }
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
  const { location, error: locationError } = await getLocation()
  
  if (locationError?.type === 'permission_denied') {
    throw new Error(locationError.message)
  }
  
  if (locationError?.type === 'timeout') {
    throw new Error(locationError.message)
  }
  
  if (locationError?.type === 'low_accuracy' && location) {
    Alert.alert('Low GPS Accuracy', locationError.message, [{ text: 'OK' }])
  }
  
  const { data, error } = await supabase.from('shifts').insert({
    worker_id: workerId,
    client_id: clientId,
    company_id: companyId,
    clock_in: new Date().toISOString(),
    clock_in_lat: location?.lat || null,
    clock_in_lng: location?.lng || null,
    gps_verified: !!location && !locationError,
    gps_accuracy: location?.accuracy || null,
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
  const { location, error: locationError } = await getLocation()
  
  if (locationError?.type === 'low_accuracy' && location) {
    Alert.alert('Low GPS Accuracy', locationError.message, [{ text: 'OK' }])
  }
  
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
      clock_out_lat: location?.lat || null,
      clock_out_lng: location?.lng || null,
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

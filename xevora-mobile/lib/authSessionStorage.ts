import AsyncStorage from '@react-native-async-storage/async-storage'
import * as SecureStore from 'expo-secure-store'

const PREF_KEY = 'xevora_stay_signed_in'
const memoryStore: Record<string, string> = {}

let staySignedIn = true

export async function loadStaySignedInPreference(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(PREF_KEY)
    staySignedIn = v !== 'false'
    return staySignedIn
  } catch {
    staySignedIn = true
    return true
  }
}

export async function saveStaySignedInPreference(value: boolean): Promise<void> {
  staySignedIn = value
  try {
    await AsyncStorage.setItem(PREF_KEY, value ? 'true' : 'false')
  } catch {
    /* ignore */
  }
}

export function getStaySignedInSync(): boolean {
  return staySignedIn
}

/** Supabase auth storage: persisted session using SecureStore when "stay signed in" is on, memory-only when off */
export const authSessionStorage = {
  getItem: async (key: string) => {
    if (!staySignedIn) {
      return memoryStore[key] ?? null
    }
    try {
      return await SecureStore.getItemAsync(key)
    } catch {
      return null
    }
  },
  setItem: async (key: string, value: string) => {
    if (!staySignedIn) {
      memoryStore[key] = value
      return
    }
    try {
      await SecureStore.setItemAsync(key, value)
    } catch {
      /* ignore */
    }
  },
  removeItem: async (key: string) => {
    delete memoryStore[key]
    try {
      await SecureStore.deleteItemAsync(key)
    } catch {
      /* ignore */
    }
  },
}

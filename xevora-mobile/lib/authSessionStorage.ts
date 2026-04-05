import AsyncStorage from '@react-native-async-storage/async-storage'

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

/** Supabase auth storage: persisted session when "stay signed in" is on, memory-only when off */
export const authSessionStorage = {
  getItem: async (key: string) => {
    if (!staySignedIn) {
      return memoryStore[key] ?? null
    }
    return AsyncStorage.getItem(key)
  },
  setItem: async (key: string, value: string) => {
    if (!staySignedIn) {
      memoryStore[key] = value
      return
    }
    await AsyncStorage.setItem(key, value)
  },
  removeItem: async (key: string) => {
    delete memoryStore[key]
    await AsyncStorage.removeItem(key)
  },
}

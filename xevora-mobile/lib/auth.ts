import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { supabase } from './supabase';

export type AuthUser = {
  id: string;
  email: string;
  role: 'driver' | 'admin' | 'manager';
  workerId: string;
  companyId: string;
};

export async function signIn(email: string, password: string): Promise<{ user: AuthUser | null; error: string | null }> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { user: null, error: error.message };
    }

    if (!data.user) {
      return { user: null, error: 'No user returned' };
    }

    const { data: workerData, error: workerError } = await supabase
      .from('workers')
      .select('id, role, company_id')
      .eq('user_id', data.user.id)
      .single();

    if (workerError || !workerData) {
      await supabase.auth.signOut();
      return { user: null, error: 'Worker profile not found' };
    }

    return {
      user: {
        id: data.user.id,
        email: data.user.email!,
        role: workerData.role as 'driver' | 'admin' | 'manager',
        workerId: workerData.id,
        companyId: workerData.company_id,
      },
      error: null,
    };
  } catch (error) {
    return {
      user: null,
      error: error instanceof Error ? error.message : 'Sign in failed',
    };
  }
}

export async function signOut() {
  await AsyncStorage.multiRemove(['xevora_quick_clock_seen']);
  try {
    await SecureStore.deleteItemAsync('xevora_last_auth_time');
    await SecureStore.deleteItemAsync('xevora_active_shift');
  } catch {
    /* ignore */
  }
  await supabase.auth.signOut();
}

export async function getSession(): Promise<AuthUser | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return null;
    }

    const { data: workerData } = await supabase
      .from('workers')
      .select('id, role, company_id')
      .eq('user_id', session.user.id)
      .single();

    if (!workerData) {
      return null;
    }

    return {
      id: session.user.id,
      email: session.user.email!,
      role: workerData.role as 'driver' | 'admin' | 'manager',
      workerId: workerData.id,
      companyId: workerData.company_id,
    };
  } catch {
    return null;
  }
}

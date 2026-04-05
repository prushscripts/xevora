import { useCallback, useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { useFonts } from 'expo-font';
import type { Session } from '@supabase/supabase-js';
import {
  PlusJakartaSans_300Light,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
  JetBrainsMono_700Bold,
  JetBrainsMono_800ExtraBold,
} from '@expo-google-fonts/jetbrains-mono';
import { supabase } from '../lib/supabase';
import { loadStaySignedInPreference } from '../lib/authSessionStorage';
import '../global.css';

export default function RootLayout() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [workerRole, setWorkerRole] = useState<string | null>(null);
  const router = useRouter();
  const segments = useSegments();

  const [fontsLoaded] = useFonts({
    PlusJakartaSans_300Light,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
    JetBrainsMono_700Bold,
    JetBrainsMono_800ExtraBold,
  });

  const fetchWorkerRole = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('workers')
      .select('role')
      .eq('user_id', userId)
      .single();
    setWorkerRole(data?.role ?? 'driver');
  }, []);

  useEffect(() => {
    void loadStaySignedInPreference();
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s ?? null);
      if (s) {
        void fetchWorkerRole(s.user.id);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, s) => {
      setSession(s);
      if (s) {
        await fetchWorkerRole(s.user.id);
      } else {
        setWorkerRole(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchWorkerRole]);

  useEffect(() => {
    if (session === undefined) return;
    if (!fontsLoaded) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session && workerRole && inAuthGroup) {
      if (workerRole === 'admin' || workerRole === 'manager') {
        router.replace('/(admin)');
      } else {
        router.replace('/(driver)');
      }
    }
  }, [session, workerRole, segments, fontsLoaded, router]);

  if (session === undefined || !fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: '#03060D' }}>
        <ActivityIndicator color="#2563EB" style={{ flex: 1 }} />
      </View>
    );
  }

  return <Slot />;
}

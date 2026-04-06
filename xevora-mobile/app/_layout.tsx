import { useCallback, useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { useFonts } from 'expo-font';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
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
import { HexLogo } from '../components/HexLogo';
import { supabase } from '../lib/supabase';
import { loadStaySignedInPreference } from '../lib/authSessionStorage';
import '../global.css';

function PremiumLoading() {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#03060D',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <HexLogo size={80} glowColor="#2563EB" animated />
      <Text
        style={{
          color: '#F1F5FF',
          fontSize: 22,
          fontFamily: 'PlusJakartaSans_800ExtraBold',
          letterSpacing: 6,
          marginTop: 20,
        }}
      >
        XEVORA
      </Text>
      <Text
        style={{
          color: '#4E6D92',
          fontSize: 12,
          fontFamily: 'JetBrainsMono_400Regular',
          letterSpacing: 2,
          marginTop: 8,
        }}
      >
        LOADING...
      </Text>
    </View>
  );
}

export default function RootLayout() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [workerRole, setWorkerRole] = useState<string | null>(null);
  const [appReady, setAppReady] = useState(true);
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
        AsyncStorage.getItem('xevora_quick_clock_seen').then((seen) => {
          if (!seen) {
            router.replace('/(auth)/quick-clock');
          } else {
            router.replace('/(driver)');
          }
        });
      }
    }
  }, [session, workerRole, segments, fontsLoaded, router]);

  useEffect(() => {
    let cancelled = false;

    async function resumeGate() {
      if (!fontsLoaded) return;
      if (session === undefined) return;

      if (!session) {
        if (!cancelled) setAppReady(true);
        return;
      }

      if (!workerRole) {
        if (!cancelled) setAppReady(false);
        return;
      }

      const inAuthGroup = segments[0] === '(auth)';
      if (inAuthGroup) {
        if (!cancelled) setAppReady(true);
        return;
      }

      let biometricEnabled = 'false';
      try {
        biometricEnabled = await SecureStore.getItemAsync('xevora_biometric_enabled') || 'false';
      } catch {
        /* ignore */
      }
      
      if (biometricEnabled !== 'true') {
        if (!cancelled) setAppReady(true);
        return;
      }

      let lastAuth: string | null = null;
      try {
        lastAuth = await SecureStore.getItemAsync('xevora_last_auth_time');
      } catch {
        /* ignore */
      }
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;
      if (lastAuth && now - parseInt(lastAuth, 10) <= fiveMinutes) {
        if (!cancelled) setAppReady(true);
        return;
      }

      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !enrolled) {
        if (!cancelled) setAppReady(true);
        return;
      }

      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      const hasFaceID = types.includes(
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION
      );

      if (!cancelled) setAppReady(false);

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: hasFaceID ? 'Use Face ID to sign in to Xevora' : 'Use biometrics to sign in to Xevora',
        fallbackLabel: 'Use Password',
        disableDeviceFallback: false,
        cancelLabel: 'Cancel',
      });

      if (cancelled) return;

      if (result.success) {
        try {
          await SecureStore.setItemAsync('xevora_last_auth_time', String(now));
        } catch {
          /* ignore */
        }
        if (!cancelled) setAppReady(true);
        return;
      }

      const err =
        result && typeof result === 'object' && 'error' in result
          ? String((result as { error?: string }).error)
          : '';
      if (err === 'user_cancel') {
        try {
          await SecureStore.deleteItemAsync('xevora_last_auth_time');
        } catch {
          /* ignore */
        }
        await supabase.auth.signOut();
      }
      if (!cancelled) setAppReady(true);
    }

    void resumeGate();
    return () => {
      cancelled = true;
    };
  }, [session, workerRole, segments, fontsLoaded]);

  if (!fontsLoaded || session === undefined) {
    return <PremiumLoading />;
  }

  if (session && (!workerRole || !appReady)) {
    return <PremiumLoading />;
  }

  return <Slot />;
}

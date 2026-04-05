import React, { useEffect, useState } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { DriverTabBar } from '../../components/driver/DriverTabBar';
import { View, StyleSheet } from 'react-native';
import { theme } from '../../constants/theme';
import { supabase } from '../../lib/supabase';

export default function DriverLayout() {
  const router = useRouter();
  const [sessionOk, setSessionOk] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (!session) {
        router.replace('/(auth)/login');
        setSessionOk(false);
        return;
      }
      setSessionOk(true);
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (sessionOk !== true) {
    return (
      <View style={styles.gate}>
        <View style={styles.sk1} />
        <View style={styles.sk2} />
        <View style={styles.sk3} />
      </View>
    );
  }

  return (
    <Tabs
      tabBar={(props) => <DriverTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="clock" options={{ title: 'Clock' }} />
      <Tabs.Screen name="timecard" options={{ title: 'Timecard' }} />
      <Tabs.Screen name="pay" options={{ title: 'Pay' }} />
      <Tabs.Screen name="vault" options={{ title: 'Vault' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  gate: {
    flex: 1,
    backgroundColor: theme.bg,
    padding: 24,
    gap: 16,
    justifyContent: 'center',
  },
  sk1: {
    height: 56,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    width: '70%',
    alignSelf: 'center',
  },
  sk2: {
    height: 160,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  sk3: {
    height: 72,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
});

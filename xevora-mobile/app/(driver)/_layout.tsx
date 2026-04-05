import { useEffect, useState } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { theme } from '../../constants/theme';
import { supabase } from '../../lib/supabase';

function TabBarIcon({ name, focused }: { name: string; focused: boolean }) {
  const color = focused ? theme.bright : theme.muted;

  const icons: Record<string, JSX.Element> = {
    home: (
      <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M9 22V12h6v10" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    ),
    clock: (
      <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" />
        <Path d="M12 6v6l4 2" stroke={color} strokeWidth="2" strokeLinecap="round" />
      </Svg>
    ),
    timecard: (
      <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <Rect x="3" y="4" width="18" height="18" rx="2" stroke={color} strokeWidth="2" />
        <Path d="M8 2v4M16 2v4M3 10h18" stroke={color} strokeWidth="2" strokeLinecap="round" />
      </Svg>
    ),
    pay: (
      <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <Path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    ),
    vault: (
      <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <Rect x="3" y="8" width="18" height="13" rx="2" stroke={color} strokeWidth="2" />
        <Path d="M7 8V6a5 5 0 0 1 10 0v2" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <Circle cx="12" cy="15" r="2" fill={color} />
      </Svg>
    ),
  };

  return icons[name] || icons.home;
}

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
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: theme.bright,
        tabBarInactiveTintColor: theme.muted,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => <TabBarIcon name="home" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="clock"
        options={{
          title: 'Clock',
          tabBarIcon: ({ focused }) => <TabBarIcon name="clock" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="timecard"
        options={{
          title: 'Timecard',
          tabBarIcon: ({ focused }) => <TabBarIcon name="timecard" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="pay"
        options={{
          title: 'Pay',
          tabBarIcon: ({ focused }) => <TabBarIcon name="pay" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="vault"
        options={{
          title: 'Vault',
          tabBarIcon: ({ focused }) => <TabBarIcon name="vault" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  gate: {
    flex: 1,
    backgroundColor: theme.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBar: {
    backgroundColor: theme.surface,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    height: 64,
    paddingBottom: 8,
    paddingTop: 8,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    fontFamily: theme.bodyMedium,
  },
});

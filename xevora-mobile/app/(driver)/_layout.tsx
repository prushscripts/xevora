import React from 'react';
import { Tabs } from 'expo-router';
import { DriverTabBar } from '../../components/driver/DriverTabBar';

export default function DriverLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <DriverTabBar {...props} />}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="clock" options={{ title: 'Clock' }} />
      <Tabs.Screen name="timecard" options={{ title: 'Timecard' }} />
      <Tabs.Screen name="pay" options={{ title: 'Pay' }} />
      <Tabs.Screen name="vault" options={{ title: 'Vault' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}

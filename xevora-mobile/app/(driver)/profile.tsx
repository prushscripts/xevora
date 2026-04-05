import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { signOut } from '../../lib/auth';

export default function DriverProfileScreen() {
  const { user } = useAuth();
  const [worker, setWorker] = useState<any>(null);
  const [weeklyStats, setWeeklyStats] = useState({ hours: 0, shifts: 0, ot: 0 });
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [quickClockEnabled, setQuickClockEnabled] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadWorkerData();
    loadSettings();
  }, []);

  async function loadWorkerData() {
    if (!user) return;

    const { data: workerData } = await supabase
      .from('workers')
      .select('*, clients(abbreviation, name)')
      .eq('user_id', user.id)
      .single();

    if (workerData) {
      setWorker(workerData);

      const monday = getMonday(new Date());
      const sunday = new Date(monday);
      sunday.setDate(sunday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);

      const { data: shifts } = await supabase
        .from('shifts')
        .select('total_hours, clock_in, clock_out')
        .eq('worker_id', workerData.id)
        .gte('clock_in', monday.toISOString())
        .lte('clock_in', sunday.toISOString());

      if (shifts) {
        const totalHours = shifts.reduce((sum, s) => sum + (s.total_hours || 0), 0);
        const otHours = Math.max(0, totalHours - 40);
        setWeeklyStats({
          hours: totalHours,
          shifts: shifts.length,
          ot: otHours,
        });
      }
    }
  }

  async function loadSettings() {
    const bio = await AsyncStorage.getItem('xevora_biometric_enabled');
    const notif = await AsyncStorage.getItem('xevora_notifications_enabled');
    const quick = await AsyncStorage.getItem('xevora_quick_clock_enabled');
    setBiometricEnabled(bio === 'true');
    setNotificationsEnabled(notif === 'true');
    setQuickClockEnabled(quick !== 'false');
  }

  function getMonday(date: Date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? 6 : day - 1;
    d.setDate(d.getDate() - diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  async function toggleBiometric() {
    if (!biometricEnabled) {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !enrolled) {
        Alert.alert('Biometrics Not Available', 'Please set up biometrics in your device settings first.');
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Enable biometric authentication',
      });

      if (result.success) {
        await AsyncStorage.setItem('xevora_biometric_enabled', 'true');
        setBiometricEnabled(true);
      }
    } else {
      await AsyncStorage.removeItem('xevora_biometric_enabled');
      setBiometricEnabled(false);
    }
  }

  async function toggleNotifications() {
    const newValue = !notificationsEnabled;
    await AsyncStorage.setItem('xevora_notifications_enabled', newValue ? 'true' : 'false');
    setNotificationsEnabled(newValue);
  }

  async function toggleQuickClock() {
    const newValue = !quickClockEnabled;
    await AsyncStorage.setItem('xevora_quick_clock_enabled', newValue ? 'true' : 'false');
    setQuickClockEnabled(newValue);
  }

  const onSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            if (busy) return;
            setBusy(true);
            try {
              await AsyncStorage.removeItem('xevora_quick_clock_seen');
              await signOut();
              router.replace('/(auth)/login');
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  };

  const getInitials = () => {
    if (!worker?.full_name) return 'DR';
    const parts = worker.full_name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return worker.full_name.substring(0, 2).toUpperCase();
  };

  const getMemberSince = () => {
    if (!worker?.created_at) return 'Member';
    const date = new Date(worker.created_at);
    return `Member since ${date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
  };

  return (
    <SafeAreaView style={s.container}>
      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
        {/* WORKER CARD */}
        <View style={s.workerCard}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{getInitials()}</Text>
          </View>
          <Text style={s.name}>{worker?.full_name || 'Driver'}</Text>
          <View style={s.badges}>
            <View style={s.badge}>
              <Text style={s.badgeText}>DRIVER</Text>
            </View>
            <View style={s.badge}>
              <Text style={s.badgeText}>{worker?.pay_type === 'flat_weekly' ? 'W2' : '1099'}</Text>
            </View>
          </View>
          <Text style={s.company}>{worker?.clients?.name || 'Xevora'}</Text>
          <Text style={s.client}>Reporting to: {worker?.clients?.abbreviation || 'N/A'}</Text>
          <Text style={s.memberSince}>{getMemberSince()}</Text>
        </View>

        {/* THIS WEEK SUMMARY */}
        <View style={s.weeklyStats}>
          <View style={s.stat}>
            <Text style={s.statValue}>{weeklyStats.hours.toFixed(1)}</Text>
            <Text style={s.statLabel}>Hours</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.stat}>
            <Text style={s.statValue}>{weeklyStats.shifts}</Text>
            <Text style={s.statLabel}>Shifts</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.stat}>
            <Text style={s.statValue}>{weeklyStats.ot.toFixed(1)}</Text>
            <Text style={s.statLabel}>OT</Text>
          </View>
        </View>

        {/* ACCOUNT SETTINGS */}
        <Text style={s.sectionHeader}>ACCOUNT SETTINGS</Text>
        <View style={s.section}>
          <TouchableOpacity style={s.row} onPress={toggleBiometric}>
            <Text style={s.rowLabel}>Face ID / Biometrics</Text>
            <View style={[s.toggle, biometricEnabled && s.toggleOn]}>
              <View style={[s.toggleThumb, biometricEnabled && s.toggleThumbOn]} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={s.row} onPress={toggleNotifications}>
            <Text style={s.rowLabel}>Notifications</Text>
            <View style={[s.toggle, notificationsEnabled && s.toggleOn]}>
              <View style={[s.toggleThumb, notificationsEnabled && s.toggleThumbOn]} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={s.row} onPress={toggleQuickClock}>
            <Text style={s.rowLabel}>Quick Clock on Open</Text>
            <View style={[s.toggle, quickClockEnabled && s.toggleOn]}>
              <View style={[s.toggleThumb, quickClockEnabled && s.toggleThumbOn]} />
            </View>
          </TouchableOpacity>
        </View>

        {/* SUPPORT */}
        <Text style={s.sectionHeader}>SUPPORT</Text>
        <View style={s.section}>
          <TouchableOpacity style={s.row} onPress={() => Linking.openURL('mailto:james@xevora.io')}>
            <Text style={s.rowLabel}>Contact Support</Text>
            <Text style={s.arrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.row} onPress={() => Linking.openURL('https://xevora.io/privacy')}>
            <Text style={s.rowLabel}>Privacy Policy</Text>
            <Text style={s.arrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.row} onPress={() => Linking.openURL('https://xevora.io/terms')}>
            <Text style={s.rowLabel}>Terms of Service</Text>
            <Text style={s.arrow}>›</Text>
          </TouchableOpacity>
          <View style={s.row}>
            <Text style={s.rowLabel}>App Version</Text>
            <Text style={s.version}>Xevora v1.0.0 (Beta)</Text>
          </View>
        </View>

        {/* DANGER ZONE */}
        <Text style={s.sectionHeader}>DANGER ZONE</Text>
        <TouchableOpacity style={s.signOutBtn} onPress={onSignOut} disabled={busy}>
          <Text style={s.signOutText}>{busy ? 'Signing out…' : 'Sign Out'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#03060D',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  workerCard: {
    padding: 24,
    borderRadius: 16,
    backgroundColor: '#0D1F45',
    marginBottom: 24,
    alignItems: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 24,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#fff',
  },
  name: {
    fontSize: 20,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#fff',
    marginBottom: 8,
  },
  badges: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#2563EB',
  },
  badgeText: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#fff',
  },
  company: {
    fontSize: 13,
    color: '#4E6D92',
    marginBottom: 4,
  },
  client: {
    fontSize: 12,
    color: '#4E6D92',
    marginBottom: 8,
  },
  memberSince: {
    fontSize: 11,
    color: '#4E6D92',
  },
  weeklyStats: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#0A1628',
    marginBottom: 24,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#1E3A5F',
  },
  statValue: {
    fontSize: 20,
    fontFamily: 'JetBrainsMono_800ExtraBold',
    color: '#F1F5FF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#4E6D92',
  },
  sectionHeader: {
    fontSize: 10,
    fontFamily: 'JetBrainsMono_400Regular',
    color: '#4E6D92',
    letterSpacing: 2,
    marginBottom: 8,
    marginTop: 8,
  },
  section: {
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#0A1628',
    marginBottom: 1,
  },
  rowLabel: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans_500Medium',
    color: '#F1F5FF',
  },
  arrow: {
    fontSize: 20,
    color: '#4E6D92',
  },
  version: {
    fontSize: 13,
    color: '#4E6D92',
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 2,
  },
  toggleOn: {
    backgroundColor: '#2563EB',
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  toggleThumbOn: {
    marginLeft: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#F1F5FF',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    marginBottom: 8,
  },
  muted: {
    fontSize: 14,
    color: '#4E6D92',
    fontFamily: 'PlusJakartaSans_400Regular',
    marginBottom: 32,
  },
  signOutBtn: {
    width: '100%',
    backgroundColor: '#060B14',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  signOutText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
  },
});

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { signOut } from '../../lib/auth';

export default function DriverProfileScreen() {
  const [busy, setBusy] = useState(false);

  const onSignOut = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await signOut();
      router.replace('/(auth)/login');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.inner}>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.muted}>Account and session</Text>
        <TouchableOpacity
          style={styles.signOutBtn}
          onPress={onSignOut}
          disabled={busy}
          activeOpacity={0.85}
        >
          <Text style={styles.signOutText}>{busy ? 'Signing out…' : 'Sign Out'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#03060D',
  },
  inner: {
    flex: 1,
    padding: 20,
    justifyContent: 'flex-end',
    paddingBottom: 32,
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

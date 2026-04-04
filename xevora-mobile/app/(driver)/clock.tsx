import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HexLogo } from '../../components/HexLogo';
import { theme } from '../../constants/theme';

export default function ClockScreen() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        <View style={styles.hexContainer}>
          <HexLogo size={180} animated />
          <View style={styles.timeOverlay}>
            <Text style={styles.time}>{formatTime(currentTime)}</Text>
          </View>
        </View>

        <Text style={styles.date}>{formatDate(currentTime)}</Text>
        <Text style={styles.gpsStatus}>Acquiring location...</Text>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.clockInBtn}>
            <Text style={styles.clockInBtnText}>CLOCK IN</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  hexContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  timeOverlay: {
    position: 'absolute',
  },
  time: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.text,
    fontFamily: theme.mono,
  },
  date: {
    fontSize: 15,
    color: theme.muted,
    marginBottom: 12,
    fontFamily: theme.body,
  },
  gpsStatus: {
    fontSize: 13,
    color: theme.muted,
    marginBottom: 40,
    fontFamily: theme.body,
  },
  actions: {
    width: '100%',
    gap: 12,
  },
  clockInBtn: {
    backgroundColor: theme.primary,
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.bright,
  },
  clockInBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
    fontFamily: theme.bodyMedium,
  },
});

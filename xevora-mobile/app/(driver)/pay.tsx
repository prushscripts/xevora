import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../constants/theme';

export default function PayScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Pay</Text>

        <LinearGradient
          colors={['#0D1F45', theme.surface]}
          style={styles.heroCard}
        >
          <Text style={styles.periodDates}>Current Pay Period</Text>
          <View style={styles.payRow}>
            <Text style={styles.payLabel}>Total Hours</Text>
            <Text style={styles.payValue}>0.0</Text>
          </View>
          <View style={styles.payRow}>
            <Text style={styles.payLabel}>Base Pay</Text>
            <Text style={styles.payValue}>$0.00</Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusText}>PENDING APPROVAL</Text>
          </View>
        </LinearGradient>

        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Pay History</Text>
          <Text style={styles.emptyText}>No pay history available</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.text,
    fontFamily: theme.heading,
  },
  heroCard: {
    borderRadius: 16,
    padding: 24,
    gap: 16,
  },
  periodDates: {
    fontSize: 13,
    color: theme.muted,
    fontFamily: theme.body,
  },
  payRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  payLabel: {
    fontSize: 15,
    color: theme.text,
    fontFamily: theme.body,
  },
  payValue: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.text,
    fontFamily: theme.mono,
  },
  statusRow: {
    marginTop: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.warning,
    letterSpacing: 0.5,
    fontFamily: theme.bodyMedium,
  },
  historySection: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.text,
    fontFamily: theme.bodyMedium,
  },
  emptyText: {
    fontSize: 14,
    color: theme.muted,
    textAlign: 'center',
    paddingVertical: 40,
    fontFamily: theme.body,
  },
});

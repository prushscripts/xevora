import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../constants/theme';

export default function TimecardScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Timecard</Text>
        
        <View style={styles.periodSelector}>
          <Text style={styles.periodText}>Current Pay Period</Text>
        </View>

        <View style={styles.summaryBar}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>0.0</Text>
            <Text style={styles.summaryLabel}>Total Hrs</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>0.0</Text>
            <Text style={styles.summaryLabel}>Regular</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>0.0</Text>
            <Text style={styles.summaryLabel}>OT</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, styles.summaryValuePay]}>$0</Text>
            <Text style={styles.summaryLabel}>Est. Pay</Text>
          </View>
        </View>

        <View style={styles.shiftsSection}>
          <Text style={styles.emptyText}>No shifts for this period</Text>
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
  periodSelector: {
    backgroundColor: theme.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.border,
  },
  periodText: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.text,
    textAlign: 'center',
    fontFamily: theme.mono,
  },
  summaryBar: {
    flexDirection: 'row',
    backgroundColor: theme.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.border,
    gap: 12,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.text,
    fontFamily: theme.mono,
    marginBottom: 4,
  },
  summaryValuePay: {
    color: theme.bright,
  },
  summaryLabel: {
    fontSize: 10,
    color: theme.muted,
    fontFamily: theme.body,
  },
  shiftsSection: {
    flex: 1,
  },
  emptyText: {
    fontSize: 14,
    color: theme.muted,
    textAlign: 'center',
    paddingVertical: 40,
    fontFamily: theme.body,
  },
});

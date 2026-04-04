import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { useShift } from '../../hooks/useShift';
import { usePayPeriod } from '../../hooks/usePayPeriod';
import { ClientChip } from '../../components/ClientChip';
import { StatusBadge } from '../../components/StatusBadge';
import { theme } from '../../constants/theme';

export default function DriverHomeScreen() {
  const { user } = useAuth();
  const { activeShift, loading: shiftLoading } = useShift(user?.workerId || '');
  const { currentPeriod, loading: periodLoading } = usePayPeriod(user?.workerId || '');

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const firstName = user?.email.split('@')[0] || 'Driver';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()},</Text>
            <Text style={styles.name}>{firstName}</Text>
          </View>
          <ClientChip abbreviation="ABC" isActive={!!activeShift} />
        </View>

        <View style={styles.shiftCard}>
          {activeShift ? (
            <>
              <StatusBadge status={activeShift.status === 'meal_break' ? 'break' : 'active'} />
              <Text style={styles.shiftTimer}>00:00:00</Text>
              <Text style={styles.shiftTime}>
                Clocked in at {new Date(activeShift.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
              <TouchableOpacity style={styles.endShiftBtn}>
                <Text style={styles.endShiftBtnText}>END SHIFT</Text>
              </TouchableOpacity>
              {activeShift.status !== 'meal_break' && (
                <TouchableOpacity style={styles.mealBreakBtn}>
                  <Text style={styles.mealBreakBtnText}>MEAL BREAK</Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <>
              <Text style={styles.noShiftText}>No active shift</Text>
              <TouchableOpacity style={styles.startShiftBtn}>
                <Text style={styles.startShiftBtnText}>START SHIFT</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={styles.weekCard}>
          <Text style={styles.weekCardTitle}>This Week</Text>
          <View style={styles.weekStats}>
            <View style={styles.weekStat}>
              <Text style={styles.weekStatLabel}>Total Hours</Text>
              <Text style={styles.weekStatValue}>
                {currentPeriod?.totalHours.toFixed(1) || '0.0'}
              </Text>
            </View>
            <View style={styles.weekStat}>
              <Text style={styles.weekStatLabel}>Est. Pay</Text>
              <Text style={[styles.weekStatValue, styles.weekStatValuePay]}>
                ${currentPeriod?.estimatedPay.toFixed(0) || '0'}
              </Text>
            </View>
          </View>
          <Text style={styles.weekPeriod}>
            {currentPeriod
              ? `${currentPeriod.start.toLocaleDateString()} - ${currentPeriod.end.toLocaleDateString()}`
              : 'Loading...'}
          </Text>
        </View>

        <View style={styles.recentSection}>
          <Text style={styles.sectionTitle}>Recent Shifts</Text>
          <Text style={styles.emptyText}>No recent shifts</Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: {
    fontSize: 13,
    color: theme.muted,
    fontFamily: theme.body,
  },
  name: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.text,
    fontFamily: theme.heading,
    marginTop: 4,
  },
  shiftCard: {
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.border,
    gap: 16,
  },
  shiftTimer: {
    fontSize: 40,
    fontWeight: '800',
    color: theme.success,
    fontFamily: theme.mono,
    textAlign: 'center',
  },
  shiftTime: {
    fontSize: 13,
    color: theme.muted,
    textAlign: 'center',
    fontFamily: theme.body,
  },
  noShiftText: {
    fontSize: 15,
    color: theme.muted,
    textAlign: 'center',
    fontFamily: theme.body,
  },
  startShiftBtn: {
    backgroundColor: theme.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  startShiftBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: theme.bodyMedium,
  },
  endShiftBtn: {
    backgroundColor: theme.danger,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  endShiftBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: theme.bodyMedium,
  },
  mealBreakBtn: {
    backgroundColor: theme.warning,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  mealBreakBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: theme.bodyMedium,
  },
  weekCard: {
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.border,
  },
  weekCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.text,
    marginBottom: 16,
    fontFamily: theme.bodyMedium,
  },
  weekStats: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 12,
  },
  weekStat: {
    flex: 1,
  },
  weekStatLabel: {
    fontSize: 11,
    color: theme.muted,
    marginBottom: 6,
    fontFamily: theme.body,
  },
  weekStatValue: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.text,
    fontFamily: theme.mono,
  },
  weekStatValuePay: {
    color: theme.bright,
  },
  weekPeriod: {
    fontSize: 11,
    color: theme.muted,
    fontFamily: theme.body,
  },
  recentSection: {
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
    paddingVertical: 20,
    fontFamily: theme.body,
  },
});

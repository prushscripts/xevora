import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ClientChip } from '../../components/ClientChip';
import { StatusBadge } from '../../components/StatusBadge';
import { theme } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import {
  calculateShiftHours,
  calculateWeeklyTotals,
  type MealBreak,
} from '../../lib/payroll';

type WorkerRow = {
  id: string;
  company_id: string;
  first_name: string | null;
  full_name: string | null;
  pay_type: string | null;
  pay_rate: number | null;
  ot_pay_rate: number | null;
  flat_weekly_rate: number | null;
};

type ShiftRow = {
  id: string;
  clock_in: string;
  clock_out: string | null;
  status: string;
  total_hours: number | null;
  created_at: string;
  meal_breaks: MealBreak[] | null;
  clients: { abbreviation: string } | { abbreviation: string }[] | null;
};

function clientAbbrev(
  clients: ShiftRow['clients']
): string | undefined {
  if (!clients) return undefined;
  if (Array.isArray(clients)) return clients[0]?.abbreviation;
  return clients.abbreviation;
}

function weekRange() {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { monday, sunday };
}

function formatElapsed(startIso: string): string {
  const ms = Date.now() - new Date(startIso).getTime();
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export default function DriverHomeScreen() {
  const [worker, setWorker] = useState<WorkerRow | null>(null);
  const [activeShift, setActiveShift] = useState<ShiftRow | null>(null);
  const [recentShifts, setRecentShifts] = useState<ShiftRow[]>([]);
  const [weekHours, setWeekHours] = useState(0);
  const [estPay, setEstPay] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [tick, setTick] = useState(0);

  const greetOp = useRef(new Animated.Value(0)).current;
  const greetY = useRef(new Animated.Value(20)).current;
  const shiftOp = useRef(new Animated.Value(0)).current;
  const shiftY = useRef(new Animated.Value(20)).current;
  const weekOp = useRef(new Animated.Value(0)).current;
  const weekY = useRef(new Animated.Value(20)).current;
  const recentOp = useRef(new Animated.Value(0)).current;
  const recentY = useRef(new Animated.Value(20)).current;

  const runEnter = useCallback(() => {
    const timing = (op: Animated.Value, y: Animated.Value, delay: number) =>
      Animated.parallel([
        Animated.timing(op, {
          toValue: 1,
          duration: 400,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(y, {
          toValue: 0,
          duration: 400,
          delay,
          useNativeDriver: true,
        }),
      ]);

    Animated.parallel([
      timing(greetOp, greetY, 100),
      timing(shiftOp, shiftY, 250),
      timing(weekOp, weekY, 400),
      timing(recentOp, recentY, 550),
    ]).start();
  }, [greetOp, greetY, shiftOp, shiftY, weekOp, weekY, recentOp, recentY]);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError('Not signed in');
        setLoading(false);
        return;
      }

      const { data: w, error: wErr } = await supabase
        .from('workers')
        .select(
          'id, company_id, first_name, full_name, pay_type, pay_rate, ot_pay_rate, flat_weekly_rate'
        )
        .eq('user_id', user.id)
        .single();

      if (wErr || !w) {
        setError(wErr?.message || 'Worker profile not found');
        setLoading(false);
        return;
      }

      setWorker(w as WorkerRow);

      const { monday, sunday } = weekRange();

      const [activeRes, recentRes, weekRes] = await Promise.all([
        supabase
          .from('shifts')
          .select(
            'id, clock_in, clock_out, status, total_hours, created_at, meal_breaks, clients(abbreviation)'
          )
          .eq('worker_id', w.id)
          .is('clock_out', null)
          .order('clock_in', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('shifts')
          .select(
            'id, clock_in, clock_out, status, total_hours, created_at, meal_breaks, clients(abbreviation)'
          )
          .eq('worker_id', w.id)
          .order('created_at', { ascending: false })
          .limit(3),
        supabase
          .from('shifts')
          .select(
            'clock_in, clock_out, meal_breaks, total_hours, regular_hours, ot_hours'
          )
          .eq('worker_id', w.id)
          .gte('clock_in', monday.toISOString())
          .lte('clock_in', sunday.toISOString()),
      ]);

      if (activeRes.error) throw activeRes.error;
      if (recentRes.error) throw recentRes.error;
      if (weekRes.error) throw weekRes.error;

      const act = activeRes.data as unknown as ShiftRow | null;
      setActiveShift(act && act.status === 'active' ? act : null);

      setRecentShifts((recentRes.data as unknown as ShiftRow[]) || []);

      const completedWeek = (weekRes.data || []).filter((row) => row.clock_out);
      const shiftTotals = completedWeek.map((row) => {
        if (row.total_hours != null && row.total_hours > 0) {
          return { totalHours: Number(row.total_hours) };
        }
        const { totalHours } = calculateShiftHours(
          new Date(row.clock_in),
          new Date(row.clock_out!),
          row.meal_breaks
        );
        return { totalHours };
      });

      const totals = calculateWeeklyTotals({
        shifts: shiftTotals,
        worker: {
          pay_type: (w.pay_type as 'hourly' | 'flat_weekly') || 'hourly',
          pay_rate: w.pay_rate,
          ot_pay_rate: w.ot_pay_rate,
          flat_weekly_rate: w.flat_weekly_rate,
        },
        workerClient: { billing_rate: 0, ot_billing_rate: 0 },
        otWeeklyThreshold: 40,
      });

      setWeekHours(totals.totalHours);
      setEstPay(totals.grossPay);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!loading && !error) {
      runEnter();
    }
  }, [loading, error, runEnter]);

  useEffect(() => {
    if (!activeShift) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [activeShift]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const firstName = useMemo(() => {
    if (!worker) return 'Driver';
    if (worker.first_name?.trim()) return worker.first_name.trim();
    if (worker.full_name?.trim()) return worker.full_name.trim().split(/\s+/)[0]!;
    return 'Driver';
  }, [worker]);

  const clientAbbr = useMemo(() => {
    const a = activeShift ? clientAbbrev(activeShift.clients) : undefined;
    if (a) return a;
    const r = recentShifts[0] ? clientAbbrev(recentShifts[0].clients) : undefined;
    return r || '—';
  }, [activeShift, recentShifts]);

  const { monday, sunday } = weekRange();

  const clockIn = async () => {
    if (!worker || actionBusy) return;
    setActionBusy(true);
    try {
      const { error: insErr } = await supabase.from('shifts').insert({
        company_id: worker.company_id,
        worker_id: worker.id,
        clock_in: new Date().toISOString(),
        status: 'active',
      });
      if (insErr) throw insErr;
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Clock in failed');
    } finally {
      setActionBusy(false);
    }
  };

  const clockOut = async () => {
    if (!activeShift || actionBusy) return;
    setActionBusy(true);
    try {
      const end = new Date();
      const { totalHours } = calculateShiftHours(
        new Date(activeShift.clock_in),
        end,
        activeShift.meal_breaks
      );
      const { error: upErr } = await supabase
        .from('shifts')
        .update({
          clock_out: end.toISOString(),
          status: 'completed',
          total_hours: totalHours,
        })
        .eq('id', activeShift.id);
      if (upErr) throw upErr;
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Clock out failed');
    } finally {
      setActionBusy(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.skeletonPad}>
          <View style={styles.skBlock} />
          <View style={[styles.skBlock, { height: 140 }]} />
          <View style={[styles.skBlock, { height: 120 }]} />
          <View style={[styles.skBlock, { height: 100 }]} />
        </View>
      </SafeAreaView>
    );
  }

  if (error && !worker) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Animated.View
          style={{
            opacity: greetOp,
            transform: [{ translateY: greetY }],
          }}
        >
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>{getGreeting()},</Text>
              <Text style={styles.name}>{firstName}</Text>
            </View>
            <ClientChip abbreviation={clientAbbr} isActive={!!activeShift} />
          </View>
        </Animated.View>

        {error ? (
          <View style={styles.inlineError}>
            <Text style={styles.errorTextSmall}>{error}</Text>
            <TouchableOpacity onPress={load}>
              <Text style={styles.retryLink}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <Animated.View
          style={{
            opacity: shiftOp,
            transform: [{ translateY: shiftY }],
          }}
        >
          <View style={styles.shiftCard}>
            {activeShift ? (
              <>
                <StatusBadge status="active" />
                <Text style={styles.shiftTimer} key={tick}>
                  {formatElapsed(activeShift.clock_in)}
                </Text>
                <Text style={styles.shiftTime}>
                  Clocked in at{' '}
                  {new Date(activeShift.clock_in).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
                <TouchableOpacity
                  style={styles.endShiftBtn}
                  onPress={clockOut}
                  disabled={actionBusy}
                >
                  {actionBusy ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.endShiftBtnText}>CLOCK OUT</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.noShiftTitle}>Start your shift</Text>
                <Text style={styles.noShiftText}>
                  Clock in when you&apos;re ready to begin.
                </Text>
                <TouchableOpacity
                  style={styles.startShiftBtn}
                  onPress={clockIn}
                  disabled={actionBusy}
                >
                  {actionBusy ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.startShiftBtnText}>CLOCK IN</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </Animated.View>

        <Animated.View
          style={{
            opacity: weekOp,
            transform: [{ translateY: weekY }],
          }}
        >
          <View style={styles.weekCard}>
            <Text style={styles.weekCardTitle}>This Week</Text>
            <View style={styles.weekStats}>
              <View style={styles.weekStat}>
                <Text style={styles.weekStatLabel}>Total Hours</Text>
                <Text style={styles.weekStatValue}>{weekHours.toFixed(1)}</Text>
              </View>
              <View style={styles.weekStat}>
                <Text style={styles.weekStatLabel}>Est. Pay</Text>
                <Text style={[styles.weekStatValue, styles.weekStatValuePay]}>
                  ${estPay.toFixed(0)}
                </Text>
              </View>
            </View>
            <Text style={styles.weekPeriod}>
              {monday.toLocaleDateString()} – {sunday.toLocaleDateString()}
            </Text>
          </View>
        </Animated.View>

        <Animated.View
          style={{
            opacity: recentOp,
            transform: [{ translateY: recentY }],
          }}
        >
          <View style={styles.recentSection}>
            <Text style={styles.sectionTitle}>Recent Shifts</Text>
            {recentShifts.length === 0 ? (
              <Text style={styles.emptyText}>No recent shifts</Text>
            ) : (
              recentShifts.map((sh) => {
                const abbr = clientAbbrev(sh.clients) ?? '—';
                const hrs =
                  sh.total_hours != null
                    ? Number(sh.total_hours).toFixed(1)
                    : sh.clock_out
                      ? calculateShiftHours(
                          new Date(sh.clock_in),
                          new Date(sh.clock_out),
                          sh.meal_breaks
                        ).totalHours.toFixed(1)
                      : '—';
                const dateStr = new Date(sh.clock_in).toLocaleDateString([], {
                  month: 'short',
                  day: 'numeric',
                });
                const st = sh.status === 'completed' ? 'completed' : sh.status === 'active' ? 'pending' : 'pending';
                return (
                  <View key={sh.id} style={styles.recentRow}>
                    <Text style={styles.recentDate}>{dateStr}</Text>
                    <Text style={styles.recentClient}>{abbr}</Text>
                    <Text style={styles.recentHrs}>{hrs}h</Text>
                    <StatusBadge status={st === 'completed' ? 'completed' : 'pending'} size="sm" />
                  </View>
                );
              })
            )}
          </View>
        </Animated.View>
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
  noShiftTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.text,
    textAlign: 'center',
    fontFamily: theme.bodyMedium,
  },
  noShiftText: {
    fontSize: 14,
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
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.border,
  },
  recentDate: {
    width: 56,
    fontSize: 12,
    color: theme.muted,
    fontFamily: theme.body,
  },
  recentClient: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: theme.bright,
    fontFamily: theme.bodyMedium,
  },
  recentHrs: {
    width: 40,
    fontSize: 13,
    color: theme.text,
    fontFamily: theme.mono,
    textAlign: 'right',
  },
  skeletonPad: {
    padding: 20,
    gap: 16,
  },
  skBlock: {
    height: 72,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  errorBox: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  errorText: {
    color: theme.danger,
    textAlign: 'center',
    fontFamily: theme.body,
  },
  errorTextSmall: {
    color: theme.danger,
    fontSize: 13,
    fontFamily: theme.body,
    flex: 1,
  },
  retryBtn: {
    backgroundColor: theme.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontFamily: theme.bodyMedium,
  },
  inlineError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)',
  },
  retryLink: {
    color: theme.bright,
    fontWeight: '700',
    fontFamily: theme.bodyMedium,
  },
});

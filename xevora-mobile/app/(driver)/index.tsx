import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Svg, { Polygon, Path } from 'react-native-svg';
import { ClientChip } from '../../components/ClientChip';
import { HexLogo } from '../../components/HexLogo';
import { OfflineBanner } from '../../components/OfflineBanner';
import { theme } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import {
  calculateShiftHours,
  calculateWeeklyTotals,
  type MealBreak,
} from '../../lib/payroll';
import {
  appendMealStart,
  closeLastOpenMeal,
  getOpenMealBreak,
} from '../../lib/shiftMeal';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

type WorkerRow = {
  id: string;
  company_id: string;
  first_name: string | null;
  full_name: string | null;
  pay_type: string | null;
  pay_rate: number | null;
  ot_pay_rate: number | null;
  flat_weekly_rate: number | null;
  clients?: { abbreviation?: string | null; name?: string | null } | null;
};

function workerClientAbbrev(w: WorkerRow | null): string | undefined {
  const c = w?.clients;
  if (!c) return undefined;
  const abbr = (c as { abbreviation?: string | null }).abbreviation;
  return abbr?.trim() || undefined;
}

type ShiftRow = {
  id: string;
  clock_in: string;
  clock_out: string | null;
  status: string;
  total_hours: number | null;
  created_at: string;
  meal_breaks: MealBreak[] | null;
  edit_status: string | null;
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

function abbrevCompany(name: string | null | undefined): string {
  if (!name?.trim()) return 'WORK';
  const u = name.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return u.slice(0, 6) || 'WORK';
}

function dayCircleColor(d: Date): string {
  const palette = ['#2563EB', '#3B82F6', '#22C55E', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4'];
  return palette[d.getDay() % palette.length]!;
}

function MiniHexMuted() {
  return (
    <Svg width={40} height={40} viewBox="0 0 100 100" opacity={0.35}>
      <Polygon
        points="50,8 92,32 92,68 50,92 8,68 8,32"
        fill="none"
        stroke="#4E6D92"
        strokeWidth={2}
      />
      <Path
        d="M33,25 L43,25 L50,37 L57,25 L67,25 L55,50 L67,75 L57,75 L50,63 L43,75 L33,75 L45,50 Z"
        fill="#4E6D92"
      />
    </Svg>
  );
}

function PulseDot({ color }: { color: string }) {
  const op = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(op, {
          toValue: 0.35,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(op, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [op]);
  return (
    <Animated.View
      style={[
        styles.pulseDot,
        { backgroundColor: color, opacity: op },
      ]}
    />
  );
}

export default function DriverHomeScreen() {
  const online = useOnlineStatus();
  const [worker, setWorker] = useState<WorkerRow | null>(null);
  const [companyAbbr, setCompanyAbbr] = useState('WORK');
  const [payPeriodLabel, setPayPeriodLabel] = useState('—');
  const [activeShift, setActiveShift] = useState<ShiftRow | null>(null);
  const [recentShifts, setRecentShifts] = useState<ShiftRow[]>([]);
  const [weekHours, setWeekHours] = useState(0);
  const [regularHrs, setRegularHrs] = useState(0);
  const [otHrs, setOtHrs] = useState(0);
  const [estPay, setEstPay] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [tick, setTick] = useState(0);
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');

  const borderPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
      setCurrentDate(
        now.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeShift) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(borderPulse, {
          toValue: 1,
          duration: 1400,
          useNativeDriver: false,
        }),
        Animated.timing(borderPulse, {
          toValue: 0,
          duration: 1400,
          useNativeDriver: false,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [activeShift, borderPulse]);

  const borderColor = borderPulse.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(37,99,235,0.35)', 'rgba(59,130,246,0.9)'],
  });

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError('Not signed in');
      setWorker(null);
      setLoading(false);
      return;
    }

    let w: WorkerRow | null = null;
    try {
      const { data: workerData, error: wErr } = await supabase
        .from('workers')
        .select(
          'id, company_id, first_name, full_name, pay_type, pay_rate, ot_pay_rate, flat_weekly_rate, clients!left(abbreviation, name)'
        )
        .eq('user_id', user.id)
        .maybeSingle();

      if (wErr) {
        console.log('Worker load error:', wErr);
        setError(wErr.message || 'Worker profile not found');
        setWorker(null);
        setLoading(false);
        return;
      }
      if (!workerData) {
        setError('Worker profile not found');
        setWorker(null);
        setLoading(false);
        return;
      }
      w = workerData as WorkerRow;
      setWorker(w);
    } catch (e) {
      console.log('Worker load error:', e);
      setError('Worker profile not found');
      setWorker(null);
      setLoading(false);
      return;
    }

    const workerId = w.id;

    try {
      const { data: co } = await supabase
        .from('companies')
        .select('name')
        .eq('id', w.company_id)
        .maybeSingle();
      setCompanyAbbr(abbrevCompany(co?.name as string | undefined));
    } catch (e) {
      console.log('Company load error:', e);
    }

    try {
      const today = new Date().toISOString().slice(0, 10);
      const { data: pp } = await supabase
        .from('pay_periods')
        .select('start_date, end_date')
        .eq('company_id', w.company_id)
        .lte('start_date', today)
        .gte('end_date', today)
        .maybeSingle();

      if (pp?.start_date && pp?.end_date) {
        const a = new Date(pp.start_date as string);
        const b = new Date(pp.end_date as string);
        setPayPeriodLabel(
          `${a.toLocaleDateString([], { month: 'short', day: 'numeric' })} – ${b.toLocaleDateString([], { month: 'short', day: 'numeric' })}`
        );
      } else {
        setPayPeriodLabel('—');
      }
    } catch (e) {
      console.log('Pay period load error:', e);
      setPayPeriodLabel('—');
    }

    const { monday, sunday } = weekRange();

    try {
      const { data: shiftData, error: activeErr } = await supabase
        .from('shifts')
        .select(
          'id, clock_in, clock_out, status, total_hours, created_at, meal_breaks, edit_status, clients(abbreviation)'
        )
        .eq('worker_id', workerId)
        .eq('status', 'active')
        .is('clock_out', null)
        .order('clock_in', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (activeErr) {
        setActiveShift(null);
      } else {
        const row = shiftData as unknown as ShiftRow | null;
        setActiveShift(row && row.status === 'active' ? row : null);
      }
    } catch {
      setActiveShift(null);
    }

    try {
      const { data: recentData, error: recentErr } = await supabase
        .from('shifts')
        .select(
          'id, clock_in, clock_out, status, total_hours, created_at, meal_breaks, edit_status, clients(abbreviation)'
        )
        .eq('worker_id', workerId)
        .gte('clock_in', monday.toISOString())
        .lte('clock_in', sunday.toISOString())
        .order('clock_in', { ascending: false })
        .limit(3);

      if (recentErr) {
        setRecentShifts([]);
      } else {
        setRecentShifts((recentData as unknown as ShiftRow[]) || []);
      }
    } catch {
      setRecentShifts([]);
    }

    try {
      const { data: weekData, error: weekErr } = await supabase
        .from('shifts')
        .select('clock_in, clock_out, meal_breaks, total_hours, regular_hours, ot_hours')
        .eq('worker_id', workerId)
        .gte('clock_in', monday.toISOString())
        .lte('clock_in', sunday.toISOString());

      if (weekErr || !w) {
        setWeekHours(0);
        setRegularHrs(0);
        setOtHrs(0);
        setEstPay(0);
      } else {
        const completedWeek = (weekData || []).filter((row) => row.clock_out);
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
        setRegularHrs(totals.regularHours);
        setOtHrs(totals.otHours);
        setEstPay(totals.grossPay);
      }
    } catch {
      setWeekHours(0);
      setRegularHrs(0);
      setOtHrs(0);
      setEstPay(0);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!activeShift) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [activeShift]);

  const firstName = useMemo(() => {
    if (!worker) return 'Driver';
    if (worker.first_name?.trim()) return worker.first_name.trim();
    if (worker.full_name?.trim()) return worker.full_name.trim().split(/\s+/)[0]!;
    return 'Driver';
  }, [worker]);

  const openMeal = activeShift
    ? getOpenMealBreak(activeShift.meal_breaks)
    : null;

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

  const startMeal = async () => {
    if (!activeShift || actionBusy || openMeal) return;
    setActionBusy(true);
    try {
      const next = appendMealStart(activeShift.meal_breaks);
      const { error: upErr } = await supabase
        .from('shifts')
        .update({ meal_breaks: next as unknown as MealBreak[] })
        .eq('id', activeShift.id);
      if (upErr) throw upErr;
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start break');
    } finally {
      setActionBusy(false);
    }
  };

  const endMeal = async () => {
    if (!activeShift || actionBusy || !openMeal) return;
    setActionBusy(true);
    try {
      const next = closeLastOpenMeal(activeShift.meal_breaks);
      const { error: upErr } = await supabase
        .from('shifts')
        .update({ meal_breaks: next as unknown as MealBreak[] })
        .eq('id', activeShift.id);
      if (upErr) throw upErr;
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not end break');
    } finally {
      setActionBusy(false);
    }
  };

  const shiftStatusUi = (sh: ShiftRow) => {
    if (sh.status === 'active') {
      return { kind: 'active' as const };
    }
    if (sh.edit_status === 'pending') {
      return { kind: 'pending_edit' as const };
    }
    if (sh.status === 'approved') {
      return { kind: 'approved' as const };
    }
    if (sh.status === 'completed') {
      return { kind: 'completed' as const };
    }
    return { kind: 'completed' as const };
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.skeletonPad}>
          <View style={styles.skBlock} />
          <View style={[styles.skBlock, { height: 160 }]} />
          <View style={[styles.skRow, { height: 72 }]} />
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
      {!online ? <OfflineBanner /> : null}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hexHeroContainer}>
          <View style={styles.hexHeroInner}>
            <HexLogo
              size={110}
              glowColor={
                activeShift && !openMeal
                  ? '#22C55E'
                  : openMeal
                    ? '#F59E0B'
                    : '#2563EB'
              }
              ringColor={
                activeShift && !openMeal
                  ? '#22C55E'
                  : openMeal
                    ? '#F59E0B'
                    : '#2563EB'
              }
              animated
            />
            <Text style={styles.liveClock}>{currentTime}</Text>
            <Text style={styles.liveDate}>{currentDate}</Text>
            <View style={styles.statusChip}>
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor: activeShift ? '#22C55E' : '#4E6D92',
                  },
                ]}
              />
              <Text style={styles.statusChipText}>
                {activeShift && !openMeal
                  ? 'ON SHIFT'
                  : openMeal
                    ? 'ON BREAK'
                    : 'OFF SHIFT'}
              </Text>
            </View>
            {workerClientAbbrev(worker) ? (
              <View style={styles.heroClientChip}>
                <ClientChip
                  abbreviation={workerClientAbbrev(worker)!}
                  isActive={!!activeShift && !openMeal}
                />
              </View>
            ) : null}
          </View>
        </View>

        {worker && error ? (
          <View style={styles.inlineError}>
            <Text style={styles.errorTextSmall}>{error}</Text>
            <TouchableOpacity onPress={load}>
              <Text style={styles.retryLink}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.shiftCard}>
          {!activeShift ? (
            <>
              <Text style={styles.shiftHello}>{firstName}</Text>
              <View style={styles.clockIconWrap}>
                <Svg width={56} height={56} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z"
                    stroke="#4E6D92"
                    strokeWidth={1.5}
                  />
                  <Path
                    d="M12 6v6l4 2"
                    stroke="#4E6D92"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                  />
                </Svg>
              </View>
              <Text style={styles.shiftTitle}>Ready to Start?</Text>
              <Text style={styles.shiftSubtitle}>
                Tap clock in when you arrive at your location
              </Text>
              <Animated.View style={{ borderWidth: 2, borderColor: borderColor, borderRadius: 14 }}>
                <TouchableOpacity
                  style={styles.clockInBtn}
                  onPress={clockIn}
                  disabled={actionBusy}
                  activeOpacity={0.85}
                >
                  <Text style={styles.clockInBtnText}>CLOCK IN</Text>
                </TouchableOpacity>
              </Animated.View>
            </>
          ) : openMeal ? (
            <>
              <View style={styles.badgeRow}>
                <PulseDot color="#F59E0B" />
                <Text style={styles.breakBadge}>ON BREAK</Text>
              </View>
              <Text style={styles.elapsedBreak} key={tick}>
                {formatElapsed(openMeal.start)}
              </Text>
              <Text style={styles.shiftMuted}>
                Break started at{' '}
                {new Date(openMeal.start).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
              <TouchableOpacity
                style={styles.endMealBtn}
                onPress={endMeal}
                disabled={actionBusy}
              >
                <Text style={styles.endMealBtnText}>END MEAL</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.badgeRowRight}>
                <PulseDot color="#22C55E" />
                <Text style={styles.onShiftBadge}>ON SHIFT</Text>
              </View>
              <Text style={styles.elapsedOn} key={tick}>
                {formatElapsed(activeShift.clock_in)}
              </Text>
              <Text style={styles.shiftMuted}>
                Clocked in at{' '}
                {new Date(activeShift.clock_in).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
              <View style={styles.dualRow}>
                <TouchableOpacity
                  style={styles.mealBtn}
                  onPress={startMeal}
                  disabled={actionBusy}
                >
                  <Text style={styles.mealBtnText}>MEAL BREAK</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.clockOutBtn}
                  onPress={clockOut}
                  disabled={actionBusy}
                >
                  <Text style={styles.clockOutBtnText}>CLOCK OUT</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statMini}>
            <Text style={styles.statLabel}>This Week</Text>
            <Text style={styles.statValue}>{weekHours.toFixed(1)}</Text>
          </View>
          <View style={styles.statMini}>
            <Text style={styles.statLabel}>Regular</Text>
            <Text style={styles.statValue}>{regularHrs.toFixed(1)}</Text>
          </View>
          <View style={styles.statMini}>
            <Text style={styles.statLabel}>OT</Text>
            <Text style={styles.statValue}>{otHrs.toFixed(1)}</Text>
          </View>
          <View style={styles.statMini}>
            <Text style={styles.statLabel}>Pay Period</Text>
            <Text style={styles.statValueSmall}>{payPeriodLabel}</Text>
          </View>
        </View>

        <View style={styles.recentHeader}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <TouchableOpacity onPress={() => router.push('/(driver)/timecard')}>
            <Text style={styles.viewAll}>View All →</Text>
          </TouchableOpacity>
        </View>

        {recentShifts.length === 0 ? (
          <View style={styles.emptyRecent}>
            <MiniHexMuted />
            <Text style={styles.emptyRecentText}>No shifts yet this week</Text>
          </View>
        ) : (
          recentShifts.map((sh) => {
            const abbr =
              clientAbbrev(sh.clients) ??
              workerClientAbbrev(worker) ??
              companyAbbr;
            const d = new Date(sh.clock_in);
            const day = d.toLocaleDateString([], { weekday: 'short' }).toUpperCase();
            const tIn = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const tOut = sh.clock_out
              ? new Date(sh.clock_out).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : '—';
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
            const ui = shiftStatusUi(sh);
            return (
              <View key={sh.id} style={styles.recentCard}>
                <View style={[styles.dayCircle, { backgroundColor: dayCircleColor(d) }]}>
                  <Text style={styles.dayCircleText}>{day}</Text>
                </View>
                <View style={styles.recentMid}>
                  <View style={styles.clientChipSmall}>
                    <Text style={styles.clientChipSmallText}>{abbr}</Text>
                  </View>
                  <Text style={styles.timeRange}>
                    {tIn} → {tOut}
                  </Text>
                </View>
                <View style={styles.recentRight}>
                  <Text style={styles.hrsMono}>{hrs}h</Text>
                  {ui.kind === 'active' ? (
                    <View style={styles.badgeActiveRow}>
                      <PulseDot color="#22C55E" />
                      <Text style={styles.badgeActiveText}>LIVE</Text>
                    </View>
                  ) : ui.kind === 'pending_edit' ? (
                    <View style={styles.badgePending}>
                      <Text style={styles.badgePendingText}>PENDING</Text>
                    </View>
                  ) : ui.kind === 'approved' ? (
                    <View style={styles.badgeApproved}>
                      <Text style={styles.badgeApprovedText}>APPROVED</Text>
                    </View>
                  ) : (
                    <Text style={styles.badgeMuted}>Done</Text>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#03060D',
  },
  scrollView: { flex: 1 },
  content: {
    padding: 20,
    paddingBottom: 32,
    gap: 16,
  },
  hexHeroContainer: {
    width: '100%',
    marginBottom: 4,
  },
  hexHeroInner: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 8,
  },
  liveClock: {
    fontSize: 32,
    fontWeight: '800',
    color: '#F1F5FF',
    fontFamily: theme.mono800,
    marginTop: 12,
    letterSpacing: 2,
  },
  liveDate: {
    fontSize: 13,
    color: '#4E6D92',
    fontFamily: theme.body,
    marginTop: 4,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 10,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusChipText: {
    fontFamily: theme.bodyMedium,
    fontSize: 11,
    color: '#F1F5FF',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  heroClientChip: {
    marginTop: 12,
  },
  shiftHello: {
    fontSize: 14,
    color: '#4E6D92',
    fontFamily: theme.body,
    textAlign: 'center',
    marginBottom: 8,
  },
  shiftCard: {
    backgroundColor: '#0A1628',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  clockIconWrap: {
    alignSelf: 'center',
    marginBottom: 8,
  },
  shiftTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F1F5FF',
    fontFamily: theme.bodyMedium,
    textAlign: 'center',
  },
  shiftSubtitle: {
    fontSize: 13,
    color: '#4E6D92',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
    fontFamily: theme.body,
  },
  clockInBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clockInBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: theme.bodyMedium,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  badgeRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-end',
    marginBottom: 12,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  onShiftBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#22C55E',
    fontFamily: theme.bodyMedium,
    letterSpacing: 0.5,
  },
  breakBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F59E0B',
    fontFamily: theme.bodyMedium,
    letterSpacing: 0.5,
  },
  elapsedOn: {
    fontSize: 36,
    fontWeight: '800',
    color: '#22C55E',
    fontFamily: theme.mono800,
    textAlign: 'center',
  },
  elapsedBreak: {
    fontSize: 36,
    fontWeight: '800',
    color: '#F59E0B',
    fontFamily: theme.mono800,
    textAlign: 'center',
  },
  shiftMuted: {
    fontSize: 13,
    color: '#4E6D92',
    textAlign: 'center',
    marginTop: 8,
    fontFamily: theme.body,
  },
  dualRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  mealBtn: {
    flex: 1,
    backgroundColor: '#F59E0B',
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealBtnText: {
    color: '#03060D',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: theme.bodyMedium,
  },
  clockOutBtn: {
    flex: 1,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clockOutBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: theme.bodyMedium,
  },
  endMealBtn: {
    backgroundColor: '#22C55E',
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  endMealBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: theme.bodyMedium,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statMini: {
    flex: 1,
    backgroundColor: '#060B14',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  statLabel: {
    fontSize: 10,
    color: '#4E6D92',
    fontFamily: theme.body,
    marginBottom: 6,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F1F5FF',
    fontFamily: theme.mono700,
  },
  statValueSmall: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F1F5FF',
    fontFamily: theme.mono700,
    lineHeight: 14,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#F1F5FF',
    fontFamily: theme.bodyMedium,
  },
  viewAll: {
    fontSize: 13,
    color: '#3B82F6',
    fontFamily: theme.bodyMedium,
  },
  emptyRecent: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 12,
  },
  emptyRecentText: {
    fontSize: 14,
    color: '#4E6D92',
    fontFamily: theme.body,
  },
  recentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#060B14',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: 12,
  },
  dayCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
    fontFamily: theme.mono700,
  },
  recentMid: {
    flex: 1,
    gap: 4,
  },
  clientChipSmall: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(37,99,235,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.25)',
  },
  clientChipSmallText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#3B82F6',
    fontFamily: theme.bodyMedium,
  },
  timeRange: {
    fontSize: 13,
    color: '#F1F5FF',
    fontFamily: theme.mono500,
  },
  recentRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  hrsMono: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F1F5FF',
    fontFamily: theme.mono700,
  },
  badgeActiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badgeActiveText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#22C55E',
    fontFamily: theme.bodyMedium,
  },
  badgePending: {
    backgroundColor: 'rgba(245,158,11,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgePendingText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#F59E0B',
    fontFamily: theme.bodyMedium,
  },
  badgeApproved: {
    backgroundColor: 'rgba(59,130,246,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeApprovedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#3B82F6',
    fontFamily: theme.bodyMedium,
  },
  badgeMuted: {
    fontSize: 11,
    color: '#4E6D92',
    fontFamily: theme.body,
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
  skRow: {
    flexDirection: 'row',
    gap: 8,
    borderRadius: 14,
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
    color: '#EF4444',
    textAlign: 'center',
    fontFamily: theme.body,
  },
  errorTextSmall: {
    color: '#EF4444',
    fontSize: 13,
    fontFamily: theme.body,
    flex: 1,
  },
  retryBtn: {
    backgroundColor: '#2563EB',
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
    color: '#3B82F6',
    fontWeight: '700',
    fontFamily: theme.bodyMedium,
  },
});

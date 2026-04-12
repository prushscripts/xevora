import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
  ListRenderItem,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Svg, { Path, Rect, Circle, Line, Text as SvgText } from 'react-native-svg';
import { supabase } from '../../lib/supabase';
import { calculateShiftHours, calculateWeeklyTotals } from '../../lib/payroll';
import { getOpenMealBreak } from '../../lib/shiftMeal';

const BG = '#03060D';
const CARD = '#0A1628';
const BORDER = 'rgba(255,255,255,0.06)';
const MUTED = '#4E6D92';
const TEXT = '#F1F5FF';
const PRIMARY = '#2563EB';
const GREEN = '#22C55E';
const AMBER = '#F59E0B';

function startOfMonday(d: Date): Date {
  const x = new Date(d);
  const day = x.getDay();
  const diff = day === 0 ? 6 : day - 1;
  x.setDate(x.getDate() - diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function sameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function shiftHours(
  clockIn: string,
  clockOut: string | null,
  meal: unknown
): number {
  const end = clockOut ? new Date(clockOut) : new Date();
  const { totalHours } = calculateShiftHours(
    new Date(clockIn),
    end,
    meal as Parameters<typeof calculateShiftHours>[2]
  );
  return totalHours;
}

type ClockedRow = {
  shiftId: string;
  workerId: string;
  name: string;
  hoursToday: string;
  onBreak: boolean;
};

type PayrollRow = {
  workerId: string;
  name: string;
  workerType: string;
  gross: number;
  status: string;
};

type ShiftRow = {
  id: string;
  worker_id: string;
  clock_in: string;
  clock_out: string | null;
  status: string;
  meal_breaks: unknown;
  total_hours: number | null;
  workers: { full_name: string | null; first_name: string | null } | null;
};

function workerName(w: { full_name: string | null; first_name: string | null } | null): string {
  if (!w) return 'Worker';
  if (w.full_name?.trim()) return w.full_name.trim();
  if (w.first_name?.trim()) return w.first_name.trim();
  return 'Worker';
}

function BellIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M13.73 21a2 2 0 0 1-3.46 0"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function GearIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={3} stroke={color} strokeWidth={2} />
      <Path
        d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function LaborChart({
  dayHours,
  selectedDay,
}: {
  dayHours: number[];
  selectedDay: number;
}) {
  const w = Dimensions.get('window').width - 40;
  const h = 140;
  const padL = 28;
  const padB = 22;
  const chartW = w - padL;
  const chartH = h - padB;
  const max = Math.max(1, ...dayHours, 8);
  const barW = (chartW / 7) * 0.55;
  const gap = chartW / 7;
  const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <Svg width={w} height={h}>
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const y = chartH * (1 - t);
        const hr = Math.round(max * t);
        return (
          <React.Fragment key={t}>
            <Line
              x1={padL}
              y1={y}
              x2={w}
              y2={y}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={1}
            />
            <SvgText
              x={4}
              y={y + 4}
              fill={MUTED}
              fontSize={9}
              fontFamily="JetBrainsMono_400Regular"
            >
              {hr}h
            </SvgText>
          </React.Fragment>
        );
      })}
      {dayHours.map((hrs, i) => {
        const bh = (hrs / max) * chartH;
        const x = padL + i * gap + (gap - barW) / 2;
        const y = chartH - bh;
        const fill = i === selectedDay ? '#3B82F6' : PRIMARY;
        return <Rect key={i} x={x} y={y} width={barW} height={Math.max(bh, 2)} rx={4} fill={fill} />;
      })}
      {labels.map((lb, i) => (
        <SvgText
          key={lb + i}
          x={padL + i * gap + gap / 2 - 4}
          y={h - 4}
          fill={MUTED}
          fontSize={10}
          fontFamily="JetBrainsMono_400Regular"
        >
          {lb}
        </SvgText>
      ))}
    </Svg>
  );
}

export default function AdminDashboardScreen() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState('Company');
  const [activeCount, setActiveCount] = useState(0);
  const [weekHours, setWeekHours] = useState(0);
  const [lastWeekHours, setLastWeekHours] = useState(0);
  const [nextPayroll, setNextPayroll] = useState(0);
  const [nextPayDue, setNextPayDue] = useState('—');
  const [ytdPaid, setYtdPaid] = useState(0);
  const [clockedRows, setClockedRows] = useState<ClockedRow[]>([]);
  const [payrollRows, setPayrollRows] = useState<PayrollRow[]>([]);
  const [periodLabel, setPeriodLabel] = useState('This period');
  const [dayHours, setDayHours] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [tick, setTick] = useState(0);
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const selectedDay = today.getDay() === 0 ? 6 : today.getDay() - 1;

  const loadDashboard = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: me } = await supabase
        .from('workers')
        .select('company_id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!me?.company_id) return;
      const cid = me.company_id as string;
      setCompanyId(cid);

      const { data: co } = await supabase
        .from('companies')
        .select('name')
        .eq('id', cid)
        .maybeSingle();
      if (co?.name) setCompanyName(co.name as string);

      const mon = startOfMonday(new Date());
      const sun = addDays(mon, 6);
      sun.setHours(23, 59, 59, 999);
      const pMon = addDays(mon, -7);
      const pSun = addDays(mon, -1);
      pSun.setHours(23, 59, 59, 999);
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data: activeShifts } = await supabase
        .from('shifts')
        .select(
          'id, worker_id, clock_in, clock_out, status, meal_breaks, total_hours, workers(full_name, first_name)'
        )
        .eq('company_id', cid)
        .is('clock_out', null)
        .eq('status', 'active');

      const act = (activeShifts as unknown as ShiftRow[]) || [];
      setActiveCount(new Set(act.map((s) => s.worker_id)).size);

      const { data: todayAll } = await supabase
        .from('shifts')
        .select('worker_id, clock_in, clock_out, total_hours, meal_breaks')
        .eq('company_id', cid)
        .gte('clock_in', todayStart.toISOString());
      const hrsByWorker = new Map<string, number>();
      for (const t of todayAll || []) {
        const wid = t.worker_id as string;
        const h = shiftHours(t.clock_in, t.clock_out, t.meal_breaks);
        hrsByWorker.set(wid, (hrsByWorker.get(wid) ?? 0) + h);
      }

      const rows: ClockedRow[] = [];
      for (const s of act) {
        const openMeal = getOpenMealBreak(
          s.meal_breaks as Parameters<typeof getOpenMealBreak>[0]
        );
        const hrsToday = hrsByWorker.get(s.worker_id) ?? 0;
        rows.push({
          shiftId: s.id,
          workerId: s.worker_id,
          name: workerName(s.workers),
          hoursToday: hrsToday.toFixed(1),
          onBreak: !!openMeal,
        });
      }
      setClockedRows(rows);

      const { data: weekList } = await supabase
        .from('shifts')
        .select('clock_in, clock_out, total_hours, meal_breaks')
        .eq('company_id', cid)
        .gte('clock_in', mon.toISOString())
        .lte('clock_in', sun.toISOString());

      let wh = 0;
      const dh = [0, 0, 0, 0, 0, 0, 0];
      for (const s of weekList || []) {
        const h = shiftHours(s.clock_in, s.clock_out, s.meal_breaks);
        wh += h;
        const d = new Date(s.clock_in);
        const idx = d.getDay() === 0 ? 6 : d.getDay() - 1;
        dh[idx] += h;
      }
      setWeekHours(Math.round(wh * 10) / 10);
      setDayHours(dh.map((x) => Math.round(x * 10) / 10));

      const { data: prevList } = await supabase
        .from('shifts')
        .select('clock_in, clock_out, total_hours, meal_breaks')
        .eq('company_id', cid)
        .gte('clock_in', pMon.toISOString())
        .lte('clock_in', pSun.toISOString());
      let ph = 0;
      for (const s of prevList || []) {
        ph += shiftHours(s.clock_in, s.clock_out, s.meal_breaks);
      }
      setLastWeekHours(Math.round(ph * 10) / 10);

      const todayStr = new Date().toISOString().slice(0, 10);
      const { data: curPeriod } = await supabase
        .from('pay_periods')
        .select('id, start_date, end_date')
        .eq('company_id', cid)
        .lte('start_date', todayStr)
        .gte('end_date', todayStr)
        .maybeSingle();

      if (curPeriod) {
        const a = new Date(curPeriod.start_date as string);
        const b = new Date(curPeriod.end_date as string);
        setPeriodLabel(
          `${a.toLocaleDateString([], { month: 'short', day: 'numeric' })} – ${b.toLocaleDateString([], { month: 'short', day: 'numeric' })}`
        );
        setNextPayDue(
          b.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })
        );

        const { data: sums } = await supabase
          .from('weekly_summaries')
          .select('final_approved_pay, status')
          .eq('company_id', cid)
          .eq('pay_period_id', curPeriod.id);

        let draft = 0;
        for (const r of sums || []) {
          draft += Number(r.final_approved_pay) || 0;
        }
        setNextPayroll(Math.round(draft * 100) / 100);

        const { data: workers } = await supabase
          .from('workers')
          .select(
            'id, full_name, first_name, worker_type, pay_rate, ot_pay_rate, pay_type, flat_weekly_rate, role'
          )
          .eq('company_id', cid)
          .eq('role', 'driver');

        const { data: periodShifts } = await supabase
          .from('shifts')
          .select('worker_id, clock_in, clock_out, total_hours, meal_breaks')
          .eq('company_id', cid)
          .gte('clock_in', new Date(curPeriod.start_date + 'T00:00:00').toISOString())
          .lte(
            'clock_in',
            new Date(new Date(curPeriod.end_date + 'T00:00:00').getTime() + 86400000 - 1).toISOString()
          );

        const { data: wsRows } = await supabase
          .from('weekly_summaries')
          .select('worker_id, final_approved_pay, status')
          .eq('company_id', cid)
          .eq('pay_period_id', curPeriod.id);

        const wsMap = new Map(
          (wsRows || []).map((r) => [
            r.worker_id as string,
            { gross: Number(r.final_approved_pay) || 0, status: r.status as string },
          ])
        );

        const pr: PayrollRow[] = [];
        for (const w of workers || []) {
          const wid = w.id as string;
          const myShifts = (periodShifts || []).filter((s) => s.worker_id === wid);
          const totals = myShifts
            .filter((s) => s.clock_out)
            .map((s) => ({
              totalHours: shiftHours(s.clock_in, s.clock_out, s.meal_breaks),
            }));
          const est = calculateWeeklyTotals({
            shifts: totals,
            worker: {
              pay_type: (w.pay_type as 'hourly' | 'flat_weekly') || 'hourly',
              pay_rate: w.pay_rate as number | null,
              ot_pay_rate: w.ot_pay_rate as number | null,
              flat_weekly_rate: w.flat_weekly_rate as number | null,
            },
            workerClient: { billing_rate: 0, ot_billing_rate: 0 },
            otWeeklyThreshold: 40,
          });
          const existing = wsMap.get(wid);
          const gross = existing?.gross ?? est.grossPay;
          let status = 'Ready';
          if (existing?.status === 'pending') status = 'Pending';
          else if (existing?.status === 'approved' || existing?.status === 'locked') {
            status = 'Approved';
          } else if (totals.length === 0) status = 'Pending';
          pr.push({
            workerId: wid,
            name: workerName(w),
            workerType: (w.worker_type as string) || '1099',
            gross: Math.round(gross * 100) / 100,
            status,
          });
        }
        setPayrollRows(pr);
      } else {
        setPeriodLabel('No open period');
        setNextPayroll(0);
        setNextPayDue('—');
        setPayrollRows([]);
      }

      const yStart = new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10);
      const { data: ytdRows } = await supabase
        .from('weekly_summaries')
        .select('final_approved_pay, status, created_at')
        .eq('company_id', cid)
        .gte('created_at', yStart + 'T00:00:00')
        .in('status', ['approved', 'locked']);

      let ytd = 0;
      for (const r of ytdRows || []) {
        ytd += Number(r.final_approved_pay) || 0;
      }
      setYtdPaid(Math.round(ytd * 100) / 100);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (!companyId) return;
    const ch = supabase
      .channel(`admin-shifts-${companyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shifts',
          filter: `company_id=eq.${companyId}`,
        },
        () => {
          void loadDashboard();
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [companyId, loadDashboard]);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  const hour = new Date().getHours();
  const greet =
    hour < 12 ? 'Good morning,' : hour < 17 ? 'Good afternoon,' : 'Good evening,';

  const pctVsLast = useMemo(() => {
    if (lastWeekHours <= 0) return weekHours > 0 ? 100 : 0;
    return Math.round(((weekHours - lastWeekHours) / lastWeekHours) * 100);
  }, [weekHours, lastWeekHours]);

  const liveTime = useMemo(
    () =>
      new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    [tick]
  );

  const renderClocked: ListRenderItem<ClockedRow> = ({ item }) => (
    <View style={styles.workerRow}>
      <Text style={styles.workerName}>{item.name}</Text>
      <Text style={styles.workerHrs}>{item.hoursToday}h</Text>
      <View
        style={[
          styles.pill,
          item.onBreak ? styles.pillAmber : styles.pillGreen,
        ]}
      >
        <Text style={styles.pillText}>
          {item.onBreak ? 'On Break' : 'Clocked In'}
        </Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.skel} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={clockedRows}
        keyExtractor={(it) => it.shiftId}
        renderItem={renderClocked}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            <View style={styles.topBar}>
              <View>
                <Text style={styles.greet}>{greet}</Text>
                <Text style={styles.company}>{companyName}</Text>
              </View>
              <View style={styles.icons}>
                <TouchableOpacity style={styles.iconBtn} hitSlop={12}>
                  <BellIcon color={MUTED} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.iconBtn}
                  hitSlop={12}
                  onPress={() => router.push('/(admin)/settings')}
                >
                  <GearIcon color={MUTED} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.statRow}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>ACTIVE WORKERS</Text>
                <Text style={styles.statValue}>{activeCount}</Text>
                <Text style={styles.statSub}>
                  <Text style={styles.statUp}>{activeCount}</Text> clocked in
                </Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>HOURS THIS WEEK</Text>
                <Text style={styles.statValue}>{weekHours.toFixed(1)}</Text>
                <Text style={styles.statSub}>
                  <Text style={{ color: pctVsLast >= 0 ? GREEN : '#EF4444' }}>
                    {pctVsLast >= 0 ? '↑' : '↓'} {Math.abs(pctVsLast)}%
                  </Text>{' '}
                  vs last
                </Text>
              </View>
            </View>

            <View style={styles.statRow}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>NEXT PAYROLL</Text>
                <Text style={styles.statValue}>
                  ${nextPayroll.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </Text>
                <Text style={styles.statSub}>Due {nextPayDue}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>YTD PAID OUT</Text>
                <Text style={styles.statValue}>
                  ${ytdPaid.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </Text>
                <Text style={styles.statSub}>On track</Text>
              </View>
            </View>

            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Workers — Clocked In</Text>
              <View style={styles.liveChip}>
                <Text style={styles.liveChipText}>{activeCount} Active</Text>
              </View>
            </View>

            {clockedRows.length > 0 ? (
              <View style={styles.liveRow}>
                <View style={styles.pulse} />
                <Text style={styles.liveText}>Live tracking enabled</Text>
                <Text style={styles.liveTime}>{liveTime}</Text>
              </View>
            ) : null}
          </>
        }
        ListEmptyComponent={
          <Text style={styles.emptyClocked}>No workers currently clocked in</Text>
        }
        ListFooterComponent={
          <>
            <View style={[styles.sectionHead, { marginTop: 24 }]}>
              <Text style={styles.sectionTitle}>Payroll — This Period</Text>
              <View style={styles.draftChip}>
                <Text style={styles.draftChipText}>Draft</Text>
              </View>
            </View>
            <Text style={styles.periodMuted}>{periodLabel}</Text>
            {payrollRows.map((p) => (
              <View key={p.workerId} style={styles.payRow}>
                <View>
                  <Text style={styles.payName}>{p.name}</Text>
                  <View style={styles.typeBadge}>
                    <Text style={styles.typeBadgeText}>{p.workerType}</Text>
                  </View>
                </View>
                <View style={styles.payRight}>
                  <Text style={styles.payGross}>
                    ${p.gross.toFixed(2)}
                  </Text>
                  <Text style={styles.payStatus}>{p.status}</Text>
                </View>
              </View>
            ))}

            <Text style={[styles.sectionTitle, { marginTop: 28, marginBottom: 12 }]}>
              Weekly labor cost
            </Text>
            <LaborChart dayHours={dayHours} selectedDay={selectedDay} />
          </>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  listContent: { padding: 20, paddingBottom: 40 },
  skel: {
    margin: 20,
    flex: 1,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  greet: {
    fontSize: 13,
    color: MUTED,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  company: {
    fontSize: 20,
    fontWeight: '800',
    color: TEXT,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    marginTop: 4,
  },
  icons: { flexDirection: 'row', gap: 16 },
  iconBtn: { padding: 4 },
  statRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  statCard: {
    flex: 1,
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  statLabel: {
    fontSize: 10,
    color: MUTED,
    fontFamily: 'JetBrainsMono_400Regular',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: TEXT,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
  },
  statSub: {
    fontSize: 12,
    color: MUTED,
    marginTop: 6,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  statUp: { color: GREEN, fontWeight: '700' },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: TEXT,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  liveChip: {
    backgroundColor: 'rgba(34,197,94,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  liveChipText: {
    color: GREEN,
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  draftChip: {
    backgroundColor: 'rgba(37,99,235,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  draftChipText: {
    color: PRIMARY,
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  pulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: GREEN,
  },
  liveText: {
    flex: 1,
    color: MUTED,
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  liveTime: {
    color: TEXT,
    fontSize: 12,
    fontFamily: 'JetBrainsMono_400Regular',
  },
  workerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: BORDER,
    gap: 10,
  },
  workerName: {
    flex: 1,
    color: TEXT,
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  workerHrs: {
    color: TEXT,
    fontSize: 14,
    fontFamily: 'JetBrainsMono_500Medium',
    marginRight: 8,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  pillGreen: { backgroundColor: 'rgba(34,197,94,0.2)' },
  pillAmber: { backgroundColor: 'rgba(245,158,11,0.2)' },
  pillText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
    color: TEXT,
  },
  emptyClocked: {
    color: MUTED,
    textAlign: 'center',
    paddingVertical: 20,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  periodMuted: {
    color: MUTED,
    fontSize: 12,
    marginBottom: 12,
    fontFamily: 'JetBrainsMono_400Regular',
  },
  payRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: BORDER,
  },
  payName: {
    color: TEXT,
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  typeBadge: {
    alignSelf: 'flex-start',
    marginTop: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeBadgeText: {
    fontSize: 10,
    color: MUTED,
    fontFamily: 'JetBrainsMono_400Regular',
  },
  payRight: { alignItems: 'flex-end' },
  payGross: {
    color: TEXT,
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'JetBrainsMono_700Bold',
  },
  payStatus: {
    color: MUTED,
    fontSize: 11,
    marginTop: 4,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
});

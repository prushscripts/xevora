import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ListRenderItem,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { OfflineBanner } from '../../components/OfflineBanner';
import { theme } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import {
  calculateShiftHours,
  calculateWeeklyTotals,
  type MealBreak,
} from '../../lib/payroll';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

type PayPeriod = {
  id: string;
  start_date: string;
  end_date: string;
  status: string;
};

type WeeklySummary = {
  pay_period_id: string;
  total_hours: number;
  regular_hours: number;
  ot_hours: number;
  final_approved_pay: number;
  ot_bonus_amount: number;
  status: string;
  flat_weekly_rate: number | null;
};

type ShiftLite = {
  clock_in: string;
  clock_out: string | null;
  meal_breaks: MealBreak[] | null;
  total_hours: number | null;
};

function periodLabel(p: PayPeriod): string {
  const a = new Date(p.start_date);
  const b = new Date(p.end_date);
  return `${a.toLocaleDateString([], { month: 'short', day: 'numeric' })} – ${b.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

function payStatus(period: PayPeriod, summary: WeeklySummary | undefined): string {
  if (period.status === 'paid') return 'PAID';
  if (!summary) return 'OPEN';
  if (summary.status === 'pending') return 'PENDING APPROVAL';
  if (summary.status === 'approved' || summary.status === 'locked') return 'APPROVED';
  return 'OPEN';
}

type HistoryRow = { period: PayPeriod; summary?: WeeklySummary };

export default function PayScreen() {
  const online = useOnlineStatus();
  const [worker, setWorker] = useState<{
    id: string;
    company_id: string;
    pay_type: string | null;
    pay_rate: number | null;
    ot_pay_rate: number | null;
    flat_weekly_rate: number | null;
  } | null>(null);
  const [periods, setPeriods] = useState<PayPeriod[]>([]);
  const [summaries, setSummaries] = useState<WeeklySummary[]>([]);
  const [currentShifts, setCurrentShifts] = useState<ShiftLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const summaryByPeriod = useMemo(() => {
    const m = new Map<string, WeeklySummary>();
    for (const s of summaries) m.set(s.pay_period_id, s);
    return m;
  }, [summaries]);

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
        .select('id, company_id, pay_type, pay_rate, ot_pay_rate, flat_weekly_rate')
        .eq('user_id', user.id)
        .single();
      if (wErr || !w) {
        setError(wErr?.message || 'Worker not found');
        setLoading(false);
        return;
      }
      setWorker({
        id: w.id,
        company_id: w.company_id,
        pay_type: w.pay_type as string | null,
        pay_rate: w.pay_rate as number | null,
        ot_pay_rate: w.ot_pay_rate as number | null,
        flat_weekly_rate: w.flat_weekly_rate as number | null,
      });

      const { data: pp, error: pErr } = await supabase
        .from('pay_periods')
        .select('id, start_date, end_date, status')
        .eq('company_id', w.company_id)
        .order('start_date', { ascending: false })
        .limit(24);
      if (pErr) throw pErr;
      const plist = (pp as PayPeriod[]) || [];
      setPeriods(plist);

      if (plist.length === 0) {
        setSummaries([]);
        setCurrentShifts([]);
        setLoading(false);
        return;
      }

      const ids = plist.map((p) => p.id);
      const { data: ws, error: wsErr } = await supabase
        .from('weekly_summaries')
        .select(
          'pay_period_id, total_hours, regular_hours, ot_hours, final_approved_pay, ot_bonus_amount, status, flat_weekly_rate'
        )
        .eq('worker_id', w.id)
        .in('pay_period_id', ids);
      if (wsErr) throw wsErr;
      setSummaries((ws as WeeklySummary[]) || []);

      const today = new Date().toISOString().slice(0, 10);
      const current = plist.find(
        (p) => p.start_date <= today && p.end_date >= today
      );
      if (current) {
        const startIso = new Date(current.start_date + 'T00:00:00').toISOString();
        const endD = new Date(current.end_date + 'T00:00:00');
        endD.setHours(23, 59, 59, 999);
        const endIso = endD.toISOString();
        const { data: sh, error: shErr } = await supabase
          .from('shifts')
          .select('clock_in, clock_out, meal_breaks, total_hours')
          .eq('worker_id', w.id)
          .gte('clock_in', startIso)
          .lte('clock_in', endIso);
        if (shErr) throw shErr;
        setCurrentShifts((sh as ShiftLite[]) || []);
      } else {
        setCurrentShifts([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load pay');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const todayStr = new Date().toISOString().slice(0, 10);
  const currentPeriod = periods.find(
    (p) => p.start_date <= todayStr && p.end_date >= todayStr
  );
  const currentSummary = currentPeriod
    ? summaryByPeriod.get(currentPeriod.id)
    : undefined;

  const derived = useMemo(() => {
    if (!worker) {
      return {
        regH: 0,
        otH: 0,
        totalH: 0,
        regPay: 0,
        otPay: 0,
        gross: 0,
        otBonus: 0,
        flat: 0,
      };
    }
    const completed = currentShifts.filter((s) => s.clock_out);
    const shiftTotals = completed.map((row) => {
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
        pay_type: (worker.pay_type as 'hourly' | 'flat_weekly') || 'hourly',
        pay_rate: worker.pay_rate,
        ot_pay_rate: worker.ot_pay_rate,
        flat_weekly_rate: worker.flat_weekly_rate,
      },
      workerClient: { billing_rate: 0, ot_billing_rate: 0 },
      otWeeklyThreshold: 40,
    });
    const pr = Number(worker.pay_rate) || 0;
    const otr = worker.ot_pay_rate != null ? Number(worker.ot_pay_rate) : pr * 1.5;
    const regPay = totals.regularHours * pr;
    const otPay = totals.otHours * otr;
    const otBonus = Number(currentSummary?.ot_bonus_amount) || 0;
    const flat = Number(worker.flat_weekly_rate) || 0;
    const gross =
      worker.pay_type === 'flat_weekly'
        ? flat + otBonus
        : regPay + otPay + otBonus;
    return {
      regH: totals.regularHours,
      otH: totals.otHours,
      totalH: totals.totalHours,
      regPay,
      otPay,
      gross: Math.round(gross * 100) / 100,
      otBonus,
      flat: worker.pay_type === 'flat_weekly' ? flat : 0,
    };
  }, [worker, currentShifts, currentSummary]);

  const displayStatus = currentPeriod
    ? payStatus(currentPeriod, currentSummary)
    : 'OPEN';

  const historyData: HistoryRow[] = useMemo(() => {
    const t = new Date().toISOString().slice(0, 10);
    const curId = periods.find(
      (p) => p.start_date <= t && p.end_date >= t
    )?.id;
    return periods
      .filter((p) => p.id !== curId)
      .map((p) => ({ period: p, summary: summaryByPeriod.get(p.id) }));
  }, [periods, summaryByPeriod]);

  const renderHistoryRow: ListRenderItem<HistoryRow> = ({ item }) => {
    const { period, summary } = item;
    const open = expanded === period.id;
    const st = payStatus(period, summary);
    const pr = Number(worker?.pay_rate) || 0;
    const otr =
      worker?.ot_pay_rate != null ? Number(worker.ot_pay_rate) : pr * 1.5;
    const flat = Number(worker?.flat_weekly_rate) || 0;
    const regH = summary?.regular_hours ?? 0;
    const otH = summary?.ot_hours ?? 0;
    const bonus = Number(summary?.ot_bonus_amount) || 0;
    const subtotal =
      worker?.pay_type === 'flat_weekly'
        ? flat + bonus
        : regH * pr + otH * otr + bonus;
    const total = summary?.final_approved_pay ?? subtotal;

    return (
      <View style={styles.accItem}>
        <TouchableOpacity
          style={styles.accHead}
          onPress={() => setExpanded(open ? null : period.id)}
        >
          <View>
            <Text style={styles.accRange}>{periodLabel(period)}</Text>
            <Text style={styles.accTotal}>${Number(total).toFixed(2)}</Text>
          </View>
          <View style={styles.accBadge}>
            <Text style={styles.accBadgeText}>{st}</Text>
          </View>
        </TouchableOpacity>
        {open ? (
          <View style={styles.accBody}>
            {worker?.pay_type === 'flat_weekly' ? (
              <>
                <Text style={styles.accLine}>Weekly contract base</Text>
                <Text style={styles.accAmt}>${flat.toFixed(2)}</Text>
                {bonus > 0 ? (
                  <>
                    <Text style={styles.accLine}>OT Bonus (approved)</Text>
                    <Text style={styles.accAmt}>+${bonus.toFixed(2)}</Text>
                  </>
                ) : null}
              </>
            ) : (
              <>
                <Text style={styles.accLine}>
                  Regular {regH.toFixed(1)} hrs × ${pr.toFixed(2)}
                </Text>
                <Text style={styles.accAmt}>${(regH * pr).toFixed(2)}</Text>
                <Text style={styles.accLine}>
                  OT {otH.toFixed(1)} hrs × ${otr.toFixed(2)}
                </Text>
                <Text style={styles.accAmt}>${(otH * otr).toFixed(2)}</Text>
                {bonus > 0 ? (
                  <>
                    <Text style={styles.accLine}>OT Bonus</Text>
                    <Text style={styles.accAmt}>+${bonus.toFixed(2)}</Text>
                  </>
                ) : null}
              </>
            )}
            <Text style={styles.accGrossLabel}>Period total</Text>
            <Text style={styles.accGross}>${Number(total).toFixed(2)}</Text>
          </View>
        ) : null}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <View style={styles.skelPad}>
          <View style={styles.skelHero} />
          <View style={styles.skelBlock} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar style="light" />
      {!online ? <OfflineBanner /> : null}

      {error ? (
        <View style={styles.errRow}>
          <Text style={styles.errText}>{error}</Text>
          <TouchableOpacity onPress={load}>
            <Text style={styles.retry}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <FlatList
        data={historyData}
        keyExtractor={(it) => it.period.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            <Text style={styles.screenTitle}>Pay</Text>
            <LinearGradient
              colors={['#0D1F45', '#060B14']}
              style={styles.hero}
            >
              <Text style={styles.heroDates}>
                {currentPeriod ? periodLabel(currentPeriod) : 'Pay period'}
              </Text>
              <View style={styles.statusPill}>
                <Text style={styles.statusPillText}>{displayStatus}</Text>
              </View>

              <View style={styles.stubCard}>
                <Text style={styles.stubSection}>EARNINGS</Text>
                {worker?.pay_type === 'flat_weekly' ? (
                  <>
                    <View style={styles.stubRow}>
                      <Text style={styles.stubLeft}>Weekly Contract</Text>
                      <Text style={styles.stubRight}> </Text>
                    </View>
                    <View style={styles.stubRow}>
                      <Text style={styles.stubMuted}>Base</Text>
                      <Text style={styles.stubRight}>
                        ${derived.flat.toFixed(2)}
                      </Text>
                    </View>
                    {derived.otBonus > 0 ? (
                      <View style={styles.stubRow}>
                        <Text style={styles.stubMuted}>OT Bonus (if approved)</Text>
                        <Text style={styles.stubRight}>
                          +${derived.otBonus.toFixed(2)}
                        </Text>
                      </View>
                    ) : null}
                  </>
                ) : (
                  <>
                    <View style={styles.stubRow}>
                      <Text style={styles.stubLeft}>
                        Regular Pay {derived.regH.toFixed(1)} hrs × $
                        {Number(worker?.pay_rate ?? 0).toFixed(2)}
                      </Text>
                      <Text style={styles.stubRight}>
                        ${derived.regPay.toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.stubRow}>
                      <Text style={styles.stubLeft}>
                        OT Pay {derived.otH.toFixed(1)} hrs × $
                        {(
                          worker?.ot_pay_rate ?? Number(worker?.pay_rate ?? 0) * 1.5
                        ).toFixed(2)}
                      </Text>
                      <Text style={styles.stubRight}>
                        ${derived.otPay.toFixed(2)}
                      </Text>
                    </View>
                    {derived.otBonus > 0 ? (
                      <View style={styles.stubRow}>
                        <Text style={styles.stubLeft}>OT Bonus (approved)</Text>
                        <Text style={styles.stubRight}>
                          +${derived.otBonus.toFixed(2)}
                        </Text>
                      </View>
                    ) : null}
                  </>
                )}

                <View style={styles.stubDivider} />
                <Text style={styles.grossLabel}>GROSS PAY</Text>
                <Text style={styles.grossVal}>${derived.gross.toFixed(2)}</Text>

                <View style={styles.stubDivider} />
                <Text style={styles.stubSection}>1099 NOTICE</Text>
                <Text style={styles.noticeLine}>Taxes not withheld</Text>
                <Text style={styles.noticeLine}>Recommended set-aside: 25%</Text>
                <TouchableOpacity
                  onPress={() => router.push('/(driver)/vault')}
                  style={styles.vaultLink}
                >
                  <Text style={styles.vaultLinkText}>Set Up Vault →</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
            {historyData.length > 0 ? (
              <Text style={styles.historyTitle}>Pay History</Text>
            ) : null}
          </>
        }
        renderItem={renderHistoryRow}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#03060D' },
  listContent: { padding: 20, paddingBottom: 40 },
  screenTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#F1F5FF',
    fontFamily: theme.heading,
    marginBottom: 16,
  },
  historyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#F1F5FF',
    fontFamily: theme.bodyMedium,
    marginBottom: 12,
    marginTop: 8,
  },
  hero: {
    borderRadius: 20,
    padding: 22,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  heroDates: {
    fontSize: 13,
    color: '#4E6D92',
    fontFamily: theme.body,
    marginBottom: 10,
  },
  statusPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(59,130,246,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 16,
  },
  statusPillText: {
    color: '#3B82F6',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: theme.bodyMedium,
  },
  stubCard: {
    backgroundColor: 'rgba(10,22,40,0.9)',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  stubSection: {
    fontSize: 11,
    letterSpacing: 1,
    color: '#4E6D92',
    fontFamily: theme.bodyMedium,
    marginBottom: 12,
  },
  stubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 12,
  },
  stubLeft: {
    flex: 1,
    color: '#F1F5FF',
    fontSize: 14,
    fontFamily: theme.body,
  },
  stubMuted: {
    flex: 1,
    color: '#4E6D92',
    fontSize: 13,
    fontFamily: theme.body,
  },
  stubRight: {
    color: '#F1F5FF',
    fontSize: 14,
    fontFamily: theme.mono500,
  },
  stubDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: 14,
  },
  grossLabel: {
    fontSize: 12,
    color: '#4E6D92',
    fontFamily: theme.bodyMedium,
  },
  grossVal: {
    fontSize: 28,
    fontWeight: '800',
    color: '#3B82F6',
    fontFamily: theme.mono800,
    marginTop: 4,
  },
  noticeLine: {
    fontSize: 13,
    color: '#4E6D92',
    fontFamily: theme.body,
    marginTop: 4,
  },
  vaultLink: { marginTop: 14 },
  vaultLinkText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: theme.bodyMedium,
  },
  accItem: {
    marginBottom: 10,
    borderRadius: 14,
    backgroundColor: '#060B14',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  accHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  accRange: {
    color: '#F1F5FF',
    fontSize: 14,
    fontFamily: theme.mono500,
  },
  accTotal: {
    color: '#F1F5FF',
    fontSize: 18,
    fontWeight: '700',
    fontFamily: theme.mono700,
    marginTop: 4,
  },
  accBadge: {
    backgroundColor: 'rgba(37,99,235,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  accBadgeText: {
    color: '#3B82F6',
    fontSize: 10,
    fontWeight: '700',
    fontFamily: theme.bodyMedium,
  },
  accBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  accLine: {
    color: '#4E6D92',
    fontSize: 13,
    fontFamily: theme.body,
    marginTop: 10,
  },
  accAmt: {
    color: '#F1F5FF',
    fontSize: 15,
    fontFamily: theme.mono500,
    marginTop: 2,
  },
  accGrossLabel: {
    marginTop: 16,
    color: '#4E6D92',
    fontSize: 12,
    fontFamily: theme.bodyMedium,
  },
  accGross: {
    color: '#3B82F6',
    fontSize: 20,
    fontWeight: '800',
    fontFamily: theme.mono800,
    marginTop: 4,
  },
  errRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 8,
    alignItems: 'center',
    gap: 12,
  },
  errText: { color: '#EF4444', flex: 1, fontSize: 13, fontFamily: theme.body },
  retry: { color: '#3B82F6', fontWeight: '700', fontFamily: theme.bodyMedium },
  skelPad: { padding: 20, gap: 16 },
  skelHero: {
    height: 280,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  skelBlock: {
    height: 80,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
});

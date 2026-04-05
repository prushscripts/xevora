import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { StatusBar } from 'expo-status-bar';
import { OfflineBanner } from '../../components/OfflineBanner';
import { theme } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import { calculateShiftHours, calculateWeeklyTotals, type MealBreak } from '../../lib/payroll';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

type Shift = {
  id: string;
  company_id: string;
  worker_id: string;
  clock_in: string;
  clock_out: string | null;
  status: string;
  meal_breaks: MealBreak[] | null;
  total_hours: number | null;
  edit_status: string | null;
  edit_note: string | null;
  original_clock_in: string | null;
  original_clock_out: string | null;
  original_meal_breaks: MealBreak[] | null;
  clients: { abbreviation: string } | { abbreviation: string }[] | null;
};

function clientAbbrev(clients: Shift['clients']): string {
  if (!clients) return '—';
  if (Array.isArray(clients)) return clients[0]?.abbreviation ?? '—';
  return clients.abbreviation;
}

function mondayOfOffset(weekOffset: number): Date {
  const now = new Date();
  const shifted = new Date(now);
  shifted.setDate(shifted.getDate() + weekOffset * 7);
  const day = shifted.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const mon = new Date(shifted);
  mon.setDate(shifted.getDate() - diff);
  mon.setHours(0, 0, 0, 0);
  return mon;
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

function shiftHoursValue(sh: Shift): number {
  if (sh.total_hours != null && Number(sh.total_hours) > 0) {
    return Number(sh.total_hours);
  }
  const end = sh.clock_out ? new Date(sh.clock_out) : new Date();
  return calculateShiftHours(new Date(sh.clock_in), end, sh.meal_breaks).totalHours;
}

function combineDayAndTime(day: Date, time: Date): string {
  const out = new Date(day);
  out.setHours(time.getHours(), time.getMinutes(), 0, 0);
  return out.toISOString();
}

type ListItem =
  | { key: string; kind: 'header'; day: Date; dayHours: number }
  | { key: string; kind: 'shift'; shift: Shift }
  | { key: string; kind: 'empty'; day: Date };

export default function TimecardScreen() {
  const online = useOnlineStatus();
  const [weekOffset, setWeekOffset] = useState(0);
  const [worker, setWorker] = useState<{
    id: string;
    company_id: string;
    pay_type: string | null;
    pay_rate: number | null;
    ot_pay_rate: number | null;
    flat_weekly_rate: number | null;
  } | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Shift | 'new' | null>(null);
  const [addDay, setAddDay] = useState<Date | null>(null);
  const [clockInT, setClockInT] = useState(new Date());
  const [clockOutT, setClockOutT] = useState(new Date());
  const [mealStartT, setMealStartT] = useState<Date | null>(null);
  const [mealEndT, setMealEndT] = useState<Date | null>(null);
  const [editNote, setEditNote] = useState('');
  const [picker, setPicker] = useState<'ci' | 'co' | 'ms' | 'me' | null>(null);

  const monday = useMemo(() => mondayOfOffset(weekOffset), [weekOffset]);
  const sunday = useMemo(() => {
    const s = addDays(monday, 6);
    s.setHours(23, 59, 59, 999);
    return s;
  }, [monday]);

  const weekLabel = `${monday.toLocaleDateString([], { month: 'short', day: 'numeric' })} – ${addDays(monday, 6).toLocaleDateString([], { month: 'short', day: 'numeric' })}`;

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

      let rows: any[] | null = null;
      const { data: rowsWithClients, error: sErr } = await supabase
        .from('shifts')
        .select('*, clients(abbreviation, name)')
        .eq('worker_id', w.id)
        .gte('clock_in', monday.toISOString())
        .lte('clock_in', sunday.toISOString())
        .order('clock_in', { ascending: true });
      
      if (sErr) {
        const { data: rowsNoJoin } = await supabase
          .from('shifts')
          .select('*')
          .eq('worker_id', w.id)
          .gte('clock_in', monday.toISOString())
          .lte('clock_in', sunday.toISOString())
          .order('clock_in', { ascending: true });
        
        rows = rowsNoJoin || [];
        
        const clientIds = [...new Set(rows.map((s: any) => s.client_id).filter(Boolean))];
        if (clientIds.length > 0) {
          const { data: clients } = await supabase
            .from('clients')
            .select('id, abbreviation, name')
            .in('id', clientIds);
          
          if (clients) {
            rows = rows.map((s: any) => {
              const client = clients.find((c: any) => c.id === s.client_id);
              return { ...s, clients: client || null };
            });
          }
        }
      } else {
        rows = rowsWithClients;
      }
      
      setShifts((rows as unknown as Shift[]) || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [monday, sunday]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!worker?.id) return;
    const channel = supabase
      .channel('timecard-shifts')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'shifts',
        filter: `worker_id=eq.${worker.id}`,
      }, () => {
        load();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [worker?.id, load]);

  const summary = useMemo(() => {
    const completed = shifts.filter((s) => s.clock_out);
    const totals = completed.map((s) => ({ totalHours: shiftHoursValue(s) }));
    if (!worker) {
      return { total: 0, reg: 0, ot: 0, pay: 0 };
    }
    const w = calculateWeeklyTotals({
      shifts: totals,
      worker: {
        pay_type: (worker.pay_type as 'hourly' | 'flat_weekly') || 'hourly',
        pay_rate: worker.pay_rate,
        ot_pay_rate: worker.ot_pay_rate,
        flat_weekly_rate: worker.flat_weekly_rate,
      },
      workerClient: { billing_rate: 0, ot_billing_rate: 0 },
      otWeeklyThreshold: 40,
    });
    return {
      total: w.totalHours,
      reg: w.regularHours,
      ot: w.otHours,
      pay: w.grossPay,
    };
  }, [shifts, worker]);

  const listData: ListItem[] = useMemo(() => {
    const items: ListItem[] = [];
    for (let i = 0; i < 7; i++) {
      const day = addDays(monday, i);
      const dayShifts = shifts.filter((s) => sameLocalDay(new Date(s.clock_in), day));
      const dayHours = dayShifts.reduce((a, s) => a + shiftHoursValue(s), 0);
      items.push({
        key: `h-${i}`,
        kind: 'header',
        day,
        dayHours,
      });
      if (dayShifts.length === 0) {
        items.push({ key: `e-${i}`, kind: 'empty', day });
      } else {
        for (const sh of dayShifts) {
          items.push({ key: sh.id, kind: 'shift', shift: sh });
        }
      }
    }
    return items;
  }, [shifts, monday]);

  const openEdit = (sh: Shift) => {
    const d0 = new Date(sh.clock_in);
    const d1 = sh.clock_out ? new Date(sh.clock_out) : new Date();
    setClockInT(d0);
    setClockOutT(d1);
    const meals = sh.meal_breaks ?? [];
    const m0 = meals[0];
    if (m0?.start) {
      setMealStartT(new Date(m0.start));
      setMealEndT(m0.end ? new Date(m0.end) : new Date());
    } else {
      setMealStartT(null);
      setMealEndT(null);
    }
    setEditNote('');
    setEditing(sh);
    setAddDay(null);
    setSheetOpen(true);
  };

  const openAdd = (day: Date) => {
    const base = new Date(day);
    base.setHours(9, 0, 0, 0);
    const end = new Date(day);
    end.setHours(17, 0, 0, 0);
    setClockInT(base);
    setClockOutT(end);
    setMealStartT(null);
    setMealEndT(null);
    setEditNote('');
    setEditing('new');
    setAddDay(day);
    setSheetOpen(true);
  };

  const closeSheet = () => {
    setSheetOpen(false);
    setEditing(null);
    setAddDay(null);
    setPicker(null);
  };

  const locked = (sh: Shift) =>
    sh.edit_status === 'approved' || sh.status === 'approved';

  const submitSheet = async () => {
    if (!worker || editing == null) return;
    if (editing !== 'new' && !editNote.trim()) {
      setError('Please add a reason for this edit');
      return;
    }
    const dayBase =
      editing === 'new' && addDay
        ? addDay
        : editing && editing !== 'new'
          ? new Date(editing.clock_in)
          : new Date();
    const inIso = combineDayAndTime(dayBase, clockInT);
    const outIso = combineDayAndTime(dayBase, clockOutT);
    let meals: MealBreak[] = [];
    if (mealStartT && mealEndT) {
      meals = [
        {
          start: combineDayAndTime(dayBase, mealStartT),
          end: combineDayAndTime(dayBase, mealEndT),
        },
      ];
    }
    const { totalHours } = calculateShiftHours(
      new Date(inIso),
      new Date(outIso),
      meals
    );

    try {
      setError(null);
      if (editing === 'new') {
        const { error: insErr } = await supabase.from('shifts').insert({
          company_id: worker.company_id,
          worker_id: worker.id,
          clock_in: inIso,
          clock_out: outIso,
          status: 'completed',
          meal_breaks: meals,
          total_hours: totalHours,
        });
        if (insErr) throw insErr;
        setBanner('Entry added');
      } else if (editing) {
        const sh = editing;
        const patch: Record<string, unknown> = {
          clock_in: inIso,
          clock_out: outIso,
          meal_breaks: meals,
          total_hours: totalHours,
          edit_status: 'pending',
          edit_note: editNote.trim() || null,
          edit_requested_at: new Date().toISOString(),
        };
        if (!sh.original_clock_in) patch.original_clock_in = sh.clock_in;
        if (!sh.original_clock_out) patch.original_clock_out = sh.clock_out;
        if (sh.original_meal_breaks == null) {
          patch.original_meal_breaks = sh.meal_breaks ?? [];
        }
        const { error: upErr } = await supabase
          .from('shifts')
          .update(patch)
          .eq('id', sh.id);
        if (upErr) throw upErr;
        setBanner('Edit submitted — pending approval');
      }
      closeSheet();
      await load();
      setTimeout(() => setBanner(null), 5000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    }
  };

  const onPickerChange = (_: unknown, date?: Date) => {
    if (Platform.OS === 'android') setPicker(null);
    if (!date) return;
    if (picker === 'ci') setClockInT(date);
    if (picker === 'co') setClockOutT(date);
    if (picker === 'ms') setMealStartT(date);
    if (picker === 'me') setMealEndT(date);
  };

  const pickerValue =
    picker === 'ci'
      ? clockInT
      : picker === 'co'
        ? clockOutT
        : picker === 'ms'
          ? mealStartT ?? new Date()
          : picker === 'me'
            ? mealEndT ?? new Date()
            : new Date();

  const renderItem = ({ item }: { item: ListItem }) => {
    if (item.kind === 'header') {
      const label = item.day
        .toLocaleDateString([], { weekday: 'short' })
        .toUpperCase();
        const num = item.day.getDate();
      return (
        <View style={styles.dayHeader}>
          <Text style={styles.dayHeaderText}>
            {label} {num}
          </Text>
          <Text style={styles.dayHeaderHrs}>{item.dayHours.toFixed(1)}h</Text>
        </View>
      );
    }
    if (item.kind === 'empty') {
      return (
        <View style={styles.emptyDay}>
          <Text style={styles.emptyDayText}>No punches</Text>
          <TouchableOpacity onPress={() => openAdd(item.day)}>
            <Text style={styles.addLink}>+ Add Entry</Text>
          </TouchableOpacity>
        </View>
      );
    }
    const sh = item.shift;
    const tIn = new Date(sh.clock_in).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    const tOut = sh.clock_out
      ? new Date(sh.clock_out).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })
      : '—';
    const hrs = shiftHoursValue(sh).toFixed(1);
    const meals = sh.meal_breaks ?? [];
    const m0 = meals[0];
    let mealLine = '';
    if (m0?.start && m0.end) {
      const ms = new Date(m0.start).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
      const me = new Date(m0.end).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
      const mins = Math.round(
        (new Date(m0.end).getTime() - new Date(m0.start).getTime()) / 60_000
      );
      mealLine = `Meal: ${ms} → ${me} (${mins} min)`;
    }
    const isLocked = locked(sh);
    const pending = sh.edit_status === 'pending';

    return (
      <View style={styles.shiftCard}>
        <View style={styles.shiftTop}>
          <Text style={styles.shiftClient}>{clientAbbrev(sh.clients)}</Text>
          <Text style={styles.shiftTimes}>
            {tIn} → {tOut}
          </Text>
        </View>
        <View style={styles.shiftMid}>
          <Text style={styles.shiftHrs}>{hrs} hrs</Text>
          {pending ? (
            <View style={styles.badgePend}>
              <Text style={styles.badgePendText}>PENDING APPROVAL</Text>
            </View>
          ) : sh.status === 'approved' ? (
            <View style={styles.badgeOk}>
              <Text style={styles.badgeOkText}>● APPROVED</Text>
            </View>
          ) : (
            <Text style={styles.badgeMuted}>● {sh.status.toUpperCase()}</Text>
          )}
        </View>
        {mealLine ? <Text style={styles.mealLine}>{mealLine}</Text> : null}
        {pending ? (
          <Text style={styles.pendingNote}>Your edit is awaiting admin review</Text>
        ) : null}
        {!isLocked && !pending ? (
          <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(sh)}>
            <Text style={styles.editBtnText}>EDIT</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar style="light" />
      {!online ? <OfflineBanner /> : null}

      <View style={styles.weekNav}>
        <TouchableOpacity
          style={styles.navArrow}
          onPress={() => setWeekOffset((w) => w - 1)}
        >
          <Text style={styles.navArrowText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.weekTitle}>Week of {weekLabel}</Text>
        <TouchableOpacity
          style={styles.navArrow}
          onPress={() => setWeekOffset((w) => w + 1)}
        >
          <Text style={styles.navArrowText}>→</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.summary}>
        <View style={styles.sumCell}>
          <Text style={styles.sumLabel}>Total Hrs</Text>
          <Text style={styles.sumVal}>{summary.total.toFixed(1)}</Text>
        </View>
        <View style={styles.sumCell}>
          <Text style={styles.sumLabel}>Regular</Text>
          <Text style={styles.sumVal}>{summary.reg.toFixed(1)}</Text>
        </View>
        <View style={styles.sumCell}>
          <Text style={styles.sumLabel}>OT</Text>
          <Text style={styles.sumVal}>{summary.ot.toFixed(1)}</Text>
        </View>
        <View style={styles.sumCell}>
          <Text style={styles.sumLabel}>Est. Pay</Text>
          <Text style={styles.sumVal}>${summary.pay.toFixed(0)}</Text>
        </View>
      </View>

      {banner ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>{banner}</Text>
        </View>
      ) : null}

      {error ? (
        <View style={styles.errRow}>
          <Text style={styles.errText}>{error}</Text>
          <TouchableOpacity onPress={load}>
            <Text style={styles.retry}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.skelList}>
          {[1, 2, 3].map((i) => (
            <View key={i} style={styles.skelBlock} />
          ))}
        </View>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(it) => it.key}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal visible={sheetOpen} transparent animationType="slide">
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={closeSheet} />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.sheetWrap}
          >
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>
              {editing === 'new' ? 'Add time entry' : 'Request edit'}
            </Text>

            <Text style={styles.fieldLab}>Clock in</Text>
            <TouchableOpacity
              style={styles.timeBtn}
              onPress={() => setPicker('ci')}
            >
              <Text style={styles.timeBtnText}>
                {clockInT.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </TouchableOpacity>

            <Text style={styles.fieldLab}>Clock out</Text>
            <TouchableOpacity
              style={styles.timeBtn}
              onPress={() => setPicker('co')}
            >
              <Text style={styles.timeBtnText}>
                {clockOutT.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </TouchableOpacity>

            <Text style={styles.fieldLab}>Meal (optional)</Text>
            <TouchableOpacity
              style={styles.timeBtn}
              onPress={() => {
                if (!mealStartT) setMealStartT(new Date(clockInT));
                setPicker('ms');
              }}
            >
              <Text style={styles.timeBtnText}>
                {mealStartT
                  ? mealStartT.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Meal start'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.timeBtn}
              onPress={() => {
                if (!mealEndT) setMealEndT(new Date(clockOutT));
                setPicker('me');
              }}
            >
              <Text style={styles.timeBtnText}>
                {mealEndT
                  ? mealEndT.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Meal end'}
              </Text>
            </TouchableOpacity>

            {editing !== 'new' ? (
              <>
                <Text style={styles.fieldLab}>Reason for edit</Text>
                <TextInput
                  style={styles.noteIn}
                  placeholder="Required for payroll accuracy"
                  placeholderTextColor="#4E6D92"
                  value={editNote}
                  onChangeText={setEditNote}
                  multiline
                />
              </>
            ) : null}

            <TouchableOpacity style={styles.submitEdit} onPress={submitSheet}>
              <Text style={styles.submitEditText}>
                {editing === 'new' ? 'Add Entry' : 'Submit Edit'}
              </Text>
            </TouchableOpacity>
          </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
      {picker ? (
        <DateTimePicker
          value={pickerValue}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onPickerChange}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#03060D' },
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  navArrow: { padding: 8 },
  navArrowText: { color: '#3B82F6', fontSize: 22, fontFamily: theme.bodyMedium },
  weekTitle: {
    color: '#F1F5FF',
    fontSize: 14,
    fontFamily: theme.mono500,
    textAlign: 'center',
    flex: 1,
  },
  summary: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    backgroundColor: '#060B14',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: 8,
  },
  sumCell: { flex: 1, alignItems: 'center' },
  sumLabel: { fontSize: 10, color: '#4E6D92', fontFamily: theme.body },
  sumVal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F1F5FF',
    fontFamily: theme.mono700,
    marginTop: 4,
  },
  banner: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.35)',
  },
  bannerText: {
    color: '#F59E0B',
    fontSize: 13,
    textAlign: 'center',
    fontFamily: theme.bodyMedium,
  },
  errRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8,
    alignItems: 'center',
    gap: 12,
  },
  errText: { color: '#EF4444', flex: 1, fontSize: 13, fontFamily: theme.body },
  retry: { color: '#3B82F6', fontWeight: '700', fontFamily: theme.bodyMedium },
  skelList: { padding: 16, gap: 12 },
  skelBlock: {
    height: 100,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  listContent: { paddingHorizontal: 16, paddingBottom: 32 },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    marginTop: 8,
  },
  dayHeaderText: {
    color: '#F1F5FF',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: theme.bodyMedium,
  },
  dayHeaderHrs: {
    color: '#3B82F6',
    fontSize: 14,
    fontFamily: theme.mono700,
  },
  emptyDay: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: '#060B14',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 8,
  },
  emptyDayText: { color: '#4E6D92', fontSize: 13, fontFamily: theme.body },
  addLink: {
    color: '#3B82F6',
    marginTop: 8,
    fontFamily: theme.bodyMedium,
    fontSize: 14,
  },
  shiftCard: {
    backgroundColor: '#0A1628',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  shiftTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  shiftClient: {
    color: '#3B82F6',
    fontWeight: '700',
    fontFamily: theme.bodyMedium,
  },
  shiftTimes: { color: '#F1F5FF', fontFamily: theme.mono500, fontSize: 13 },
  shiftMid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shiftHrs: {
    color: '#F1F5FF',
    fontFamily: theme.mono700,
    fontSize: 15,
  },
  badgePend: {
    backgroundColor: 'rgba(245,158,11,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgePendText: {
    color: '#F59E0B',
    fontSize: 10,
    fontWeight: '700',
    fontFamily: theme.bodyMedium,
  },
  badgeOk: {},
  badgeOkText: {
    color: '#4E6D92',
    fontSize: 12,
    fontFamily: theme.mono500,
  },
  badgeMuted: {
    color: '#4E6D92',
    fontSize: 11,
    fontFamily: theme.body,
  },
  mealLine: {
    marginTop: 8,
    color: '#4E6D92',
    fontSize: 12,
    fontFamily: theme.mono,
  },
  pendingNote: {
    marginTop: 6,
    fontSize: 11,
    color: '#F59E0B',
    fontFamily: theme.body,
  },
  editBtn: {
    alignSelf: 'flex-end',
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.4)',
  },
  editBtnText: {
    color: '#3B82F6',
    fontWeight: '700',
    fontSize: 12,
    fontFamily: theme.bodyMedium,
  },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  sheetWrap: { maxHeight: '92%' as const },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(3,6,13,0.7)',
  },
  sheet: {
    backgroundColor: '#060B14',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  sheetTitle: {
    color: '#F1F5FF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    fontFamily: theme.bodyMedium,
  },
  fieldLab: {
    color: '#4E6D92',
    fontSize: 11,
    marginTop: 10,
    fontFamily: theme.bodyMedium,
  },
  timeBtn: {
    backgroundColor: '#0A1628',
    borderRadius: 12,
    padding: 14,
    marginTop: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  timeBtnText: { color: '#F1F5FF', fontFamily: theme.mono500, fontSize: 16 },
  noteIn: {
    backgroundColor: '#0A1628',
    borderRadius: 12,
    padding: 12,
    marginTop: 6,
    color: '#F1F5FF',
    minHeight: 72,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    fontFamily: theme.body,
  },
  submitEdit: {
    backgroundColor: '#2563EB',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  submitEditText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    fontFamily: theme.bodyMedium,
  },
});

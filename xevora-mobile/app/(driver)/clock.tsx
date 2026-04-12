import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { HexLogo } from '../../components/HexLogo';
import { OfflineBanner } from '../../components/OfflineBanner';
import { theme } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import { calculateShiftHours, type MealBreak } from '../../lib/payroll';
import {
  appendMealStart,
  closeLastOpenMeal,
  getOpenMealBreak,
} from '../../lib/shiftMeal';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

type ShiftRow = {
  id: string;
  clock_in: string;
  clock_out: string | null;
  status: string;
  meal_breaks: MealBreak[] | null;
  gps_verified: boolean | null;
};

function formatElapsed(startIso: string): string {
  const ms = Date.now() - new Date(startIso).getTime();
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export default function ClockScreen() {
  const online = useOnlineStatus();
  const [workerId, setWorkerId] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [activeShift, setActiveShift] = useState<ShiftRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);
  const [gpsLine, setGpsLine] = useState('📍 Acquiring location...');
  const [confirm, setConfirm] = useState<{ text: string } | null>(null);
  const confirmOp = useRef(new Animated.Value(0)).current;

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
        .select('id, company_id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (wErr || !w) {
        setError(wErr?.message || 'Worker not found');
        setLoading(false);
        return;
      }
      setWorkerId(w.id);
      setCompanyId(w.company_id);

      const { data: shift, error: sErr } = await supabase
        .from('shifts')
        .select('id, clock_in, clock_out, status, meal_breaks, gps_verified')
        .eq('worker_id', w.id)
        .is('clock_out', null)
        .order('clock_in', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (sErr) throw sErr;
      const row = shift as unknown as ShiftRow | null;
      setActiveShift(row && row.status === 'active' ? row : null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Load failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!activeShift) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [activeShift]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;
        if (status !== 'granted') {
          setGpsLine('📍 Location permission needed');
          return;
        }
        setGpsLine('📍 Acquiring location...');
        await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!cancelled) setGpsLine('📍 Location confirmed');
      } catch {
        if (!cancelled) setGpsLine('📍 Location unavailable');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const openMeal = activeShift
    ? getOpenMealBreak(activeShift.meal_breaks)
    : null;

  const phase = useMemo(() => {
    if (!activeShift) return 'out' as const;
    if (openMeal) return 'break' as const;
    return 'in' as const;
  }, [activeShift, openMeal]);

  const glow = phase === 'out' ? '#2563EB' : phase === 'in' ? '#22C55E' : '#F59E0B';

  const showConfirm = (text: string) => {
    setConfirm({ text });
    confirmOp.setValue(0);
    Animated.sequence([
      Animated.timing(confirmOp, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.delay(400),
      Animated.timing(confirmOp, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => setConfirm(null));
  };

  const nowStr = useMemo(
    () =>
      new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
    [tick]
  );

  const dateStr = new Date().toLocaleDateString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const clockIn = async () => {
    if (!workerId || !companyId || busy) return;
    setBusy(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      let lat: number | null = null;
      let lng: number | null = null;
      let verified = false;
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted') {
        try {
          const pos = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
          verified = true;
          setGpsLine('📍 Location confirmed');
        } catch {
          setGpsLine('📍 Could not fix GPS');
        }
      }

      const row: Record<string, unknown> = {
        company_id: companyId,
        worker_id: workerId,
        clock_in: new Date().toISOString(),
        status: 'active',
        gps_verified: verified,
      };
      if (lat != null) row.clock_in_lat = lat;
      if (lng != null) row.clock_in_lng = lng;

      const { error: insErr } = await supabase.from('shifts').insert(row);
      if (insErr) throw insErr;
      showConfirm('Clocked In ✓');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Clock in failed');
    } finally {
      setBusy(false);
    }
  };

  const clockOut = async () => {
    if (!activeShift || busy) return;
    setBusy(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
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
      showConfirm('Clocked Out ✓');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Clock out failed');
    } finally {
      setBusy(false);
    }
  };

  const takeMeal = async () => {
    if (!activeShift || busy || openMeal) return;
    setBusy(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      const next = appendMealStart(activeShift.meal_breaks);
      const { error: upErr } = await supabase
        .from('shifts')
        .update({ meal_breaks: next as unknown as MealBreak[] })
        .eq('id', activeShift.id);
      if (upErr) throw upErr;
      showConfirm('Meal Break Started ✓');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Break failed');
    } finally {
      setBusy(false);
    }
  };

  const endMeal = async () => {
    if (!activeShift || busy || !openMeal) return;
    setBusy(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      const next = closeLastOpenMeal(activeShift.meal_breaks);
      const { error: upErr } = await supabase
        .from('shifts')
        .update({ meal_breaks: next as unknown as MealBreak[] })
        .eq('id', activeShift.id);
      if (upErr) throw upErr;
      showConfirm('Meal Ended ✓');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'End meal failed');
    } finally {
      setBusy(false);
    }
  };

  const ringSize = 120 * 4.2;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar style="light" />
      {!online ? <OfflineBanner /> : null}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
      >
        <Text style={styles.dateTop}>{dateStr}</Text>

        {error ? (
          <View style={styles.errBar}>
            <Text style={styles.errText}>{error}</Text>
            <TouchableOpacity onPress={load}>
              <Text style={styles.retry}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.center}>
          <View style={{ width: ringSize, height: ringSize, alignItems: 'center', justifyContent: 'center' }}>
            <HexLogo
              size={120}
              glowColor={glow}
              ringColor={glow}
              animated={!loading}
            />
            <View style={styles.timeOverlay} pointerEvents="none">
              <Text style={styles.hexTime} key={tick}>
                {nowStr}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.actions}>
        {phase === 'out' && (
          <>
            <TouchableOpacity
              style={styles.btnPrimary}
              onPress={clockIn}
              disabled={busy || loading}
            >
              <Text style={styles.btnPrimaryText}>CLOCK IN</Text>
            </TouchableOpacity>
            <Text style={styles.gps}>{gpsLine}</Text>
          </>
        )}

        {phase === 'in' && activeShift && (
          <>
            <TouchableOpacity
              style={styles.btnAmber}
              onPress={takeMeal}
              disabled={busy}
            >
              <Text style={styles.btnAmberText}>TAKE MEAL</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.btnOutlineRed}
              onPress={clockOut}
              disabled={busy}
            >
              <Text style={styles.btnOutlineRedText}>CLOCK OUT</Text>
            </TouchableOpacity>
            <Text style={styles.meta}>
              Shift started at{' '}
              {new Date(activeShift.clock_in).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
            <Text style={styles.elapsed} key={tick}>
              {formatElapsed(activeShift.clock_in)}
            </Text>
            {activeShift.gps_verified ? (
              <Text style={styles.gpsOk}>GPS Verified ✓</Text>
            ) : null}
          </>
        )}

        {phase === 'break' && activeShift && openMeal && (
          <>
            <TouchableOpacity
              style={styles.btnGreen}
              onPress={endMeal}
              disabled={busy}
            >
              <Text style={styles.btnGreenText}>END MEAL</Text>
            </TouchableOpacity>
            <Text style={styles.meta}>
              Break started at{' '}
              {new Date(openMeal.start).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
            <Text style={styles.elapsedBreak} key={tick}>
              {formatElapsed(openMeal.start)}
            </Text>
          </>
        )}
      </View>

      <Modal visible={!!confirm} transparent animationType="none">
        <View style={styles.confirmWrap}>
          <Animated.View style={[styles.confirmCard, { opacity: confirmOp }]}>
            <Text style={styles.check}>✓</Text>
            <Text style={styles.confirmText}>{confirm?.text}</Text>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#03060D',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  dateTop: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 14,
    color: '#4E6D92',
    fontFamily: theme.mono,
  },
  errBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(239,68,68,0.1)',
  },
  errText: { color: '#EF4444', flex: 1, fontSize: 13, fontFamily: theme.body },
  retry: { color: '#3B82F6', fontWeight: '700', fontFamily: theme.bodyMedium },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 400,
  },
  timeOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hexTime: {
    fontSize: 24,
    fontWeight: '800',
    color: '#F1F5FF',
    fontFamily: theme.mono800,
  },
  actions: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    gap: 12,
    backgroundColor: '#03060D',
  },
  btnPrimary: {
    backgroundColor: '#2563EB',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
  },
  btnPrimaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: theme.bodyMedium,
  },
  gps: {
    textAlign: 'center',
    color: '#4E6D92',
    fontSize: 13,
    fontFamily: theme.body,
  },
  gpsOk: {
    textAlign: 'center',
    color: '#22C55E',
    fontSize: 12,
    fontFamily: theme.bodyMedium,
  },
  btnAmber: {
    backgroundColor: '#F59E0B',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
  },
  btnAmberText: {
    color: '#03060D',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: theme.bodyMedium,
  },
  btnOutlineRed: {
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#EF4444',
    backgroundColor: 'transparent',
  },
  btnOutlineRedText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: theme.bodyMedium,
  },
  btnGreen: {
    backgroundColor: '#22C55E',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
  },
  btnGreenText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: theme.bodyMedium,
  },
  meta: {
    textAlign: 'center',
    color: '#4E6D92',
    fontSize: 13,
    fontFamily: theme.body,
  },
  elapsed: {
    textAlign: 'center',
    color: '#22C55E',
    fontSize: 22,
    fontWeight: '800',
    fontFamily: theme.mono800,
  },
  elapsedBreak: {
    textAlign: 'center',
    color: '#F59E0B',
    fontSize: 22,
    fontWeight: '800',
    fontFamily: theme.mono800,
  },
  confirmWrap: {
    flex: 1,
    backgroundColor: 'rgba(3,6,13,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmCard: {
    backgroundColor: '#0A1628',
    paddingHorizontal: 32,
    paddingVertical: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    gap: 8,
  },
  check: {
    fontSize: 40,
    color: '#22C55E',
    fontWeight: '800',
  },
  confirmText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#F1F5FF',
    fontFamily: theme.bodyMedium,
  },
});

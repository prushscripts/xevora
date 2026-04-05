import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { LoginHexArt } from '../../components/LoginPremiumChrome'
import { clockIn, takeMeal, endMeal, clockOut } from '../../lib/punch'

export default function QuickClockScreen() {
  const { user } = useAuth()
  const [worker, setWorker] = useState<any>(null)
  const [activeShift, setActiveShift] = useState<any>(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [loading, setLoading] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [confirmationText, setConfirmationText] = useState('')

  useEffect(() => {
    loadWorkerData()
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    AsyncStorage.setItem('xevora_quick_clock_seen', 'true')
  }, [])

  async function loadWorkerData() {
    if (!user) return

    const { data: workerData } = await supabase
      .from('workers')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (workerData) {
      setWorker(workerData)

      const { data: shift } = await supabase
        .from('shifts')
        .select('*')
        .eq('worker_id', workerData.id)
        .eq('status', 'active')
        .order('clock_in', { ascending: false })
        .limit(1)
        .single()

      setActiveShift(shift)
    }
  }

  function getGreeting() {
    const hour = currentTime.getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  function formatTime(date: Date) {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    })
  }

  function formatDate(date: Date) {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    })
  }

  function getElapsedTime(startTime: string) {
    const start = new Date(startTime)
    const now = new Date()
    const diff = now.getTime() - start.getTime()
    const hours = Math.floor(diff / 1000 / 60 / 60)
    const minutes = Math.floor((diff / 1000 / 60) % 60)
    const seconds = Math.floor((diff / 1000) % 60)
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  function isOnBreak() {
    if (!activeShift?.meal_breaks) return false
    const breaks = activeShift.meal_breaks
    return breaks.some((b: any) => b.start && !b.end)
  }

  async function handleClockIn() {
    if (!worker) return
    setLoading(true)
    try {
      const shift = await clockIn(worker.id, worker.client_id, worker.company_id)
      setActiveShift(shift)
      showConfirmationOverlay('Clocked In')
    } catch (error) {
      Alert.alert('Error', 'Failed to clock in')
    }
    setLoading(false)
  }

  async function handleTakeMeal() {
    if (!activeShift) return
    setLoading(true)
    try {
      const shift = await takeMeal(activeShift.id)
      setActiveShift(shift)
      showConfirmationOverlay('Meal Break Started')
    } catch (error) {
      Alert.alert('Error', 'Failed to start meal break')
    }
    setLoading(false)
  }

  async function handleEndMeal() {
    if (!activeShift) return
    setLoading(true)
    try {
      const shift = await endMeal(activeShift.id)
      setActiveShift(shift)
      showConfirmationOverlay('Meal Break Ended')
    } catch (error) {
      Alert.alert('Error', 'Failed to end meal break')
    }
    setLoading(false)
  }

  async function handleClockOut() {
    if (!activeShift) return
    setLoading(true)
    try {
      await clockOut(activeShift.id, activeShift.clock_in, activeShift.meal_breaks)
      setActiveShift(null)
      showConfirmationOverlay('Clocked Out')
    } catch (error) {
      Alert.alert('Error', 'Failed to clock out')
    }
    setLoading(false)
  }

  function showConfirmationOverlay(text: string) {
    setConfirmationText(text)
    setShowConfirmation(true)
    setTimeout(() => setShowConfirmation(false), 700)
  }

  const onBreak = isOnBreak()

  return (
    <SafeAreaView style={s.container}>
      <View style={s.content}>
        {/* TOP SECTION */}
        <View style={s.topSection}>
          <View style={s.hexContainer}>
            <LoginHexArt />
          </View>
          <Text style={s.wordmark}>XEVORA</Text>
          <Text style={s.greeting}>
            {getGreeting()}, {worker?.first_name || 'Driver'}
          </Text>
        </View>

        {/* LIVE CLOCK */}
        <View style={s.clockSection}>
          <Text style={s.time}>{formatTime(currentTime)}</Text>
          <Text style={s.date}>{formatDate(currentTime)}</Text>
          <View style={s.statusChip}>
            <View style={[s.statusDot, { backgroundColor: '#10B981' }]} />
            <Text style={s.statusText}>Online</Text>
          </View>
        </View>

        {/* PUNCH STATUS BAR */}
        <View
          style={[
            s.statusBar,
            activeShift && !onBreak && s.statusBarActive,
            onBreak && s.statusBarBreak,
          ]}
        >
          {activeShift ? (
            <>
              <Text style={s.statusBarTitle}>
                {onBreak ? 'ON BREAK' : 'ON SHIFT'} since{' '}
                {new Date(
                  onBreak
                    ? activeShift.meal_breaks.find((b: any) => !b.end)?.start
                    : activeShift.clock_in
                ).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                })}
              </Text>
              <Text style={s.statusBarTimer}>
                {getElapsedTime(
                  onBreak
                    ? activeShift.meal_breaks.find((b: any) => !b.end)?.start
                    : activeShift.clock_in
                )}
              </Text>
            </>
          ) : (
            <Text style={s.statusBarTitle}>No active shift today</Text>
          )}
        </View>

        {/* PUNCH BUTTONS */}
        <View style={s.buttonsSection}>
          {!activeShift ? (
            <TouchableOpacity
              style={s.primaryButton}
              onPress={handleClockIn}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.primaryButtonText}>▶ START SHIFT</Text>
              )}
            </TouchableOpacity>
          ) : onBreak ? (
            <TouchableOpacity
              style={s.endMealButton}
              onPress={handleEndMeal}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.endMealButtonText}>▶ END MEAL</Text>
              )}
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                style={s.mealButton}
                onPress={handleTakeMeal}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={s.mealButtonText}>⏸ TAKE MEAL</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={s.endShiftButton}
                onPress={handleClockOut}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#EF4444" />
                ) : (
                  <Text style={s.endShiftButtonText}>⏹ END SHIFT</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* GPS NOTE */}
        <Text style={s.gpsNote}>📍 Location will be captured on punch</Text>

        {/* BOTTOM ROW */}
        <TouchableOpacity
          style={s.enterAppButton}
          onPress={() => router.replace('/(driver)')}
        >
          <Text style={s.enterAppText}>Enter Full App →</Text>
          <Text style={s.enterAppSubtext}>Takes you to your full dashboard</Text>
        </TouchableOpacity>
      </View>

      {/* CONFIRMATION OVERLAY */}
      {showConfirmation && (
        <View style={s.confirmationOverlay}>
          <View style={s.confirmationBox}>
            <Text style={s.confirmationCheck}>✓</Text>
            <Text style={s.confirmationText}>{confirmationText}</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#03060D',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 20,
  },
  topSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  hexContainer: {
    marginBottom: 12,
  },
  wordmark: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 18,
    letterSpacing: 4,
    color: '#F1F5FF',
    marginBottom: 8,
  },
  greeting: {
    fontSize: 14,
    color: '#4E6D92',
    fontFamily: 'PlusJakartaSans_500Medium',
  },
  clockSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  time: {
    fontFamily: 'JetBrainsMono_800ExtraBold',
    fontSize: 48,
    color: '#F1F5FF',
    marginBottom: 8,
  },
  date: {
    fontSize: 14,
    color: '#4E6D92',
    marginBottom: 12,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(16,185,129,0.1)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    color: '#10B981',
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  statusBar: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#0A1628',
    borderWidth: 1,
    borderColor: '#1E3A5F',
    marginBottom: 24,
  },
  statusBarActive: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16,185,129,0.05)',
  },
  statusBarBreak: {
    borderColor: '#F59E0B',
    backgroundColor: 'rgba(245,158,11,0.05)',
  },
  statusBarTitle: {
    fontSize: 14,
    color: '#F1F5FF',
    fontFamily: 'PlusJakartaSans_600SemiBold',
    marginBottom: 4,
  },
  statusBarTimer: {
    fontSize: 20,
    color: '#F1F5FF',
    fontFamily: 'JetBrainsMono_800ExtraBold',
  },
  buttonsSection: {
    gap: 12,
    marginBottom: 24,
  },
  primaryButton: {
    height: 60,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#fff',
  },
  mealButton: {
    height: 56,
    borderRadius: 12,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealButtonText: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#fff',
  },
  endMealButton: {
    height: 60,
    borderRadius: 12,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  endMealButtonText: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#fff',
  },
  endShiftButton: {
    height: 56,
    borderRadius: 12,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  endShiftButtonText: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#EF4444',
  },
  gpsNote: {
    fontSize: 11,
    color: '#4E6D92',
    textAlign: 'center',
    marginBottom: 32,
  },
  enterAppButton: {
    alignItems: 'flex-end',
    marginTop: 'auto',
  },
  enterAppText: {
    fontSize: 15,
    color: '#4E6D92',
    fontFamily: 'PlusJakartaSans_600SemiBold',
    marginBottom: 4,
  },
  enterAppSubtext: {
    fontSize: 12,
    color: '#2D4A6B',
  },
  confirmationOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(3,6,13,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmationBox: {
    alignItems: 'center',
  },
  confirmationCheck: {
    fontSize: 64,
    color: '#10B981',
    marginBottom: 16,
  },
  confirmationText: {
    fontSize: 20,
    color: '#F1F5FF',
    fontFamily: 'PlusJakartaSans_700Bold',
  },
})

import React, { useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Animated,
  Easing,
  Dimensions,
} from 'react-native'
import Svg, { Polygon, Line, Circle, G } from 'react-native-svg'
import { LinearGradient } from 'expo-linear-gradient'

const BAR_W = 240
const BAR_H = 2
const WORD = 'XEVORA'

const T_HEX_APPEAR = 600
const T_TYPE_START = 600
const LETTER_INTERVAL = 200
const T_BAR_START = 800
const T_STATUS_1 = 1800
const T_STATUS_2 = 2100
const T_STATUS_3 = 2400
const T_SCAN_START = 2600
const SCAN_DURATION = 400
const FADE_OUT_DURATION = 200
const TOTAL_DURATION = 3200

type Props = {
  visible: boolean
  progress: number
  onExitComplete: () => void
}

export function LoginSignInTransition({
  visible,
  progress = 0,
  onExitComplete,
}: Props) {
  const { width: sw, height: sh } = Dimensions.get('window')
  const bgOp = useRef(new Animated.Value(0)).current
  const hexOp = useRef(new Animated.Value(0)).current
  const hexScale = useRef(new Animated.Value(0.3)).current
  const hexPulse = useRef(new Animated.Value(1)).current
  const ring1 = useRef(new Animated.Value(0)).current
  const ring2 = useRef(new Animated.Value(0)).current
  const ring3 = useRef(new Animated.Value(0)).current
  const [letters, setLetters] = useState(0)
  const [statusText, setStatusText] = useState('')
  const barProgress = useRef(new Animated.Value(0)).current
  const flareX = useRef(new Animated.Value(0)).current
  const statusOp = useRef(new Animated.Value(0)).current
  const scanY = useRef(new Animated.Value(0)).current
  const overlayOp = useRef(new Animated.Value(1)).current
  const cursorOp = useRef(new Animated.Value(1)).current
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const cursorBlink = useRef<Animated.CompositeAnimation | null>(null)
  const animProgress = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (!visible) {
      timers.current.forEach(clearTimeout)
      timers.current = []
      cursorBlink.current?.stop()
      setLetters(0)
      setStatusText('')
      bgOp.setValue(0)
      hexOp.setValue(0)
      hexScale.setValue(0.3)
      hexPulse.setValue(1)
      ring1.setValue(0)
      ring2.setValue(0)
      ring3.setValue(0)
      barProgress.setValue(0)
      flareX.setValue(0)
      statusOp.setValue(0)
      scanY.setValue(0)
      overlayOp.setValue(1)
      cursorOp.setValue(1)
      animProgress.setValue(0)
      return
    }

    const push = (t: ReturnType<typeof setTimeout>) => timers.current.push(t)

    Animated.timing(bgOp, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start()

    Animated.parallel([
      Animated.timing(hexOp, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(hexScale, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start()

    push(setTimeout(() => {
      Animated.spring(ring1, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }).start()
    }, 100))
    push(setTimeout(() => {
      Animated.spring(ring2, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }).start()
    }, 200))
    push(setTimeout(() => {
      Animated.spring(ring3, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }).start()
    }, 300))

    push(setTimeout(() => {
      let count = 0
      const typeNext = () => {
        count++
        setLetters(count)
        if (count < WORD.length) {
          push(setTimeout(typeNext, LETTER_INTERVAL))
        } else {
          cursorBlink.current = Animated.loop(
            Animated.sequence([
              Animated.timing(cursorOp, { toValue: 0, duration: 500, useNativeDriver: true }),
              Animated.timing(cursorOp, { toValue: 1, duration: 500, useNativeDriver: true }),
            ])
          )
          cursorBlink.current.start()
          push(setTimeout(() => {
            cursorBlink.current?.stop()
            Animated.timing(cursorOp, { toValue: 0, duration: 200, useNativeDriver: true }).start()
          }, 1500))
        }
      }
      typeNext()
    }, T_TYPE_START))

    push(setTimeout(() => {
      Animated.parallel([
        Animated.timing(barProgress, {
          toValue: 1,
          duration: 1600,
          useNativeDriver: false,
        }),
        Animated.timing(flareX, {
          toValue: BAR_W - 8,
          duration: 1600,
          useNativeDriver: false,
        }),
      ]).start()
    }, T_BAR_START))

    push(setTimeout(() => {
      setStatusText('AUTHENTICATING...')
      Animated.timing(statusOp, { toValue: 1, duration: 200, useNativeDriver: true }).start()
    }, T_STATUS_1))

    push(setTimeout(() => {
      Animated.timing(statusOp, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
        setStatusText('LOADING WORKSPACE...')
        Animated.timing(statusOp, { toValue: 1, duration: 200, useNativeDriver: true }).start()
      })
    }, T_STATUS_2))

    push(setTimeout(() => {
      Animated.timing(statusOp, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
        setStatusText('READY.')
        Animated.timing(statusOp, { toValue: 1, duration: 200, useNativeDriver: true }).start()
      })
      Animated.sequence([
        Animated.timing(hexPulse, { toValue: 1.08, duration: 200, useNativeDriver: true }),
        Animated.timing(hexPulse, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start()
    }, T_STATUS_3))

    push(setTimeout(() => {
      Animated.timing(statusOp, { toValue: 0, duration: 200, useNativeDriver: true }).start()
      Animated.timing(scanY, {
        toValue: sh,
        duration: SCAN_DURATION,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }).start(() => {
        Animated.timing(overlayOp, {
          toValue: 0,
          duration: FADE_OUT_DURATION,
          useNativeDriver: true,
        }).start(() => {
          onExitComplete()
        })
      })
    }, T_SCAN_START))

    return () => {
      timers.current.forEach(clearTimeout)
      timers.current = []
      cursorBlink.current?.stop()
    }
  }, [visible, bgOp, hexOp, hexScale, hexPulse, ring1, ring2, ring3, barProgress, flareX, statusOp, scanY, overlayOp, cursorOp, animProgress, sh, onExitComplete])

  useEffect(() => {
    if (progress > 0) {
      Animated.timing(animProgress, {
        toValue: progress,
        duration: 300,
        useNativeDriver: false,
      }).start()
    }
  }, [progress, animProgress])

  return (
    <Modal visible={visible} transparent={false} animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.root, { opacity: overlayOp }]}>
        <View style={styles.hexContainer}>
          {[ring1, ring2, ring3].map((ring, i) => (
            <Animated.View
              key={i}
              style={[
                styles.ring,
                {
                  width: 140 + i * 40,
                  height: 140 + i * 40,
                  borderRadius: (140 + i * 40) / 2,
                  opacity: ring.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 0.4 - i * 0.1],
                  }),
                  transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [1, 1.4] }) }],
                },
              ]}
            />
          ))}
          <Animated.View style={{ opacity: hexOp, transform: [{ scale: hexScale }] }}>
            <Animated.View style={{ transform: [{ scale: hexPulse }] }}>
              <Svg width={80} height={80} viewBox="0 0 100 100">
                <Polygon points="50,8 92,32 92,68 50,92 8,68 8,32" fill="#060B14" stroke="#2563EB" strokeWidth={2} />
                <Line x1={22} y1={22} x2={78} y2={78} stroke="#3B82F6" strokeWidth={10} strokeLinecap="round" />
                <Line x1={78} y1={22} x2={22} y2={78} stroke="#3B82F6" strokeWidth={10} strokeLinecap="round" />
                <Line x1={22} y1={22} x2={78} y2={78} stroke="#93c5fd" strokeWidth={3} strokeLinecap="round" opacity={0.8} />
                <Line x1={78} y1={22} x2={22} y2={78} stroke="#93c5fd" strokeWidth={3} strokeLinecap="round" opacity={0.8} />
                <Circle cx={50} cy={50} r={3.5} fill="#bfdbfe" />
              </Svg>
            </Animated.View>
          </Animated.View>
        </View>

        <View style={styles.wordmarkContainer}>
          <View style={styles.wordmarkRow}>
            <Text style={styles.wordmark}>{WORD.slice(0, letters)}</Text>
            {letters >= WORD.length && (
              <Animated.Text style={[styles.cursor, { opacity: cursorOp }]}>|</Animated.Text>
            )}
          </View>
        </View>

        <View style={styles.barContainer}>
          <View style={styles.barTrack}>
            <Animated.View
              style={[
                styles.barFill,
                {
                  width: barProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, BAR_W],
                  }),
                },
              ]}
            >
              <LinearGradient
                colors={['#1d4ed8', '#3B82F6', '#60a5fa']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
            <Animated.View style={[styles.flare, { left: flareX }]} />
          </View>
        </View>

        <Animated.Text style={[styles.status, { opacity: statusOp }]}>
          {statusText}
        </Animated.Text>

        <Animated.View
          pointerEvents="none"
          style={[
            styles.scanLine,
            {
              transform: [{ translateY: scanY }],
            },
          ]}
        >
          <LinearGradient
            colors={['transparent', '#93c5fd', '#ffffff', '#93c5fd', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </Animated.View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#03060D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hexContainer: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: '#2563EB',
  },
  wordmarkContainer: {
    marginTop: 24,
    minHeight: 36,
    justifyContent: 'center',
  },
  wordmarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 28,
    letterSpacing: 6,
    color: '#F1F5FF',
  },
  cursor: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 28,
    letterSpacing: 6,
    color: '#F1F5FF',
    marginLeft: 2,
  },
  barContainer: {
    marginTop: 32,
    width: BAR_W,
  },
  barTrack: {
    width: BAR_W,
    height: BAR_H,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  barFill: {
    height: BAR_H,
    borderRadius: 1,
  },
  flare: {
    position: 'absolute',
    top: -3,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 8,
  },
  status: {
    marginTop: 24,
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 11,
    color: '#4E6D92',
    letterSpacing: 2,
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 1,
  },
})

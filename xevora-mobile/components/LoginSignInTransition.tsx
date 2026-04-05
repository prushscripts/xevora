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

const BAR_W = 260
const BAR_H = 3
const WORD = 'XEVORA'

/** Wall-clock stages from overlay open: hex 0–500ms, type+bar 500–2000ms, ready+pulse 2000–2500ms, scan+fade 2500–3000ms */
const T_HEX_MS = 500
const T_TYPE_START_MS = 500
const LETTER_MS = 200
const T_BAR_START_MS = 500
const T_BAR_DURATION_MS = 1500
const T_READY_MS = 2000
const T_SCAN_MS = 2500
const SCAN_LINE_MS = 300
const FADE_OUT_MS = 200

type Props = {
  visible: boolean
  onTimelineComplete: () => void
}

export function LoginSignInTransition({
  visible,
  onTimelineComplete,
}: Props) {
  const { width: sw } = Dimensions.get('window')
  const hexOp = useRef(new Animated.Value(0)).current
  const hexScale = useRef(new Animated.Value(0.5)).current
  const hexPulse = useRef(new Animated.Value(1)).current
  const ringScales = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ]
  const [letters, setLetters] = useState(0)
  const [showBar, setShowBar] = useState(false)
  const barW = useRef(new Animated.Value(0)).current
  const flareX = useRef(new Animated.Value(0)).current
  const readyOp = useRef(new Animated.Value(0)).current
  const scanY = useRef(new Animated.Value(0)).current
  const rootOp = useRef(new Animated.Value(1)).current
  const cursorOp = useRef(new Animated.Value(1)).current
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const letterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cursorLoopRef = useRef<Animated.CompositeAnimation | null>(null)
  const timelineDone = useRef(false)

  useEffect(() => {
    if (!visible) {
      timers.current.forEach(clearTimeout)
      timers.current = []
      if (letterTimerRef.current) clearTimeout(letterTimerRef.current)
      letterTimerRef.current = null
      cursorLoopRef.current?.stop()
      cursorLoopRef.current = null
      timelineDone.current = false
      setLetters(0)
      setShowBar(false)
      hexOp.setValue(0)
      hexScale.setValue(0.5)
      hexPulse.setValue(1)
      ringScales.forEach((r) => r.setValue(0))
      barW.setValue(0)
      flareX.setValue(0)
      readyOp.setValue(0)
      scanY.setValue(0)
      rootOp.setValue(1)
      cursorOp.setValue(1)
      return
    }

    timelineDone.current = false

    const push = (id: ReturnType<typeof setTimeout>) => {
      timers.current.push(id)
    }

    Animated.parallel([
      Animated.timing(hexOp, {
        toValue: 1,
        duration: T_HEX_MS,
        useNativeDriver: true,
      }),
      Animated.spring(hexScale, {
        toValue: 1,
        friction: 7,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start()

    ringScales.forEach((r, i) => {
      push(
        setTimeout(() => {
          Animated.spring(r, {
            toValue: 1,
            friction: 6,
            tension: 40,
            useNativeDriver: true,
          }).start()
        }, i * 100)
      )
    })

    push(
      setTimeout(() => {
        let n = 0
        const revealNext = () => {
          n += 1
          setLetters(n)
          if (n >= WORD.length) {
            letterTimerRef.current = null
            cursorLoopRef.current?.stop()
            cursorLoopRef.current = Animated.loop(
              Animated.sequence([
                Animated.timing(cursorOp, {
                  toValue: 0,
                  duration: 500,
                  useNativeDriver: true,
                }),
                Animated.timing(cursorOp, {
                  toValue: 1,
                  duration: 500,
                  useNativeDriver: true,
                }),
              ])
            )
            cursorLoopRef.current.start()
            return
          }
          letterTimerRef.current = setTimeout(revealNext, LETTER_MS)
        }
        revealNext()
      }, T_TYPE_START_MS)
    )

    push(
      setTimeout(() => {
        setShowBar(true)
        Animated.parallel([
          Animated.timing(barW, {
            toValue: BAR_W,
            duration: T_BAR_DURATION_MS,
            useNativeDriver: false,
          }),
          Animated.timing(flareX, {
            toValue: BAR_W - 6,
            duration: T_BAR_DURATION_MS,
            useNativeDriver: false,
          }),
        ]).start()
      }, T_BAR_START_MS)
    )

    push(
      setTimeout(() => {
        Animated.timing(readyOp, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start()

        Animated.sequence([
          Animated.timing(hexPulse, {
            toValue: 1.1,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(hexPulse, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
        ]).start()
      }, T_READY_MS)
    )

    push(
      setTimeout(() => {
        scanY.setValue(0)
        Animated.timing(scanY, {
          toValue: sw,
          duration: SCAN_LINE_MS,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }).start(() => {
          Animated.timing(rootOp, {
            toValue: 0,
            duration: FADE_OUT_MS,
            useNativeDriver: true,
          }).start(() => {
            if (timelineDone.current) return
            timelineDone.current = true
            onTimelineComplete()
          })
        })
      }, T_SCAN_MS)
    )

    return () => {
      timers.current.forEach(clearTimeout)
      timers.current = []
      if (letterTimerRef.current) clearTimeout(letterTimerRef.current)
      letterTimerRef.current = null
      cursorLoopRef.current?.stop()
      cursorLoopRef.current = null
    }
  }, [visible, hexOp, hexScale, ringScales, onTimelineComplete, sw, barW, flareX, readyOp, scanY, rootOp, cursorOp])

  const typingDone = letters >= WORD.length

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="none"
      statusBarTranslucent
    >
      <Animated.View style={[styles.root, { opacity: rootOp }]}>
        <View style={styles.center}>
          {ringScales.map((rs, i) => (
            <Animated.View
              key={i}
              style={[
                styles.ring,
                {
                  width: 110 + i * 35,
                  height: 110 + i * 35,
                  borderRadius: (110 + i * 35) / 2,
                  marginLeft: -(110 + i * 35) / 2,
                  marginTop: -(110 + i * 35) / 2,
                  opacity: rs.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 0.35 - i * 0.08],
                  }),
                  transform: [{ scale: rs }],
                },
              ]}
            />
          ))}

          <Animated.View
            style={{
              opacity: hexOp,
              transform: [{ scale: hexScale }],
            }}
          >
            <Animated.View style={{ transform: [{ scale: hexPulse }] }}>
              <Svg width={88} height={88} viewBox="0 0 100 100">
                <G>
                  <Polygon
                    points="50,8 92,32 92,68 50,92 8,68 8,32"
                    fill="#060B14"
                    stroke="#1E3A6E"
                    strokeWidth={1.5}
                  />
                  <Line
                    x1={22}
                    y1={22}
                    x2={78}
                    y2={78}
                    stroke="#3B82F6"
                    strokeWidth={10}
                    strokeLinecap="round"
                  />
                  <Line
                    x1={78}
                    y1={22}
                    x2={22}
                    y2={78}
                    stroke="#3B82F6"
                    strokeWidth={10}
                    strokeLinecap="round"
                  />
                  <Line
                    x1={22}
                    y1={22}
                    x2={78}
                    y2={78}
                    stroke="#93c5fd"
                    strokeWidth={3}
                    strokeLinecap="round"
                    opacity={0.75}
                  />
                  <Line
                    x1={78}
                    y1={22}
                    x2={22}
                    y2={78}
                    stroke="#93c5fd"
                    strokeWidth={3}
                    strokeLinecap="round"
                    opacity={0.75}
                  />
                  <Circle cx={50} cy={50} r={3.5} fill="#bfdbfe" />
                </G>
              </Svg>
            </Animated.View>
          </Animated.View>
        </View>

        <View style={styles.wordmarkBlock}>
          <View style={styles.wordmarkRow}>
            <Text style={styles.wordmark}>{WORD.slice(0, letters)}</Text>
            {typingDone ? (
              <Animated.Text style={[styles.cursor, { opacity: cursorOp }]}>
                |
              </Animated.Text>
            ) : null}
          </View>
        </View>

        {showBar ? (
          <View style={styles.barSection}>
            <View style={styles.barTrack}>
              <Animated.View style={[styles.barFillWrap, { width: barW }]}>
                <LinearGradient
                  colors={['#1D4ED8', '#3B82F6', '#60A5FA']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
              </Animated.View>
              <Animated.View
                style={[
                  styles.flare,
                  {
                    left: flareX,
                  },
                ]}
              />
            </View>
          </View>
        ) : null}

        <Animated.Text style={[styles.ready, { opacity: readyOp }]}>
          READY.
        </Animated.Text>

        <Animated.View
          pointerEvents="none"
          style={[
            styles.scan,
            {
              transform: [{ translateY: scanY }],
            },
          ]}
        />
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
  center: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    borderWidth: 1,
    borderColor: '#2563EB',
  },
  wordmarkBlock: {
    marginTop: 24,
    minHeight: 40,
    justifyContent: 'center',
  },
  wordmarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 22,
    letterSpacing: 6,
    color: '#F1F5FF',
    textAlign: 'center',
  },
  cursor: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 22,
    letterSpacing: 6,
    color: '#F1F5FF',
  },
  barSection: {
    marginTop: 28,
    width: BAR_W,
  },
  barTrack: {
    width: BAR_W,
    height: BAR_H,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  barFillWrap: {
    height: BAR_H,
    overflow: 'hidden',
    borderRadius: 2,
  },
  flare: {
    position: 'absolute',
    top: -3,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#fff',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 6,
  },
  ready: {
    marginTop: 20,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 18,
    color: '#3B82F6',
    letterSpacing: 2,
  },
  scan: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 15,
    elevation: 12,
  },
})

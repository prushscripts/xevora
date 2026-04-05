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

type Props = {
  visible: boolean
  progress: number
  onExitComplete: () => void
}

export function LoginSignInTransition({
  visible,
  progress,
  onExitComplete,
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
  const [showCursor, setShowCursor] = useState(false)
  const barW = useRef(new Animated.Value(0)).current
  const flareX = useRef(new Animated.Value(0)).current
  const readyOp = useRef(new Animated.Value(0)).current
  const scanY = useRef(new Animated.Value(0)).current
  const rootOp = useRef(new Animated.Value(1)).current
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const exitStarted = useRef(false)

  useEffect(() => {
    if (!visible) {
      timers.current.forEach(clearTimeout)
      timers.current = []
      if (intervalRef.current) clearInterval(intervalRef.current)
      intervalRef.current = null
      exitStarted.current = false
      setLetters(0)
      setShowBar(false)
      setShowCursor(false)
      hexOp.setValue(0)
      hexScale.setValue(0.5)
      hexPulse.setValue(1)
      ringScales.forEach((r) => r.setValue(0))
      barW.setValue(0)
      flareX.setValue(0)
      readyOp.setValue(0)
      scanY.setValue(0)
      rootOp.setValue(1)
      return
    }

    Animated.parallel([
      Animated.timing(hexOp, {
        toValue: 1,
        duration: 400,
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
      timers.current.push(
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

    timers.current.push(
      setTimeout(() => {
        let n = 0
        intervalRef.current = setInterval(() => {
          n += 1
          setLetters(n)
          if (n >= WORD.length) {
            if (intervalRef.current) clearInterval(intervalRef.current)
            intervalRef.current = null
            setShowCursor(true)
          }
        }, 160)
      }, 400)
    )

    timers.current.push(setTimeout(() => setShowBar(true), 600))

    return () => {
      timers.current.forEach(clearTimeout)
      timers.current = []
      if (intervalRef.current) clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [visible, hexOp, hexScale, ringScales])

  useEffect(() => {
    if (!visible) return
    const w = Math.max(0, Math.min(1, progress)) * BAR_W
    Animated.parallel([
      Animated.timing(barW, {
        toValue: w,
        duration: 220,
        useNativeDriver: false,
      }),
      Animated.timing(flareX, {
        toValue: Math.max(0, w - 6),
        duration: 220,
        useNativeDriver: false,
      }),
    ]).start()
  }, [progress, visible, barW, flareX])

  useEffect(() => {
    if (!visible || progress < 1 || exitStarted.current) return
    exitStarted.current = true

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

    scanY.setValue(0)
    Animated.timing(scanY, {
      toValue: sw,
      duration: 400,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      Animated.timing(rootOp, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        onExitComplete()
      })
    })
  }, [progress, visible, readyOp, hexPulse, scanY, rootOp, sw, onExitComplete])

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
          <Text style={styles.wordmark}>
            {WORD.slice(0, letters)}
            {showCursor ? <Text style={styles.cursor}>|</Text> : null}
          </Text>
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
  wordmark: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 22,
    letterSpacing: 6,
    color: '#F1F5FF',
    textAlign: 'center',
  },
  cursor: {
    opacity: 0.6,
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

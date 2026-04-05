import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Modal,
} from 'react-native';
import Svg, { Polygon, Line, Circle, G } from 'react-native-svg';

type Props = {
  visible: boolean;
  firstName: string;
  target: 'admin' | 'driver';
  onComplete: (dest: 'admin' | 'driver') => void;
};

export function LoginTransitionOverlay({
  visible,
  firstName,
  target,
  onComplete,
}: Props) {
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const targetRef = useRef(target);
  targetRef.current = target;

  const [phase, setPhase] = useState(0);
  const overlayOp = useRef(new Animated.Value(0)).current;
  const hexScale = useRef(new Animated.Value(0.3)).current;
  const authOp = useRef(new Animated.Value(0)).current;
  const welcomeOp = useRef(new Animated.Value(0)).current;
  const textFade = useRef(new Animated.Value(1)).current;
  const hexBlow = useRef(new Animated.Value(1)).current;
  const flashOp = useRef(new Animated.Value(0)).current;
  const hexPulse = useRef(new Animated.Value(1)).current;
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (!visible) {
      timers.current.forEach(clearTimeout);
      timers.current = [];
      pulseLoop.current?.stop();
      pulseLoop.current = null;
      setPhase(0);
      overlayOp.setValue(0);
      hexScale.setValue(0.3);
      authOp.setValue(0);
      welcomeOp.setValue(0);
      textFade.setValue(1);
      hexBlow.setValue(1);
      flashOp.setValue(0);
      hexPulse.setValue(1);
      return;
    }

    targetRef.current = target;

    timers.current.forEach(clearTimeout);
    timers.current = [];

    Animated.parallel([
      Animated.timing(overlayOp, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(hexScale, {
        toValue: 1,
        friction: 7,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start();

    timers.current.push(
      setTimeout(() => {
        setPhase(1);
        Animated.timing(authOp, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }).start();
      }, 300)
    );

    timers.current.push(
      setTimeout(() => {
        setPhase(2);
        Animated.timing(welcomeOp, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }).start();
        pulseLoop.current = Animated.loop(
          Animated.sequence([
            Animated.timing(hexPulse, {
              toValue: 1,
              duration: 280,
              useNativeDriver: true,
            }),
            Animated.timing(hexPulse, {
              toValue: 0.55,
              duration: 280,
              useNativeDriver: true,
            }),
          ])
        );
        pulseLoop.current.start();
      }, 1200)
    );

    timers.current.push(
      setTimeout(() => {
        pulseLoop.current?.stop();
        pulseLoop.current = null;
      }, 1780)
    );

    timers.current.push(
      setTimeout(() => {
        setPhase(3);
        Animated.parallel([
          Animated.timing(textFade, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(hexBlow, {
            toValue: 20,
            duration: 600,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start(() => {
          Animated.sequence([
            Animated.timing(flashOp, {
              toValue: 1,
              duration: 100,
              useNativeDriver: true,
            }),
            Animated.timing(flashOp, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start();
        });
      }, 1800)
    );

    timers.current.push(
      setTimeout(() => {
        onCompleteRef.current(targetRef.current);
      }, 2400)
    );

    return () => {
      timers.current.forEach(clearTimeout);
      pulseLoop.current?.stop();
    };
  }, [
    visible,
    overlayOp,
    hexScale,
    authOp,
    welcomeOp,
    textFade,
    hexBlow,
    flashOp,
    hexPulse,
  ]);

  if (!visible) return null;

  const displayName = firstName.trim() || 'Driver';

  return (
    <Modal visible transparent animationType="none">
      <Animated.View
        style={[styles.overlay, { opacity: overlayOp }]}
        pointerEvents="auto"
      >
        <Animated.View
          style={{
            opacity: flashOp,
            ...StyleSheet.absoluteFillObject,
            backgroundColor: '#F1F5FF',
          }}
        />

        <Animated.View
          style={[
            styles.centerWrap,
            {
              opacity: hexPulse,
              transform: [{ scale: hexBlow }],
            },
          ]}
        >
          <Animated.View style={{ transform: [{ scale: hexScale }] }}>
            <Svg width={100} height={100} viewBox="0 0 100 100">
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
                  opacity={0.85}
                />
                <Line
                  x1={78}
                  y1={22}
                  x2={22}
                  y2={78}
                  stroke="#93c5fd"
                  strokeWidth={3}
                  strokeLinecap="round"
                  opacity={0.85}
                />
                <Circle cx={50} cy={50} r={3.5} fill="#bfdbfe" />
              </G>
            </Svg>
          </Animated.View>
        </Animated.View>

        <Animated.View
          style={[styles.textBlock, { opacity: textFade }]}
          pointerEvents="none"
        >
          {phase >= 1 && phase < 2 && (
            <Animated.View style={{ opacity: authOp, alignItems: 'center' }}>
              <Text style={styles.monoMuted}>AUTHENTICATING</Text>
              <DotRow />
            </Animated.View>
          )}
          {phase >= 2 && (
            <Animated.View style={{ opacity: welcomeOp, alignItems: 'center' }}>
              <Text style={styles.welcomeTitle}>
                WELCOME BACK, {displayName.toUpperCase()}
              </Text>
              <Text style={styles.monoMutedSmall}>
                LOADING YOUR WORKSPACE...
              </Text>
            </Animated.View>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

function DotRow() {
  const [dot, setDot] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setDot((d) => (d + 1) % 4), 320);
    return () => clearInterval(id);
  }, []);
  const label = dot === 0 ? '' : dot === 1 ? '.' : dot === 2 ? '..' : '...';
  return <Text style={styles.dots}>{label}</Text>;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#03060D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: {
    position: 'absolute',
    bottom: '28%',
    left: 24,
    right: 24,
    alignItems: 'center',
  },
  monoMuted: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 11,
    letterSpacing: 4,
    color: '#4E6D92',
    textAlign: 'center',
  },
  monoMutedSmall: {
    marginTop: 10,
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 10,
    letterSpacing: 2,
    color: '#4E6D92',
    textAlign: 'center',
  },
  welcomeTitle: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 12,
    letterSpacing: 2,
    color: '#3B82F6',
    textAlign: 'center',
  },
  dots: {
    marginTop: 8,
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 18,
    color: '#4E6D92',
    height: 24,
    textAlign: 'center',
  },
});

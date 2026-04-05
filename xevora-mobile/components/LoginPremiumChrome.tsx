import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Polygon, Line, Circle, G } from 'react-native-svg';

const VERTICES: [number, number][] = [
  [50, 8],
  [92, 32],
  [92, 68],
  [50, 92],
  [8, 68],
  [8, 32],
];

function lerpHex(t: number): { x: number; y: number } {
  const n = VERTICES.length;
  const seg = (t % 1) * n;
  const i = Math.floor(seg) % n;
  const f = seg - Math.floor(seg);
  const a = VERTICES[i]!;
  const b = VERTICES[(i + 1) % n]!;
  return {
    x: a[0] + (b[0] - a[0]) * f,
    y: a[1] + (b[1] - a[1]) * f,
  };
}

export function LoginStarBackdrop({
  width,
  height,
}: {
  width: number;
  height: number;
}) {
  const stars = useMemo(
    () =>
      Array.from({ length: 50 }, (_, i) => ({
        id: i,
        x: Math.random() * width,
        y: Math.random() * height * 0.6,
        size: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.25 + 0.05,
      })),
    [width, height]
  );

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {stars.map((star) => (
        <View
          key={star.id}
          style={{
            position: 'absolute',
            left: star.x,
            top: star.y,
            width: star.size,
            height: star.size,
            borderRadius: star.size,
            backgroundColor: '#ffffff',
            opacity: star.opacity,
          }}
        />
      ))}
    </View>
  );
}

export function LoginHexArt() {
  const [ball, setBall] = useState(() => lerpHex(0));
  const tRef = useRef(0);

  useEffect(() => {
    const id = setInterval(() => {
      tRef.current += 16 / 2600;
      if (tRef.current >= 1) tRef.current -= 1;
      setBall(lerpHex(tRef.current));
    }, 16);
    return () => clearInterval(id);
  }, []);

  const ring1 = useRef(new Animated.Value(0.3)).current;
  const ring2 = useRef(new Animated.Value(0.22)).current;
  const ring3 = useRef(new Animated.Value(0.14)).current;

  useEffect(() => {
    const makeLoop = (v: Animated.Value) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, {
            toValue: 0.08,
            duration: 1400,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(v, {
            toValue: 0.3,
            duration: 1400,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );

    const l1 = makeLoop(ring1);
    const l2 = makeLoop(ring2);
    const l3 = makeLoop(ring3);
    l1.start();
    const t2 = setTimeout(() => l2.start(), 400);
    const t3 = setTimeout(() => l3.start(), 800);
    return () => {
      clearTimeout(t2);
      clearTimeout(t3);
      l1.stop();
      l2.stop();
      l3.stop();
    };
  }, [ring1, ring2, ring3]);

  return (
    <View style={styles.hexStage} pointerEvents="none">
      {[
        { size: 180, opacity: ring3 },
        { size: 145, opacity: ring2 },
        { size: 110, opacity: ring1 },
      ].map((ring) => (
        <Animated.View
          key={ring.size}
          style={[
            styles.ring,
            {
              width: ring.size,
              height: ring.size,
              borderRadius: ring.size / 2,
              marginLeft: -ring.size / 2,
              marginTop: -ring.size / 2,
              opacity: ring.opacity,
            },
          ]}
        />
      ))}

      <Svg width={90} height={90} viewBox="0 0 100 100">
        <G>
          <Polygon
            points="50,8 92,32 92,68 50,92 8,68 8,32"
            fill="#060B14"
            stroke="#1E3A6E"
            strokeWidth={1.5}
          />
          <Polygon
            points="50,14 86,35 86,65 50,86 14,65 14,35"
            fill="none"
            stroke="#2563EB"
            strokeWidth={1}
            opacity={0.4}
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
            opacity={0.7}
          />
          <Line
            x1={78}
            y1={22}
            x2={22}
            y2={78}
            stroke="#93c5fd"
            strokeWidth={3}
            strokeLinecap="round"
            opacity={0.7}
          />
          <Circle cx={50} cy={50} r={3.5} fill="#bfdbfe" />
          <Circle
            cx={ball.x}
            cy={ball.y}
            r={9}
            fill="#3B82F6"
            opacity={0.25}
          />
          <Circle cx={ball.x} cy={ball.y} r={4.5} fill="#ffffff" />
        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  hexStage: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  ring: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    borderWidth: 1,
    borderColor: '#2563EB',
    backgroundColor: 'transparent',
  },
});

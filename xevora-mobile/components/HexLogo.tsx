import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import Svg, { Polygon, Path } from 'react-native-svg';
import { theme } from '../constants/theme';

type HexLogoProps = {
  size?: number;
  glowColor?: string;
  animated?: boolean;
};

export function HexLogo({ size = 76, glowColor = theme.primary, animated = true }: HexLogoProps) {
  const ring1Opacity = useRef(new Animated.Value(0.2)).current;
  const ring2Opacity = useRef(new Animated.Value(0.12)).current;
  const ring3Opacity = useRef(new Animated.Value(0.07)).current;
  const ring1Scale = useRef(new Animated.Value(1)).current;
  const ring2Scale = useRef(new Animated.Value(1)).current;
  const ring3Scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!animated) return;

    const createPulse = (opacity: Animated.Value, scale: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(opacity, {
              toValue: 0.4,
              duration: 1600,
              useNativeDriver: true,
            }),
            Animated.timing(scale, {
              toValue: 1.1,
              duration: 1600,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(opacity, {
              toValue: 0.2,
              duration: 1600,
              useNativeDriver: true,
            }),
            Animated.timing(scale, {
              toValue: 1,
              duration: 1600,
              useNativeDriver: true,
            }),
          ]),
        ])
      );
    };

    const anim1 = createPulse(ring1Opacity, ring1Scale, 0);
    const anim2 = createPulse(ring2Opacity, ring2Scale, 400);
    const anim3 = createPulse(ring3Opacity, ring3Scale, 800);

    anim1.start();
    anim2.start();
    anim3.start();

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
    };
  }, [animated]);

  const ringSize1 = size * 4.2;
  const ringSize2 = size * 3;
  const ringSize3 = size * 2.1;

  return (
    <View style={[styles.container, { width: ringSize1, height: ringSize1 }]}>
      <Animated.View
        style={[
          styles.ring,
          {
            width: ringSize1,
            height: ringSize1,
            borderRadius: ringSize1 / 2,
            opacity: ring1Opacity,
            transform: [{ scale: ring1Scale }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.ring,
          {
            width: ringSize2,
            height: ringSize2,
            borderRadius: ringSize2 / 2,
            opacity: ring2Opacity,
            transform: [{ scale: ring2Scale }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.ring,
          {
            width: ringSize3,
            height: ringSize3,
            borderRadius: ringSize3 / 2,
            opacity: ring3Opacity,
            transform: [{ scale: ring3Scale }],
          },
        ]}
      />
      <View
        style={[
          styles.hexContainer,
          {
            width: size,
            height: size,
            borderRadius: size * 0.18,
          },
        ]}
      >
        <Svg width={size * 0.6} height={size * 0.6} viewBox="0 0 100 100">
          <Polygon
            points="50,6 89,28 89,72 50,94 11,72 11,28"
            fill={theme.surface}
            stroke={glowColor}
            strokeWidth="2.5"
          />
          <Path
            d="M33,25 L43,25 L50,37 L57,25 L67,25 L55,50 L67,75 L57,75 L50,63 L43,75 L33,75 L45,50 Z"
            fill={glowColor}
          />
          <Polygon points="50,43 57,50 50,57 43,50" fill={theme.bright} />
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: theme.primary,
  },
  hexContainer: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: 'rgba(37,99,235,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
});

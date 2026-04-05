import React, { useEffect, useRef } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import * as Haptics from 'expo-haptics'
import Svg, { Path, Circle, Rect } from 'react-native-svg'

const { width: SCREEN_W } = Dimensions.get('window')

const TAB_COUNT = 6
const TAB_W = SCREEN_W / TAB_COUNT

const inactive = '#4E6D92'
const active = '#3B82F6'

function Icon({
  name,
  color,
}: {
  name: 'home' | 'clock' | 'timecard' | 'pay' | 'vault' | 'profile'
  color: string
}) {
  switch (name) {
    case 'home':
      return (
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <Path
            d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M9 22V12h6v10"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      )
    case 'clock':
      return (
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <Circle cx={12} cy={12} r={10} stroke={color} strokeWidth={2} />
          <Path
            d="M12 6v6l4 2"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
          />
        </Svg>
      )
    case 'timecard':
      return (
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <Rect x={4} y={4} width={16} height={18} rx={2} stroke={color} strokeWidth={2} />
          <Path d="M8 9h8M8 13h6M8 17h4" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
        </Svg>
      )
    case 'pay':
      return (
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={2} />
          <Path
            d="M12 8v8M14 10h-3.5a1.5 1.5 0 0 0 0 3H13a1.5 1.5 0 0 1 0 3h-3"
            stroke={color}
            strokeWidth={1.8}
            strokeLinecap="round"
          />
        </Svg>
      )
    case 'vault':
      return (
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <Rect x={5} y={10} width={14} height={11} rx={2} stroke={color} strokeWidth={2} />
          <Path
            d="M9 10V8a3 3 0 0 1 6 0v2"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
          />
          <Circle cx={12} cy={15} r={1.5} fill={color} />
        </Svg>
      )
    case 'profile':
      return (
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <Circle cx={12} cy={9} r={4} stroke={color} strokeWidth={2} />
          <Path
            d="M6 21v-1a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v1"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
          />
        </Svg>
      )
    default:
      return null
  }
}

const ROUTES = [
  { key: 'index', label: 'Home', icon: 'home' as const },
  { key: 'clock', label: 'Clock', icon: 'clock' as const },
  { key: 'timecard', label: 'Timecard', icon: 'timecard' as const },
  { key: 'pay', label: 'Pay', icon: 'pay' as const },
  { key: 'vault', label: 'Vault', icon: 'vault' as const },
  { key: 'profile', label: 'Profile', icon: 'profile' as const },
]

export function DriverTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets()
  const pillX = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const idx = state.index
    Animated.spring(pillX, {
      toValue: idx * TAB_W + TAB_W / 2 - 8,
      friction: 8,
      tension: 80,
      useNativeDriver: true,
    }).start()
  }, [state.index, pillX])

  const height = 64 + insets.bottom

  return (
    <View style={[styles.wrap, { height, paddingBottom: insets.bottom }]}>
      <View style={styles.row}>
        <Animated.View
          style={[
            styles.pill,
            {
              transform: [{ translateX: pillX }],
            },
          ]}
        />
        {state.routes.map((route, index) => {
          const focused = state.index === index
          const { options } = descriptors[route.key]
          const label =
            options.title ??
            ROUTES.find((r) => r.key === route.name)?.label ??
            route.name
          const iconName = (ROUTES.find((r) => r.key === route.name)?.icon ??
            'home') as 'home' | 'clock' | 'timecard' | 'pay' | 'vault' | 'profile'

          const onPress = () => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            })
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name)
            }
          }

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              onPress={onPress}
              style={styles.tab}
              activeOpacity={0.7}
            >
              <Icon name={iconName} color={focused ? active : inactive} />
              <Text
                style={[styles.label, { color: focused ? active : inactive }]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#060B14',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  pill: {
    position: 'absolute',
    top: 6,
    left: 0,
    width: 16,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#3B82F6',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: 8,
  },
  label: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans_500Medium',
  },
})

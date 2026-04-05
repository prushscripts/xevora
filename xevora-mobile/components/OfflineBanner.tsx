import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { theme } from '../constants/theme'

export function OfflineBanner() {
  return (
    <View style={styles.wrap} accessibilityRole="alert">
      <Text style={styles.text}>Offline — showing cached data</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245,158,11,0.35)',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  text: {
    color: theme.warning,
    fontSize: 12,
    fontFamily: theme.bodyMedium,
    textAlign: 'center',
  },
})

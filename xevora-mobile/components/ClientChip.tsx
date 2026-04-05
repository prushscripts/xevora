import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../constants/theme';

type ClientChipProps = {
  abbreviation: string;
  isActive?: boolean;
  dotColor?: string;
};

export function ClientChip({
  abbreviation,
  isActive = false,
  dotColor = '#3B82F6',
}: ClientChipProps) {
  return (
    <View style={styles.container}>
      <View
        style={[
          isActive ? styles.pulseDot : styles.staticDot,
          !isActive && { backgroundColor: dotColor },
        ]}
      />
      <Text style={styles.text}>{abbreviation}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(37,99,235,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(37,99,235,0.3)',
    gap: 6,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.success,
  },
  staticDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.bright,
    letterSpacing: 0.5,
  },
});

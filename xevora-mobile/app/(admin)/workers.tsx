import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../constants/theme';

export default function WorkersScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        decelerationRate="fast"
      >
        <Text style={styles.title}>Workers</Text>

        <View style={styles.searchSection}>
          <Text style={styles.searchPlaceholder}>Search workers...</Text>
        </View>

        <View style={styles.workersList}>
          <Text style={styles.emptyText}>No workers found</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.text,
    fontFamily: theme.heading,
  },
  searchSection: {
    backgroundColor: theme.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.border,
  },
  searchPlaceholder: {
    fontSize: 15,
    color: theme.muted,
    fontFamily: theme.body,
  },
  workersList: {
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: theme.muted,
    textAlign: 'center',
    paddingVertical: 40,
    fontFamily: theme.body,
  },
});

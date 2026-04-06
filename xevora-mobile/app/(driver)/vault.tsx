import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../constants/theme';

export default function VaultScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        decelerationRate="fast"
      >
        <Text style={styles.title}>Xevora Vault</Text>

        <View style={styles.setupCard}>
          <Text style={styles.setupTitle}>Set Up Your Tax Vault</Text>
          <Text style={styles.setupDesc}>
            Automatically set aside a percentage of each paycheck for taxes. Perfect for 1099 contractors.
          </Text>
          <TouchableOpacity style={styles.activateBtn}>
            <Text style={styles.activateBtnText}>Activate Vault</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoText}>
            The Vault helps you save for quarterly tax payments by automatically setting aside funds from each paycheck.
          </Text>
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
  setupCard: {
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderColor: theme.border,
    borderLeftColor: theme.warning,
    gap: 16,
  },
  setupTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.text,
    fontFamily: theme.bodyMedium,
  },
  setupDesc: {
    fontSize: 14,
    color: theme.muted,
    lineHeight: 20,
    fontFamily: theme.body,
  },
  activateBtn: {
    backgroundColor: theme.warning,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  activateBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: theme.bodyMedium,
  },
  infoSection: {
    backgroundColor: theme.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.border,
  },
  infoText: {
    fontSize: 13,
    color: theme.muted,
    lineHeight: 18,
    fontFamily: theme.body,
  },
});

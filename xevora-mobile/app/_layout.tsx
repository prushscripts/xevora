import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { useFonts } from 'expo-font';
import {
  PlusJakartaSans_300Light,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
} from '@expo-google-fonts/jetbrains-mono';
import { HexLogo } from '../components/HexLogo';
import { useAuth } from '../hooks/useAuth';
import { theme } from '../constants/theme';
import '../global.css';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_300Light,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
  });

  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    if (loading || !fontsLoaded || isNavigating) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      setIsNavigating(true);
      router.replace('/(auth)/login');
      setTimeout(() => setIsNavigating(false), 100);
    } else if (user && inAuthGroup) {
      setIsNavigating(true);
      if (user.role === 'driver') {
        router.replace('/(driver)/');
      } else {
        router.replace('/(admin)/');
      }
      setTimeout(() => setIsNavigating(false), 100);
    }
  }, [user, loading, segments, fontsLoaded]);

  if (!fontsLoaded || loading) {
    return (
      <View style={styles.loadingContainer}>
        <HexLogo size={120} animated />
        <ActivityIndicator size="large" color={theme.primary} style={styles.spinner} />
      </View>
    );
  }

  return <Slot />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    marginTop: 40,
  },
});

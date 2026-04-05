import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
  Animated,
  Dimensions,
  Modal,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Svg, { Polygon, Line, Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { useFonts, PlusJakartaSans_300Light, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold } from '@expo-google-fonts/plus-jakarta-sans';
import { JetBrainsMono_400Regular } from '@expo-google-fonts/jetbrains-mono';
import { supabase } from '../../lib/supabase';
import { theme } from '../../constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const STARS = Array.from({ length: 40 }, (_, i) => ({
  x: Math.random() * SCREEN_WIDTH,
  y: Math.random() * SCREEN_HEIGHT * 0.6,
  size: Math.random() * 2 + 1,
  opacity: Math.random() * 0.2 + 0.1,
  pulses: i < 12,
}));

const FIELD_SCROLL_POSITIONS: Record<string, number> = {
  companyCode: 0,
  fullName: 80,
  email: 160,
  password: 240,
  confirmPassword: 320,
};

const HEX_VERTICES = [
  { x: 50, y: 8 },
  { x: 92, y: 32 },
  { x: 92, y: 68 },
  { x: 50, y: 92 },
  { x: 8, y: 68 },
  { x: 8, y: 32 },
];

interface InputFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  fieldName: string;
  inputRef: React.RefObject<TextInput | null>;
  nextRef?: React.RefObject<TextInput | null>;
  secureTextEntry?: boolean;
  showToggle?: boolean;
  onToggleShow?: () => void;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  textContentType?: TextInput['props']['textContentType'];
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoComplete?: TextInput['props']['autoComplete'];
  returnKeyType?: 'done' | 'go' | 'next' | 'search' | 'send';
  onSubmitEditing?: () => void;
  scrollY?: number;
  focusedField: string | null;
  setFocusedField: (field: string | null) => void;
  scrollViewRef: React.RefObject<ScrollView | null>;
  editable?: boolean;
}

const InputField = ({
  label,
  value,
  onChangeText,
  placeholder,
  fieldName,
  inputRef,
  nextRef,
  secureTextEntry = false,
  showToggle = false,
  onToggleShow,
  keyboardType = 'default',
  textContentType = 'none',
  autoCapitalize = 'none',
  autoComplete = 'off',
  returnKeyType = 'next',
  onSubmitEditing,
  scrollY = 0,
  focusedField,
  setFocusedField,
  scrollViewRef,
  editable = true,
}: InputFieldProps) => {
  const isFocused = focusedField === fieldName;

  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{
        fontFamily: 'JetBrainsMono_400Regular',
        fontSize: 10,
        color: '#4E6D92',
        letterSpacing: 1.5,
        marginBottom: 8,
        textTransform: 'uppercase'
      }}>
        {label}
      </Text>
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0A1628',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: isFocused ? '#2563EB' : 'rgba(255,255,255,0.08)',
        shadowColor: isFocused ? '#2563EB' : 'transparent',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: isFocused ? 0.3 : 0,
        shadowRadius: isFocused ? 8 : 0,
        elevation: isFocused ? 4 : 0,
      }}>
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#4E6D92"
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          textContentType={textContentType}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          autoCorrect={false}
          spellCheck={false}
          returnKeyType={nextRef ? 'next' : 'done'}
          blurOnSubmit={!nextRef}
          onSubmitEditing={() => {
            if (nextRef) {
              nextRef.current?.focus();
            } else {
              Keyboard.dismiss();
              onSubmitEditing?.();
            }
          }}
          onFocus={() => {
            setFocusedField(fieldName);
            scrollViewRef.current?.scrollTo({
              y: scrollY,
              animated: true
            });
          }}
          onBlur={() => setFocusedField(null)}
          selectionColor="#3B82F6"
          cursorColor="#3B82F6"
          editable={editable}
          style={{
            flex: 1,
            paddingHorizontal: 16,
            paddingVertical: 14,
            fontSize: 16,
            color: '#F1F5FF',
            fontFamily: 'PlusJakartaSans_400Regular',
            backgroundColor: 'transparent',
          }}
        />
        {showToggle && (
          <TouchableOpacity
            onPress={onToggleShow}
            style={{ paddingHorizontal: 16, paddingVertical: 14 }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={{ color: '#4E6D92', fontSize: 12 }}>
              {secureTextEntry ? 'SHOW' : 'HIDE'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

function AnimatedHexLogo({ size = 200 }) {
  const scale = size / 100;
  const orbitProgress = useRef(new Animated.Value(0)).current;
  const ring1Opacity = useRef(new Animated.Value(0.1)).current;
  const ring2Opacity = useRef(new Animated.Value(0.1)).current;
  const ring3Opacity = useRef(new Animated.Value(0.1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(orbitProgress, {
        toValue: 1,
        duration: 2600,
        useNativeDriver: true,
      })
    ).start();

    const createRingPulse = (opacityValue: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(opacityValue, {
            toValue: 0.5,
            duration: 1400,
            useNativeDriver: true,
          }),
          Animated.timing(opacityValue, {
            toValue: 0.1,
            duration: 1400,
            useNativeDriver: true,
          }),
        ])
      );
    };

    Animated.parallel([
      createRingPulse(ring1Opacity, 0),
      createRingPulse(ring2Opacity, 400),
      createRingPulse(ring3Opacity, 800),
    ]).start();
  }, []);

  const getOrbitPosition = (progress: number) => {
    const segmentLength = 1 / 6;
    const segment = Math.floor(progress / segmentLength);
    const localProgress = (progress % segmentLength) / segmentLength;
    
    const startVertex = HEX_VERTICES[segment];
    const endVertex = HEX_VERTICES[(segment + 1) % 6];
    
    const x = startVertex.x + (endVertex.x - startVertex.x) * localProgress;
    const y = startVertex.y + (endVertex.y - startVertex.y) * localProgress;
    
    return { x: x * scale, y: y * scale };
  };

  const ballX = orbitProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const ballY = orbitProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <RadialGradient id="hexbg" cx="50%" cy="50%" r="60%">
            <Stop offset="0%" stopColor="#0B1A3E" />
            <Stop offset="100%" stopColor="#03060D" />
          </RadialGradient>
        </Defs>
        
        <AnimatedCircle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="#2563EB"
          strokeWidth="0.5"
          opacity={ring3Opacity}
        />
        <AnimatedCircle
          cx="50"
          cy="50"
          r="38"
          fill="none"
          stroke="#2563EB"
          strokeWidth="0.5"
          opacity={ring2Opacity}
        />
        <AnimatedCircle
          cx="50"
          cy="50"
          r="31"
          fill="none"
          stroke="#2563EB"
          strokeWidth="0.5"
          opacity={ring1Opacity}
        />
        
        <Polygon
          points="50,8 92,32 92,68 50,92 8,68 8,32"
          fill="url(#hexbg)"
          stroke="#1E3A6E"
          strokeWidth="1.5"
        />
        
        <Line x1="18" y1="18" x2="82" y2="82" stroke="#1d4ed8" strokeWidth="14" strokeLinecap="round" opacity="0.6" />
        <Line x1="82" y1="18" x2="18" y2="82" stroke="#1d4ed8" strokeWidth="14" strokeLinecap="round" opacity="0.6" />
        <Line x1="18" y1="18" x2="82" y2="82" stroke="#3B82F6" strokeWidth="8" strokeLinecap="round" />
        <Line x1="82" y1="18" x2="18" y2="82" stroke="#3B82F6" strokeWidth="8" strokeLinecap="round" />
        <Line x1="18" y1="18" x2="82" y2="82" stroke="#93c5fd" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
        <Line x1="82" y1="18" x2="18" y2="82" stroke="#93c5fd" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
        
        <Circle cx="50" cy="50" r="3" fill="#bfdbfe" opacity="0.9" />
      </Svg>
      
      <Animated.View
        style={{
          position: 'absolute',
          transform: [
            {
              translateX: orbitProgress.interpolate({
                inputRange: [0, 0.166, 0.333, 0.5, 0.666, 0.833, 1],
                outputRange: HEX_VERTICES.map(v => v.x * scale).concat([HEX_VERTICES[0].x * scale]),
              }),
            },
            {
              translateY: orbitProgress.interpolate({
                inputRange: [0, 0.166, 0.333, 0.5, 0.666, 0.833, 1],
                outputRange: HEX_VERTICES.map(v => v.y * scale).concat([HEX_VERTICES[0].y * scale]),
              }),
            },
          ],
        }}
      >
        <View style={{ width: 16, height: 16, marginLeft: -8, marginTop: -8 }}>
          <View style={[styles.orbitBall, { width: 16, height: 16, borderRadius: 8, backgroundColor: '#3B82F6', opacity: 0.2 }]} />
          <View style={[styles.orbitBall, { width: 8, height: 8, borderRadius: 4, backgroundColor: '#93c5fd', opacity: 0.9, position: 'absolute', top: 4, left: 4 }]} />
          <View style={[styles.orbitBall, { width: 4, height: 4, borderRadius: 2, backgroundColor: '#ffffff', position: 'absolute', top: 6, left: 6 }]} />
        </View>
      </Animated.View>
    </View>
  );
}

export default function LoginScreen() {
  const router = useRouter();
  
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_300Light,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
    JetBrainsMono_400Regular,
  });

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  
  // Sign In state
  const [signInCode, setSignInCode] = useState('');
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  
  // Register state
  const [regCode, setRegCode] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirm, setShowRegConfirm] = useState(false);
  
  // Focus state
  const [focusedField, setFocusedField] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [infoSheet, setInfoSheet] = useState<'about' | 'faq' | 'contact' | null>(null);

  const flipAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Refs — one per input, named clearly
  const signInCodeRef = useRef<TextInput>(null);
  const signInEmailRef = useRef<TextInput>(null);
  const signInPasswordRef = useRef<TextInput>(null);
  
  const regCodeRef = useRef<TextInput>(null);
  const regNameRef = useRef<TextInput>(null);
  const regEmailRef = useRef<TextInput>(null);
  const regPasswordRef = useRef<TextInput>(null);
  const regConfirmRef = useRef<TextInput>(null);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);


  const switchMode = (newMode: 'signin' | 'signup') => {
    if (newMode === mode) return;
    
    Animated.timing(flipAnim, {
      toValue: mode === 'signin' ? 1 : 0,
      duration: 400,
      useNativeDriver: true,
    }).start();
    
    setMode(newMode);
    setError('');
    setFieldErrors({});
    setFocusedField(null);
    
    // Clear form fields when switching modes
    setSignInCode('');
    setSignInEmail('');
    setSignInPassword('');
    setRegCode('');
    setRegName('');
    setRegEmail('');
    setRegPassword('');
    setRegConfirmPassword('');
  };

  const handleSignIn = async () => {
    Keyboard.dismiss();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const errors: Record<string, string> = {};
    if (!signInCode) errors.companyCode = 'Company code is required';
    if (!signInEmail) errors.email = 'Email is required';
    if (!signInPassword) errors.password = 'Password is required';
    
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setLoading(true);
    setError('');
    setFieldErrors({});

    try {
      const { data: codeCheck, error: codeError } = await supabase.rpc('verify_driver_signup_code', {
        p_plaincode: signInCode.trim(),
      });

      if (codeError || !codeCheck?.ok) {
        setFieldErrors({ companyCode: 'Invalid company code' });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setLoading(false);
        return;
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: signInEmail,
        password: signInPassword,
      });

      if (signInError) {
        if (signInError.message.includes('Invalid login credentials')) {
          setFieldErrors({ email: 'Invalid email or password', password: 'Invalid email or password' });
        } else {
          setError(signInError.message);
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setLoading(false);
        return;
      }

      // Success animation
      setSubmitSuccess(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      setTimeout(() => {
        router.replace('/(driver)/');
        setLoading(false);
      }, 400);
    } catch (err) {
      setError('An error occurred. Please try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    Keyboard.dismiss();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const errors: Record<string, string> = {};
    if (!regCode) errors.companyCode = 'Company code is required';
    if (!regName) errors.fullName = 'Full name is required';
    if (!regEmail) errors.email = 'Email is required';
    if (!regPassword) errors.password = 'Password is required';
    if (!regConfirmPassword) errors.confirmPassword = 'Please confirm your password';
    else if (regPassword !== regConfirmPassword) errors.confirmPassword = 'Passwords do not match';
    
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setLoading(true);
    setError('');
    setFieldErrors({});

    try {
      const { data: codeCheck, error: codeError } = await supabase.rpc('verify_driver_signup_code', {
        p_plaincode: regCode.trim(),
      });

      if (codeError || !codeCheck?.ok) {
        setFieldErrors({ companyCode: 'Invalid company code' });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setLoading(false);
        return;
      }

      const company = { id: codeCheck.company_id };

      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: regEmail,
        password: regPassword,
      });

      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          setFieldErrors({ email: 'This email is already registered' });
        } else {
          setError(signUpError.message);
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setLoading(false);
        return;
      }

      if (authData.user) {
        const { data: profileResult, error: profileError } = await supabase.rpc('create_driver_account', {
          p_user_id: authData.user.id,
          p_company_id: company.id,
          p_full_name: regName,
          p_email: regEmail,
        });

        if (profileError || !profileResult?.ok) {
          setError(`Account created but profile setup failed: ${profileError?.message || profileResult?.error}`);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          setLoading(false);
          return;
        }

        // Success animation
        setSubmitSuccess(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        setTimeout(() => {
          router.replace('/(driver)/');
          setLoading(false);
        }, 400);
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  const frontRotation = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const backRotation = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['180deg', '360deg'],
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.container}>
        <AnimatedHexLogo size={120} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: '#03060D' }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none"
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={{ flex: 1 }}>
            {STARS.map((star, i) => (
              <View
                key={i}
                style={[
                  styles.star,
                  {
                    left: star.x,
                    top: star.y,
                    width: star.size,
                    height: star.size,
                    opacity: star.opacity,
                  },
                ]}
              />
            ))}
            
            <View style={styles.glowBg} />
            
            <Animated.View style={[styles.logoSection, { opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
              <AnimatedHexLogo size={180} />
              <Text style={styles.wordmark}>XEVORA</Text>
              <Text style={styles.tagline}>Workforce. Simplified.</Text>
            </Animated.View>

            <View style={styles.modeSwitcher}>
              <TouchableOpacity
                style={[styles.modeTab, mode === 'signin' && styles.modeTabActive]}
                onPress={() => switchMode('signin')}
              >
                <Text style={[styles.modeTabText, mode === 'signin' && styles.modeTabTextActive]}>
                  Sign In
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeTab, mode === 'signup' && styles.modeTabActive]}
                onPress={() => switchMode('signup')}
              >
                <Text style={[styles.modeTabText, mode === 'signup' && styles.modeTabTextActive]}>
                  Create Account
                </Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.cardContainer, { minHeight: mode === 'signup' ? 650 : 420 }]}>
              <Animated.View
                style={[
                  styles.card,
                  {
                    transform: [{ rotateY: frontRotation }],
                    backfaceVisibility: 'hidden',
                  },
                ]}
              >
                <View style={{ paddingHorizontal: 24 }}>
                  <InputField
                    label="Company Code"
                    value={signInCode}
                    onChangeText={setSignInCode}
                    placeholder="Enter your company code"
                    fieldName="signInCode"
                    inputRef={signInCodeRef}
                    nextRef={signInEmailRef}
                    textContentType="none"
                    autoCapitalize="none"
                    autoComplete="off"
                    scrollY={0}
                    focusedField={focusedField}
                    setFocusedField={setFocusedField}
                    scrollViewRef={scrollViewRef}
                    editable={!loading}
                  />
                  {fieldErrors.companyCode && (
                    <Text style={styles.fieldError}>{fieldErrors.companyCode}</Text>
                  )}
                  <Text style={styles.helperText}>Provided by your employer</Text>

                  <InputField
                    label="Email Address"
                    value={signInEmail}
                    onChangeText={setSignInEmail}
                    placeholder="you@company.com"
                    fieldName="signInEmail"
                    inputRef={signInEmailRef}
                    nextRef={signInPasswordRef}
                    keyboardType="email-address"
                    textContentType="emailAddress"
                    autoComplete="email"
                    scrollY={80}
                    focusedField={focusedField}
                    setFocusedField={setFocusedField}
                    scrollViewRef={scrollViewRef}
                    editable={!loading}
                  />
                  {fieldErrors.email && (
                    <Text style={styles.fieldError}>{fieldErrors.email}</Text>
                  )}

                  <InputField
                    label="Password"
                    value={signInPassword}
                    onChangeText={setSignInPassword}
                    placeholder="Enter your password"
                    fieldName="signInPassword"
                    inputRef={signInPasswordRef}
                    secureTextEntry={!showSignInPassword}
                    showToggle={true}
                    onToggleShow={() => setShowSignInPassword(!showSignInPassword)}
                    textContentType="password"
                    autoComplete="password"
                    scrollY={160}
                    onSubmitEditing={handleSignIn}
                    focusedField={focusedField}
                    setFocusedField={setFocusedField}
                    scrollViewRef={scrollViewRef}
                    editable={!loading}
                  />
                  {fieldErrors.password && (
                    <Text style={styles.fieldError}>{fieldErrors.password}</Text>
                  )}
                </View>

                {error && mode === 'signin' ? <Text style={styles.errorText}>{error}</Text> : null}

                <TouchableOpacity
                  style={[
                    styles.submitBtn,
                    loading && styles.submitBtnDisabled,
                    submitSuccess && styles.submitBtnSuccess
                  ]}
                  onPress={handleSignIn}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : submitSuccess ? (
                    <Text style={styles.submitBtnText}>✓ Success</Text>
                  ) : (
                    <Text style={styles.submitBtnText}>Sign In</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.forgotPassword}>
                  <Text style={styles.forgotPasswordText}>Forgot password?</Text>
                </TouchableOpacity>
              </Animated.View>

              <Animated.View
                style={[
                  styles.card,
                  styles.cardBack,
                  {
                    transform: [{ rotateY: backRotation }],
                    backfaceVisibility: 'hidden',
                  },
                ]}
              >
                <View style={{ paddingHorizontal: 24 }}>
                  <InputField
                    label="Company Code"
                    value={regCode}
                    onChangeText={setRegCode}
                    placeholder="Enter your company code"
                    fieldName="regCode"
                    inputRef={regCodeRef}
                    nextRef={regNameRef}
                    textContentType="none"
                    autoCapitalize="none"
                    scrollY={0}
                    focusedField={focusedField}
                    setFocusedField={setFocusedField}
                    scrollViewRef={scrollViewRef}
                    editable={!loading}
                  />
                  {fieldErrors.companyCode && (
                    <Text style={styles.fieldError}>{fieldErrors.companyCode}</Text>
                  )}
                  <Text style={styles.helperText}>Provided by your employer</Text>

                  <InputField
                    label="Full Name"
                    value={regName}
                    onChangeText={setRegName}
                    placeholder="John Doe"
                    fieldName="regName"
                    inputRef={regNameRef}
                    nextRef={regEmailRef}
                    textContentType="name"
                    autoCapitalize="words"
                    scrollY={80}
                    focusedField={focusedField}
                    setFocusedField={setFocusedField}
                    scrollViewRef={scrollViewRef}
                    editable={!loading}
                  />
                  {fieldErrors.fullName && (
                    <Text style={styles.fieldError}>{fieldErrors.fullName}</Text>
                  )}

                  <InputField
                    label="Email Address"
                    value={regEmail}
                    onChangeText={setRegEmail}
                    placeholder="you@company.com"
                    fieldName="regEmail"
                    inputRef={regEmailRef}
                    nextRef={regPasswordRef}
                    keyboardType="email-address"
                    textContentType="emailAddress"
                    autoComplete="email"
                    scrollY={160}
                    focusedField={focusedField}
                    setFocusedField={setFocusedField}
                    scrollViewRef={scrollViewRef}
                    editable={!loading}
                  />
                  {fieldErrors.email && (
                    <Text style={styles.fieldError}>{fieldErrors.email}</Text>
                  )}

                  <InputField
                    label="Password"
                    value={regPassword}
                    onChangeText={setRegPassword}
                    placeholder="Create a password"
                    fieldName="regPassword"
                    inputRef={regPasswordRef}
                    nextRef={regConfirmRef}
                    secureTextEntry={!showRegPassword}
                    showToggle={true}
                    onToggleShow={() => setShowRegPassword(!showRegPassword)}
                    textContentType="newPassword"
                    autoComplete="new-password"
                    scrollY={240}
                    focusedField={focusedField}
                    setFocusedField={setFocusedField}
                    scrollViewRef={scrollViewRef}
                    editable={!loading}
                  />
                  {fieldErrors.password && (
                    <Text style={styles.fieldError}>{fieldErrors.password}</Text>
                  )}

                  <InputField
                    label="Confirm Password"
                    value={regConfirmPassword}
                    onChangeText={setRegConfirmPassword}
                    placeholder="Confirm your password"
                    fieldName="regConfirm"
                    inputRef={regConfirmRef}
                    secureTextEntry={!showRegConfirm}
                    showToggle={true}
                    onToggleShow={() => setShowRegConfirm(!showRegConfirm)}
                    textContentType="newPassword"
                    autoComplete="new-password"
                    scrollY={320}
                    onSubmitEditing={handleSignUp}
                    focusedField={focusedField}
                    setFocusedField={setFocusedField}
                    scrollViewRef={scrollViewRef}
                    editable={!loading}
                  />
                  {fieldErrors.confirmPassword && (
                    <Text style={styles.fieldError}>{fieldErrors.confirmPassword}</Text>
                  )}
                </View>

                {error && mode === 'signup' ? <Text style={styles.errorText}>{error}</Text> : null}

                <TouchableOpacity
                  style={[
                    styles.submitBtn,
                    loading && styles.submitBtnDisabled,
                    submitSuccess && styles.submitBtnSuccess
                  ]}
                  onPress={handleSignUp}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.submitBtnText}>Create Account</Text>
                  )}
                </TouchableOpacity>

                <Text style={styles.termsText}>
                  By creating an account you agree to our Terms of Service
                </Text>
              </Animated.View>
            </View>

            <View style={styles.infoTabs}>
              <TouchableOpacity style={styles.infoTab} onPress={() => setInfoSheet('about')}>
                <Text style={styles.infoTabText}>About</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.infoTab} onPress={() => setInfoSheet('faq')}>
                <Text style={styles.infoTabText}>FAQ</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.infoTab} onPress={() => setInfoSheet('contact')}>
                <Text style={styles.infoTabText}>Contact</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      <Modal
        visible={infoSheet !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setInfoSheet(null)}
      >
        <TouchableWithoutFeedback onPress={() => setInfoSheet(null)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                {infoSheet === 'about' && (
                  <>
                    <Text style={styles.modalTitle}>About Xevora</Text>
                    <Text style={styles.modalText}>
                      Xevora is a next-generation workforce and payroll platform built for field operators, delivery companies, and staffing agencies. Part of the Xavorn ecosystem.
                    </Text>
                    <Text style={styles.modalText}>Version: 1.0.0 (Beta)</Text>
                    <Text style={styles.modalText}>© 2026 Xavorn Inc.</Text>
                  </>
                )}
                {infoSheet === 'faq' && (
                  <>
                    <Text style={styles.modalTitle}>FAQ</Text>
                    <Text style={styles.modalQuestion}>Q: How do I get a company code?</Text>
                    <Text style={styles.modalText}>
                      A: Your employer or administrator provides your unique company code.
                    </Text>
                    <Text style={styles.modalQuestion}>Q: Is my data secure?</Text>
                    <Text style={styles.modalText}>
                      A: All data is encrypted end-to-end using Supabase with row-level security.
                    </Text>
                    <Text style={styles.modalQuestion}>Q: What if I forget my password?</Text>
                    <Text style={styles.modalText}>
                      A: Use "Forgot password?" on the login screen to reset via email.
                    </Text>
                  </>
                )}
                {infoSheet === 'contact' && (
                  <>
                    <Text style={styles.modalTitle}>Contact</Text>
                    <Text style={styles.modalText}>support@xevora.io</Text>
                    <Text style={styles.modalText}>xevora.io</Text>
                    <Text style={styles.modalText}>Part of Xavorn — xavorn.com</Text>
                  </>
                )}
                <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setInfoSheet(null)}>
                  <Text style={styles.modalCloseBtnText}>Close</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#03060D',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  star: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 1,
  },
  glowBg: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.1,
    left: SCREEN_WIDTH / 2 - 150,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(37,99,235,0.04)',
  },
  logoSection: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 20,
  },
  wordmark: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 28,
    color: '#F1F5FF',
    letterSpacing: 6,
    marginTop: 16,
  },
  tagline: {
    fontFamily: 'PlusJakartaSans_300Light',
    fontSize: 13,
    color: '#4E6D92',
    marginTop: 6,
  },
  modeSwitcher: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 999,
    padding: 4,
    marginTop: 24,
    marginBottom: 20,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 999,
  },
  modeTabActive: {
    backgroundColor: '#2563EB',
  },
  modeTabText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 14,
    color: '#4E6D92',
  },
  modeTabTextActive: {
    color: '#fff',
  },
  cardContainer: {
    width: '100%',
  },
  card: {
    backgroundColor: '#060B14',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    padding: 24,
    paddingBottom: 24,
    width: '100%',
  },
  cardBack: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    width: '100%',
  },
  inputGroup: {
    marginBottom: 4,
  },
  inputLabel: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 10,
    color: '#4E6D92',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  inputWrapper: {
    backgroundColor: '#0A1628',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  inputWrapperFocused: {
    borderColor: '#2563EB',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  inputWrapperError: {
    borderColor: '#EF4444',
  },
  input: {
    backgroundColor: '#0A1628',
    borderWidth: 0,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#F1F5FF',
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeBtn: {
    position: 'absolute',
    right: 16,
    top: 14,
  },
  eyeText: {
    fontSize: 18,
  },
  helperText: {
    fontFamily: 'PlusJakartaSans_300Light',
    fontSize: 11,
    color: '#4E6D92',
    marginTop: 6,
    marginLeft: 4,
  },
  fieldError: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 12,
    color: '#EF4444',
    marginTop: 6,
    marginLeft: 4,
  },
  errorText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 13,
    color: '#EF4444',
    textAlign: 'center',
    marginTop: 12,
  },
  submitBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnSuccess: {
    backgroundColor: '#10B981',
  },
  submitBtnText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 16,
    color: '#fff',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: 12,
    marginBottom: 16,
  },
  forgotPasswordText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 13,
    color: '#4E6D92',
  },
  termsText: {
    fontFamily: 'PlusJakartaSans_300Light',
    fontSize: 11,
    color: '#4E6D92',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 16,
  },
  infoTabs: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 24,
  },
  infoTab: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  infoTabText: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 11,
    color: '#4E6D92',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#060B14',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 20,
    color: '#F1F5FF',
    marginBottom: 16,
  },
  modalQuestion: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 14,
    color: '#F1F5FF',
    marginTop: 12,
    marginBottom: 4,
  },
  modalText: {
    fontFamily: 'PlusJakartaSans_300Light',
    fontSize: 14,
    color: '#4E6D92',
    lineHeight: 20,
    marginBottom: 8,
  },
  modalCloseBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  modalCloseBtnText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 16,
    color: '#fff',
  },
  orbitBall: {
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
});

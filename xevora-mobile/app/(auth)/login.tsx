import React, { useState, useRef, useEffect, useCallback, type RefObject } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Keyboard,
  StatusBar,
  Dimensions,
  Animated,
} from 'react-native'
import { supabase } from '../../lib/supabase'
import { LoginStarBackdrop, LoginHexArt } from '../../components/LoginPremiumChrome'
import { LoginSignInTransition } from '../../components/LoginSignInTransition'
import { prefetchDriverHomeData } from '../../lib/driverPrefetch'
import {
  loadStaySignedInPreference,
  saveStaySignedInPreference,
} from '../../lib/authSessionStorage'

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#03060D',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: Platform.OS === 'ios' ? 74 : 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  hexWrap: {
    width: 80,
    height: 80,
    backgroundColor: '#060B14',
    borderWidth: 1.5,
    borderColor: '#2563EB',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  hexX: {
    fontSize: 32,
    color: '#3B82F6',
    fontWeight: '800',
  },
  wordmark: {
    fontSize: 28,
    fontWeight: '800',
    color: '#F1F5FF',
    letterSpacing: 6,
    marginBottom: 6,
  },
  tagline: {
    fontSize: 13,
    color: '#4E6D92',
    fontWeight: '300',
  },
  modeSwitcher: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 100,
    padding: 4,
    marginBottom: 24,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 100,
    alignItems: 'center',
  },
  modeBtnActive: {
    backgroundColor: '#2563EB',
  },
  modeBtnText: {
    fontSize: 14,
    color: '#4E6D92',
    fontWeight: '500',
  },
  modeBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#060B14',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 24,
  },
  fieldWrap: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 10,
    color: '#4E6D92',
    letterSpacing: 1.5,
    marginBottom: 8,
    fontWeight: '500',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A1628',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#F1F5FF',
    backgroundColor: '#0A1628',
    borderRadius: 12,
  },
  toggleBtn: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  toggleText: {
    fontSize: 10,
    color: '#4E6D92',
    letterSpacing: 1,
    fontWeight: '600',
  },
  helperText: {
    fontSize: 11,
    color: '#4E6D92',
    marginTop: -10,
    marginBottom: 16,
    marginLeft: 2,
  },
  error: {
    fontSize: 13,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 12,
  },
  submitBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  terms: {
    fontSize: 11,
    color: '#4E6D92',
    textAlign: 'center',
    marginTop: 16,
  },
  successBanner: {
    borderLeftWidth: 4,
    borderLeftColor: '#22C55E',
    backgroundColor: 'rgba(34,197,94,0.08)',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  successBannerText: {
    color: '#F1F5FF',
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_500Medium',
  },
  flipStage: {
    position: 'relative',
    width: '100%',
  },
  flipFace: {
    width: '100%',
    backfaceVisibility: 'hidden' as const,
  },
  flipFaceAbs: {
    position: 'absolute',
    width: '100%',
    top: 0,
    left: 0,
    right: 0,
    backfaceVisibility: 'hidden' as const,
  },
  stayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 4,
    gap: 10,
  },
  stayTrack: {
    width: 28,
    height: 16,
    borderRadius: 8,
    padding: 2,
    justifyContent: 'center',
  },
  stayThumb: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#fff',
  },
  stayLabel: {
    fontSize: 13,
    color: '#4E6D92',
    fontFamily: 'PlusJakartaSans_500Medium',
    flex: 1,
  },
})

type InputFieldProps = {
  label: string
  value: string
  onChange: (text: string) => void
  placeholder: string
  inputRef: RefObject<TextInput | null>
  nextRef?: RefObject<TextInput | null>
  secure?: boolean
  showToggle?: boolean
  onToggle?: () => void
  keyboardType?: 'default' | 'email-address'
  textContentType?: 'none' | 'emailAddress' | 'password' | 'name' | 'newPassword'
  autoCapitalize?: 'none' | 'words'
  onDone?: () => void
  isFocused?: boolean
  disabled?: boolean
  onFocus?: () => void
  onBlur?: () => void
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
  inputRef,
  nextRef,
  secure = false,
  showToggle = false,
  onToggle,
  keyboardType = 'default',
  textContentType = 'none',
  autoCapitalize = 'none',
  onDone,
  isFocused = false,
  disabled = false,
  onFocus,
  onBlur,
}: InputFieldProps) {
  return (
    <View style={s.fieldWrap}>
      <Text style={s.fieldLabel}>{label}</Text>
      <View
        style={[
          s.inputRow,
          isFocused && { borderColor: 'rgba(59,130,246,0.35)' },
        ]}
      >
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor="#4E6D92"
          secureTextEntry={secure}
          keyboardType={keyboardType}
          textContentType={textContentType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          autoComplete="off"
          spellCheck={false}
          returnKeyType={nextRef ? 'next' : 'done'}
          blurOnSubmit={false}
          selectionColor="#3B82F6"
          cursorColor="#3B82F6"
          editable={!disabled}
          onFocus={onFocus}
          onBlur={onBlur}
          onSubmitEditing={() => {
            if (nextRef) {
              nextRef.current?.focus()
            } else {
              onDone?.()
            }
          }}
          style={[s.input, { backgroundColor: '#0A1628' }]}
        />
        {showToggle && (
          <TouchableOpacity
            onPress={onToggle}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={s.toggleBtn}
          >
            <Text style={s.toggleText}>{secure ? 'SHOW' : 'HIDE'}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

export default function LoginScreen() {
  const { width, height } = Dimensions.get('window')
  const [mode, setMode] = useState<'signin' | 'register'>('signin')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [signInOverlay, setSignInOverlay] = useState(false)
  const [staySignedIn, setStaySignedIn] = useState(true)
  const [showRegBanner, setShowRegBanner] = useState(false)
  const bannerOp = useRef(new Animated.Value(0)).current
  const thumbX = useRef(new Animated.Value(14)).current

  useEffect(() => {
    void loadStaySignedInPreference().then((v) => {
      setStaySignedIn(v)
      thumbX.setValue(v ? 14 : 2)
    })
  }, [thumbX])

  useEffect(() => {
    Animated.spring(thumbX, {
      toValue: staySignedIn ? 14 : 2,
      friction: 8,
      tension: 120,
      useNativeDriver: false,
    }).start()
  }, [staySignedIn, thumbX])

  const MIN_ANIMATION_MS = 3000
  const authCompletedRef = useRef(false)
  const animationDoneRef = useRef(false)
  const animStartRef = useRef(0)
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearDismissTimer = useCallback(() => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current)
      dismissTimerRef.current = null
    }
  }, [])

  const tryDismissOverlay = useCallback(() => {
    if (!authCompletedRef.current || !animationDoneRef.current) return
    if (dismissTimerRef.current) return
    const elapsed = Date.now() - animStartRef.current
    const remaining = Math.max(0, MIN_ANIMATION_MS - elapsed)
    const finish = () => {
      dismissTimerRef.current = null
      setSignInOverlay(false)
      authCompletedRef.current = false
      animationDoneRef.current = false
    }
    if (remaining > 0) {
      dismissTimerRef.current = setTimeout(finish, remaining)
    } else {
      finish()
    }
  }, [])

  const handleTimelineComplete = useCallback(() => {
    animationDoneRef.current = true
    tryDismissOverlay()
  }, [tryDismissOverlay])

  // Sign in state
  const [siCode, setSiCode] = useState('')
  const [siEmail, setSiEmail] = useState('')
  const [siPassword, setSiPassword] = useState('')
  const [siShowPw, setSiShowPw] = useState(false)

  // Register state
  const [regCode, setRegCode] = useState('')
  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regConfirm, setRegConfirm] = useState('')
  const [regShowPw, setRegShowPw] = useState(false)
  const [regShowConfirm, setRegShowConfirm] = useState(false)

  // Refs
  const siCodeRef = useRef<TextInput>(null)
  const siEmailRef = useRef<TextInput>(null)
  const siPasswordRef = useRef<TextInput>(null)
  const regCodeRef = useRef<TextInput>(null)
  const regNameRef = useRef<TextInput>(null)
  const regEmailRef = useRef<TextInput>(null)
  const regPasswordRef = useRef<TextInput>(null)
  const regConfirmRef = useRef<TextInput>(null)

  const handleSignInPress = () => {
    Keyboard.dismiss()
    if (!siEmail || !siPassword) {
      setError('Please fill in all required fields')
      return
    }
    setError('')
    clearDismissTimer()
    authCompletedRef.current = false
    animationDoneRef.current = false
    animStartRef.current = Date.now()
    setSignInOverlay(true)
    setTimeout(() => {
      void handleSignIn()
    }, 50)
  }

  const handleSignIn = async () => {
    setLoading(true)
    await saveStaySignedInPreference(staySignedIn)
    try {
      // Company code is optional on sign in
      if (siCode.trim()) {
        const { data: codeCheck, error: codeError } = await supabase.rpc(
          'verify_driver_signup_code',
          { p_plaincode: siCode.trim() }
        )

        if (codeError || !codeCheck?.ok) {
          setError('Invalid company code')
          clearDismissTimer()
          authCompletedRef.current = false
          animationDoneRef.current = false
          setSignInOverlay(false)
          setLoading(false)
          return
        }
      }

      const { error: authError } = await supabase.auth.signInWithPassword({
        email: siEmail.trim(),
        password: siPassword,
      })
      if (authError) {
        setError(authError.message)
        clearDismissTimer()
        authCompletedRef.current = false
        animationDoneRef.current = false
        setSignInOverlay(false)
        setLoading(false)
        return
      }

      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()
      if (!authUser) {
        setError('Auth failed')
        clearDismissTimer()
        authCompletedRef.current = false
        animationDoneRef.current = false
        setSignInOverlay(false)
        setLoading(false)
        return
      }

      const { data: worker } = await supabase
        .from('workers')
        .select('id, role, first_name, full_name')
        .eq('user_id', authUser.id)
        .single()

      const target: 'admin' | 'driver' =
        worker?.role === 'admin' || worker?.role === 'manager'
          ? 'admin'
          : 'driver'

      if (target === 'driver' && worker?.id) {
        await prefetchDriverHomeData(worker.id)
      }

      authCompletedRef.current = true
      tryDismissOverlay()
    } catch (e) {
      setError('Something went wrong. Please try again.')
      clearDismissTimer()
      authCompletedRef.current = false
      animationDoneRef.current = false
      setSignInOverlay(false)
    }
    setLoading(false)
  }

  const handleRegister = async () => {
    Keyboard.dismiss()
    if (!regCode || !regName || !regEmail || !regPassword || !regConfirm) {
      setError('Please fill in all fields')
      return
    }
    if (regPassword !== regConfirm) {
      setError('Passwords do not match')
      return
    }
    if (regPassword.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    setLoading(true)
    setError('')
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: regEmail.trim(),
        password: regPassword,
      })
      if (authError) {
        setError(authError.message)
        setLoading(false)
        return
      }
      if (!authData.user) {
        setError('Signup failed. Please try again.')
        setLoading(false)
        return
      }

      const { data: regResult, error: regError } = await supabase.rpc(
        'register_driver_with_code',
        {
          p_full_name: regName.trim(),
          p_code: regCode.trim(),
        }
      )

      if (regError || !regResult?.ok) {
        setError(
          (regResult as { error?: string } | null)?.error ||
            'Invalid company code or registration failed'
        )
        setLoading(false)
        return
      }

      setSiCode(regCode)
      setSiEmail(regEmail)
      setSiPassword('')
      setError('')
      setMode('signin')
      setShowRegBanner(true)
      bannerOp.setValue(1)
      Animated.sequence([
        Animated.delay(3200),
        Animated.timing(bannerOp, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start(() => setShowRegBanner(false))
    } catch (e) {
      setError('Something went wrong. Please try again.')
    }
    setLoading(false)
  }

  return (
    <KeyboardAvoidingView
      style={[s.root, { position: 'relative' }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? -34 : 0}
    >
      <LoginStarBackdrop width={width} height={height} />
      <StatusBar barStyle="light-content" />
      <ScrollView
        style={[s.scroll, { zIndex: 1 }]}
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
        showsVerticalScrollIndicator={false}
        bounces={false}
        automaticallyAdjustKeyboardInsets={true}
      >
        {/* HEADER */}
        <View style={s.header}>
          <LoginHexArt />
          <Text style={s.wordmark}>XEVORA</Text>
          <Text style={s.tagline}>Workforce. Simplified.</Text>
        </View>

        {/* MODE SWITCHER */}
        <View style={s.modeSwitcher}>
          <TouchableOpacity
            style={[s.modeBtn, mode === 'signin' && s.modeBtnActive]}
            onPress={() => { setMode('signin'); setError('') }}
          >
            <Text style={[s.modeBtnText, mode === 'signin' && s.modeBtnTextActive]}>
              Sign In
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.modeBtn, mode === 'register' && s.modeBtnActive]}
            onPress={() => { setMode('register'); setError('') }}
          >
            <Text style={[s.modeBtnText, mode === 'register' && s.modeBtnTextActive]}>
              Create Account
            </Text>
          </TouchableOpacity>
        </View>

        {showRegBanner ? (
          <Animated.View style={[s.successBanner, { opacity: bannerOp }]}>
            <Text style={s.successBannerText}>
              Account created! Sign in to continue.
            </Text>
          </Animated.View>
        ) : null}

        {/* FORM CARD — simple conditional render */}
        <View style={s.card}>
          {mode === 'signin' ? (
            <View>
              <InputField
                label="COMPANY CODE"
                value={siCode}
                onChange={setSiCode}
                placeholder="Company code (optional)"
                inputRef={siCodeRef}
                nextRef={siEmailRef}
                textContentType="none"
                autoCapitalize="none"
                isFocused={focusedField === 'siCode'}
                disabled={loading}
                onFocus={() => setFocusedField('siCode')}
                onBlur={() => setFocusedField(null)}
              />
              <Text style={s.helperText}>Optional if you already have an account</Text>
              <InputField
                label="EMAIL ADDRESS"
                value={siEmail}
                onChange={setSiEmail}
                placeholder="you@company.com"
                inputRef={siEmailRef}
                nextRef={siPasswordRef}
                keyboardType="email-address"
                textContentType="emailAddress"
                isFocused={focusedField === 'siEmail'}
                disabled={loading}
                onFocus={() => setFocusedField('siEmail')}
                onBlur={() => setFocusedField(null)}
              />
              <InputField
                label="PASSWORD"
                value={siPassword}
                onChange={setSiPassword}
                placeholder="Enter your password"
                inputRef={siPasswordRef}
                secure={!siShowPw}
                showToggle
                onToggle={() => setSiShowPw(!siShowPw)}
                textContentType="password"
                onDone={handleSignInPress}
                isFocused={focusedField === 'siPassword'}
                disabled={loading}
                onFocus={() => setFocusedField('siPassword')}
                onBlur={() => setFocusedField(null)}
              />
              <View style={s.stayRow}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setStaySignedIn(!staySignedIn)}
                  style={[
                    s.stayTrack,
                    {
                      backgroundColor: staySignedIn
                        ? '#2563EB'
                        : 'rgba(255,255,255,0.1)',
                    },
                  ]}
                >
                  <Animated.View style={[s.stayThumb, { marginLeft: thumbX }]} />
                </TouchableOpacity>
                <Text style={s.stayLabel}>Stay signed in</Text>
              </View>
              {error ? <Text style={s.error}>{error}</Text> : null}
              <TouchableOpacity
                style={[s.submitBtn, loading && s.submitBtnDisabled]}
                onPress={handleSignInPress}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={s.submitBtnText}>Sign In</Text>
                }
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <InputField
                label="COMPANY CODE"
                value={regCode}
                onChange={setRegCode}
                placeholder="Enter your company code"
                inputRef={regCodeRef}
                nextRef={regNameRef}
                textContentType="none"
                autoCapitalize="none"
                isFocused={focusedField === 'regCode'}
                disabled={loading}
                onFocus={() => setFocusedField('regCode')}
                onBlur={() => setFocusedField(null)}
              />
              <Text style={s.helperText}>Provided by your employer</Text>
              <InputField
                label="FULL NAME"
                value={regName}
                onChange={setRegName}
                placeholder="John Doe"
                inputRef={regNameRef}
                nextRef={regEmailRef}
                textContentType="name"
                autoCapitalize="words"
                isFocused={focusedField === 'regName'}
                disabled={loading}
                onFocus={() => setFocusedField('regName')}
                onBlur={() => setFocusedField(null)}
              />
              <InputField
                label="EMAIL ADDRESS"
                value={regEmail}
                onChange={setRegEmail}
                placeholder="you@company.com"
                inputRef={regEmailRef}
                nextRef={regPasswordRef}
                keyboardType="email-address"
                textContentType="emailAddress"
                isFocused={focusedField === 'regEmail'}
                disabled={loading}
                onFocus={() => setFocusedField('regEmail')}
                onBlur={() => setFocusedField(null)}
              />
              <InputField
                label="PASSWORD"
                value={regPassword}
                onChange={setRegPassword}
                placeholder="Create a password"
                inputRef={regPasswordRef}
                nextRef={regConfirmRef}
                secure={!regShowPw}
                showToggle
                onToggle={() => setRegShowPw(!regShowPw)}
                textContentType="newPassword"
                isFocused={focusedField === 'regPassword'}
                disabled={loading}
                onFocus={() => setFocusedField('regPassword')}
                onBlur={() => setFocusedField(null)}
              />
              <InputField
                label="CONFIRM PASSWORD"
                value={regConfirm}
                onChange={setRegConfirm}
                placeholder="Confirm your password"
                inputRef={regConfirmRef}
                secure={!regShowConfirm}
                showToggle
                onToggle={() => setRegShowConfirm(!regShowConfirm)}
                textContentType="newPassword"
                onDone={handleRegister}
                isFocused={focusedField === 'regConfirm'}
                disabled={loading}
                onFocus={() => setFocusedField('regConfirm')}
                onBlur={() => setFocusedField(null)}
              />
              {error ? <Text style={s.error}>{error}</Text> : null}
              <TouchableOpacity
                style={[s.submitBtn, loading && s.submitBtnDisabled]}
                onPress={handleRegister}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={s.submitBtnText}>Create Account</Text>
                }
              </TouchableOpacity>
              <Text style={s.terms}>
                By creating an account you agree to our Terms of Service
              </Text>
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <LoginSignInTransition
        visible={signInOverlay}
        progress={0}
        onExitComplete={handleTimelineComplete}
      />
    </KeyboardAvoidingView>
  )
}

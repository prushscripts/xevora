import React, { useState, useRef, type RefObject } from 'react'
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
} from 'react-native'
import { router } from 'expo-router'
import { supabase } from '../../lib/supabase'

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
    paddingBottom: 40,
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
          style={s.input}
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
  const [mode, setMode] = useState<'signin' | 'register'>('signin')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [focusedField, setFocusedField] = useState<string | null>(null)

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

  const handleSignIn = async () => {
    Keyboard.dismiss()
    if (!siCode || !siEmail || !siPassword) {
      setError('Please fill in all fields')
      return
    }
    setLoading(true)
    setError('')
    try {
      const { data: codeCheck, error: codeError } = await supabase.rpc(
        'verify_driver_signup_code',
        { p_plaincode: siCode.trim() }
      )

      if (codeError || !codeCheck?.ok) {
        setError('Invalid company code')
        setLoading(false)
        return
      }

      const { error: authError } = await supabase.auth.signInWithPassword({
        email: siEmail.trim(),
        password: siPassword,
      })
      if (authError) {
        setError(authError.message)
        setLoading(false)
        return
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setError('Auth failed')
        setLoading(false)
        return
      }

      const { data: worker } = await supabase
        .from('workers')
        .select('role')
        .eq('user_id', user.id)
        .single()

      if (worker?.role === 'admin' || worker?.role === 'manager') {
        router.replace('/(admin)')
      } else {
        router.replace('/(driver)')
      }
    } catch (e) {
      setError('Something went wrong. Please try again.')
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

      router.replace('/(driver)')
    } catch (e) {
      setError('Something went wrong. Please try again.')
    }
    setLoading(false)
  }

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
    >
      <StatusBar barStyle="light-content" />
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* HEADER */}
        <View style={s.header}>
          <View style={s.hexWrap}>
            <Text style={s.hexX}>✕</Text>
          </View>
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

        {/* FORM CARD */}
        <View style={s.card}>
          {mode === 'signin' ? (
            <View>
              <InputField
                label="COMPANY CODE"
                value={siCode}
                onChange={setSiCode}
                placeholder="Enter your company code"
                inputRef={siCodeRef}
                nextRef={siEmailRef}
                textContentType="none"
                autoCapitalize="none"
                isFocused={focusedField === 'siCode'}
                disabled={loading}
                onFocus={() => setFocusedField('siCode')}
                onBlur={() => setFocusedField(null)}
              />
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
                onDone={handleSignIn}
                isFocused={focusedField === 'siPassword'}
                disabled={loading}
                onFocus={() => setFocusedField('siPassword')}
                onBlur={() => setFocusedField(null)}
              />
              {error ? <Text style={s.error}>{error}</Text> : null}
              <TouchableOpacity
                style={[s.submitBtn, loading && s.submitBtnDisabled]}
                onPress={handleSignIn}
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
    </KeyboardAvoidingView>
  )
}

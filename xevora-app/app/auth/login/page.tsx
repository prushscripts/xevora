"use client";

import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  EyeIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/outline";
import type { CSSProperties } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import HexLogo from "@/components/auth/HexLogo";
import LoginTransition from "@/components/auth/LoginTransition";
import { createClient } from "@/lib/supabase";

function mapLoginError(message: string) {
  if (message.includes("Invalid login credentials")) {
    return "Incorrect email or password";
  }
  if (message.includes("Email not confirmed")) {
    return "Please verify your email first";
  }
  return "Something went wrong. Try again.";
}

type Strength = "Weak" | "Fair" | "Good" | "Strong";

function getPasswordStrength(password: string): { label: Strength; score: number } {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  if (score <= 1) return { label: "Weak", score: Math.max(1, score) };
  if (score === 2) return { label: "Fair", score };
  if (score === 3) return { label: "Good", score };
  return { label: "Strong", score: 4 };
}

function mapSignupError(message: string) {
  if (message.includes("User already registered")) {
    return "An account with this email already exists.";
  }
  if (message.includes("Password should be at least")) {
    return "Use a stronger password with at least 8 characters.";
  }
  return "Something went wrong. Try again.";
}

interface StarParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
  color: "37,99,235" | "96,165,250";
}

/** Starfield canvas only runs at this breakpoint and up (saves mobile battery). */
const SHOW_STARS_QUERY = "(min-width: 768px)";
const MOBILE_STARS_QUERY = "(max-width: 767px)";

interface MobileLightStar {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
}

/** Lightweight white particle field — mobile only (< 768px). */
function MobileLightStarsBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<MobileLightStar[]>([]);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_STARS_QUERY);
    const apply = () => setActive(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    let frameId = 0;

    const makeParticle = (width: number, height: number): MobileLightStar => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() < 0.5 ? -1 : 1) * (0.08 + Math.random() * 0.07),
      vy: (Math.random() < 0.5 ? -1 : 1) * (0.08 + Math.random() * 0.07),
      radius: 0.8 + Math.random() * 0.4,
      opacity: 0.15 + Math.random() * 0.25,
    });

    const resize = () => {
      const width = Math.max(1, parent.clientWidth);
      const height = Math.max(1, parent.clientHeight);
      canvas.width = width;
      canvas.height = height;
      if (particlesRef.current.length === 0) {
        particlesRef.current = Array.from({ length: 40 }, () => makeParticle(width, height));
      } else {
        particlesRef.current.forEach((particle) => {
          particle.x = Math.min(particle.x, width);
          particle.y = Math.min(particle.y, height);
        });
      }
    };

    const tick = () => {
      const { width, height } = canvas;
      if (width < 2 || height < 2) {
        frameId = requestAnimationFrame(tick);
        return;
      }
      context.fillStyle = "#03060D";
      context.fillRect(0, 0, width, height);

      const particles = particlesRef.current;
      particles.forEach((particle) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        if (particle.x <= 0 || particle.x >= width) particle.vx *= -1;
        if (particle.y <= 0 || particle.y >= height) particle.vy *= -1;
        particle.x = Math.max(0, Math.min(width, particle.x));
        particle.y = Math.max(0, Math.min(height, particle.y));
      });

      particles.forEach((particle) => {
        context.beginPath();
        context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        context.fillStyle = `rgba(255,255,255,${particle.opacity.toFixed(3)})`;
        context.fill();
      });

      frameId = requestAnimationFrame(tick);
    };

    resize();
    tick();
    const observer = new ResizeObserver(resize);
    observer.observe(parent);

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      particlesRef.current = [];
    };
  }, [active]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 h-full w-full md:hidden"
    />
  );
}

function MobileFormHex({ active }: { active: boolean }) {
  const [isNarrow, setIsNarrow] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_STARS_QUERY);
    const apply = () => setIsNarrow(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  if (!isNarrow || !active) return null;

  return (
    <div className="auth-mobile-hex mb-5 flex shrink-0 justify-center">
      <div className="flex h-11 w-11 items-center justify-center overflow-visible">
        <div className="origin-center scale-[0.3143]">
          <HexLogo />
        </div>
      </div>
    </div>
  );
}

function ConnectedStarsBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<StarParticle[]>([]);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(SHOW_STARS_QUERY);
    const apply = () => setActive(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    let animationId = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      if (particlesRef.current.length === 0) {
        particlesRef.current = Array.from({ length: 80 }, () => ({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.6,
          vy: (Math.random() - 0.5) * 0.6,
          radius: 0.8 + Math.random(),
          opacity: 0.3 + Math.random() * 0.4,
          color: Math.random() < 0.7 ? "37,99,235" : "96,165,250",
        }));
      }
    };

    const render = () => {
      const { width, height } = canvas;
      context.fillStyle = "#03060D";
      context.fillRect(0, 0, width, height);

      const particles = particlesRef.current;
      particles.forEach((particle) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        if (particle.x <= 0 || particle.x >= width) particle.vx *= -1;
        if (particle.y <= 0 || particle.y >= height) particle.vy *= -1;
        particle.x = Math.max(0, Math.min(width, particle.x));
        particle.y = Math.max(0, Math.min(height, particle.y));
      });

      for (let i = 0; i < particles.length; i += 1) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j += 1) {
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < 120) {
            const opacity = (1 - distance / 120) * 0.12;
            context.beginPath();
            context.moveTo(a.x, a.y);
            context.lineTo(b.x, b.y);
            context.lineWidth = 0.5;
            context.strokeStyle = `rgba(37,99,235,${opacity.toFixed(3)})`;
            context.stroke();
          }
        }
      }

      particles.forEach((particle) => {
        context.beginPath();
        context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        context.fillStyle = `rgba(${particle.color},${particle.opacity.toFixed(3)})`;
        context.fill();
      });

      animationId = requestAnimationFrame(render);
    };

    resize();
    render();
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
    };
  }, [active]);

  if (!active) return null;

  return (
    <>
      <canvas ref={canvasRef} className="fixed inset-0 z-0 h-full w-full" />
      <div className="pointer-events-none fixed inset-0 z-[1] bg-[radial-gradient(circle_at_30%_40%,rgba(37,99,235,0.08)_0%,transparent_60%)]" />
    </>
  );
}

function BrandPanel() {
  return (
    <motion.aside
      initial={{ x: -40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="relative z-[2] hidden h-full w-[45%] overflow-hidden border-r border-[rgba(37,99,235,0.1)] bg-transparent md:flex lg:w-[55%]"
    >
      <div className="relative z-10 flex h-full w-full flex-col justify-between p-[60px]">
        <div className="flex flex-col justify-between">
          <div className="inline-flex items-center gap-3">
            <div className="drop-shadow-[0_0_24px_rgba(37,99,235,0.5)]">
              <HexLogo />
            </div>
            <p className="text-[20px] font-extrabold tracking-[5px] text-[#F1F5FF]">XEVORA</p>
          </div>

          <div className="mt-16">
            <p className="text-[48px] font-light leading-[1.06]">Run your</p>
            <p className="text-[52px] font-extrabold leading-[1.06]">operation.</p>
            <p className="text-[36px] font-light leading-[1.1] text-[var(--blue)]">Not spreadsheets.</p>
            <div className="my-6 h-px w-12 bg-[rgba(37,99,235,0.2)]" />
            <p className="max-w-[340px] text-[15px] font-light leading-[1.7] text-[var(--muted)]">
              GPS time tracking, automated payroll, and workforce management - built for the operators who keep the world
              moving.
            </p>
          </div>
        </div>

        <div>
          <div className="mb-6 flex items-start gap-5">
            {[
              { value: "900K+", label: "ADP users overpaying" },
              { value: "$0", label: "Hidden fees. Ever." },
              { value: "20min", label: "Average onboard time" },
            ].map((item, index) => (
              <div key={item.value} className="flex items-start gap-5">
                <div>
                  <p className="text-[24px] font-extrabold">{item.value}</p>
                  <p className="whitespace-nowrap text-[11px] font-light leading-[1.4] text-[var(--muted)]">{item.label}</p>
                </div>
                {index < 2 ? <div className="mt-1 h-8 w-px bg-[rgba(37,99,235,0.15)]" /> : null}
              </div>
            ))}
          </div>

          <p className="inline-flex items-center gap-2 text-[11px] font-light text-[var(--muted)]">
            <span className="h-2 w-2 rotate-45 bg-[#B8965A]" />
            Part of the Xavorn ecosystem
            <a href="https://xavorn.com" target="_blank" rel="noopener noreferrer" className="text-[#B8965A] hover:underline">
              xavorn.com
            </a>
          </p>
        </div>
      </div>
    </motion.aside>
  );
}

function StaggerField({
  children,
  delay,
}: {
  children: React.ReactNode;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ y: 12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

function PremiumAuthButton({
  children,
  type = "button",
  disabled = false,
}: {
  children: React.ReactNode;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  const [shimmerActive, setShimmerActive] = useState(false);
  const baseStyle: CSSProperties = {
    transition:
      "transform 300ms cubic-bezier(0.25,0.46,0.45,0.94), box-shadow 300ms cubic-bezier(0.25,0.46,0.45,0.94), background 200ms ease",
    transform: "translateY(0px)",
    boxShadow: "0 4px 16px rgba(37,99,235,0.3)",
    background: "#2563EB",
    willChange: "transform",
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onMouseEnter={(e) => {
        setShimmerActive(true);
        const btn = e.currentTarget;
        btn.style.transform = "translateY(-3px)";
        btn.style.boxShadow = "0 8px 28px rgba(37,99,235,0.5), 0 0 0 1px rgba(37,99,235,0.25)";
        btn.style.background = "#1D4ED8";
      }}
      onMouseLeave={(e) => {
        setShimmerActive(false);
        const btn = e.currentTarget;
        btn.style.transform = "translateY(0px)";
        btn.style.boxShadow = "0 4px 16px rgba(37,99,235,0.3)";
        btn.style.background = "#2563EB";
      }}
      onMouseDown={(e) => {
        const btn = e.currentTarget;
        btn.style.transform = "translateY(-1px)";
        btn.style.boxShadow = "0 4px 12px rgba(37,99,235,0.35)";
      }}
      onMouseUp={(e) => {
        const btn = e.currentTarget;
        btn.style.transform = "translateY(-3px)";
        btn.style.boxShadow = "0 8px 28px rgba(37,99,235,0.5)";
      }}
      style={baseStyle}
      className={`relative flex w-full min-h-[52px] cursor-pointer items-center justify-center overflow-hidden rounded-[10px] border-0 px-6 text-base font-medium tracking-[0.4px] text-white md:min-h-0 md:py-[14px] disabled:cursor-not-allowed disabled:opacity-70 ${
        shimmerActive ? "btn-shimmer-active" : ""
      }`}
    >
      <span className="btn-shimmer" />
      <span className="relative z-[2] flex items-center justify-center gap-2">{children}</span>
    </button>
  );
}

export default function LoginPage() {
  const supabase = useMemo(() => createClient(), []);
  const [isFlipped, setIsFlipped] = useState(false);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [showTransition, setShowTransition] = useState(false);

  async function onLoginSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginLoading(true);
    setLoginError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: loginEmail.trim(),
      password: loginPassword,
    });

    if (signInError) {
      setLoginError(mapLoginError(signInError.message));
      setLoginLoading(false);
      return;
    }

    setShowTransition(true);
    setLoginLoading(false);
  }

  async function onSignupSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!agreeTerms) {
      setSignupError("Please agree to the Terms of Service and Privacy Policy.");
      return;
    }

    setSignupLoading(true);
    setSignupError(null);
    const { error } = await supabase.auth.signUp({
      email: signupEmail.trim(),
      password: signupPassword,
      options: {
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
        },
      },
    });

    if (error) {
      setSignupError(mapSignupError(error.message));
      setSignupLoading(false);
      return;
    }

    setSignupSuccess(true);
    setSignupLoading(false);
    setTimeout(() => {
      setIsFlipped(false);
      setSignupSuccess(false);
    }, 1500);
  }

  const strength = getPasswordStrength(signupPassword);
  const strengthColor =
    strength.label === "Weak"
      ? "bg-[var(--red)]"
      : strength.label === "Fair"
        ? "bg-[var(--amber)]"
        : strength.label === "Good"
          ? "bg-[var(--blue)]"
          : "bg-[var(--green)]";

  const inputClasses =
    "block min-h-[52px] w-full min-w-0 box-border rounded-[10px] border border-[rgba(37,99,235,0.25)] bg-[#030710] px-4 py-4 text-base leading-normal text-[var(--text)] outline-none transition focus:border-[rgba(37,99,235,0.7)] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)] md:min-h-0 md:py-3";

  const loginForm = (
    <>
      <h1 className="text-center text-[28px] font-extrabold leading-snug md:text-left md:text-[26px]">Welcome back</h1>
      <p className="mt-1.5 text-center text-[14px] font-light leading-snug text-[var(--muted)] md:text-left">
        Sign in to your Xevora account
      </p>
      <div className="my-7 h-px w-full min-w-0 bg-[rgba(37,99,235,0.1)]" />
      <form onSubmit={onLoginSubmit} className="w-full space-y-4">
        <StaggerField delay={0.2}>
          <label className="mb-2 block w-full text-[11px] uppercase tracking-[1px] text-[var(--muted)]">Work Email</label>
          <input type="email" required value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} className={inputClasses} />
        </StaggerField>
        <StaggerField delay={0.25}>
          <label className="mb-2 block w-full text-[11px] uppercase tracking-[1px] text-[var(--muted)]">Password</label>
          <div className="relative w-full">
            <input type={showLoginPassword ? "text" : "password"} required value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} className={`${inputClasses} pr-11`} />
            <button type="button" onClick={() => setShowLoginPassword((value) => !value)} aria-label={showLoginPassword ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--blue-bright)]">
              {showLoginPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
            </button>
          </div>
        </StaggerField>
        <div className="w-full text-center md:text-right">
          <Link href="/auth/reset" className="text-sm text-[var(--muted)] transition hover:text-[var(--blue-bright)] md:text-[12px]">
            Forgot password?
          </Link>
        </div>
        <PremiumAuthButton type="submit" disabled={loginLoading}>
          {loginLoading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              Signing in...
            </>
          ) : (
            "Sign In"
          )}
        </PremiumAuthButton>
        {loginError ? (
          <p className="flex min-w-0 items-start gap-1 break-words text-sm text-[var(--red)]">
            <ExclamationCircleIcon className="h-4 w-4 shrink-0" />
            {loginError}
          </p>
        ) : null}
      </form>
      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-[var(--border)]" />
        <span className="text-xs text-[var(--muted)]">or</span>
        <div className="h-px flex-1 bg-[var(--border)]" />
      </div>
      <p className="mx-auto max-w-full text-center text-[13px] leading-normal">
        <span className="text-[var(--muted)]">Don&apos;t have an account? </span>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            setIsFlipped(true);
          }}
          className="cursor-pointer text-[var(--blue-bright)] hover:underline"
        >
          Sign up
        </button>
      </p>
      <p className="mt-6 text-center text-xs text-[#2A3848]">🔒 256-bit SSL encrypted</p>
    </>
  );

  const signupForm = signupSuccess ? (
    <div className="min-w-0 py-6 text-center">
      <CheckCircleIcon className="mx-auto h-12 w-12 text-[var(--green)]" />
      <h2 className="mt-3 text-[24px] font-extrabold">Account created!</h2>
      <p className="mt-2 text-[14px] font-light text-[var(--muted)]">
        Check your email to verify your account before signing in.
      </p>
      <button type="button" onClick={() => setIsFlipped(false)} className="mt-4 cursor-pointer text-[var(--blue-bright)] hover:underline">
        Sign in now →
      </button>
    </div>
  ) : (
    <>
      <h2 className="text-center text-[28px] font-extrabold leading-snug md:text-left md:text-[26px]">Create Account</h2>
      <p className="mt-1.5 text-center text-[14px] font-light leading-snug text-[var(--muted)] md:text-left">
        Start your free beta access
      </p>
      <div className="my-7 h-px w-full min-w-0 bg-[rgba(37,99,235,0.1)]" />
      <form onSubmit={onSignupSubmit} className="w-full min-w-0 space-y-4">
        <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2">
          <div>
            <label className="mb-2 block w-full text-[11px] uppercase tracking-[1px] text-[var(--muted)]">First Name</label>
            <input type="text" required value={firstName} onChange={(event) => setFirstName(event.target.value)} className={inputClasses} />
          </div>
          <div>
            <label className="mb-2 block w-full text-[11px] uppercase tracking-[1px] text-[var(--muted)]">Last Name</label>
            <input type="text" required value={lastName} onChange={(event) => setLastName(event.target.value)} className={inputClasses} />
          </div>
        </div>
        <div>
          <label className="mb-2 block w-full text-[11px] uppercase tracking-[1px] text-[var(--muted)]">Work Email</label>
          <input type="email" required value={signupEmail} onChange={(event) => setSignupEmail(event.target.value)} className={inputClasses} />
        </div>
        <div>
          <label className="mb-2 block w-full text-[11px] uppercase tracking-[1px] text-[var(--muted)]">Password</label>
          <div className="relative w-full">
            <input type={showSignupPassword ? "text" : "password"} required value={signupPassword} onChange={(event) => setSignupPassword(event.target.value)} className={`${inputClasses} pr-11`} />
            <button type="button" onClick={() => setShowSignupPassword((value) => !value)} aria-label={showSignupPassword ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--blue-bright)]">
              {showSignupPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
            </button>
          </div>
          <div className="mt-2 grid grid-cols-4 gap-1">
            {[0, 1, 2, 3].map((item) => (
              <span key={item} className={`h-1.5 rounded-full ${item < strength.score ? strengthColor : "bg-[#1e2d45]"}`} />
            ))}
          </div>
          <p className="mt-1 text-sm text-[var(--muted)]">{strength.label}</p>
        </div>
        <label className="flex min-w-0 items-start gap-2 text-base leading-snug text-[var(--muted)]">
          <input type="checkbox" checked={agreeTerms} onChange={(event) => setAgreeTerms(event.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-[var(--blue)]" />
          <span className="min-w-0">I agree to the Terms of Service and Privacy Policy</span>
        </label>
        <PremiumAuthButton type="submit" disabled={signupLoading}>
          {signupLoading ? "Creating account..." : "Create Account"}
        </PremiumAuthButton>
        {signupError ? (
          <p className="flex min-w-0 items-start gap-1 break-words text-sm text-[var(--red)]">
            <ExclamationCircleIcon className="h-4 w-4 shrink-0" />
            {signupError}
          </p>
        ) : null}
      </form>
      <p className="mx-auto mt-8 max-w-full text-center text-[13px] leading-normal md:mt-5 md:text-left">
        <span className="text-[var(--muted)]">Already have an account? </span>
        <button
          type="button"
          onClick={() => setIsFlipped(false)}
          className="cursor-pointer text-[var(--blue-bright)] hover:underline"
        >
          Sign in
        </button>
      </p>
    </>
  );

  return (
    <>
      <a
        href="https://xevora.io"
        target="_self"
        style={{
          position: "fixed",
          top: "24px",
          left: "24px",
          zIndex: 50,
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          fontFamily: "'DM Sans', sans-serif",
          fontSize: "13px",
          fontWeight: 400,
          color: "#4E6D92",
          textDecoration: "none",
          transition: "color 200ms ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "#F1F5FF";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "#4E6D92";
        }}
      >
        ← Back to Xevora
      </a>
      {showTransition ? <LoginTransition /> : null}
      <div
        className={`flex min-h-dvh flex-col transition-opacity md:h-screen md:overflow-hidden ${
          showTransition ? "pointer-events-none opacity-0" : "opacity-100"
        }`}
      >
        <ConnectedStarsBackground />
        <div className="relative z-[2] flex min-h-0 min-w-0 flex-1 flex-col md:h-full md:flex-row">
          <BrandPanel />

          <motion.main
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-[2] flex min-h-0 w-full min-w-0 flex-1 flex-col justify-center bg-[#03060D] px-6 py-8 md:h-screen md:w-[55%] md:bg-[rgba(3,6,13,0.6)] md:px-10 md:py-10 md:shadow-[inset_8px_0_32px_rgba(37,99,235,0.04)] lg:w-[45%]"
          >
            <MobileLightStarsBackground />
            <div className="relative z-10 mx-auto w-full min-w-0 max-w-full md:max-w-[400px]">
              <div
                className="w-full min-w-0 rounded-none border-0 bg-transparent p-0 shadow-none backdrop-blur-none md:rounded-[20px] md:border md:border-[rgba(37,99,235,0.15)] md:bg-[rgba(6,11,20,0.75)] md:p-[44px] md:shadow-[0_0_0_1px_rgba(37,99,235,0.05),0_24px_64px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.03)] md:backdrop-blur-[20px] md:[-webkit-backdrop-filter:blur(20px)]"
                style={{ perspective: "1200px" }}
              >
                <div
                  className="relative min-h-[min(100dvh,760px)] w-full md:min-h-[580px]"
                  style={{
                    transformStyle: "preserve-3d",
                    transition: "transform 600ms cubic-bezier(0.16,1,0.3,1)",
                    transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                  }}
                >
                  <div
                    style={{
                      backfaceVisibility: "hidden",
                      WebkitBackfaceVisibility: "hidden",
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      minHeight: "100%",
                      transform: "rotateY(0deg)",
                    }}
                  >
                    <div className="flex min-h-[min(100dvh,760px)] min-w-0 flex-col md:min-h-[580px]">
                      <MobileFormHex active={!isFlipped} />
                      {loginForm}
                    </div>
                  </div>

                  <div
                    style={{
                      backfaceVisibility: "hidden",
                      WebkitBackfaceVisibility: "hidden",
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      minHeight: "100%",
                      transform: "rotateY(180deg)",
                    }}
                  >
                    <div className="flex min-h-[min(100dvh,760px)] min-w-0 flex-col overflow-y-auto pb-6 md:min-h-[580px]">
                      <MobileFormHex active={isFlipped} />
                      {signupForm}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.main>
        </div>
      </div>
    </>
  );
}

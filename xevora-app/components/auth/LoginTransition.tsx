"use client";

import { motion } from "framer-motion";
import { JetBrains_Mono } from "next/font/google";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase";

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400"],
});

const SHOW_STARS_QUERY = "(min-width: 768px)";

export default function LoginTransition() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<
    Array<{ x: number; y: number; vx: number; vy: number; radius: number; opacity: number; color: "37,99,235" | "96,165,250" }>
  >([]);
  const [starsActive, setStarsActive] = useState(false);
  const [phase, setPhase] = useState(0);
  const [overlayOpacity, setOverlayOpacity] = useState(1);
  const [portalOut, setPortalOut] = useState(false);
  const [done, setDone] = useState(false);
  const [statusIndex, setStatusIndex] = useState(0);

  useEffect(() => {
    const mq = window.matchMedia(SHOW_STARS_QUERY);
    const apply = () => setStarsActive(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const word = useMemo(() => "XEVORA".split(""), []);
  const statuses = useMemo(
    () => ["Initializing your workspace...", "Loading worker profiles...", "Syncing payroll data..."],
    [],
  );

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 2100),
      setTimeout(() => setPhase(4), 3200),
      setTimeout(() => setPortalOut(true), 3200),
      setTimeout(() => {
        void (async () => {
          const supabase = createClient();
          const {
            data: { user },
          } = await supabase.auth.getUser();
          let path = "/dashboard";
          if (user) {
            const { data } = await supabase.from("workers").select("role").eq("user_id", user.id).maybeSingle();
            if (data?.role === "driver") {
              path = "/driver";
            }
          }
          router.push(path);
          router.refresh();
        })();
      }, 4200),
      setTimeout(() => setOverlayOpacity(0), 4200),
      setTimeout(() => setDone(true), 4600),
    ];

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [router]);

  useEffect(() => {
    if (phase < 2 || phase >= 4) return;
    const interval = setInterval(() => {
      setStatusIndex((value) => (value + 1) % statuses.length);
    }, 800);
    return () => clearInterval(interval);
  }, [phase, statuses.length]);

  useEffect(() => {
    if (!starsActive) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    let frameId = 0;
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

    const draw = () => {
      context.fillStyle = "#03060D";
      context.fillRect(0, 0, canvas.width, canvas.height);

      const particles = particlesRef.current;
      particles.forEach((particle) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        if (particle.x <= 0 || particle.x >= canvas.width) particle.vx *= -1;
        if (particle.y <= 0 || particle.y >= canvas.height) particle.vy *= -1;
        particle.x = Math.max(0, Math.min(canvas.width, particle.x));
        particle.y = Math.max(0, Math.min(canvas.height, particle.y));
      });

      for (let i = 0; i < particles.length; i += 1) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j += 1) {
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < 120) {
            const opacity = (1 - distance / 120) * 0.08;
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

      frameId = requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
    };
  }, [starsActive]);

  if (done) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: overlayOpacity }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-x-hidden overflow-y-auto bg-[#03060D] px-4"
    >
      {starsActive ? <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" /> : null}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(37,99,235,0.08)_0%,transparent_60%)]" />
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="pointer-events-none absolute left-6 top-6 h-5 w-5 border-l-[1.5px] border-t-[1.5px] border-[rgba(37,99,235,0.4)]"
      />
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="pointer-events-none absolute right-6 top-6 h-5 w-5 border-r-[1.5px] border-t-[1.5px] border-[rgba(37,99,235,0.4)]"
      />
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="pointer-events-none absolute bottom-6 left-6 h-5 w-5 border-b-[1.5px] border-l-[1.5px] border-[rgba(37,99,235,0.4)]"
      />
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="pointer-events-none absolute bottom-6 right-6 h-5 w-5 border-b-[1.5px] border-r-[1.5px] border-[rgba(37,99,235,0.4)]"
      />
      <div className="login-scan-line" />

      <motion.div
        animate={portalOut ? { scale: 8, opacity: 0 } : { scale: phase >= 4 ? 1.03 : 1, opacity: 1 }}
        transition={portalOut ? { duration: 0.4, ease: "easeIn" } : { duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 flex w-full max-w-[100vw] flex-col items-center"
      >
        <div className="login-ring" />
        <div className="login-ring login-ring-reverse" />
        <div className="login-hex-glow" />
        <motion.div
          animate={{
            boxShadow:
              phase >= 1
                ? "0 0 0 1px rgba(37,99,235,0.24), 0 0 40px rgba(37,99,235,0.35)"
                : "0 0 0 0 rgba(37,99,235,0)",
          }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-20 flex h-[min(200px,52vw)] w-[min(200px,52vw)] max-w-[220px] items-center justify-center rounded-full md:h-[220px] md:w-[220px]"
        >
          <svg
            className="h-[min(120px,38vw)] w-[min(120px,38vw)] max-w-[160px] md:h-[160px] md:w-[160px]"
            viewBox="0 0 88 88"
            fill="none"
            aria-hidden="true"
          >
            <motion.polygon
              points="44,4 76,22 76,66 44,84 12,66 12,22"
              fill="#060B14"
              stroke="rgba(37,99,235,0.5)"
              strokeWidth="1.5"
              pathLength={1}
              initial={{ pathLength: 0, opacity: 0.4 }}
              animate={{ pathLength: phase >= 1 ? 1 : 0, opacity: 1 }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            />
            <motion.path
              d="M28 28L40 44L28 60H35.5L44 49.2L52.5 60H60L48 44L60 28H52.5L44 38.8L35.5 28H28Z"
              fill="#2563EB"
              initial={{ opacity: 0 }}
              animate={{ opacity: phase >= 2 ? 1 : 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            />
            <motion.rect
              x="41"
              y="41"
              width="6"
              height="6"
              transform="rotate(45 41 41)"
              fill="#60A5FA"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.1, repeat: Number.POSITIVE_INFINITY }}
            />
          </svg>
        </motion.div>

        {phase >= 2 ? (
          <>
            <div className="mt-4 flex max-w-full flex-wrap justify-center gap-x-0.5 text-center text-[clamp(22px,7vw,36px)] font-extrabold tracking-[0.2em] text-[var(--text)] [text-shadow:0_0_30px_rgba(37,99,235,0.5)] md:tracking-[14px]">
              {word.map((letter, index) => (
                <motion.span
                  key={`${letter}-${index}`}
                  className="inline-block"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: phase >= 2 ? 1 : 0 }}
                  transition={{ duration: 0.2, delay: 1.2 + index * 0.15 }}
                >
                  {letter}
                </motion.span>
              ))}
            </div>
            <div className="mt-4 h-[2px] w-[min(280px,88vw)] max-w-full shrink-0 overflow-hidden rounded-full bg-[rgba(37,99,235,0.15)]">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: phase >= 3 ? "100%" : "0%" }}
                transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
                className="h-full bg-[var(--blue)] shadow-[0_0_8px_rgba(37,99,235,0.8)]"
              />
            </div>
            <motion.p
              key={phase >= 4 ? "ready" : statuses[statusIndex]}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              className={`${mono.className} mt-3 max-w-[min(340px,90vw)] px-2 text-center text-[10px] leading-relaxed tracking-[0.18em] text-[var(--muted)] md:text-[11px] md:tracking-[3px]`}
            >
              {phase >= 4 ? "Ready." : statuses[statusIndex]}
            </motion.p>
          </>
        ) : null}
      </motion.div>
    </motion.div>
  );
}

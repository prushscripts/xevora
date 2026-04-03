"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/auth/login");
  }, [router]);

  return (
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
        fontFamily: "'Plus Jakarta Sans', sans-serif",
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
  );
}

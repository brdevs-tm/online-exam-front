"use client";

import { useEffect, useState } from "react";
import Script from "next/script";

type User = {
  id: number;
  telegram_id: number;
  full_name: string;
  role: string;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://localhost:8000";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [debugToken, setDebugToken] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const qTelegramId = params.get("telegram_id");

        // TG WebApp object kelishini kutamiz
        let tg: any = null;
        for (let i = 0; i < 30; i++) {
          tg = (window as any).Telegram?.WebApp;
          if (tg?.initDataUnsafe?.user?.id) break;
          await sleep(100);
        }

        const telegramIdFromTg = tg?.initDataUnsafe?.user?.id;
        const telegramId =
          telegramIdFromTg ?? (qTelegramId ? Number(qTelegramId) : null);

        if (!telegramId) {
          setError(
            "Telegram session topilmadi. WebApp’ni botdagi tugma orqali oching.",
          );
          return;
        }

        tg?.ready?.();

        // ✅ Asosiy qadam: backend'dan token + user olamiz
        const res = await fetch(`${API_BASE}/api/bot/webapp-token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ telegram_id: telegramId }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok || !data?.ok || !data?.token || !data?.user) {
          setError(
            data?.detail
              ? JSON.stringify(data.detail)
              : "Auth xato: token olinmadi.",
          );
          return;
        }

        localStorage.setItem("access_token", data.token);
        setDebugToken(data.token);

        if (cancelled) return;
        setUser(data.user as User);

        // ✅ Role bo'yicha redirect
        setTimeout(() => {
          const role = (data.user?.role || "").toLowerCase();
          if (role === "teacher") window.location.href = "/teacher";
          else window.location.href = "/student";
        }, 250);
      } catch (e: any) {
        setError(e?.message || "Noma’lum xatolik");
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 16,
        background:
          "radial-gradient(1200px 600px at 20% 10%, rgba(99, 102, 241, 0.20), transparent 60%), radial-gradient(900px 500px at 80% 20%, rgba(34, 197, 94, 0.18), transparent 55%), linear-gradient(180deg, #0b1020 0%, #070a14 100%)",
        color: "#e8eefc",
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial, "Noto Sans", "Liberation Sans", sans-serif',
      }}
    >
      <Script
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="afterInteractive"
      />

      <div style={{ width: "100%", maxWidth: 520 }}>
        <div style={{ marginBottom: 14 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 12px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.10)",
              boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 999,
                background: error
                  ? "rgba(239,68,68,0.95)"
                  : user
                    ? "rgba(34,197,94,0.95)"
                    : "rgba(99,102,241,0.95)",
                boxShadow: "0 0 0 6px rgba(255,255,255,0.04)",
              }}
            />
            <span style={{ fontSize: 13, opacity: 0.9 }}>
              Online Exam • Telegram WebApp
            </span>
          </div>
        </div>

        <div
          style={{
            borderRadius: 18,
            padding: 18,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.10)",
            boxShadow: "0 18px 60px rgba(0,0,0,0.45)",
            backdropFilter: "blur(10px)",
          }}
        >
          {error && (
            <div
              style={{
                borderRadius: 14,
                padding: 14,
                background: "rgba(239,68,68,0.12)",
                border: "1px solid rgba(239,68,68,0.28)",
              }}
            >
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 12,
                    display: "grid",
                    placeItems: "center",
                    background: "rgba(239,68,68,0.16)",
                    border: "1px solid rgba(239,68,68,0.25)",
                  }}
                >
                  <span style={{ fontSize: 16 }}>✖</span>
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>
                    Xatolik yuz berdi
                  </div>
                  <div style={{ fontSize: 13, opacity: 0.9, marginTop: 2 }}>
                    {error}
                  </div>
                </div>
              </div>
            </div>
          )}

          {!error && !user && (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 14,
                  background: "rgba(99,102,241,0.14)",
                  border: "1px solid rgba(99,102,241,0.28)",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 999,
                    border: "2px solid rgba(255,255,255,0.25)",
                    borderTop: "2px solid rgba(255,255,255,0.95)",
                    animation: "spin 0.9s linear infinite",
                  }}
                />
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800 }}>
                  Authenticating…
                </div>
                <div style={{ fontSize: 13, opacity: 0.85, marginTop: 2 }}>
                  Backend’dan token olinmoqda
                </div>
              </div>
            </div>
          )}

          {!error && user && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 16,
                    background: "rgba(34,197,94,0.14)",
                    border: "1px solid rgba(34,197,94,0.28)",
                    display: "grid",
                    placeItems: "center",
                    fontSize: 18,
                  }}
                >
                  ✅
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 18, fontWeight: 900 }}>
                    Welcome{" "}
                    <span style={{ opacity: 0.95 }}>{user.full_name}</span>
                  </div>
                  <div style={{ fontSize: 13, opacity: 0.85, marginTop: 3 }}>
                    Redirecting…
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    padding: "6px 10px",
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    textTransform: "uppercase",
                    letterSpacing: 0.6,
                    opacity: 0.9,
                  }}
                >
                  {user.role}
                </span>
              </div>

              {debugToken && (
                <div
                  style={{
                    marginTop: 12,
                    padding: 12,
                    borderRadius: 12,
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.10)",
                    wordBreak: "break-all",
                    fontSize: 12,
                    opacity: 0.9,
                  }}
                >
                  <b>DEBUG TOKEN:</b>
                  <div>{debugToken}</div>
                </div>
              )}
            </div>
          )}
        </div>

        <div
          style={{
            marginTop: 12,
            fontSize: 12,
            opacity: 0.65,
            textAlign: "center",
          }}
        >
          Secure session • JWT stored locally
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

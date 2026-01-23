"use client";

import { useEffect, useState } from "react";
import Script from "next/script";

type User = {
  id: number;
  telegram_id: number;
  full_name: string;
  role: string;
};

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      const params = new URLSearchParams(window.location.search);
      const qTelegramId = params.get("telegram_id");

      const tg = (window as any).Telegram?.WebApp;
      if (tg?.ready) tg.ready();

      const telegramIdFromTg = tg?.initDataUnsafe?.user?.id;
      const telegramId =
        telegramIdFromTg ?? (qTelegramId ? Number(qTelegramId) : null);

      if (!telegramId) {
        setError("Telegram ID topilmadi.");
        return;
      }

      const res = await fetch("/api/bot/webapp-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telegram_id: telegramId }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.detail ? JSON.stringify(data.detail) : "Auth xato");
        return;
      }

      if (data?.ok && data?.user) {
        localStorage.setItem("access_token", data.token);
        setUser(data.user as User);
        return;
      }

      setError("Auth failed: backend user qaytarmadi.");
    };

    run();
  }, []);

  if (error) {
    return (
      <div style={{ padding: 16 }}>
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="afterInteractive"
        />
        ❌ {error}
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ padding: 16 }}>
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="afterInteractive"
        />
        Authenticating...
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <Script
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="afterInteractive"
      />
      <h1>Welcome {user.full_name}</h1>
      <p>Role: {user.role}</p>
      <p>Telegram ID: {user.telegram_id}</p>
    </div>
  );
}

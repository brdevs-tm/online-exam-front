"use client";

import { useEffect, useMemo, useState } from "react";

export default function Watermark({
  telegramId,
  attemptId,
}: {
  telegramId?: number;
  attemptId?: number;
}) {
  const [tick, setTick] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setTick(Date.now()), 10000);
    return () => clearInterval(t);
  }, []);

  const text = useMemo(() => {
    const t = new Date(tick).toLocaleString();
    return `Examly • tg:${telegramId ?? "-"} • att:${attemptId ?? "-"} • ${t}`;
  }, [telegramId, attemptId, tick]);

  return (
    <div
      aria-hidden
      style={{
        pointerEvents: "none",
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        opacity: 0.12,
        transform: "rotate(-18deg)",
        display: "grid",
        placeItems: "center",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: "120%",
          textAlign: "center",
          fontWeight: 900,
          fontSize: 18,
          lineHeight: 2,
        }}
      >
        {Array.from({ length: 18 }).map((_, i) => (
          <div key={i}>
            {text} • {text} • {text} • {text}
          </div>
        ))}
      </div>
    </div>
  );
}

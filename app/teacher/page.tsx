"use client";

import { useEffect, useMemo, useState } from "react";

type EventMsg = {
  ts?: string;
  event?: string;
  telegram_id?: number;
  attempt_id?: number;
  exam_id?: number;
  detail?: any;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://127.0.0.1:8000";

export default function TeacherPage() {
  const [events, setEvents] = useState<EventMsg[]>([]);
  const [status, setStatus] = useState<
    "connecting" | "open" | "closed" | "error"
  >("connecting");

  const wsUrl = useMemo(() => {
    const wsBase = API_BASE.replace(/^http/, "ws"); // http->ws, https->wss
    return `${wsBase}/ws/monitor`;
  }, []);

  useEffect(() => {
    let ws: WebSocket | null = null;

    try {
      setStatus("connecting");
      ws = new WebSocket(wsUrl);

      ws.onopen = () => setStatus("open");
      ws.onclose = () => setStatus("closed");
      ws.onerror = () => setStatus("error");

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          setEvents((prev) => [msg, ...prev].slice(0, 100));
        } catch {
          setEvents((prev) =>
            [{ event: "RAW", detail: e.data }, ...prev].slice(0, 100),
          );
        }
      };
    } catch {
      setStatus("error");
    }

    return () => ws?.close();
  }, [wsUrl]);

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ fontSize: 26, fontWeight: 900 }}>Teacher Live Monitoring</h1>
      <div style={{ opacity: 0.8, marginTop: 4 }}>
        WS: <b>{status}</b> • {wsUrl}
      </div>

      <div style={{ marginTop: 14 }}>
        {events.length === 0 ? (
          <div style={{ opacity: 0.7 }}>Hali event yo‘q...</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {events.map((ev, idx) => (
              <div
                key={idx}
                style={{
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.06)",
                }}
              >
                <div style={{ fontWeight: 900 }}>
                  {ev.event || "EVENT"}{" "}
                  <span style={{ opacity: 0.6, fontWeight: 600 }}>
                    {ev.ts || ""}
                  </span>
                </div>
                <pre
                  style={{ marginTop: 8, fontSize: 12, whiteSpace: "pre-wrap" }}
                >
                  {JSON.stringify(ev, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

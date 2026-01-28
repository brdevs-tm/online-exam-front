"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type MonitorEvent = {
  id: string;
  ts: string; // ISO
  event: string;
  attempt_id: number;
  exam_id?: number | null;
  telegram_id?: number | string | null;
  full_name?: string | null;
  role?: string | null;
  detail?: any;
};

const CACHE_KEY = "teacher_monitor_events_v1";

function safeJsonParse<T>(s: string, fallback: T): T {
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

function formatTime(ts: string) {
  try {
    const d = new Date(ts);
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return ts;
  }
}

function severity(name: string): "low" | "med" | "high" {
  const e = (name || "").toUpperCase();
  if (e.includes("DEVTOOLS") || e.includes("TIME_VIOLATION")) return "high";
  if (e.includes("SCREENSHOT") || e.includes("COPY") || e.includes("PASTE"))
    return "med";
  if (e.includes("TAB") || e.includes("BLUR") || e.includes("VISIBILITY"))
    return "med";
  return "low";
}

function SevBadge({ s }: { s: "low" | "med" | "high" }) {
  const map = {
    low: { bg: "rgba(34,197,94,0.14)", bd: "rgba(34,197,94,0.28)", tx: "LOW" },
    med: {
      bg: "rgba(245,158,11,0.14)",
      bd: "rgba(245,158,11,0.28)",
      tx: "MED",
    },
    high: {
      bg: "rgba(239,68,68,0.14)",
      bd: "rgba(239,68,68,0.28)",
      tx: "HIGH",
    },
  } as const;
  const c = map[s];
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 950,
        padding: "4px 8px",
        borderRadius: 999,
        background: c.bg,
        border: `1px solid ${c.bd}`,
        letterSpacing: 0.4,
        opacity: 0.95,
        whiteSpace: "nowrap",
      }}
    >
      {c.tx}
    </span>
  );
}

export default function TeacherMonitorPage() {
  const [events, setEvents] = useState<MonitorEvent[]>([]);
  const [wsState, setWsState] = useState<
    "connecting" | "open" | "closed" | "error"
  >("connecting");

  const [openEvent, setOpenEvent] = useState<MonitorEvent | null>(null);

  const listRef = useRef<HTMLDivElement | null>(null);
  const autoScrollRef = useRef(true);

  // Backend local (PC ichida)
  const wsUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    // doim local backend:
    return `ws://127.0.0.1:8000/ws/monitor`;
  }, []);

  // 1) Load cache (refresh bo‘lsa ham o‘chmasin)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const cached = safeJsonParse<MonitorEvent[]>(
      localStorage.getItem(CACHE_KEY) || "[]",
      [],
    );
    if (cached.length) {
      // cache eski bo‘lsa ham list chiqsin
      cached.sort((a, b) => (a.ts || "").localeCompare(b.ts || ""));
      setEvents(cached.slice(-500));
    }
  }, []);

  // 2) Save cache
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(CACHE_KEY, JSON.stringify(events.slice(-500)));
  }, [events]);

  // 3) WS connect + reconnect
  useEffect(() => {
    if (!wsUrl) return;

    let ws: WebSocket | null = null;
    let alive = true;

    const connect = () => {
      setWsState("connecting");
      ws = new WebSocket(wsUrl);

      ws.onopen = () => alive && setWsState("open");

      ws.onclose = () => {
        if (!alive) return;
        setWsState("closed");
        setTimeout(connect, 900);
      };

      ws.onerror = () => alive && setWsState("error");

      ws.onmessage = (msg) => {
        const data = safeJsonParse<any>(msg.data, null);
        if (!data) return;

        // HISTORY
        if (data.type === "history" && Array.isArray(data.events)) {
          const incoming = data.events as MonitorEvent[];
          setEvents((prev) => {
            const map = new Map<string, MonitorEvent>();
            for (const p of prev) map.set(p.id, p);
            for (const e of incoming) map.set(e.id, e);
            const merged = Array.from(map.values()).sort((a, b) =>
              (a.ts || "").localeCompare(b.ts || ""),
            );
            return merged.slice(-500);
          });
          return;
        }

        // LIVE EVENT
        if (data.type === "event" && data.event) {
          const ev = data.event as MonitorEvent;
          setEvents((prev) => {
            // dedupe
            if (prev.some((x) => x.id === ev.id)) return prev;
            const next = [...prev, ev].sort((a, b) =>
              (a.ts || "").localeCompare(b.ts || ""),
            );
            return next.slice(-500);
          });
          return;
        }
      };
    };

    connect();

    return () => {
      alive = false;
      try {
        ws?.close();
      } catch {}
    };
  }, [wsUrl]);

  // autoscroll
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;

    const onScroll = () => {
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
      autoScrollRef.current = nearBottom;
    };

    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    if (!autoScrollRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [events]);

  const bg =
    "radial-gradient(1200px 600px at 20% 10%, rgba(99, 102, 241, 0.20), transparent 60%), radial-gradient(900px 500px at 80% 20%, rgba(34, 197, 94, 0.18), transparent 55%), linear-gradient(180deg, #0b1020 0%, #070a14 100%)";

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: 16,
        background: bg,
        color: "#e8eefc",
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial',
      }}
    >
      <div style={{ width: "100%", maxWidth: 980, margin: "0 auto" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 24, fontWeight: 950, letterSpacing: -0.2 }}>
              Teacher Live Monitoring
            </div>
            <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
              WS: <b>{wsState}</b> • {wsUrl}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              onClick={() => {
                // cache tozalash (xohlasang olib tashla)
                localStorage.removeItem(CACHE_KEY);
                setEvents([]);
              }}
              style={{
                borderRadius: 12,
                padding: "10px 12px",
                fontWeight: 900,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.06)",
                color: "#e8eefc",
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              Clear
            </button>

            <button
              onClick={() => {
                autoScrollRef.current = true;
                const el = listRef.current;
                if (el) el.scrollTop = el.scrollHeight;
              }}
              style={{
                borderRadius: 12,
                padding: "10px 12px",
                fontWeight: 900,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.06)",
                color: "#e8eefc",
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              Latest
            </button>

            <div
              style={{
                padding: "10px 12px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.10)",
                fontSize: 12,
                fontWeight: 900,
                opacity: 0.9,
                whiteSpace: "nowrap",
              }}
            >
              Events: {events.length}
            </div>
          </div>
        </div>

        {/* Card */}
        <div
          style={{
            borderRadius: 18,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.10)",
            boxShadow: "0 18px 60px rgba(0,0,0,0.45)",
            overflow: "hidden",
            minHeight: 560,
          }}
        >
          <div
            style={{
              padding: 12,
              borderBottom: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.03)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ fontWeight: 950 }}>Real-time feed (last 500)</div>
            <div style={{ fontSize: 12, opacity: 0.75 }}>
              Click event → details (no layout shift)
            </div>
          </div>

          <div
            ref={listRef}
            style={{ maxHeight: 560, overflowY: "auto", padding: 10 }}
          >
            {!events.length ? (
              <div style={{ padding: 14, opacity: 0.75 }}>Hali event yo‘q…</div>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {events
                  .slice()
                  .reverse()
                  .map((e) => {
                    const s = severity(e.event);
                    return (
                      <button
                        key={e.id}
                        onClick={() => setOpenEvent(e)}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          borderRadius: 14,
                          padding: 12,
                          border: "1px solid rgba(255,255,255,0.10)",
                          background: "rgba(255,255,255,0.05)",
                          color: "#e8eefc",
                          cursor: "pointer",
                          transition:
                            "transform 120ms ease, background 120ms ease",
                        }}
                      >
                        {/* minimized row */}
                        <div
                          style={{
                            display: "flex",
                            gap: 10,
                            alignItems: "center",
                          }}
                        >
                          <SevBadge s={s} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 950 }}>
                              {e.event}
                            </div>
                            <div
                              style={{
                                marginTop: 4,
                                fontSize: 12,
                                opacity: 0.82,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              <b>{e.telegram_id ?? "—"}</b> •{" "}
                              {e.full_name ?? "Unknown"} • {formatTime(e.ts)}
                            </div>
                          </div>
                          <div
                            style={{
                              fontSize: 12,
                              opacity: 0.65,
                              whiteSpace: "nowrap",
                            }}
                          >
                            attempt #{e.attempt_id}
                          </div>
                        </div>
                      </button>
                    );
                  })}
              </div>
            )}
          </div>
        </div>

        <div
          style={{
            marginTop: 12,
            fontSize: 12,
            opacity: 0.65,
            textAlign: "center",
          }}
        >
          Secure session • Monitoring channel
        </div>
      </div>

      {/* MODAL (no layout shift) */}
      {openEvent && (
        <div
          onClick={() => setOpenEvent(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "grid",
            placeItems: "center",
            padding: 16,
            zIndex: 9999,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 760,
              borderRadius: 18,
              background: "rgba(15,18,35,0.95)",
              border: "1px solid rgba(255,255,255,0.10)",
              boxShadow: "0 30px 90px rgba(0,0,0,0.65)",
              overflow: "hidden",
              animation: "fadeIn 140ms ease",
            }}
          >
            <div
              style={{
                padding: 14,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.03)",
              }}
            >
              <div style={{ fontWeight: 950, fontSize: 14 }}>Event details</div>
              <button
                onClick={() => setOpenEvent(null)}
                style={{
                  borderRadius: 12,
                  padding: "8px 10px",
                  fontWeight: 900,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.06)",
                  color: "#e8eefc",
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                Close
              </button>
            </div>

            <div style={{ padding: 14 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                <div>
                  <div style={{ fontSize: 15, fontWeight: 950 }}>
                    {openEvent.event}
                  </div>
                  <div style={{ marginTop: 6, fontSize: 12, opacity: 0.85 }}>
                    Time: <b>{formatTime(openEvent.ts)}</b>
                  </div>
                  <div style={{ marginTop: 6, fontSize: 12, opacity: 0.85 }}>
                    User: <b>{openEvent.telegram_id ?? "—"}</b> •{" "}
                    <b>{openEvent.full_name ?? "—"}</b>
                  </div>
                  <div style={{ marginTop: 6, fontSize: 12, opacity: 0.85 }}>
                    Attempt: <b>#{openEvent.attempt_id}</b> • Exam:{" "}
                    <b>{openEvent.exam_id ?? "—"}</b>
                  </div>
                </div>
                <SevBadge s={severity(openEvent.event)} />
              </div>

              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 950, opacity: 0.9 }}>
                  Full payload
                </div>
                <pre
                  style={{
                    marginTop: 8,
                    padding: 12,
                    borderRadius: 14,
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.10)",
                    overflow: "auto",
                    fontSize: 12,
                    lineHeight: 1.45,
                    maxHeight: 340,
                  }}
                >
                  {JSON.stringify(openEvent, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

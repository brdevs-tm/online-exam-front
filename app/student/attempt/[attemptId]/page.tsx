"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://127.0.0.1:8000";

function nowIso() {
  return new Date().toISOString();
}

async function cheatLog(token: string, payload: any) {
  try {
    await fetch(`${API_BASE}/api/cheat/log`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch {
    // jim
  }
}

type OverlayState =
  | { open: false }
  | {
      open: true;
      title: string;
      desc: string;
      tone?: "warn" | "danger" | "ok";
    };

export default function AttemptPage() {
  const params = useParams<{ attemptId: string }>();
  const search = useSearchParams();

  const attemptId = Number(params.attemptId);
  const examId = Number(search.get("exam_id") || 0);

  const token =
    typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

  const tgUserId = useMemo(() => {
    if (typeof window === "undefined") return null;
    const tg = (window as any).Telegram?.WebApp;
    return tg?.initDataUnsafe?.user?.id ?? null;
  }, []);

  const [overlay, setOverlay] = useState<OverlayState>({ open: false });
  const [blur, setBlur] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // watermark (dynamic)
  const wmText = useMemo(() => {
    const tid = tgUserId ?? "unknown";
    return `Examly • tid:${tid} • attempt:${attemptId} • ${nowIso()}`;
  }, [tgUserId, attemptId]);

  const [wmPos, setWmPos] = useState({ x: 18, y: 90, rot: -18 });
  useEffect(() => {
    const t = setInterval(() => {
      const x = 10 + Math.floor(Math.random() * 70);
      const y = 70 + Math.floor(Math.random() * 240);
      const rot = -24 + Math.floor(Math.random() * 22);
      setWmPos({ x, y, rot });
    }, 3200);
    return () => clearInterval(t);
  }, []);

  const showOverlay = (
    title: string,
    desc: string,
    tone: OverlayState extends any ? any : any = "warn",
  ) => {
    setOverlay({ open: true, title, desc, tone });
    setTimeout(() => setOverlay({ open: false }), 1200);
  };

  // heuristics: background timing
  const hiddenAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (!token || !attemptId) return;

    // Telegram WebApp: best practice
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.ready) tg.ready();
    if (tg?.expand) tg.expand();

    // block selection
    document.documentElement.style.userSelect = "none";
    (document.body.style as any).webkitUserSelect = "none";

    const log = (event: string, detail?: any) =>
      cheatLog(token, {
        event,
        attempt_id: attemptId,
        exam_id: examId || undefined,
        ts: nowIso(),
        detail,
      });

    const onVisibility = () => {
      if (document.hidden) {
        hiddenAtRef.current = Date.now();
        setBlur(true);
        showOverlay(
          "Warning",
          "App’dan chiqildi / minimize bo‘ldi. Monitoring yozildi.",
          "warn",
        );
        log("TAB_SWITCH");
        log("VISIBILITY_HIDDEN");
      } else {
        // came back
        const hiddenAt = hiddenAtRef.current;
        hiddenAtRef.current = null;
        setBlur(false);

        if (hiddenAt) {
          const dur = Date.now() - hiddenAt;
          // uzun background bo‘lsa screen record/screenshot suspect deb belgilaymiz
          if (dur > 2500) {
            log("SCREEN_RECORD_SUSPECT", { hidden_ms: dur });
          } else {
            log("SCREENSHOT_SUSPECT", { hidden_ms: dur });
          }
        }

        log("WINDOW_FOCUS");
      }
    };

    const onBlur = () => {
      setBlur(true);
      showOverlay("Warning", "Fokus yo‘qoldi. Monitoring yozildi.", "warn");
      log("WINDOW_BLUR");
    };

    const onFocus = () => {
      setBlur(false);
      log("WINDOW_FOCUS");
    };

    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      showOverlay("Blocked", "Right-click bloklandi (logged).", "warn");
      log("CONTEXT_MENU");
    };

    const onCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      showOverlay("Blocked", "Copy urinish log qilindi.", "warn");
      log("COPY");
    };

    const onPaste = (e: ClipboardEvent) => {
      e.preventDefault();
      showOverlay("Warning", "Paste urinish log qilindi.", "warn");
      log("PASTE");
    };

    const onSelectStart = (e: Event) => {
      e.preventDefault();
      log("TEXT_SELECTION");
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const key = (e.key || "").toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;

      // PrintScreen (to‘liq blok bo‘lmaydi, lekin log + blur qilamiz)
      if (key === "printscreen") {
        e.preventDefault();
        setBlur(true);
        showOverlay(
          "Warning",
          "Screenshot urinish aniqlandi (logged).",
          "danger",
        );
        log("SCREENSHOT_KEY", { key: "PrintScreen" });
        setTimeout(() => setBlur(false), 900);
        return;
      }

      // Block common shortcuts
      if (ctrl && (key === "p" || key === "s" || key === "u")) {
        e.preventDefault();
        showOverlay("Blocked", "Shortcut bloklandi (logged).", "warn");
        log("SHORTCUT_BLOCK", { key: e.key, ctrl, shift });
        return;
      }

      // Devtools
      if (
        key === "f12" ||
        (ctrl && shift && (key === "i" || key === "j" || key === "c"))
      ) {
        e.preventDefault();
        showOverlay(
          "Blocked",
          "DevTools shortcut bloklandi (logged).",
          "danger",
        );
        log("DEVTOOLS_SHORTCUT", { key: e.key, ctrl, shift });
        return;
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("copy", onCopy);
    document.addEventListener("paste", onPaste);
    document.addEventListener("selectstart", onSelectStart);
    window.addEventListener("keydown", onKeyDown, { capture: true });

    // “debugger pause suspect”
    const lastTick = { t: Date.now() };
    const tickTimer = setInterval(() => {
      const now = Date.now();
      const diff = now - lastTick.t;
      lastTick.t = now;
      if (diff > 1700) log("DEBUGGER_PAUSE_SUSPECT", { diff_ms: diff });
    }, 1000);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("selectstart", onSelectStart);
      window.removeEventListener("keydown", onKeyDown, {
        capture: true,
      } as any);
      clearInterval(tickTimer);

      document.documentElement.style.userSelect = "auto";
      (document.body.style as any).webkitUserSelect = "auto";
    };
  }, [token, attemptId, examId]);

  const finish = async () => {
    if (!token) return setError("Token yo‘q");
    try {
      setError(null);
      const res = await fetch(
        `${API_BASE}/api/student/attempts/${attemptId}/finish`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          data?.detail ? JSON.stringify(data.detail) : "Finish bo‘lmadi",
        );
        return;
      }
      showOverlay("OK", "Exam yakunlandi", "ok");
      window.location.href = `/student/result/${attemptId}`;
    } catch (e: any) {
      setError(e?.message || "Failed to fetch");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 16,
      }}
    >
      <div style={{ width: "100%", maxWidth: 900 }}>
        <div
          style={{
            borderRadius: 18,
            padding: 18,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.10)",
            boxShadow: "0 18px 60px rgba(0,0,0,0.45)",
            backdropFilter: "blur(10px)",
            position: "relative",
            overflow: "hidden",
            color: "#e8eefc",
            fontFamily:
              'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial',
          }}
        >
          {/* watermark */}
          <div
            style={{
              position: "absolute",
              top: wmPos.y,
              left: wmPos.x,
              transform: `rotate(${wmPos.rot}deg)`,
              opacity: 0.18,
              pointerEvents: "none",
              fontWeight: 900,
              letterSpacing: 0.4,
              fontSize: 13,
              whiteSpace: "nowrap",
              textShadow: "0 10px 30px rgba(0,0,0,0.35)",
            }}
          >
            {wmText}
          </div>

          {/* overlay */}
          {overlay.open && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(0,0,0,0.58)",
                display: "grid",
                placeItems: "center",
                zIndex: 50,
              }}
            >
              <div
                style={{
                  borderRadius: 16,
                  padding: 16,
                  maxWidth: 520,
                  width: "90%",
                  background:
                    overlay.tone === "danger"
                      ? "rgba(239,68,68,0.12)"
                      : overlay.tone === "ok"
                        ? "rgba(34,197,94,0.12)"
                        : "rgba(255,255,255,0.08)",
                  border:
                    overlay.tone === "danger"
                      ? "1px solid rgba(239,68,68,0.28)"
                      : overlay.tone === "ok"
                        ? "1px solid rgba(34,197,94,0.28)"
                        : "1px solid rgba(255,255,255,0.12)",
                }}
              >
                <div style={{ fontWeight: 950, fontSize: 16 }}>
                  {overlay.title}
                </div>
                <div style={{ marginTop: 6, opacity: 0.85, fontSize: 13 }}>
                  {overlay.desc}
                </div>
              </div>
            </div>
          )}

          {/* content */}
          <div
            style={{
              filter: blur ? "blur(10px)" : "none",
              transition: "filter 120ms ease",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div>
                <div style={{ fontSize: 22, fontWeight: 950 }}>
                  Attempt #{attemptId}
                </div>
                <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
                  Anti-cheat: minimize/tab switch/copy/paste/devtools/screenshot
                  → log qilinadi
                </div>
              </div>
              <button
                onClick={finish}
                style={{
                  borderRadius: 12,
                  padding: "10px 12px",
                  fontWeight: 900,
                  border: "1px solid rgba(99,102,241,0.35)",
                  background: "rgba(99,102,241,0.22)",
                  color: "#e8eefc",
                  cursor: "pointer",
                  height: 42,
                  alignSelf: "flex-start",
                }}
              >
                Finish Exam
              </button>
            </div>

            {error && (
              <div
                style={{
                  marginTop: 12,
                  padding: 12,
                  borderRadius: 12,
                  background: "rgba(239,68,68,0.10)",
                  border: "1px solid rgba(239,68,68,0.25)",
                  fontSize: 13,
                }}
              >
                {error}
              </div>
            )}

            <div
              style={{
                marginTop: 14,
                padding: 12,
                borderRadius: 12,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.10)",
                fontSize: 13,
                opacity: 0.9,
              }}
            >
              Test qilish uchun: mini appdan chiqib qayt, copy/paste qilib ko‘r,
              yoki desktopda PrintScreen bosib ko‘r. Teacher monitor’da eventlar
              chiqadi.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

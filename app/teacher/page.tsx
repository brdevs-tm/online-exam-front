"use client";

import { useEffect, useMemo, useState } from "react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://127.0.0.1:8000";

type Exam = {
  id: number;
  title: string;
  description?: string | null;
  starts_at?: string;
  ends_at?: string;
  is_active?: boolean;
};

function fmt(ts?: string) {
  if (!ts) return "—";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleString();
}

export default function TeacherExamsPage() {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

  const [items, setItems] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [assignBusy, setAssignBusy] = useState<number | null>(null);

  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const [tgId, setTgId] = useState<Record<number, string>>({}); // examId -> telegram id input

  const dotColor = useMemo(() => {
    if (err) return "var(--bad)";
    if (loading) return "var(--info)";
    return "var(--good)";
  }, [err, loading]);

  const toast = (type: "ok" | "err", msg: string) => {
    if (type === "ok") {
      setOkMsg(msg);
      setErr(null);
      setTimeout(() => setOkMsg(null), 1800);
    } else {
      setErr(msg);
      setOkMsg(null);
    }
  };

  const fetchExams = async () => {
    if (!token) {
      toast("err", "Token yo‘q. Webapp-token orqali login qiling.");
      return;
    }
    try {
      setLoading(true);
      setErr(null);
      const res = await fetch(`${API_BASE}/api/teacher/exams`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast(
          "err",
          data?.detail ? JSON.stringify(data.detail) : "Exams yuklanmadi",
        );
        return;
      }

      const list = Array.isArray(data) ? data : data?.items || [];
      setItems(list);
    } catch (e: any) {
      toast("err", e?.message || "Failed to fetch");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const toggle = async (examId: number) => {
    if (!token) return toast("err", "Token yo‘q");
    try {
      setBusyId(examId);
      const res = await fetch(
        `${API_BASE}/api/teacher/exams/${examId}/toggle`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(
          "err",
          data?.detail ? JSON.stringify(data.detail) : "Toggle bo‘lmadi",
        );
        return;
      }
      // optimistik update
      setItems((prev) =>
        prev.map((x) =>
          x.id === examId
            ? { ...x, is_active: data?.is_active ?? !x.is_active }
            : x,
        ),
      );
      toast(
        "ok",
        `Exam #${examId} active: ${String(data?.is_active ?? "updated")}`,
      );
    } catch (e: any) {
      toast("err", e?.message || "Toggle error");
    } finally {
      setBusyId(null);
    }
  };

  const assign = async (examId: number) => {
    if (!token) return toast("err", "Token yo‘q");
    const raw = (tgId[examId] || "").trim();
    if (!raw) return toast("err", "Student telegram_id kiriting");
    const tid = Number(raw);
    if (!Number.isFinite(tid)) return toast("err", "telegram_id noto‘g‘ri");

    try {
      setAssignBusy(examId);
      const res = await fetch(
        `${API_BASE}/api/teacher/exams/${examId}/assign`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ student_telegram_id: tid }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(
          "err",
          data?.detail ? JSON.stringify(data.detail) : "Assign bo‘lmadi",
        );
        return;
      }
      toast("ok", `Assign: ${data?.status || "ok"} (student ${tid})`);
    } catch (e: any) {
      toast("err", e?.message || "Assign error");
    } finally {
      setAssignBusy(null);
    }
  };

  return (
    <div className="container">
      <div className="shell">
        <div style={{ marginBottom: 14 }}>
          <div className="pill">
            <span className="dot" style={{ background: dotColor }} />
            <span style={{ fontSize: 13, opacity: 0.9 }}>Examly • Teacher</span>
          </div>
        </div>

        <div className="card">
          <div className="row">
            <div>
              <h1 className="h1">Teacher Exams</h1>
              <div className="small" style={{ marginTop: 6 }}>
                Toggle ACTIVE qiling → student ko‘radi. Keyin telegram_id bilan
                ASSIGN.
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button className="btn" onClick={fetchExams} disabled={loading}>
                Refresh
              </button>
              <span className="badge">TEACHER</span>
            </div>
          </div>

          <hr className="hr" />

          {okMsg && (
            <div
              className="kvRow"
              style={{
                borderColor: "rgba(34,197,94,0.28)",
                background: "rgba(34,197,94,0.10)",
              }}
            >
              <div style={{ fontWeight: 900 }}>OK</div>
              <div className="small" style={{ maxWidth: 560 }}>
                {okMsg}
              </div>
            </div>
          )}

          {err && (
            <div
              className="kvRow"
              style={{
                borderColor: "rgba(239,68,68,0.28)",
                background: "rgba(239,68,68,0.10)",
              }}
            >
              <div style={{ fontWeight: 900 }}>Xatolik</div>
              <div className="small" style={{ maxWidth: 560 }}>
                {err}
              </div>
            </div>
          )}

          {loading ? (
            <div className="muted">Loading…</div>
          ) : items.length === 0 ? (
            <div className="muted">
              Exam yo‘q (teacher create qilmagan bo‘lishi mumkin)
            </div>
          ) : (
            <div className="grid" style={{ marginTop: 10 }}>
              {items.map((ex) => {
                const active = !!ex.is_active;
                const b1 = busyId === ex.id;
                const b2 = assignBusy === ex.id;
                return (
                  <div
                    key={ex.id}
                    className="kvRow"
                    style={{ alignItems: "stretch" }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          gap: 10,
                          alignItems: "center",
                        }}
                      >
                        <div style={{ fontWeight: 950, fontSize: 14, flex: 1 }}>
                          #{ex.id} • {ex.title}
                        </div>
                        <span
                          className="badge"
                          style={{
                            background: active
                              ? "rgba(34,197,94,0.14)"
                              : "rgba(255,255,255,0.06)",
                            borderColor: active
                              ? "rgba(34,197,94,0.28)"
                              : "rgba(255,255,255,0.10)",
                          }}
                        >
                          {active ? "ACTIVE" : "INACTIVE"}
                        </span>
                      </div>

                      <div
                        className="small"
                        style={{ marginTop: 6, opacity: 0.9 }}
                      >
                        {ex.description || "Description yo‘q"}
                      </div>

                      <div
                        className="small"
                        style={{ marginTop: 8, opacity: 0.75 }}
                      >
                        Start: <b>{fmt(ex.starts_at)}</b> • End:{" "}
                        <b>{fmt(ex.ends_at)}</b>
                      </div>

                      <div
                        style={{
                          marginTop: 10,
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <button
                          className={`btn ${active ? "" : "btnPrimary"}`}
                          onClick={() => toggle(ex.id)}
                          disabled={b1 || b2}
                          title="Student ko‘rishi uchun ACTIVE qiling"
                        >
                          {b1 ? "..." : active ? "Deactivate" : "Activate"}
                        </button>

                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            alignItems: "center",
                          }}
                        >
                          <input
                            value={tgId[ex.id] || ""}
                            onChange={(e) =>
                              setTgId((p) => ({
                                ...p,
                                [ex.id]: e.target.value,
                              }))
                            }
                            placeholder="student telegram_id"
                            style={{
                              height: 38,
                              borderRadius: 12,
                              padding: "0 12px",
                              border: "1px solid rgba(255,255,255,0.12)",
                              background: "rgba(255,255,255,0.06)",
                              color: "var(--fg)",
                              outline: "none",
                              width: 220,
                            }}
                          />

                          <button
                            className="btn btnPrimary"
                            onClick={() => assign(ex.id)}
                            disabled={b1 || b2}
                            title="Studentga examni biriktirish"
                          >
                            {b2 ? "Assigning…" : "Assign"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="small" style={{ marginTop: 12 }}>
            Backend: {API_BASE} • Token: {token ? "OK" : "NO"}
          </div>
        </div>

        <div className="small" style={{ marginTop: 12, textAlign: "center" }}>
          Teacher panel • Exam activate + assign
        </div>
      </div>
    </div>
  );
}

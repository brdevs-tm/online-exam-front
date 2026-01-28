"use client";

import { useEffect, useMemo, useState } from "react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://127.0.0.1:8000";

type Exam = {
  id: number;
  title: string;
  description?: string;
  starts_at?: string;
  ends_at?: string;
};

export default function StudentHome() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const token =
    typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

  const dotColor = useMemo(() => {
    if (error) return "var(--bad)";
    if (loading) return "var(--info)";
    return "var(--good)";
  }, [error, loading]);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`${API_BASE}/api/student/exams`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          setError(
            data?.detail ? JSON.stringify(data.detail) : "Exams yuklanmadi",
          );
          return;
        }

        setExams(Array.isArray(data) ? data : data?.items || []);
      } catch (e: any) {
        setError(e?.message || "Failed to fetch");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [token]);

  const startExam = async (examId: number) => {
    try {
      setError(null);

      const res = await fetch(`${API_BASE}/api/student/exams/${examId}/start`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.detail ? JSON.stringify(data.detail) : "Start bo‘lmadi");
        return;
      }

      const attemptId =
        data?.attempt_id ?? data?.attemptId ?? data?.id ?? data?.attempt?.id;

      if (!attemptId) {
        setError("Attempt ID qaytmadi (start response formatini tekshir).");
        return;
      }

      window.location.href = `/student/attempt/${attemptId}?exam_id=${examId}`;
    } catch (e: any) {
      setError(e?.message || "Failed to fetch");
    }
  };

  return (
    <div className="container">
      <div className="shell">
        <div style={{ marginBottom: 14 }}>
          <div className="pill">
            <span className="dot" style={{ background: dotColor }} />
            <span style={{ fontSize: 13, opacity: 0.9 }}>Examly • Student</span>
          </div>
        </div>

        <div className="card">
          <div className="row">
            <div>
              <h1 className="h1">Available Exams</h1>
              <div className="small" style={{ marginTop: 6 }}>
                Start bosib examni boshlaysan. Anti-cheat avtomatik ishlaydi.
              </div>
            </div>
            <span className="badge">STUDENT</span>
          </div>

          <hr className="hr" />

          {error && (
            <div
              className="kvRow"
              style={{
                borderColor: "rgba(239,68,68,0.28)",
                background: "rgba(239,68,68,0.10)",
              }}
            >
              <div style={{ fontWeight: 900 }}>Xatolik</div>
              <div className="small" style={{ maxWidth: 560 }}>
                {error}
              </div>
            </div>
          )}

          {loading ? (
            <div className="muted">Loading…</div>
          ) : exams.length === 0 ? (
            <div className="muted">
              Exam yo‘q (teacher assign qilmagan bo‘lishi mumkin)
            </div>
          ) : (
            <div className="grid" style={{ marginTop: 10 }}>
              {exams.map((ex) => (
                <div key={ex.id} className="kvRow">
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 950, fontSize: 14 }}>
                      {ex.title}
                    </div>
                    <div className="small" style={{ marginTop: 4 }}>
                      {ex.description || "Description yo‘q"}
                    </div>
                  </div>
                  <button
                    className="btn btnPrimary"
                    onClick={() => startExam(ex.id)}
                  >
                    Start
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="small" style={{ marginTop: 12 }}>
            Token localStorage’da saqlanadi • Backend: {API_BASE}
          </div>
        </div>

        <div className="small" style={{ marginTop: 12, textAlign: "center" }}>
          Secure session • JWT stored locally
        </div>
      </div>
    </div>
  );
}

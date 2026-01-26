"use client";

import { useEffect, useState } from "react";

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
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({}), // backend body talab qilmasa bo'sh
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.detail ? JSON.stringify(data.detail) : "Start bo‘lmadi");
        return;
      }

      // backend nima qaytarishiga qarab:
      const attemptId = data?.attempt_id ?? data?.id ?? data?.attempt?.id;
      if (!attemptId) {
        setError("Attempt ID qaytmadi. Backend response'ni tekshir.");
        return;
      }

      window.location.href = `/student/attempt/${attemptId}?exam_id=${examId}`;
    } catch (e: any) {
      setError(e?.message || "Failed to fetch");
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ fontSize: 22, fontWeight: 900 }}>Student • My Exams</h1>

      {error && (
        <div style={{ marginTop: 10, padding: 10, border: "1px solid #f55" }}>
          {error}
        </div>
      )}

      {loading ? (
        <p style={{ opacity: 0.8 }}>Loading…</p>
      ) : exams.length === 0 ? (
        <p style={{ opacity: 0.8 }}>
          Exam yo‘q (teacher assign qilmagan bo‘lishi mumkin)
        </p>
      ) : (
        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
          {exams.map((ex) => (
            <div
              key={ex.id}
              style={{
                padding: 12,
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.12)",
              }}
            >
              <div style={{ fontWeight: 900 }}>{ex.title}</div>
              {ex.description && (
                <div style={{ opacity: 0.8 }}>{ex.description}</div>
              )}

              <div style={{ marginTop: 10 }}>
                <button onClick={() => startExam(ex.id)}>Start</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

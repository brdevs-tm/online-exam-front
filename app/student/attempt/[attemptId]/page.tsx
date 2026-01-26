"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://127.0.0.1:8000";

async function logCheat(token: string, payload: any) {
  await fetch(`${API_BASE}/api/cheat/log`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  }).catch(() => {});
}

export default function AttemptPage() {
  const params = useParams<{ attemptId: string }>();
  const search = useSearchParams();

  const attemptId = Number(params.attemptId);
  const examId = Number(search.get("exam_id") || 0);

  const token =
    typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

  const [status, setStatus] = useState<"idle" | "finishing">("idle");
  const [error, setError] = useState<string | null>(null);

  // ✅ Anti-cheat listeners
  useEffect(() => {
    if (!token || !attemptId) return;

    const onVisibility = () => {
      if (document.hidden) {
        logCheat(token, {
          event: "TAB_SWITCH",
          attempt_id: attemptId,
          exam_id: examId || undefined,
        });
      }
    };

    const onBlur = () => {
      logCheat(token, {
        event: "WINDOW_BLUR",
        attempt_id: attemptId,
        exam_id: examId || undefined,
      });
    };

    const onCopy = () => {
      logCheat(token, {
        event: "COPY",
        attempt_id: attemptId,
        exam_id: examId || undefined,
      });
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    document.addEventListener("copy", onCopy);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("copy", onCopy);
    };
  }, [token, attemptId, examId]);

  const finish = async () => {
    if (!token) return setError("Token yo‘q");

    try {
      setStatus("finishing");
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
        setStatus("idle");
        return;
      }

      window.location.href = `/student/result/${attemptId}`;
    } catch (e: any) {
      setError(e?.message || "Failed to fetch");
      setStatus("idle");
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ fontSize: 22, fontWeight: 900 }}>Attempt #{attemptId}</h1>
      <p style={{ opacity: 0.8 }}>
        Tab almashtir / copy qil → Teacher monitoring’da event chiqishi kerak.
      </p>

      {error && (
        <div style={{ marginTop: 10, padding: 10, border: "1px solid #f55" }}>
          {error}
        </div>
      )}

      <button onClick={finish} disabled={status === "finishing"}>
        {status === "finishing" ? "Finishing..." : "Finish Exam"}
      </button>
    </div>
  );
}

"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";

export default function ResultPage() {
  const params = useParams<{ attemptId: string }>();

  const attemptId = useMemo(() => {
    const urlId = params?.attemptId;
    if (urlId) return urlId;

    if (typeof window !== "undefined") {
      const fromLs = localStorage.getItem("attempt_id");
      if (fromLs) return fromLs;
    }
    return "—";
  }, [params?.attemptId]);

  return (
    <div className="container">
      <div className="shell">
        <div style={{ marginBottom: 14 }}>
          <div className="pill">
            <span className="dot" style={{ background: "var(--good)" }} />
            <span style={{ fontSize: 13, opacity: 0.9 }}>Examly • Result</span>
          </div>
        </div>

        <div className="card">
          <div className="row">
            <div>
              <h1 className="h1">Result ✅</h1>
              <div className="small" style={{ marginTop: 6 }}>
                Attempt #{attemptId} yakunlandi.
              </div>
            </div>
            <span className="badge">DONE</span>
          </div>

          <hr className="hr" />

          <div className="kv">
            <div className="kvRow">
              <span className="small">Attempt ID</span>
              <b>{attemptId}</b>
            </div>
            <div className="kvRow">
              <span className="small">Next step</span>
              <b>Score/stat endpoint qo‘shib shu yerda ko‘rsatamiz</b>
            </div>
          </div>
        </div>

        <div className="small" style={{ marginTop: 12, textAlign: "center" }}>
          Secure session • Result view
        </div>
      </div>
    </div>
  );
}

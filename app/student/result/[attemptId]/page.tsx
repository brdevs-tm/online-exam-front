"use client";
import { useParams } from "next/navigation";

export default function ResultPage() {
  const params = useParams<{ attemptId: string }>();
  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ fontSize: 22, fontWeight: 900 }}>Result</h1>
      <p>Attempt #{params.attemptId} yakunlandi ✅</p>
      <p style={{ opacity: 0.8 }}>
        Keyingi qadam: backend’dan score/stat qaytarib shu yerda ko‘rsatamiz.
      </p>
    </div>
  );
}

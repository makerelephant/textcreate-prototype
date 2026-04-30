"use client";

import { useState } from "react";

export default function DemoPage() {
  const [imageUrl, setImageUrl] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  async function runDemo(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    const res = await fetch(`/api/dev/mock-inbound${imageUrl || phone ? `?imageUrl=${encodeURIComponent(imageUrl)}&phone=${encodeURIComponent(phone)}` : ""}`, { method: "POST" });
    setResult(await res.json());
    setLoading(false);
  }

  return (
    <main className="container">
      <h1>Demo: AI Visual Collection</h1>
      <ol>
        <li>Text a photo to the Twilio number.</li>
        <li>AI analyzes style, colors, mood, and materials.</li>
        <li>AI creates a styled visual collection.</li>
        <li>User receives a collection link by SMS.</li>
      </ol>

      <form onSubmit={runDemo} className="card" style={{ display: "grid", gap: 10 }}>
        <label>Optional image URL<input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." /></label>
        <label>Optional phone<input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+15555550123" /></label>
        <button type="submit" disabled={loading}>{loading ? "Generating..." : "Generate Demo Collection"}</button>
      </form>

      {result && <pre className="card" style={{ marginTop: 16, overflowX: "auto" }}>{JSON.stringify(result, null, 2)}</pre>}
    </main>
  );
}

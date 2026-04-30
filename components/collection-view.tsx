"use client";

import { useEffect, useState } from "react";
import type { CollectionSession } from "@/types";

export default function CollectionView({ session, shareUrl }: { session: CollectionSession; shareUrl: string }) {
  const [copied, setCopied] = useState(false);
  const [heroUrl, setHeroUrl] = useState<string | null>(session.generated_hero_image_url);
  const [heroState, setHeroState] = useState<"idle" | "generating" | "failed">(
    session.generated_hero_image_url ? "idle" : "generating"
  );
  const tags = [
    ...session.analysis.colors,
    ...session.analysis.style,
    ...session.analysis.materials,
    ...session.analysis.visual_direction.mood,
  ].slice(0, 10);

  useEffect(() => {
    if (heroUrl) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/sessions/${session.id}/hero`, { method: "POST" });
        const data = await res.json();
        if (cancelled) return;
        if (data.ok && data.heroUrl) {
          setHeroUrl(data.heroUrl);
          setHeroState("idle");
        } else {
          setHeroState("failed");
        }
      } catch {
        if (!cancelled) setHeroState("failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session.id, heroUrl]);

  async function copyLink() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <main className="container">
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div>
          <h1 style={{ marginBottom: 4 }}>AI-generated visual collection</h1>
          <p style={{ marginTop: 0, color: "#555" }}>Inspired by your photo and curated into visual matches.</p>
          <p style={{ marginTop: 4, color: "#777" }}>Prototype collection generated on {new Date(session.created_at).toLocaleString()}.</p>
        </div>
        <button onClick={copyLink}>{copied ? "Copied" : "Copy link"}</button>
      </header>

      <section className="card" style={{ marginTop: 12 }}>
        <p style={{ marginTop: 0 }}><strong>Share</strong>: send this link in a text message.</p>
        <code style={{ wordBreak: "break-all" }}>{shareUrl}</code>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16, marginTop: 16 }}>
        <article className="card">
          <h2>Collection hero</h2>
          {heroUrl ? (
            <>
              <img src={heroUrl} alt="AI generated hero" style={{ width: "100%", borderRadius: 10 }} />
              <p>AI-generated visual inspired by your photo and real product assets.</p>
            </>
          ) : heroState === "generating" ? (
            <p>Generating hero image…</p>
          ) : (
            <p>Hero unavailable. Showing visual matches below.</p>
          )}
        </article>
        <article className="card">
          <h2>Source inspiration image</h2>
          <img src={session.source_image_url} alt="Source inspiration" style={{ width: "100%", borderRadius: 10 }} />
        </article>
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <h2>Visual direction</h2>
        <div>{tags.length ? tags.map((t) => <span key={t} className="badge">{t}</span>) : <p>No visual tags detected.</p>}</div>
      </section>

      <section style={{ marginTop: 16 }}>
        <h2>Collection items</h2>
        {session.collection_items.length === 0 ? (
          <p className="card">No visual matches found yet.</p>
        ) : (
          <div className="grid">
            {session.collection_items.map((it) => (
              <article key={it.id} className="card">
                <img src={it.image} alt={it.title} style={{ height: 180, objectFit: "cover", borderRadius: 8, width: "100%" }} />
                <h3>{it.title}</h3>
                <p>{it.description}</p>
                <p><span className="badge">{it.category}</span></p>
                <div style={{ background: "#eee", borderRadius: 999, height: 8, overflow: "hidden" }}>
                  <div style={{ width: `${Math.round(it.confidence_score * 100)}%`, height: "100%", background: "#4f46e5" }} />
                </div>
                <small>Confidence: {Math.round(it.confidence_score * 100)}%</small>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

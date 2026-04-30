"use client";

import { useEffect, useRef, useState } from "react";
import type { CollectionSession } from "@/types";
import { MOCKUP_PRODUCTS } from "@/lib/product-matching";
import "../app/collections/[sessionId]/collections.css";

type TileState = "generating" | "ready" | "failed";

export default function CollectionView({ session, shareUrl }: { session: CollectionSession; shareUrl: string }) {
  const [mockups, setMockups] = useState<Record<string, string>>(session.mockups || {});
  const [states, setStates] = useState<Record<string, TileState>>(() => {
    const initial: Record<string, TileState> = {};
    for (const p of MOCKUP_PRODUCTS) {
      initial[p.id] = session.mockups?.[p.id] ? "ready" : "generating";
    }
    return initial;
  });
  const [copied, setCopied] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const toFetch = MOCKUP_PRODUCTS.filter((p) => !mockups[p.id]);
    if (toFetch.length === 0) return;

    let cancelled = false;
    toFetch.forEach(async (product) => {
      try {
        const res = await fetch(`/api/sessions/${session.id}/mockups/${product.id}`, { method: "POST" });
        const data = await res.json();
        if (cancelled) return;
        if (data.ok && data.mockupUrl) {
          setMockups((prev) => ({ ...prev, [product.id]: data.mockupUrl }));
          setStates((prev) => ({ ...prev, [product.id]: "ready" }));
        } else {
          setStates((prev) => ({ ...prev, [product.id]: "failed" }));
        }
      } catch {
        if (!cancelled) setStates((prev) => ({ ...prev, [product.id]: "failed" }));
      }
    });

    return () => { cancelled = true; };
  }, [session.id, mockups]);

  async function copyLink() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  const STATUS_LABEL: Record<TileState, string> = {
    generating: "Generating",
    ready: "Ready",
    failed: "Failed",
  };

  return (
    <main className="cp-page" data-state="populated">
      <img className="cp-brand" src="/assets/logo-mark.png" alt="In Motion" width={56} height={45} />

      <div className="cp-motif" aria-hidden="true">
        <img src="/assets/engine-background.png" alt="" />
      </div>

      <div className="cp-content">
        <header className="cp-header">
          <div>
            <h1 className="cp-h1">here is your collection 👉🏻</h1>
            <p className="cp-sub">Here are a collection of product mockups containing the asset that you sent to MiM.</p>
          </div>
          <button type="button" className="cp-btn cp-btn-secondary" onClick={copyLink}>
            {copied ? "Copied" : "Copy share link"}
          </button>
        </header>

        <section className="cp-source-row">
          <img className="cp-source-img" src={session.source_image_url} alt="Your design" />
          <div className="cp-source-text">
            <span className="cp-source-label">Your design</span>
            <span className="cp-source-share">{shareUrl}</span>
          </div>
        </section>

        <div>
          <h2 className="cp-section-title">Products</h2>
          <section className="cp-grid" aria-label="Product mockups">
            {MOCKUP_PRODUCTS.map((product, i) => {
              const url = mockups[product.id];
              const state = states[product.id];
              return (
                <article key={product.id} className="cp-tile" style={{ animationDelay: `${i * 60}ms` }}>
                  <div
                    className="cp-preview"
                    style={url ? { backgroundImage: `url(${url})` } : undefined}
                    aria-label={url ? `${product.title} mockup` : `${product.title} ${STATUS_LABEL[state]}`}
                  >
                    {!url && (
                      <div className="cp-preview-status" data-state={state}>
                        {state === "generating" && <span className="cp-spinner" aria-hidden />}
                        <span>{STATUS_LABEL[state]}</span>
                      </div>
                    )}
                  </div>
                  <div className="cp-tile-row">
                    <span className="cp-name" title={product.title}>{product.title}</span>
                    <span className="cp-chip" data-status={state}>{STATUS_LABEL[state]}</span>
                  </div>
                </article>
              );
            })}
          </section>
        </div>
      </div>

      <footer className="cp-footer">© 2026 Made In Motion PBC</footer>
    </main>
  );
}

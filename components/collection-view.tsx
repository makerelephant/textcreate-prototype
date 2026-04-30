"use client";

import { useEffect, useRef, useState } from "react";
import type { CollectionSession } from "@/types";
import { MOCKUP_PRODUCTS } from "@/lib/product-matching";
import "../app/collections/[sessionId]/collections.css";

const INITIAL_BATCH = 3;
const BATCH_SIZE = 3;

type TileState = "generating" | "ready" | "failed";

export default function CollectionView({ session, shareUrl }: { session: CollectionSession; shareUrl: string }) {
  const initialMockups = session.mockups || {};
  const [mockups, setMockups] = useState<Record<string, string>>(initialMockups);
  const [failed, setFailed] = useState<Set<string>>(new Set());
  const [visibleCount, setVisibleCount] = useState(INITIAL_BATCH);
  const [shareLabel, setShareLabel] = useState<"Share your Collection" | "Link copied" | "Shared">("Share your Collection");
  const triggeredRef = useRef<Set<string>>(new Set(Object.keys(initialMockups)));

  useEffect(() => {
    const visible = MOCKUP_PRODUCTS.slice(0, visibleCount);
    const toTrigger = visible.filter(
      (p) => !mockups[p.id] && !triggeredRef.current.has(p.id)
    );
    if (toTrigger.length === 0) return;

    let cancelled = false;
    toTrigger.forEach(async (product) => {
      triggeredRef.current.add(product.id);
      // Client-side abort cap so a hung Vercel function never leaves a tile spinning forever.
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 100_000);
      try {
        const res = await fetch(`/api/sessions/${session.id}/mockups/${product.id}`, {
          method: "POST",
          signal: controller.signal,
        });
        const data = await res.json();
        if (cancelled) return;
        if (data.ok && data.mockupUrl) {
          setMockups((prev) => ({ ...prev, [product.id]: data.mockupUrl }));
        } else {
          setFailed((prev) => new Set(prev).add(product.id));
        }
      } catch {
        if (!cancelled) setFailed((prev) => new Set(prev).add(product.id));
      } finally {
        clearTimeout(timeout);
      }
    });
    return () => { cancelled = true; };
  }, [session.id, visibleCount, mockups]);

  function stateFor(productId: string): TileState {
    if (mockups[productId]) return "ready";
    if (failed.has(productId)) return "failed";
    return "generating";
  }

  async function shareCollection() {
    const nav = navigator as Navigator & { share?: (data: ShareData) => Promise<void> };
    if (typeof nav.share === "function") {
      try {
        await nav.share({
          title: "My In Motion collection",
          text: "Here's my collection of product mockups",
          url: shareUrl,
        });
        setShareLabel("Shared");
        setTimeout(() => setShareLabel("Share your Collection"), 1500);
        return;
      } catch {
        // User cancelled or share failed — fall through to clipboard.
      }
    }
    await navigator.clipboard.writeText(shareUrl);
    setShareLabel("Link copied");
    setTimeout(() => setShareLabel("Share your Collection"), 1500);
  }

  const STATUS_LABEL: Record<TileState, string> = {
    generating: "Generating",
    ready: "Ready",
    failed: "Failed",
  };

  const visibleProducts = MOCKUP_PRODUCTS.slice(0, visibleCount);
  const moreCount = Math.min(MOCKUP_PRODUCTS.length - visibleCount, BATCH_SIZE);

  return (
    <main className="cp-page" data-state="populated">
      <img className="cp-brand" src="/assets/logo-mark.png" alt="In Motion" width={56} height={45} />

      <div className="cp-motif" aria-hidden="true">
        <img src="/assets/engine-background.png" alt="" />
      </div>

      <div className="cp-content">
        <header className="cp-header">
          <div>
            <h1 className="cp-h1">Here is your collection 👉🏻</h1>
            <p className="cp-sub">Here are a collection of product mockups containing the asset that you sent to MiM.</p>
          </div>
          <button type="button" className="cp-btn-share" onClick={shareCollection}>
            <IconShare aria-hidden />
            <span>{shareLabel}</span>
          </button>
        </header>

        <section className="cp-source-row">
          <img className="cp-source-img" src={session.source_image_url} alt="Your design" />
          <div className="cp-source-text">
            <span className="cp-source-label">Your design</span>
            <a
              className="cp-chip-btn"
              href={session.source_image_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              See your design
            </a>
          </div>
        </section>

        <div>
          <h2 className="cp-section-title">Products</h2>
          <section className="cp-grid" aria-label="Product mockups">
            {visibleProducts.map((product, i) => {
              const url = mockups[product.id];
              const state = stateFor(product.id);
              return (
                <article key={product.id} className="cp-tile" style={{ animationDelay: `${i * 60}ms` }}>
                  <div
                    className="cp-preview"
                    style={url ? { backgroundImage: `url(${url})` } : undefined}
                    aria-label={url ? `${product.title} mockup` : `${product.title} ${STATUS_LABEL[state]}`}
                  >
                    {!url && (
                      <div className="cp-preview-status" data-state={state}>
                        {state === "generating" ? (
                          <>
                            <span className="cp-spinner" aria-hidden />
                            <div className="cp-status-stack">
                              <span>Generating</span>
                              <span className="cp-status-eta">~30 sec</span>
                            </div>
                          </>
                        ) : (
                          <span>Failed</span>
                        )}
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

          {moreCount > 0 && (
            <div className="cp-spinup-row">
              <button
                type="button"
                className="cp-btn cp-btn-primary"
                onClick={() => setVisibleCount((c) => c + BATCH_SIZE)}
              >
                Spin up {moreCount} more…
              </button>
            </div>
          )}
        </div>
      </div>

      <footer className="cp-footer">© 2026 Made In Motion PBC</footer>
    </main>
  );
}

function IconShare(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M15 3h6v6" />
      <path d="M10 14L21 3" />
      <path d="M19 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6" />
    </svg>
  );
}

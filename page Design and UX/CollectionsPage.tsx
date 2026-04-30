"use client";

import { useCallback, useState, type SVGProps } from "react";
import "./collections.css";

/* ============================================================
   Collections page — In Motion
   Single-file React component. Plain CSS via collections.css.
   ============================================================ */

type ProductStatus = "draft" | "live" | "archive";

interface Product {
  id: string;
  name: string;
  status: ProductStatus;
  /** ISO 8601 timestamp */
  createdAt: string;
  /** Optional preview image URL — falls back to the placeholder gradient */
  previewUrl?: string;
}

export interface CollectionsPageProps {
  initialProducts?: Product[];
  /** Wire to your router. */
  onOpenProduct?: (product: Product) => void;
}

const STATUS_LABEL: Record<ProductStatus, string> = {
  draft: "Draft",
  live: "Live",
  archive: "Archived",
};

export function CollectionsPage({
  initialProducts = [],
  onOpenProduct,
}: CollectionsPageProps = {}) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const isEmpty = products.length === 0;

  const handleCreate = useCallback(() => {
    setProducts((prev) => [
      {
        id: `p_${Date.now()}`,
        name: `Untitled product ${prev.length + 1}`,
        status: "draft",
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
  }, []);

  return (
    <main
      className="cp-page"
      data-state={isEmpty ? "empty" : "populated"}
    >
      {/* Brand mark */}
      <img
        className="cp-brand"
        src="/assets/logo-mark.png"
        alt="In Motion"
        width={56}
        height={45}
      />

      {/* Hero motif */}
      <div className="cp-motif" aria-hidden="true">
        <img src="/assets/engine-background.png" alt="" />
      </div>

      <div className="cp-content">
        {/* Header */}
        <header className="cp-header">
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span className="cp-eyebrow">Collections</span>
            <h1 className="cp-h1">
              Your products
              {products.length > 0 && (
                <span className="cp-count">· {products.length}</span>
              )}
            </h1>
          </div>

          <button type="button" className="cp-btn cp-btn-primary" onClick={handleCreate}>
            <IconPlus aria-hidden />
            <span>Create</span>
          </button>
        </header>

        {/* Empty / populated */}
        {isEmpty ? (
          <div className="cp-empty">
            <h2>Nothing in your collection yet</h2>
            <p>
              Products you create will land here — investor updates, business
              reviews, memos, anything you build with In Motion.
            </p>
            <button
              type="button"
              className="cp-btn cp-btn-primary"
              onClick={handleCreate}
            >
              <IconPlus aria-hidden />
              <span>Create your first product</span>
            </button>
          </div>
        ) : (
          <section className="cp-grid" aria-label="Products">
            {products.map((p, i) => (
              <button
                key={p.id}
                type="button"
                className="cp-tile"
                onClick={() => onOpenProduct?.(p)}
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <div
                  className="cp-preview"
                  aria-hidden
                  style={
                    p.previewUrl
                      ? {
                          backgroundImage: `url(${p.previewUrl})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                        }
                      : undefined
                  }
                />
                <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, minWidth: 0 }}>
                    <span className="cp-name" title={p.name}>{p.name}</span>
                    <span className="cp-when">{formatRelative(p.createdAt)}</span>
                  </div>
                  <div>
                    <span className="cp-chip" data-status={p.status}>
                      {STATUS_LABEL[p.status]}
                    </span>
                  </div>
                </div>
              </button>
            ))}

            {/* Trailing "+ New product" tile */}
            <button
              type="button"
              className="cp-tile cp-tile-add"
              onClick={handleCreate}
            >
              <IconPlus aria-hidden />
              <span style={{ fontSize: 13, fontWeight: 600 }}>New product</span>
            </button>
          </section>
        )}
      </div>

      <footer className="cp-footer">© 2026 Made In Motion PBC</footer>
    </main>
  );
}

/* ---------- helpers ---------- */

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const diffH = (Date.now() - then) / 36e5;
  if (diffH < 1) return "Just now";
  if (diffH < 24) return `${Math.round(diffH)}h ago`;
  const days = Math.round(diffH / 24);
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.round(days / 7)}w ago`;
  return `${Math.round(days / 30)}mo ago`;
}

function IconPlus(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

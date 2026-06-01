"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useLocale } from "@/hooks/useLocale";

export const dynamic = "force-dynamic";

interface BookConfig {
  id: string;
  pet_id: string;
  name: string;
  status: "draft" | "ordered";
  theme: string;
  custom_title: string | null;
  year_filter: number | null;
  selected_story_ids: string[];
  cover_photo_url: string | null;
  story_layouts: Record<string, string>;
  dedication_text: string | null;
  gelato_order_id: string | null;
  ordered_at: string | null;
  page_count: number | null;
  created_at: string;
  updated_at: string;
}

interface GelatoStatus {
  orderStatus: string;
  fulfillmentStatus: string;
  shipments: { trackingCode: string; trackingUrl: string; carrier: string; shippedAt: string }[];
}

const STATUS_LABEL: Record<string, { fr: string; en: string; color: string }> = {
  created:    { fr: "Créée",       en: "Created",    color: "#7A5C44" },
  passed:     { fr: "En cours",    en: "Processing", color: "#C8813A" },
  accepted:   { fr: "Acceptée",    en: "Accepted",   color: "#C8813A" },
  printed:    { fr: "Imprimée",    en: "Printed",    color: "#5880B8" },
  shipped:    { fr: "Expédiée",    en: "Shipped",    color: "#6A9E78" },
  delivered:  { fr: "Livrée",      en: "Delivered",  color: "#6A9E78" },
  canceled:   { fr: "Annulée",     en: "Canceled",   color: "#A32D2D" },
};

export default function BooksPage({ params }: { params: { id: string } }) {
  const { locale } = useLocale();
  const { id: petId } = params;
  const isFR = locale === "fr";

  const [configs, setConfigs] = useState<BookConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [gelatoStatuses, setGelatoStatuses] = useState<Record<string, GelatoStatus>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reorderingId, setReorderingId] = useState<string | null>(null);

  const bg = "#F7F2EA";
  const textPrimary = "#3D2B1F";
  const textMuted = "#7A5C44";
  const accentColor = "#C8813A";
  const cardBg = "#FDFAF5";
  const cardBorder = "1px solid rgba(61,43,31,.08)";

  const fetchConfigs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/book-configs?petId=${petId}`);
      const data = await res.json();
      setConfigs(data.configs ?? []);
    } catch { /* silent */ }
    setLoading(false);
  }, [petId]);

  useEffect(() => { fetchConfigs(); }, [fetchConfigs]);

  // Fetch Gelato status for ordered configs
  useEffect(() => {
    const ordered = configs.filter(c => c.status === "ordered" && c.gelato_order_id);
    ordered.forEach(c => {
      if (gelatoStatuses[c.gelato_order_id!]) return; // already fetched
      fetch(`/api/gelato/status/${c.gelato_order_id}`)
        .then(r => r.json())
        .then(data => setGelatoStatuses(prev => ({ ...prev, [c.gelato_order_id!]: data })))
        .catch(() => {});
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configs]);

  const handleDelete = async (config: BookConfig) => {
    if (!confirm(isFR ? `Supprimer "${config.custom_title || config.name || "ce brouillon"}" ?` : `Delete "${config.custom_title || config.name || "this draft"}"?`)) return;
    setDeletingId(config.id);
    await fetch(`/api/book-configs/${config.id}`, { method: "DELETE" });
    setConfigs(prev => prev.filter(c => c.id !== config.id));
    setDeletingId(null);
  };

  const handleReorder = async (config: BookConfig) => {
    // Mark as draft so the order page can reuse it
    setReorderingId(config.id);
    // Navigate to order page with configId — the order page will load the config
    window.location.href = `/dashboard/pets/${petId}/order?configId=${config.id}`;
  };

  const drafts = configs.filter(c => c.status === "draft");
  const ordered = configs.filter(c => c.status === "ordered");

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(isFR ? "fr-FR" : "en-GB", { day: "2-digit", month: "short", year: "numeric" });

  const ConfigCard = ({ config }: { config: BookConfig }) => {
    const isOrdered = config.status === "ordered";
    const gelatoData = config.gelato_order_id ? gelatoStatuses[config.gelato_order_id] : null;
    const statusInfo = gelatoData ? STATUS_LABEL[gelatoData.orderStatus] ?? STATUS_LABEL[gelatoData.fulfillmentStatus] : null;
    const shipment = gelatoData?.shipments?.[0];

    return (
      <div style={{
        background: cardBg, border: cardBorder, borderRadius: 16,
        padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: ".75rem",
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: ".5rem" }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: ".5rem", flexWrap: "wrap" }}>
              <span style={{
                fontSize: ".65rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".08em",
                padding: ".2rem .5rem", borderRadius: 4,
                background: isOrdered ? "rgba(106,158,120,.15)" : "rgba(200,129,58,.12)",
                color: isOrdered ? "#3A6A48" : accentColor,
              }}>
                {isOrdered ? (isFR ? "Commandé" : "Ordered") : (isFR ? "Brouillon" : "Draft")}
              </span>
              {statusInfo && (
                <span style={{ fontSize: ".65rem", fontWeight: 600, color: statusInfo.color, textTransform: "uppercase", letterSpacing: ".06em" }}>
                  · {isFR ? statusInfo.fr : statusInfo.en}
                </span>
              )}
            </div>
            <div style={{ fontFamily: "Georgia, serif", fontSize: "1rem", fontWeight: 600, color: textPrimary, marginTop: ".35rem" }}>
              {config.custom_title || config.name || (isFR ? "Sans titre" : "Untitled")}
            </div>
          </div>
          {config.cover_photo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={config.cover_photo_url} alt="" style={{ width: 52, height: 52, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
          )}
        </div>

        {/* Meta */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: ".5rem 1rem", fontSize: ".78rem", color: textMuted, fontFamily: "sans-serif" }}>
          {config.page_count && <span>📄 {config.page_count} {isFR ? "pages" : "pages"}</span>}
          {config.selected_story_ids.length > 0 && (
            <span>📖 {config.selected_story_ids.length} {isFR ? "chapitre(s)" : "chapter(s)"}</span>
          )}
          {config.year_filter && <span>📅 {config.year_filter}</span>}
          {config.theme && <span>🎨 {config.theme}</span>}
          {isOrdered && config.ordered_at && (
            <span>{isFR ? "Commandé le" : "Ordered"} {formatDate(config.ordered_at)}</span>
          )}
          {!isOrdered && (
            <span>{isFR ? "Modifié le" : "Updated"} {formatDate(config.updated_at)}</span>
          )}
        </div>

        {/* Shipment tracking */}
        {shipment?.trackingUrl && (
          <a
            href={shipment.trackingUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: ".8rem", color: "#5880B8", fontFamily: "sans-serif" }}
          >
            🚚 {isFR ? "Suivre ma commande" : "Track my order"} ({shipment.carrier})
          </a>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
          <Link
            href={`/dashboard/pets/${petId}/order?configId=${config.id}`}
            style={{
              padding: ".5rem 1rem", borderRadius: 100, fontSize: ".8rem", fontWeight: 500,
              background: accentColor, color: "#FDFAF5", textDecoration: "none",
            }}
          >
            {isOrdered ? (isFR ? "Recommander" : "Reorder") : (isFR ? "Reprendre" : "Resume")}
          </Link>
          {!isOrdered && (
            <button
              onClick={() => handleDelete(config)}
              disabled={deletingId === config.id}
              style={{
                padding: ".5rem 1rem", borderRadius: 100, fontSize: ".8rem",
                border: "1px solid rgba(163,45,45,.3)", background: "transparent",
                color: "#A32D2D", cursor: "pointer", fontFamily: "inherit",
                opacity: deletingId === config.id ? .5 : 1,
              }}
            >
              {isFR ? "Supprimer" : "Delete"}
            </button>
          )}
          {isOrdered && (
            <button
              onClick={() => handleReorder(config)}
              disabled={reorderingId === config.id}
              style={{
                padding: ".5rem 1rem", borderRadius: 100, fontSize: ".8rem",
                border: `1px solid rgba(61,43,31,.2)`, background: "transparent",
                color: textMuted, cursor: "pointer", fontFamily: "inherit",
              }}
            >
              {isFR ? "Dupliquer en brouillon" : "Duplicate as draft"}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ minHeight: "100vh", background: bg, fontFamily: "'DM Sans', sans-serif" }}>
      <nav style={{ background: "rgba(247,242,234,0.9)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(61,43,31,.08)", padding: "1rem 2rem", display: "flex", alignItems: "center", gap: "1rem" }}>
        <Link href={`/dashboard/pets/${petId}`} style={{ fontSize: ".85rem", color: textMuted, textDecoration: "none" }}>
          ← {isFR ? "Retour au profil" : "Back to profile"}
        </Link>
        <span style={{ fontFamily: "Georgia, serif", fontSize: "1.1rem", fontWeight: 600, color: textPrimary }}>
          {isFR ? "Mes livres" : "My books"}
        </span>
      </nav>

      <main style={{ maxWidth: 600, margin: "0 auto", padding: "2rem 1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.75rem" }}>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: "1.4rem", color: textPrimary, margin: 0 }}>
            {isFR ? "Livres & brouillons" : "Books & drafts"}
          </h1>
          <Link
            href={`/dashboard/pets/${petId}/order`}
            style={{ background: accentColor, color: "#FDFAF5", padding: ".6rem 1.25rem", borderRadius: 100, fontSize: ".85rem", fontWeight: 500, textDecoration: "none" }}
          >
            + {isFR ? "Nouveau livre" : "New book"}
          </Link>
        </div>

        {loading && (
          <p style={{ color: textMuted, fontFamily: "sans-serif", fontSize: ".875rem" }}>
            {isFR ? "Chargement…" : "Loading…"}
          </p>
        )}

        {!loading && configs.length === 0 && (
          <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>📚</div>
            <p style={{ color: textMuted, fontFamily: "sans-serif" }}>
              {isFR ? "Aucun livre ni brouillon pour le moment." : "No books or drafts yet."}
            </p>
            <Link
              href={`/dashboard/pets/${petId}/order`}
              style={{ display: "inline-block", marginTop: "1rem", background: accentColor, color: "#FDFAF5", padding: ".75rem 1.5rem", borderRadius: 100, textDecoration: "none", fontSize: ".875rem", fontWeight: 500 }}
            >
              {isFR ? "Créer mon premier livre" : "Create my first book"}
            </Link>
          </div>
        )}

        {!loading && ordered.length > 0 && (
          <section style={{ marginBottom: "2rem" }}>
            <h2 style={{ fontSize: ".75rem", fontWeight: 600, color: textMuted, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: "1rem", fontFamily: "sans-serif" }}>
              {isFR ? "Commandes passées" : "Past orders"}
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: ".875rem" }}>
              {ordered.map(c => <ConfigCard key={c.id} config={c} />)}
            </div>
          </section>
        )}

        {!loading && drafts.length > 0 && (
          <section>
            <h2 style={{ fontSize: ".75rem", fontWeight: 600, color: textMuted, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: "1rem", fontFamily: "sans-serif", display: "flex", justifyContent: "space-between" }}>
              <span>{isFR ? "Brouillons" : "Drafts"}</span>
              <span style={{ fontWeight: 400 }}>{drafts.length}/15</span>
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: ".875rem" }}>
              {drafts.map(c => <ConfigCard key={c.id} config={c} />)}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useLocale } from "@/hooks/useLocale";
import { createClient } from "@/lib/supabase/client";

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
  stripe_receipt_url: string | null;
  stripe_amount_paid: number | null;
  stripe_currency: string | null;
  created_at: string;
  updated_at: string;
}

interface GelatoStatus {
  orderStatus: string;
  fulfillmentStatus: string;
  shipments: { trackingCode: string; trackingUrl: string; carrier: string; shippedAt: string }[];
}

const SPECIES_EMOJI: Record<string, string> = {
  dog: "🐶", cat: "🐱", rabbit: "🐰", bird: "🐦", other: "🐾",
};

const STATUS_LABEL: Record<string, { fr: string; en: string; color: string }> = {
  created:    { fr: "Créée",       en: "Created",    color: "var(--ep-text-muted)" },
  passed:     { fr: "En cours",    en: "Processing", color: "var(--ep-brand)" },
  accepted:   { fr: "Acceptée",    en: "Accepted",   color: "var(--ep-brand)" },
  printed:    { fr: "Imprimée",    en: "Printed",    color: "var(--ep-status-print)" },
  shipped:    { fr: "Expédiée",    en: "Shipped",    color: "var(--ep-status-ship)" },
  delivered:  { fr: "Livrée",      en: "Delivered",  color: "var(--ep-status-ship)" },
  canceled:   { fr: "Annulée",     en: "Canceled",   color: "var(--ep-alert)" },
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
  const [petName, setPetName] = useState<string>("");
  const [petSpecies, setPetSpecies] = useState<string>("");
  const [petPhotoUrl, setPetPhotoUrl] = useState<string | null>(null);

  const bg = "var(--ep-bg)";
  const textPrimary = "var(--ep-text)";
  const textMuted = "var(--ep-text-muted)";
  const accentColor = "var(--ep-brand)";
  const cardBg = "var(--ep-bg-card)";
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

  useEffect(() => {
    const supabase = createClient();
    supabase.from("pets").select("name, species, photo_url").eq("id", petId).single()
      .then(({ data }) => {
        if (data) { setPetName(data.name); setPetSpecies(data.species); setPetPhotoUrl(data.photo_url ?? null); }
      });
  }, [petId]);

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
    // Navigate to order page with configId, the order page will load the config
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
                color: isOrdered ? "var(--ep-status-ship-ink)" : accentColor,
              }}>
                {isOrdered ? (isFR ? "Commandé" : "Ordered") : (isFR ? "Brouillon" : "Draft")}
              </span>
              {statusInfo && (
                <span style={{ fontSize: ".65rem", fontWeight: 600, color: statusInfo.color, textTransform: "uppercase", letterSpacing: ".06em" }}>
                  · {isFR ? statusInfo.fr : statusInfo.en}
                </span>
              )}
              {petName && (
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: ".3rem",
                  fontSize: ".72rem", fontWeight: 500,
                  padding: ".2rem .55rem", borderRadius: 100,
                  background: "rgba(61,43,31,.06)", color: textMuted,
                }}>
                  {petPhotoUrl
                    ? <img src={petPhotoUrl} alt="" style={{ width: 14, height: 14, borderRadius: "50%", objectFit: "cover" }} />
                    : <span style={{ fontSize: ".8rem", lineHeight: 1 }}>{SPECIES_EMOJI[petSpecies] ?? "🐾"}</span>
                  }
                  {petName}
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
          {isOrdered && config.ordered_at && (
            <span>{isFR ? "Commandé le" : "Ordered"} {formatDate(config.ordered_at)}</span>
          )}
          {!isOrdered && (
            <span>{isFR ? "Modifié le" : "Updated"} {formatDate(config.updated_at)}</span>
          )}
        </div>

        {/* Shipment tracking */}
        {shipment?.trackingUrl?.startsWith("https://") && (
          <a
            href={shipment.trackingUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: ".8rem", color: "var(--ep-status-print)", fontFamily: "sans-serif" }}
          >
            🚚 {isFR ? "Suivre ma commande" : "Track my order"} ({shipment.carrier})
          </a>
        )}

        {/* Invoice */}
        {isOrdered && (
          config.stripe_receipt_url ? (
            <a
              href={config.stripe_receipt_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: ".78rem", color: "var(--ep-status-print)", fontFamily: "sans-serif", display: "inline-flex", alignItems: "center", gap: ".3rem" }}
            >
              🧾 {isFR ? "Voir la facture" : "View receipt"}
              {config.stripe_amount_paid != null && config.stripe_currency && (
                <span style={{ color: "var(--ep-text-faint)" }}>
                  · {(config.stripe_amount_paid / 100).toFixed(2)} {config.stripe_currency.toUpperCase()}
                </span>
              )}
            </a>
          ) : (
            <p style={{ fontSize: ".78rem", color: "var(--ep-text-faint)", fontFamily: "sans-serif", margin: 0 }}>
              🧾 {isFR ? "Inclus dans votre abonnement Print" : "Included in your Print subscription"}
            </p>
          )
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
          <Link
            href={
              isOrdered
                ? `/dashboard/pets/${petId}/order?configId=${config.id}&startStep=address`
                : `/dashboard/pets/${petId}/order?configId=${config.id}`
            }
            style={{
              padding: ".5rem 1rem", borderRadius: 100, fontSize: ".8rem", fontWeight: 500,
              background: accentColor, color: "var(--ep-bg-card)", textDecoration: "none",
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
                color: "var(--ep-alert)", cursor: "pointer", fontFamily: "inherit",
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
    <div style={{ minHeight: "100dvh", background: bg, fontFamily: "'DM Sans', sans-serif" }}>
      <main style={{ maxWidth: 900, margin: "0 auto", padding: "2rem 1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.75rem" }}>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: "1.4rem", color: textPrimary, margin: 0 }}>
            {isFR ? "Livres & brouillons" : "Books & drafts"}
          </h1>
          <Link
            href={`/dashboard/pets/${petId}/order`}
            style={{ display: "inline-flex", alignItems: "center", gap: ".35rem", padding: ".4rem .875rem", borderRadius: 100, border: "1.5px solid rgba(61,43,31,.2)", background: "transparent", color: "var(--ep-text-muted)", fontSize: ".8rem", textDecoration: "none", whiteSpace: "nowrap", flexShrink: 0, transition: "border-color .12s, color .12s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--ep-brand)"; (e.currentTarget as HTMLElement).style.color = "var(--ep-brand)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(61,43,31,.2)"; (e.currentTarget as HTMLElement).style.color = "var(--ep-text-muted)"; }}
          >
            {isFR ? "Nouveau livre" : "New book"}
          </Link>
        </div>

        {loading && (
          <p style={{ color: textMuted, fontFamily: "sans-serif", fontSize: ".875rem" }}>
            {isFR ? "Chargement…" : "Loading…"}
          </p>
        )}

        {!loading && configs.length === 0 && (
          <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
            <img src="/illustrations/book.svg" alt="" aria-hidden style={{ width: 76, display: "block", margin: "0 auto 1rem" }} />
            <p style={{ color: textMuted, fontFamily: "sans-serif" }}>
              {isFR ? "Aucun livre ni brouillon pour le moment." : "No books or drafts yet."}
            </p>
            <Link
              href={`/dashboard/pets/${petId}/order`}
              style={{ display: "inline-block", marginTop: "1rem", background: accentColor, color: "var(--ep-bg-card)", padding: ".75rem 1.5rem", borderRadius: 100, textDecoration: "none", fontSize: ".875rem", fontWeight: 500 }}
            >
              {isFR ? "Créer mon premier livre" : "Create my first book"}
            </Link>
          </div>
        )}

        {!loading && ordered.length > 0 && (
          <section style={{ marginBottom: "2rem" }}>
            <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.05rem", fontWeight: 600, color: textPrimary, marginBottom: "1rem" }}>
              {isFR ? "Commandes passées" : "Past orders"}
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: ".875rem" }}>
              {ordered.map(c => <ConfigCard key={c.id} config={c} />)}
            </div>
          </section>
        )}

        {!loading && drafts.length > 0 && (
          <section>
            <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.05rem", fontWeight: 600, color: textPrimary, marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span>{isFR ? "Brouillons" : "Drafts"}</span>
              <span style={{ fontSize: ".72rem", fontWeight: 400, color: textMuted, fontFamily: "'DM Sans', sans-serif" }}>{drafts.length}/15 {isFR ? "brouillons maximums" : "drafts maximum"}</span>
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

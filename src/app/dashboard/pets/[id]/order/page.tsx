"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/hooks/useLocale";
import { calcGelatoBookPrice } from "@/lib/gelato-pricing";
import type { Step, LayoutType, ThemeId, Story, Entry, Pet, Profile } from "./constants";
import { PAGE_LAYOUTS, SHIPPING_BY_COUNTRY, COUNTRIES, COVER_THEMES } from "./constants";
import { estimateOrderPages, calcCoverPeriod, calcMonthsCount } from "./utils";
import PreviewModal from "./components/PreviewModal";
import Stepper from "./components/Stepper";

export const dynamic = "force-dynamic";

export default function OrderPage({ params }: { params: { id: string } }) {
  const { t, locale } = useLocale();
  const { id } = params;
  const searchParams = useSearchParams();
  const isMemorial = searchParams.get("memorial") === "true";
  const configIdParam = searchParams.get("configId");
  const startStepParam = searchParams.get("startStep") as Step | null;

  const [pet, setPet] = useState<Pet | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [step, setStep] = useState<Step>("preview");
  const [loading, setLoading] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  // New states for Points 4, 7, 9, 10
  const [selectedStoryIds, setSelectedStoryIds] = useState<string[]>([]);
  const [dedicationText, setDedicationText] = useState<string>("");
  const [yearFilter, setYearFilter] = useState<number | null>(null);
  const [coverPhotoUrl, setCoverPhotoUrl] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [coverTheme, setCoverTheme] = useState<ThemeId>("classic");
  const [customTitle, setCustomTitle] = useState("");
  const [storyLayouts, setStoryLayouts] = useState<Record<string, LayoutType>>({});
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewStale, setPreviewStale] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const [renewalDate, setRenewalDate] = useState<string | null>(null);
  const [currentConfigId, setCurrentConfigId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [checkoutError, setCheckoutError] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [addressErrors, setAddressErrors] = useState<Record<string, boolean>>({});
  const [awaitingCredit, setAwaitingCredit] = useState(false);
  // Payment succeeded but the book credit never landed within the polling window
  const [paymentPending, setPaymentPending] = useState(false);
  const [approvedTributesCount, setApprovedTributesCount] = useState(0);
  const [includeTributes, setIncludeTributes] = useState(false);

  const [address, setAddress] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = sessionStorage.getItem(`ep_order_${id}_addr`);
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return {
      firstName: "",
      lastName: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      postCode: "",
      country: typeof navigator !== "undefined" && navigator.language.startsWith("fr") ? "FR" : "",
    };
  });

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      Promise.all([
        supabase.from("pets").select("id, name, birthdate, created_at, user_id, deceased_at").eq("id", id).single(),
        supabase.from("stories").select("id, title, content, period_start, period_end, created_at").eq("pet_id", id).order("created_at", { ascending: true }),
        supabase.from("entries").select("id, photo_urls, entry_date").eq("pet_id", id).order("entry_date", { ascending: true }),
        supabase.from("profiles").select("plan, book_credits, subscription_renewal_date").eq("id", user.id).single(),
      ]).then(([{ data: petData }, { data: storiesData }, { data: entriesData }, { data: profileData }]) => {
        if (petData) {
          if ((petData as typeof petData & { user_id?: string }).user_id !== user.id) {
            window.location.href = "/dashboard";
            return;
          }
          setPet(petData);
        }
        if (storiesData) setStories(storiesData);
        if (entriesData) setEntries(entriesData);
        if (profileData) {
          setProfile(profileData as Profile);
          // Renewal date from profile (stored by webhook on each billing cycle)
          const ts = (profileData as Profile & { subscription_renewal_date?: number | null }).subscription_renewal_date;
          if (ts) {
            const d = new Date(ts * 1000);
            setRenewalDate(d.toLocaleDateString(locale === "fr" ? "fr-FR" : "en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }));
          } else if ((profileData as Profile).plan === "print" && (profileData as Profile).book_credits === 0) {
            // Fallback: fetch from Stripe API for users without stored renewal date
            fetch("/api/stripe/subscription")
              .then(r => r.json())
              .then(data => {
                if (data.subscription?.current_period_end) {
                  const d = new Date(data.subscription.current_period_end * 1000);
                  setRenewalDate(d.toLocaleDateString(locale === "fr" ? "fr-FR" : "en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }));
                }
              })
              .catch(() => {});
          }
        }
      });
    });
  }, [id, locale]);

  // Load approved tribute count for deceased pets
  useEffect(() => {
    if (!pet?.deceased_at) return;
    fetch(`/api/memorial/tributes?petId=${id}&status=approved`)
      .then(r => r.json())
      .then(d => setApprovedTributesCount((d.tributes ?? []).length))
      .catch(() => {});
  }, [pet, id]);

  // Load config from URL param (coming from /books page)
  useEffect(() => {
    if (!configIdParam) return;
    fetch(`/api/book-configs?petId=${id}`)
      .then(r => r.json())
      .then(({ configs }) => {
        const cfg = (configs ?? []).find((c: Record<string, unknown>) => c.id === configIdParam);
        if (!cfg) return;
        setCurrentConfigId(cfg.id);
        if (cfg.theme) setCoverTheme(cfg.theme as ThemeId);
        if (cfg.custom_title !== undefined) setCustomTitle(cfg.custom_title ?? "");
        if (cfg.year_filter !== undefined) setYearFilter(cfg.year_filter ?? null);
        if (cfg.selected_story_ids) setSelectedStoryIds(cfg.selected_story_ids as string[]);
        if (cfg.cover_photo_url !== undefined) setCoverPhotoUrl(cfg.cover_photo_url ?? null);
        if (cfg.story_layouts) setStoryLayouts(cfg.story_layouts as Record<string, LayoutType>);
        if (cfg.dedication_text !== undefined) setDedicationText(cfg.dedication_text ?? "");
        // Jump to requested step after config is loaded (e.g. ?startStep=address for reorder)
        const validSteps: Step[] = ["preview", "address", "confirm", "success"];
        if (startStepParam && validSteps.includes(startStepParam)) {
          setStep(startStepParam);
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configIdParam]);

  // Initialize: select all stories across all years (null = toutes les années)
  useEffect(() => {
    if (stories.length > 0) {
      setYearFilter(null);
      setSelectedStoryIds(stories.map(s => s.id));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stories]);

  // After Stripe book payment: poll for credit then auto-place order
  useEffect(() => {
    if (searchParams.get("book_paid") !== "true") return;
    if (!profile) return;
    setStep("confirm");
    setAwaitingCredit(true);

    let attempts = 0;
    const poll = setInterval(async () => {
      attempts++;
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { clearInterval(poll); setAwaitingCredit(false); return; }
      const { data: p } = await supabase.from("profiles").select("book_credits").eq("id", user.id).single();
      if ((p?.book_credits ?? 0) > 0 || attempts >= 10) {
        clearInterval(poll);
        setAwaitingCredit(false);
        if ((p?.book_credits ?? 0) > 0) {
          setProfile(prev => prev ? { ...prev, book_credits: p!.book_credits } : prev);
          try {
            sessionStorage.removeItem(`ep_order_${id}_addr`);
          } catch {}
          handleOrder();
        } else {
          // Payment went through but the webhook hasn't credited within 20s.
          // Surface it explicitly and offer a manual retry (which consumes the
          // credit, never re-triggers a second payment).
          setPaymentPending(true);
        }
      }
    }, 2000);

    return () => clearInterval(poll);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.get("book_paid"), profile?.plan]);

  // Reset selectedStoryIds when yearFilter changes (null = all years)
  const handleYearChange = (year: number | null) => {
    setYearFilter(year);
    const visible = year === null
      ? stories
      : stories.filter(s => new Date(s.period_start ?? s.created_at).getFullYear() === year);
    setSelectedStoryIds(visible.map(s => s.id));
    // Reset cover photo, it may no longer exist in the new year's entries
    setCoverPhotoUrl(null);
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${user.id}/book-cover-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("pet-photos")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage
        .from("pet-photos")
        .getPublicUrl(path);
      setCoverPhotoUrl(publicUrl);
    } catch (err) {
      console.error("Cover upload error:", err);
      alert(locale === "fr"
        ? "Impossible d'importer la photo de couverture. Réessayez."
        : "Could not upload the cover photo. Please try again.");
    } finally {
      setUploadingCover(false);
      e.target.value = "";
    }
  };

  const handleFullPreview = async () => {
    setPreviewLoading(true);
    try {
      const res = await fetch("/api/preview-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          petId: id,
          lang: locale,
          storyIds: selectedStoryIds.join(","),
          dedication: dedicationText.trim() || undefined,
          year: yearFilter ?? undefined,
          coverPhoto: coverPhotoUrl ?? undefined,
          theme: coverTheme,
          customTitle: customTitle.trim() || undefined,
          layouts: storyLayouts,
          includeTributes: includeTributes && approvedTributesCount > 0,
        }),
      });
      if (!res.ok) {
        const msg = locale === "fr"
          ? "Impossible de générer l'aperçu. Vérifiez votre connexion et réessayez."
          : "Could not generate the preview. Check your connection and try again.";
        alert(msg);
      } else {
        const html = await res.text();
        setPreviewHtml(html);
      }
    } catch (err) {
      console.error("Preview error:", err);
      alert(locale === "fr" ? "Une erreur est survenue." : "An error occurred.");
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => { setPreviewHtml(null); setPreviewStale(false); };

  const handleDownloadPdf = async () => {
    setDownloadLoading(true);
    try {
      const res = await fetch("/api/book-pdf-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          petId: id,
          lang: locale,
          storyIds: selectedStoryIds,
          dedication: dedicationText.trim() || undefined,
          year: yearFilter ?? undefined,
          coverPhoto: coverPhotoUrl ?? undefined,
          theme: coverTheme,
          customTitle: customTitle.trim() || undefined,
          layouts: storyLayouts,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(locale === "fr"
          ? "Impossible de générer le PDF. Vérifiez votre abonnement et réessayez."
          : "Could not generate the PDF. Check your subscription and try again.");
      }
    } catch (err) {
      console.error("Download error:", err);
      alert(locale === "fr" ? "Une erreur est survenue." : "An error occurred.");
    } finally {
      setDownloadLoading(false);
    }
  };

  // Mark preview stale when config changes (if preview is open, auto-refresh after 1.5s)
  useEffect(() => {
    if (!previewHtml) return;
    setPreviewStale(true);
    const timer = setTimeout(() => {
      handleFullPreview().then(() => setPreviewStale(false));
    }, 1500);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStoryIds, coverTheme, customTitle, coverPhotoUrl, yearFilter, dedicationText]);

  // Derived: available years (Point 9)
  const availableYears = Array.from(
    new Set(
      stories.map(s => new Date(s.period_start ?? s.created_at).getFullYear())
    )
  ).sort((a, b) => b - a);

  // Derived: stories filtered by year (null = all years)
  const visibleStories = yearFilter === null
    ? stories
    : stories.filter(s => new Date(s.period_start ?? s.created_at).getFullYear() === yearFilter);

  // Derived: entries filtered by year (null = all years)
  const filteredEntries = yearFilter === null
    ? entries
    : entries.filter(e => new Date(e.entry_date).getFullYear() === yearFilter);

  const petName = pet?.name ?? "";
  const photoEntries = filteredEntries.filter(e => e.photo_urls?.length > 0);
  const photoCount = Math.min(photoEntries.flatMap(e => e.photo_urls).length, 6);

  // Estimated content page count (no dedication, filled at address step).
  // Total PDF pages = estimatedPages + 3 structural (cover, endpaper, back cover).
  const { estimatedPages, tooFewContent } = estimateOrderPages(visibleStories, filteredEntries, selectedStoryIds);

  // Cover photo picker uses the same year filter as the rest of the preview
  const availablePhotos = filteredEntries
    .flatMap(e => e.photo_urls ?? [])
    .filter(Boolean)
    .slice(0, 8);

  const coverPeriod = calcCoverPeriod(pet, visibleStories, filteredEntries, yearFilter);

  const monthsCount = calcMonthsCount(pet, entries, stories, filteredEntries, visibleStories, yearFilter);

  const handleSave = async (name?: string) => {
    setSaving(true);
    setSaveSuccess(false);
    setSaveError(false);
    const configName = name ?? (locale === "fr" ? `Brouillon ${new Date().toLocaleDateString("fr-FR")}` : `Draft ${new Date().toLocaleDateString("en-GB")}`);
    const payload = {
      id: currentConfigId ?? undefined,
      pet_id: id,
      name: configName,
      status: "draft",
      theme: coverTheme,
      custom_title: customTitle || null,
      year_filter: yearFilter,
      selected_story_ids: selectedStoryIds,
      cover_photo_url: coverPhotoUrl,
      story_layouts: storyLayouts,
      dedication_text: dedicationText || null,
      page_count: estimatedPages,
    };
    try {
      const res = await fetch("/api/book-configs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.config?.id) {
        setCurrentConfigId(data.config.id);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setSaveError(true);
      }
    } catch {
      setSaveError(true);
    }
    setSaving(false);
  };

  // Launch the paid extra-book Stripe checkout. Shared by the no-credits upsell
  // and the confirm-step place-order button. Always gives explicit feedback.
  const startBookCheckout = async () => {
    setCheckoutError(false);
    setCheckoutLoading(true);
    try {
      // Persist the address so it survives the Stripe redirect
      try { sessionStorage.setItem(`ep_order_${id}_addr`, JSON.stringify(address)); } catch {}
      const res = await fetch("/api/stripe/book-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ petId: id, pageCount: estimatedPages }),
      });
      const data = await res.json();
      if (data.url) { window.location.href = data.url; return; }
      setCheckoutError(true);
    } catch {
      setCheckoutError(true);
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleOrder = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/gelato/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          petId: id,
          shippingAddress: address,
          memorial: isMemorial,
          selectedStoryIds,
          dedicationText: dedicationText.trim() || null,
          coverPhotoUrl,
          yearFilter,
          lang: locale,
          coverTheme,
          customTitle: customTitle.trim() || null,
          storyLayouts,
          bookConfigId: currentConfigId ?? undefined,
          stripeSessionId: searchParams.get("session_id") ?? undefined,
          includeTributes: includeTributes && approvedTributesCount > 0,
        }),
      });
      const data = await res.json();
      if (data.orderId) {
        setPaymentPending(false);
        setOrderId(data.orderId);
        setStep("success");
      } else {
        // Keep the payment-pending retry screen up if this was a post-payment retry
        alert(t.order.order_failed);
      }
    } catch {
      alert(t.order.order_failed);
    }
    setLoading(false);
  };

  const fields = [
    { key: "firstName", label: t.order.first_name, placeholder: "", autocomplete: "given-name" },
    { key: "lastName", label: t.order.last_name, placeholder: "", autocomplete: "family-name" },
    { key: "addressLine1", label: t.order.address, placeholder: "", autocomplete: "address-line1" },
    { key: "addressLine2", label: t.order.apt, placeholder: "", autocomplete: "address-line2" },
    { key: "city", label: t.order.city, placeholder: "", autocomplete: "address-level2" },
    { key: "postCode", label: t.order.postal_code, placeholder: "", autocomplete: "postal-code" },
  ];

  const selectedTheme = COVER_THEMES.find(t => t.id === coverTheme) ?? COVER_THEMES[0];
  const bookBg = isMemorial ? "#0E0B08" : selectedTheme.bg;
  const bookTitleColor = isMemorial ? "#F7C27A" : selectedTheme.title;
  const bookAccentColor = isMemorial ? "var(--ep-memorial)" : selectedTheme.accent;
  const defaultCoverTitle = isMemorial
    ? t.order.memorial_cover_title.replace("{name}", petName || "…")
    : t.order.book_cover_title.replace("{name}", petName || "…");
  const displayCoverTitle = customTitle.trim() || defaultCoverTitle;

  const bg = isMemorial ? "#1C1410" : "var(--ep-bg)";
  const cardBg = isMemorial ? "rgba(247,242,234,.04)" : "var(--ep-bg-card)";
  const cardBorder = isMemorial ? "1px solid rgba(247,242,234,.08)" : "1px solid rgba(61,43,31,.08)";
  const textPrimary = isMemorial ? "var(--ep-bg)" : "var(--ep-text)";
  const textMuted = isMemorial ? "rgba(247,242,234,.5)" : "var(--ep-text-muted)";
  const labelColor = isMemorial ? "rgba(247,242,234,.4)" : "var(--ep-text-muted)";
  const accentColor = isMemorial ? "var(--ep-memorial)" : "var(--ep-brand)";
  const extraBookPrice = calcGelatoBookPrice(estimatedPages);
  const extraBookPriceLabel = `${extraBookPrice} €`;
  const price = isMemorial ? t.memorial.order_price : extraBookPriceLabel;
  const productName = isMemorial
    ? (petName ? t.memorial.order_tribute.replace("{name}", petName) : "…")
    : t.order.product_detail;
  const productSpecs = isMemorial ? t.memorial.order_specs : t.order.product_specs;
  const warningText = isMemorial ? t.memorial.order_note : t.order.warning;

  const inputStyle = {
    width: "100%", padding: ".75rem 1rem", borderRadius: 12,
    border: `1.5px solid ${isMemorial ? "rgba(247,242,234,.12)" : "rgba(61,43,31,.15)"}`,
    background: isMemorial ? "rgba(247,242,234,.05)" : "var(--ep-bg)",
    fontFamily: "inherit", fontSize: ".9rem",
    color: isMemorial ? "var(--ep-bg)" : "var(--ep-text)",
    outline: "none", boxSizing: "border-box" as const,
  };

  const stepLabels = [t.order.step_preview, t.order.step_address, t.order.step_payment];

  const shippingEstimate = SHIPPING_BY_COUNTRY[address.country];

  const dedicationLabel = locale === "fr" ? "Dédicace (optionnel)" : "Dedication (optional)";
  const dedicationPlaceholder = locale === "fr"
    ? "Ex : À toi, notre fidèle compagnon…"
    : "E.g.: To you, our faithful companion…";
  const bookYearLabel = locale === "fr" ? "Année du livre" : "Book year";
  const allYearsLabel = locale === "fr" ? "Toutes les années" : "All years";
  const coverPhotoLabel = locale === "fr" ? "Photo de couverture" : "Cover photo";
  const coverDefaultLabel = locale === "fr" ? "Par défaut" : "Default";
  const chaptersLabel = locale === "fr" ? "Chapitres à inclure" : "Chapters to include";

  const previewLabel = locale === "fr" ? "Aperçu complet du livre" : "Full book preview";
  const closeLabel = locale === "fr" ? "Fermer" : "Close";

  // ── Render helpers ───────────────────────────────────────────────────────

  const renderUpsellBanners = () => (
    <>
      {/* No-credits upsell, Print plan */}
      {profile !== null && profile.book_credits === 0 && profile.plan === "print" && step === "preview" && (
        <div style={{
          background: isMemorial ? "rgba(247,242,234,.04)" : "#FFF3E0",
          border: isMemorial ? "1px solid rgba(200,129,58,.25)" : "1px solid #F7C27A",
          borderRadius: 16, padding: "1.5rem", marginBottom: "1.75rem",
          textAlign: "center",
        }}>
          <div style={{ fontSize: "1.5rem", marginBottom: ".75rem" }}>📚</div>
          <h3 style={{ fontFamily: "Georgia, serif", fontSize: "1.1rem", fontWeight: 600, color: textPrimary, marginBottom: ".5rem" }}>
            {t.order.print_extra_book_title}
          </h3>
          <p style={{ fontSize: ".875rem", color: textMuted, lineHeight: 1.6, maxWidth: 380, margin: "0 auto 1rem" }}>
            {renewalDate
              ? locale === "fr"
                ? `Votre livre gratuit sera disponible à partir du ${renewalDate}, date de renouvellement de votre abonnement.`
                : `Your free book will be available again from ${renewalDate}, when your subscription renews.`
              : locale === "fr"
                ? "Votre livre gratuit sera disponible à la date de renouvellement de votre abonnement."
                : "Your free book will be available again when your subscription renews."
            }
          </p>
        </div>
      )}

      {/* Gate, Free plan */}
      {profile !== null && profile.plan === "free" && step === "preview" && (
        <div style={{
          background: isMemorial ? "rgba(247,242,234,.04)" : "#FFF3E0",
          border: isMemorial ? "1px solid rgba(200,129,58,.25)" : "1px solid #F7C27A",
          borderRadius: 16, padding: "1.5rem", marginBottom: "1.75rem",
          textAlign: "center",
        }}>
          <div style={{ fontSize: "1.5rem", marginBottom: ".75rem" }}>📚</div>
          <h3 style={{ fontFamily: "Georgia, serif", fontSize: "1.1rem", fontWeight: 600, color: textPrimary, marginBottom: ".5rem" }}>
            {locale === "fr" ? "Fonctionnalité Premium Print" : "Premium Print Feature"}
          </h3>
          <p style={{ fontSize: ".875rem", color: textMuted, lineHeight: 1.6, maxWidth: 380, margin: "0 auto 1rem" }}>
            {locale === "fr"
              ? "La commande d'un livre imprimé gratuit est réservée aux abonnés Premium Print. Passez à l'abonnement Print pour recevoir un livre gratuitement chaque année."
              : "Ordering a free printed book is available to Premium Print subscribers. Upgrade to Print to receive a book for free every year."}
          </p>
          <a
            href="/dashboard/settings"
            style={{
              background: accentColor, color: "var(--ep-bg-card)", border: "none",
              padding: ".625rem 1.5rem", borderRadius: 100, fontSize: ".875rem",
              fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              textDecoration: "none", display: "inline-block",
            }}
          >
            {locale === "fr" ? "Passer à Premium Print" : "Upgrade to Premium Print"}
          </a>
        </div>
      )}

      {/* No-credits upsell, non-Print plans */}
      {profile !== null && profile.book_credits === 0 && profile.plan !== "free" && profile.plan !== "print" && step === "preview" && (
        <div style={{
          background: isMemorial ? "rgba(247,242,234,.04)" : "#FFF3E0",
          border: isMemorial ? "1px solid rgba(200,129,58,.25)" : "1px solid #F7C27A",
          borderRadius: 16, padding: "1.5rem", marginBottom: "1.75rem",
          textAlign: "center",
        }}>
          <div style={{ fontSize: "1.5rem", marginBottom: ".75rem" }}>📚</div>
          <h3 style={{ fontFamily: "Georgia, serif", fontSize: "1.1rem", fontWeight: 600, color: textPrimary, marginBottom: ".5rem" }}>
            {t.order.no_credits_title}
          </h3>
          <p style={{ fontSize: ".875rem", color: textMuted, lineHeight: 1.6, maxWidth: 380, margin: "0 auto 1rem" }}>
            {t.order.no_credits_desc}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: ".625rem", alignItems: "center" }}>
            <button
              onClick={startBookCheckout}
              disabled={checkoutLoading}
              style={{
                background: accentColor, color: "var(--ep-bg-card)", border: "none",
                padding: ".625rem 1.5rem", borderRadius: 100, fontSize: ".875rem",
                fontWeight: 600, cursor: checkoutLoading ? "wait" : "pointer", fontFamily: "inherit",
                opacity: checkoutLoading ? .6 : 1,
              }}
            >
              {checkoutLoading
                ? (locale === "fr" ? "Chargement…" : "Loading…")
                : `${t.order.no_credits_cta}, ${extraBookPriceLabel} ${locale === "fr" ? "+ livraison" : "+ shipping"}`}
            </button>
            <a
              href="/dashboard/settings#plan"
              style={{
                fontSize: ".8rem", color: accentColor, textDecoration: "underline",
                textDecorationStyle: "dotted", textUnderlineOffset: "3px", cursor: "pointer",
              }}
            >
              {(t.order as Record<string, string>).no_credits_upgrade_cta ?? (locale === "fr" ? "Passer au plan Print" : "Upgrade to Print")}
            </a>
          </div>
        </div>
      )}

      {/* Memorial hero */}
      {isMemorial && petName && step === "preview" && (
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ fontSize: "2rem", marginBottom: ".75rem" }}>🕊️</div>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: "1.75rem", fontWeight: 600, color: "var(--ep-bg)", marginBottom: ".5rem" }}>
            {t.memorial.order_tribute.replace("{name}", petName)}
          </h1>
          <p style={{ fontSize: ".9rem", color: "rgba(247,242,234,.5)", fontWeight: 300, lineHeight: 1.7, maxWidth: 380, margin: "0 auto" }}>
            {t.memorial.order_subtitle}
          </p>
        </div>
      )}
    </>
  );

  const renderPreviewStep = () => (
    <div>
      <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.25rem", color: textPrimary, marginBottom: "1.25rem", textAlign: "center" }}>
        {t.order.preview_title}
      </h2>

      {/* Year filter, shown as soon as there is data (Point 9) */}
      {availableYears.length >= 1 && (
        <div style={{ marginBottom: "1.25rem" }}>
          <label style={{ fontSize: ".75rem", fontWeight: 500, color: labelColor, display: "block", marginBottom: ".4rem", fontFamily: "sans-serif" }}>
            {bookYearLabel}
          </label>
          <select
            value={yearFilter ?? ""}
            onChange={e => handleYearChange(e.target.value === "" ? null : Number(e.target.value))}
            style={inputStyle}
          >
            {availableYears.length > 1 && (
              <option value="">{allYearsLabel}</option>
            )}
            {availableYears.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      )}

      {/* Customization, theme + title */}
      {!isMemorial && (
        <div style={{ marginBottom: "1.25rem", background: cardBg, border: cardBorder, borderRadius: 14, padding: "1rem 1.25rem" }}>
          <div style={{ fontSize: ".75rem", fontWeight: 500, color: labelColor, marginBottom: ".875rem", fontFamily: "sans-serif" }}>
            {locale === "fr" ? "Personnalisation" : "Customization"}
          </div>
          {/* Theme swatches */}
          <div style={{ marginBottom: ".875rem" }}>
            <div style={{ fontSize: ".7rem", color: textMuted, marginBottom: ".5rem", fontFamily: "sans-serif" }}>
              {locale === "fr" ? "Thème de couleur" : "Color theme"}
            </div>
            <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
              {COVER_THEMES.map(theme => (
                <button
                  key={theme.id}
                  onClick={() => setCoverTheme(theme.id)}
                  title={locale === "fr" ? theme.labelFr : theme.labelEn}
                  style={{
                    width: 36, height: 36, borderRadius: 8,
                    background: theme.bg,
                    border: coverTheme === theme.id ? `2.5px solid ${accentColor}` : "2.5px solid transparent",
                    cursor: "pointer", position: "relative",
                    boxShadow: coverTheme === theme.id ? `0 0 0 1px ${accentColor}` : "none",
                    transition: "border .15s, box-shadow .15s",
                    overflow: "hidden",
                  }}
                >
                  {/* Accent color strip at bottom */}
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 8, background: theme.accent }} />
                </button>
              ))}
            </div>
            <div style={{ fontSize: ".65rem", color: textMuted, marginTop: ".35rem", fontFamily: "sans-serif" }}>
              {locale === "fr"
                ? (COVER_THEMES.find(t => t.id === coverTheme)?.labelFr ?? "")
                : (COVER_THEMES.find(t => t.id === coverTheme)?.labelEn ?? "")}
            </div>
          </div>
          {/* Custom title */}
          <div>
            <div style={{ fontSize: ".7rem", color: textMuted, marginBottom: ".5rem", fontFamily: "sans-serif" }}>
              {locale === "fr" ? "Titre du livre (optionnel)" : "Book title (optional)"}
            </div>
            <input
              type="text"
              value={customTitle}
              onChange={e => setCustomTitle(e.target.value)}
              maxLength={60}
              placeholder={defaultCoverTitle}
              style={{ ...inputStyle, fontSize: ".85rem" }}
            />
            <div style={{ fontSize: ".65rem", color: customTitle.length >= 54 ? "var(--ep-alert)" : textMuted, textAlign: "right", marginTop: ".25rem", fontFamily: "sans-serif" }}>
              {customTitle.length}/60
            </div>
          </div>
        </div>
      )}

      {/* Book cover */}
      <div style={{
        background: coverPhotoUrl ? "transparent" : bookBg,
        backgroundImage: coverPhotoUrl
          ? `linear-gradient(rgba(0,0,0,.55), rgba(0,0,0,.65)), url('${coverPhotoUrl}')`
          : undefined,
        backgroundSize: coverPhotoUrl ? "cover" : undefined,
        backgroundPosition: coverPhotoUrl ? "center" : undefined,
        borderRadius: 20, padding: "3rem 2rem",
        textAlign: "center", marginBottom: "1.25rem",
        boxShadow: "0 12px 40px rgba(0,0,0,.25)",
        position: "relative", overflow: "hidden",
        transition: "background .3s",
      }}>
        {/* Decorative spine line */}
        <div style={{ position: "absolute", left: 18, top: 0, bottom: 0, width: 4, background: `${bookAccentColor}60`, borderRadius: 2 }} />
        <div style={{ fontSize: "2.75rem", marginBottom: "1.25rem" }}>{isMemorial ? "🕊️" : "🐾"}</div>
        <div style={{ fontFamily: "Georgia, serif", fontSize: "1.9rem", fontWeight: 600, color: bookTitleColor, lineHeight: 1.25, marginBottom: ".75rem", transition: "color .3s" }}>
          {displayCoverTitle}
        </div>
        {coverPeriod && (
          <div style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: "1rem", color: "rgba(247,242,234,.45)", marginBottom: "1.5rem" }}>
            {petName} · {coverPeriod}
          </div>
        )}
        <div style={{ width: 48, height: 2, background: bookAccentColor, margin: "0 auto 1.5rem", borderRadius: 1, transition: "background .3s" }} />
        <div style={{ fontSize: ".7rem", color: "rgba(247,242,234,.3)", letterSpacing: ".12em", textTransform: "uppercase" }}>
          {t.order.book_cover_label}
        </div>
      </div>

      {/* Cover photo picker (Point 10), always visible */}
      <div style={{ marginBottom: "1.25rem" }}>
        <div style={{ fontSize: ".75rem", fontWeight: 500, color: labelColor, marginBottom: ".875rem", fontFamily: "sans-serif" }}>
          {coverPhotoLabel}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: ".5rem", alignItems: "center" }}>
          {/* Default button */}
          <button
            onClick={() => setCoverPhotoUrl(null)}
            style={{
              width: 72, height: 72, borderRadius: 8,
              background: "var(--ep-text)",
              border: coverPhotoUrl === null ? "2px solid var(--ep-brand)" : "2px solid transparent",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              color: "rgba(247,242,234,.6)", fontSize: ".6rem", fontFamily: "sans-serif",
              textAlign: "center", padding: 4, lineHeight: 1.2,
            }}
          >
            {coverDefaultLabel}
          </button>
          {/* Journal photo thumbnails (filtered by year) */}
          {availablePhotos.map((photoUrl, i) => (
            <button
              key={i}
              onClick={() => setCoverPhotoUrl(photoUrl)}
              style={{
                width: 72, height: 72, borderRadius: 8,
                border: coverPhotoUrl === photoUrl ? "2px solid var(--ep-brand)" : "2px solid transparent",
                padding: 0, cursor: "pointer", overflow: "hidden", background: "transparent",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoUrl}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            </button>
          ))}
          {/* Upload custom cover photo */}
          <label style={{
            width: 72, height: 72, borderRadius: 8, flexShrink: 0,
            border: `2px dashed ${isMemorial ? "rgba(247,242,234,.2)" : "rgba(61,43,31,.2)"}`,
            cursor: uploadingCover ? "wait" : "pointer",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            gap: 3, color: textMuted, fontSize: ".55rem", fontFamily: "sans-serif",
            textAlign: "center", lineHeight: 1.2,
            opacity: uploadingCover ? 0.5 : 1,
            transition: "opacity .15s",
          }}>
            <input
              type="file"
              accept="image/*"
              disabled={uploadingCover}
              onChange={handleCoverUpload}
              style={{ display: "none" }}
            />
            {uploadingCover
              ? <span style={{ fontSize: ".8rem" }}>⏳</span>
              : <>
                  <span style={{ fontSize: ".9rem" }}>+</span>
                  <span>{locale === "fr" ? "Importer" : "Upload"}</span>
                </>
            }
          </label>
          {/* Preview of custom uploaded photo (if not from journal) */}
          {coverPhotoUrl && !availablePhotos.includes(coverPhotoUrl) && (
            <div style={{ position: "relative", width: 72, height: 72 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coverPhotoUrl}
                alt=""
                style={{ width: 72, height: 72, borderRadius: 8, objectFit: "cover", display: "block", border: "2px solid var(--ep-brand)" }}
              />
              <button
                onClick={() => setCoverPhotoUrl(null)}
                style={{
                  position: "absolute", top: -6, right: -6,
                  width: 18, height: 18, borderRadius: "50%",
                  background: "var(--ep-brand)", border: "none",
                  color: "#fff", fontSize: ".6rem", fontWeight: 700,
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  lineHeight: 1,
                }}
              >✕</button>
            </div>
          )}
        </div>
      </div>

      {/* Content summary pill */}
      <div style={{
        background: cardBg, border: cardBorder, borderRadius: 14,
        padding: ".875rem 1.25rem", marginBottom: "1.5rem",
        display: "flex", justifyContent: "center", alignItems: "center",
        gap: ".75rem", flexWrap: "wrap",
      }}>
        {[
          (() => { const n = selectedStoryIds.length || visibleStories.length; return n === 1 ? (locale === "fr" ? "1 chapitre" : "1 chapter") : t.order.summary_chapters.replace("{n}", String(n)); })(),
          t.order.summary_photos.replace("{n}", String(photoCount)),
          t.order.summary_months.replace("{n}", String(monthsCount)),
          t.order.summary_pages.replace("{n}", String(estimatedPages)),
        ].map((item, i, arr) => (
          <span key={i} style={{ display: "flex", alignItems: "center", gap: ".75rem" }}>
            {i === 1 && photoCount === 0 ? (
              <Link
                href={`/dashboard/pets/${id}?tab=journal`}
                title={locale === "fr" ? "Ajoutez des photos dans vos entrées du journal pour les inclure dans votre livre" : "Add photos to your journal entries to include them in your book"}
                style={{ fontSize: ".875rem", fontWeight: 400, color: "var(--ep-brand)", textDecoration: "underline", textDecorationStyle: "dotted", textUnderlineOffset: "3px" }}
              >
                {item}
              </Link>
            ) : (
              <span style={{
                fontSize: ".875rem",
                fontWeight: i === 3 ? 600 : i === 1 ? 400 : 500,
                color: i === 3 ? accentColor : i === 1 ? accentColor : textPrimary,
              }}>
                {item}
              </span>
            )}
            {i < arr.length - 1 && <span style={{ color: isMemorial ? "rgba(247,242,234,.2)" : "rgba(61,43,31,.2)", fontSize: ".75rem" }}>·</span>}
          </span>
        ))}
      </div>
      {/* Note sur la dédicace */}
      <p style={{ fontSize: ".7rem", color: textMuted, textAlign: "center", margin: "-.75rem 0 1.5rem", fontFamily: "sans-serif", opacity: .7 }}>
        {t.order.summary_pages_note}
      </p>

      {/* Chapter selection (Point 4 & 9) */}
      {visibleStories.length > 0 && (
        <div style={{ marginBottom: "1.25rem" }}>
          <div style={{ fontSize: ".75rem", fontWeight: 500, color: labelColor, marginBottom: ".875rem", fontFamily: "sans-serif" }}>
            {chaptersLabel}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}>
            {visibleStories.map((story, i) => {
              const isSelected = selectedStoryIds.includes(story.id);
              return (
                <div
                  key={story.id}
                  onClick={() => {
                    setSelectedStoryIds(prev =>
                      isSelected
                        ? prev.filter(sid => sid !== story.id)
                        : [...prev, story.id]
                    );
                  }}
                  style={{
                    background: cardBg,
                    border: isSelected
                      ? `1.5px solid ${accentColor}`
                      : cardBorder,
                    borderRadius: 16, padding: "1.25rem 1.5rem",
                    cursor: "pointer",
                    display: "flex", alignItems: "flex-start", gap: "1rem",
                    transition: "border-color .15s",
                  }}
                >
                  {/* Checkbox indicator */}
                  <div style={{
                    width: 20, height: 20, borderRadius: 6, flexShrink: 0, marginTop: 2,
                    background: isSelected ? accentColor : "transparent",
                    border: `2px solid ${isSelected ? accentColor : isMemorial ? "rgba(247,242,234,.2)" : "rgba(61,43,31,.2)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "var(--ep-bg-card)", fontSize: ".7rem", fontWeight: 700,
                  }}>
                    {isSelected ? "✓" : ""}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: ".6rem", marginBottom: ".4rem", flexWrap: "wrap" }}>
                      <span style={{ fontSize: ".7rem", fontWeight: 600, color: accentColor }}>
                        {t.order.preview_chapter} {i + 1}
                      </span>
                      {(() => {
                        const dateLocale = locale === "fr" ? "fr-FR" : "en-US";
                        const fmt = (d: string) => new Date(d).toLocaleDateString(dateLocale, { month: "short", year: "numeric" });
                        // Fallback sur created_at si period_start est absent
                        const start = fmt(story.period_start ?? story.created_at);
                        const end = story.period_end ? fmt(story.period_end) : null;
                        const label = end && end !== start ? `${start} – ${end}` : start;
                        return (
                          <span style={{ fontSize: ".68rem", color: textMuted, fontFamily: "sans-serif" }}>
                            {label}
                          </span>
                        );
                      })()}
                    </div>
                    <div style={{ fontFamily: "Georgia, serif", fontSize: ".95rem", fontWeight: 600, color: textPrimary, marginBottom: ".5rem", lineHeight: 1.3 }}>
                      {story.title || `${petName}'s Story`}
                    </div>
                    <div style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: ".84rem", color: textMuted, lineHeight: 1.75, marginBottom: ".875rem" }}>
                      {story.content.slice(0, 160).trim()}
                      {story.content.length > 160 ? "…" : ""}
                    </div>
                    {/* Layout selector, stop click propagation so it doesn't toggle selection */}
                    <div
                      onClick={e => e.stopPropagation()}
                      style={{ borderTop: `1px solid ${isMemorial ? "rgba(247,242,234,.06)" : "rgba(61,43,31,.06)"}`, paddingTop: ".75rem" }}
                    >
                      <div style={{ fontSize: ".65rem", color: textMuted, fontFamily: "sans-serif", marginBottom: ".4rem" }}>
                        {t.order.layout_label}
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".35rem" }}>
                        {PAGE_LAYOUTS.map(layout => {
                          const isActive = (storyLayouts[story.id] ?? "classic") === layout.id;
                          return (
                            <button
                              key={layout.id}
                              onClick={() => setStoryLayouts(prev => ({ ...prev, [story.id]: layout.id }))}
                              style={{
                                padding: ".4rem .5rem",
                                borderRadius: 8,
                                border: `1.5px solid ${isActive ? accentColor : isMemorial ? "rgba(247,242,234,.15)" : "rgba(61,43,31,.15)"}`,
                                background: isActive ? `${accentColor}18` : "transparent",
                                color: isActive ? accentColor : textMuted,
                                cursor: "pointer",
                                fontSize: ".68rem",
                                fontFamily: "sans-serif",
                                display: "flex", alignItems: "center", justifyContent: "center", gap: ".3rem",
                                transition: "all .12s",
                                whiteSpace: "nowrap",
                                minHeight: "unset",
                              }}
                            >
                              <span style={{ fontSize: ".9rem", lineHeight: 1, flexShrink: 0 }}>{layout.icon}</span>
                              <span>{t.order[layout.labelKey]}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Photo preview (first available photo) */}
      {photoEntries.length > 0 && (
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ fontSize: ".75rem", fontWeight: 500, color: labelColor, marginBottom: ".875rem", fontFamily: "sans-serif" }}>
            {t.order.preview_photos_page}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: photoEntries.length > 1 ? "1fr 1fr" : "1fr", gap: ".625rem" }}>
            {photoEntries.slice(0, 2).map(e => (
              <div key={e.id} style={{ borderRadius: 14, overflow: "hidden", aspectRatio: "4/3", background: isMemorial ? "rgba(247,242,234,.04)" : "rgba(61,43,31,.05)" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={e.photo_urls[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tributes chapter option (deceased pets with approved tributes) */}
      {pet?.deceased_at && approvedTributesCount > 0 && (
        <div style={{ background: isMemorial ? "rgba(247,242,234,.04)" : "rgba(200,129,58,.04)", border: isMemorial ? "1px solid rgba(247,242,234,.08)" : "1px solid rgba(200,129,58,.2)", borderRadius: 12, padding: ".875rem 1rem", marginBottom: "1rem" }}>
          <label style={{ display: "flex", alignItems: "center", gap: ".75rem", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={includeTributes}
              onChange={e => setIncludeTributes(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: "var(--ep-brand)", flexShrink: 0 }}
            />
            <span style={{ fontSize: ".875rem", color: textPrimary, lineHeight: 1.5 }}>
              {locale === "fr"
                ? `🕊️ Inclure la page des hommages (${approvedTributesCount} message${approvedTributesCount > 1 ? "s" : ""})`
                : `🕊️ Include tributes page (${approvedTributesCount} message${approvedTributesCount > 1 ? "s" : ""})`}
            </span>
          </label>
        </div>
      )}

      {/* CTA buttons */}
      {visibleStories.length > 0 && selectedStoryIds.length === 0 && (
        <div style={{ background: "rgba(200,129,58,.08)", border: "1px solid rgba(200,129,58,.3)", borderRadius: 12, padding: ".75rem 1rem", marginBottom: ".25rem", fontSize: ".8rem", color: "var(--ep-brand)", fontFamily: "sans-serif" }}>
          {locale === "fr" ? "Sélectionnez au moins un chapitre pour continuer." : "Select at least one chapter to continue."}
        </div>
      )}
      {tooFewContent && selectedStoryIds.length > 0 && (
        <div style={{ background: "rgba(163,45,45,.06)", border: "1px solid rgba(163,45,45,.25)", borderRadius: 12, padding: ".75rem 1rem", marginBottom: ".25rem", fontSize: ".8rem", color: "var(--ep-alert)", fontFamily: "sans-serif" }}>
          {locale === "fr"
            ? "Pas assez de chapitres pour imprimer un livre (minimum 7 chapitres requis)."
            : "Not enough chapters to print a book (minimum 7 chapters required)."}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}>
        {/* Hide main CTA when user has no credits, except free plan (show disabled so user understands the gate) */}
        {((profile?.book_credits ?? 0) > 0 || profile?.plan === "free") && <button
          onClick={() => {
            setStep("address");
          }}
          disabled={(visibleStories.length > 0 && selectedStoryIds.length === 0) || tooFewContent || checkoutLoading || profile?.plan === "free"}
          style={{
            width: "100%", padding: ".875rem 1rem", borderRadius: 100, border: "none",
            background: accentColor, color: "var(--ep-bg-card)", fontFamily: "inherit",
            fontSize: ".9rem", fontWeight: 600, cursor: (visibleStories.length > 0 && selectedStoryIds.length === 0) || tooFewContent || checkoutLoading || profile?.plan === "free" ? "not-allowed" : "pointer",
            opacity: (visibleStories.length > 0 && selectedStoryIds.length === 0) || tooFewContent || checkoutLoading || profile?.plan === "free" ? .5 : 1,
            display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", minHeight: 48,
          }}
        >
          {checkoutLoading
            ? (locale === "fr" ? "Chargement…" : "Loading…")
            : profile?.plan === "print" && profile.book_credits === 0
              ? t.order.print_extra_book_cta
              : t.order.preview_cta}
        </button>}
        {checkoutError && (
          <p style={{ fontSize: ".8rem", color: "var(--ep-alert)", textAlign: "center", margin: "-.25rem 0 0" }}>
            {locale === "fr"
              ? "Une erreur est survenue. Vérifie ta connexion et réessaie."
              : "Something went wrong. Check your connection and try again."}
          </p>
        )}
        <button
          onClick={handleFullPreview}
          disabled={previewLoading}
          style={{
            width: "100%", padding: ".75rem 1rem", borderRadius: 100,
            border: `1.5px solid ${isMemorial ? "rgba(247,242,234,.2)" : "rgba(61,43,31,.2)"}`,
            background: "transparent", fontFamily: "inherit", fontSize: ".875rem",
            color: textPrimary, cursor: previewLoading ? "wait" : "pointer",
            opacity: previewLoading ? .6 : 1,
            display: "flex", alignItems: "center", justifyContent: "center", gap: ".5rem", minHeight: 44,
          }}
        >
          <span>{previewLoading ? "…" : previewLabel}</span>
        </button>
        <button
          onClick={handleDownloadPdf}
          disabled={downloadLoading}
          style={{
            width: "100%", padding: ".75rem 1rem", borderRadius: 100,
            border: `1.5px solid ${isMemorial ? "rgba(247,242,234,.2)" : "rgba(61,43,31,.2)"}`,
            background: "transparent", fontFamily: "inherit", fontSize: ".875rem",
            color: textPrimary, cursor: downloadLoading ? "wait" : "pointer",
            opacity: downloadLoading ? .6 : 1,
            display: "flex", alignItems: "center", justifyContent: "center", gap: ".5rem", minHeight: 44,
          }}
        >
          <span>{downloadLoading ? "…" : (locale === "fr" ? "Télécharger le PDF" : "Download PDF")}</span>
        </button>
        <button
          onClick={() => handleSave()}
          disabled={saving}
          style={{
            width: "100%", padding: ".75rem 1rem", borderRadius: 100,
            border: `1.5px solid ${saveSuccess ? "var(--ep-status-ship)" : isMemorial ? "rgba(247,242,234,.2)" : "rgba(61,43,31,.2)"}`,
            background: saveSuccess ? "rgba(106,158,120,.1)" : "transparent",
            fontFamily: "inherit", fontSize: ".875rem",
            color: saveSuccess ? "var(--ep-status-ship)" : textMuted,
            cursor: saving ? "wait" : "pointer",
            opacity: saving ? .6 : 1,
            transition: "all .2s",
            display: "flex", alignItems: "center", justifyContent: "center", gap: ".4rem", minHeight: 44,
          }}
        >
          {saving ? "…" : saveSuccess
            ? (locale === "fr" ? "✓ Sauvegardé" : "✓ Saved")
            : (locale === "fr" ? "Sauvegarder" : "Save")}
        </button>
        {saveError && (
          <p style={{ fontSize: ".8rem", color: "var(--ep-alert)", textAlign: "center", margin: 0 }}>
            {locale === "fr"
              ? "Impossible d'enregistrer le brouillon (limite atteinte ou connexion). Réessaie."
              : "Could not save the draft (limit reached or connection). Try again."}
          </p>
        )}
      </div>
    </div>
  );

  const renderSuccessStep = () => (
    <div style={{ background: cardBg, borderRadius: 24, padding: "2.5rem", border: cardBorder, textAlign: "center" }}>
      <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>{isMemorial ? "🕊️" : "📬"}</div>
      <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.5rem", color: textPrimary, marginBottom: ".75rem" }}>{t.order.success_title}</h2>
      <p style={{ fontSize: ".9rem", color: textMuted, fontWeight: 300, lineHeight: 1.6, marginBottom: ".5rem" }}>
        {t.order.success_desc}
      </p>
      <p style={{ fontSize: ".8rem", color: textMuted, fontWeight: 300, marginBottom: "2rem" }}>
        {t.order.order_id} <code style={{ background: isMemorial ? "rgba(247,242,234,.08)" : "rgba(61,43,31,.06)", padding: "2px 6px", borderRadius: 4 }}>{orderId}</code>
      </p>
      <Link href="/dashboard" style={{ background: accentColor, color: "var(--ep-bg-card)", padding: ".75rem 2rem", borderRadius: 100, fontSize: ".875rem", fontWeight: 500, textDecoration: "none" }}>
        {t.order.back_dashboard}
      </Link>
    </div>
  );

  const renderConfirmStep = () => (
    <>
      {awaitingCredit && (
        <div style={{ background: cardBg, borderRadius: 24, padding: "2.5rem", border: cardBorder, textAlign: "center" }}>
          <div style={{ display: "inline-block", width: 32, height: 32, border: "3px solid rgba(200,129,58,.3)", borderTopColor: "var(--ep-brand)", borderRadius: "50%", animation: "spin .8s linear infinite", marginBottom: "1.25rem" }} />
          <p style={{ fontSize: ".95rem", color: textPrimary, fontWeight: 500, margin: "0 0 .4rem" }}>
            {locale === "fr" ? "Paiement reçu" : "Payment received"}
          </p>
          <p style={{ fontSize: ".85rem", color: textMuted, fontWeight: 300, margin: 0 }}>
            {locale === "fr" ? "Envoi de la commande en cours…" : "Placing your order…"}
          </p>
        </div>
      )}
      {!awaitingCredit && paymentPending && (
        <div style={{ background: cardBg, borderRadius: 24, padding: "2.5rem", border: cardBorder, textAlign: "center" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>⏳</div>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.35rem", color: textPrimary, marginBottom: ".75rem" }}>
            {locale === "fr" ? "Paiement reçu" : "Payment received"}
          </h2>
          <p style={{ fontSize: ".9rem", color: textMuted, fontWeight: 300, lineHeight: 1.6, marginBottom: "1.5rem", maxWidth: 420, marginLeft: "auto", marginRight: "auto" }}>
            {locale === "fr"
              ? "Ton paiement est bien passé, mais la commande n'a pas encore pu être envoyée à l'impression (traitement en cours). Clique pour réessayer, aucun nouveau paiement ne sera demandé."
              : "Your payment went through, but the order couldn't be sent to print yet (still processing). Tap to retry, you will not be charged again."}
          </p>
          <button
            onClick={handleOrder}
            disabled={loading}
            style={{ padding: ".75rem 2rem", borderRadius: 100, border: "none", background: accentColor, color: "var(--ep-bg-card)", fontFamily: "inherit", fontSize: ".9rem", fontWeight: 600, cursor: loading ? "wait" : "pointer", opacity: loading ? .7 : 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: ".5rem" }}
          >
            {loading && <span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid rgba(255,255,255,.4)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin .7s linear infinite" }} />}
            {loading ? t.order.placing : (locale === "fr" ? "Réessayer la commande" : "Retry order")}
          </button>
          <p style={{ fontSize: ".78rem", color: textMuted, fontWeight: 300, margin: "1rem 0 0" }}>
            {locale === "fr"
              ? "Le problème persiste ? Écris-nous depuis Réglages, ta commande sera honorée."
              : "Still stuck? Contact us from Settings, your order will be honored."}
          </p>
        </div>
      )}
      {!awaitingCredit && !paymentPending && (
        <div style={{ background: cardBg, borderRadius: 24, padding: "2rem", border: cardBorder }}>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.25rem", color: textPrimary, marginBottom: "1.5rem" }}>{t.order.confirm_title}</h2>

          <div style={{ background: isMemorial ? "rgba(247,242,234,.04)" : "var(--ep-bg)", borderRadius: 16, padding: "1.25rem", marginBottom: "1.5rem" }}>
            <div style={{ fontSize: ".75rem", fontWeight: 500, color: labelColor, marginBottom: ".75rem", fontFamily: "sans-serif" }}>{t.order.shipping_to}</div>
            <p style={{ fontSize: ".9rem", color: textPrimary, lineHeight: 1.7, margin: 0 }}>
              {address.firstName} {address.lastName}<br />
              {address.addressLine1}{address.addressLine2 ? `, ${address.addressLine2}` : ""}<br />
              {address.city}, {address.postCode}<br />
              {address.country}
            </p>
          </div>

          <div style={{ background: isMemorial ? "rgba(247,242,234,.04)" : "var(--ep-bg)", borderRadius: 16, padding: "1.25rem", marginBottom: "1.5rem" }}>
            <div style={{ fontSize: ".75rem", fontWeight: 500, color: labelColor, marginBottom: ".75rem", fontFamily: "sans-serif" }}>{t.order.order_summary}</div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".9rem", color: textPrimary, marginBottom: ".5rem" }}>
              <span>{isMemorial && petName ? t.memorial.order_tribute.replace("{name}", petName) : t.order.product_name}</span>
              <span style={{ fontWeight: 500 }}>{price}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".85rem", color: textMuted }}>
              <span>{t.order.shipping}</span>
              <span>{shippingEstimate ?? t.order.shipping_calculated}</span>
            </div>
          </div>

          {selectedStoryIds.length < 3 && (
            <div style={{ background: "rgba(200,129,58,.08)", border: "1px solid rgba(200,129,58,.3)", borderRadius: 12, padding: ".875rem 1rem", marginBottom: "1rem", fontSize: ".8rem", color: "var(--ep-brand)", lineHeight: 1.5, fontFamily: "sans-serif" }}>
              {t.order.few_stories_warning}
            </div>
          )}


          <div style={{ display: "flex", gap: ".75rem" }}>
            <button onClick={() => setStep("address")} style={{ flex: 1, padding: ".75rem", borderRadius: 100, border: `1.5px solid ${isMemorial ? "rgba(247,242,234,.15)" : "rgba(61,43,31,.15)"}`, background: "transparent", fontFamily: "inherit", fontSize: ".875rem", color: textMuted, cursor: "pointer" }}>
              {t.order.edit_address}
            </button>
            <button
              onClick={() => {
                if (profile?.plan === "print" && profile.book_credits === 0) {
                  startBookCheckout();
                  return;
                }
                handleOrder();
              }}
              disabled={loading || checkoutLoading}
              style={{ flex: 2, padding: ".75rem", borderRadius: 100, border: "none", background: accentColor, color: "var(--ep-bg-card)", fontFamily: "inherit", fontSize: ".875rem", fontWeight: 500, cursor: loading || checkoutLoading ? "wait" : "pointer", opacity: loading || checkoutLoading ? .7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: ".5rem" }}
            >
              {(loading || checkoutLoading) && <span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid rgba(255,255,255,.4)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin .7s linear infinite" }} />}
              {loading || checkoutLoading ? t.order.placing : t.order.place_order}
            </button>
          </div>
          {checkoutError && (
            <p style={{ fontSize: ".8rem", color: "var(--ep-alert)", textAlign: "center", margin: "1rem 0 0" }}>
              {locale === "fr"
                ? "Impossible de démarrer le paiement. Vérifie ta connexion et réessaie."
                : "Could not start checkout. Check your connection and try again."}
            </p>
          )}
        </div>
      )}
    </>
  );

  const renderAddressStep = () => (
    <div style={{ background: cardBg, borderRadius: 24, padding: "2rem", border: cardBorder }}>
      <div style={{ background: isMemorial ? "rgba(200,129,58,.06)" : "rgba(200,129,58,.08)", border: "1px solid rgba(200,129,58,.2)", borderRadius: 14, padding: "1rem 1.25rem", marginBottom: "1.5rem", display: "flex", gap: "1rem", alignItems: "center" }}>
        <span style={{ fontSize: "1.5rem" }}>{isMemorial ? "🕊️" : "📖"}</span>
        <div>
          <p style={{ fontSize: ".875rem", fontWeight: 500, color: textPrimary, margin: "0 0 .2rem" }}>{productName}</p>
          <p style={{ fontSize: ".8rem", color: textMuted, margin: 0, fontWeight: 300, fontFamily: "sans-serif" }}>{productSpecs}</p>
        </div>
        <div style={{ marginLeft: "auto", textAlign: "right" }}>
          <span style={{ fontFamily: "Georgia, serif", fontSize: "1.1rem", fontWeight: 600, color: "var(--ep-brand)", whiteSpace: "nowrap" }}>{price}</span>
          {(profile?.book_credits ?? 0) > 0 && (
            <p style={{ fontSize: ".72rem", color: textMuted, margin: ".2rem 0 0", fontFamily: "sans-serif", whiteSpace: "nowrap" }}>
              {locale === "fr"
                ? `1 crédit utilisé · reste ${(profile?.book_credits ?? 1) - 1}`
                : `1 credit used · ${(profile?.book_credits ?? 1) - 1} remaining`}
            </p>
          )}
        </div>
      </div>

      <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.25rem", color: textPrimary, marginBottom: "1.5rem" }}>{t.order.shipping_address}</h2>

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          {fields.slice(0, 2).map(field => (
            <div key={field.key}>
              <label style={{ fontSize: ".75rem", fontWeight: 500, color: labelColor, display: "block", marginBottom: ".4rem", fontFamily: "sans-serif" }}>{field.label}</label>
              <input type="text" autoComplete={field.autocomplete} placeholder={field.placeholder} value={address[field.key as keyof typeof address]} onChange={e => { setAddress({ ...address, [field.key]: e.target.value }); setAddressErrors(prev => ({ ...prev, [field.key]: false })); }} style={{ ...inputStyle, borderColor: addressErrors[field.key] ? "var(--ep-alert)" : undefined }} />
              {addressErrors[field.key] && <span style={{ fontSize: ".7rem", color: "var(--ep-alert)", fontFamily: "sans-serif" }}>{locale === "fr" ? "Champ requis" : "Required"}</span>}
            </div>
          ))}
        </div>
        {fields.slice(2).map(field => (
          <div key={field.key}>
            <label style={{ fontSize: ".75rem", fontWeight: 500, color: labelColor, display: "block", marginBottom: ".4rem", fontFamily: "sans-serif" }}>{field.label}</label>
            <input type="text" autoComplete={field.autocomplete} placeholder={field.placeholder} value={address[field.key as keyof typeof address]} onChange={e => { setAddress({ ...address, [field.key]: e.target.value }); setAddressErrors(prev => ({ ...prev, [field.key]: false })); }} style={{ ...inputStyle, borderColor: addressErrors[field.key] ? "var(--ep-alert)" : undefined }} />
            {addressErrors[field.key] && <span style={{ fontSize: ".7rem", color: "var(--ep-alert)", fontFamily: "sans-serif" }}>{locale === "fr" ? "Champ requis" : "Required"}</span>}
          </div>
        ))}
        <div>
          <label style={{ fontSize: ".75rem", fontWeight: 500, color: labelColor, display: "block", marginBottom: ".4rem", fontFamily: "sans-serif" }}>{t.order.country}</label>
          <div style={{ position: "relative" }}>
            <input
              type="text"
              autoComplete="off"
              placeholder={locale === "fr" ? "Rechercher un pays…" : "Search country…"}
              value={countrySearch || (address.country ? (COUNTRIES.find(c => c.code === address.country)?.name ?? "") : "")}
              onFocus={() => setCountrySearch("")}
              onChange={e => { setCountrySearch(e.target.value); setAddress({ ...address, country: "" }); }}
              style={inputStyle}
            />
            {countrySearch.trim().length > 0 && (
              <div style={{
                position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 50,
                background: isMemorial ? "#1C1410" : "var(--ep-bg-card)",
                border: `1.5px solid ${isMemorial ? "rgba(247,242,234,.15)" : "rgba(61,43,31,.15)"}`,
                borderRadius: 12, overflow: "hidden",
                boxShadow: "0 8px 24px rgba(0,0,0,.12)",
                maxHeight: 200, overflowY: "auto",
              }}>
                {COUNTRIES.filter(c => c.name.toLowerCase().includes(countrySearch.toLowerCase())).length === 0 ? (
                  <div style={{ padding: ".75rem 1rem", fontSize: ".85rem", color: textMuted, fontFamily: "sans-serif" }}>
                    {locale === "fr" ? "Aucun résultat" : "No results"}
                  </div>
                ) : COUNTRIES.filter(c => c.name.toLowerCase().includes(countrySearch.toLowerCase())).map(c => (
                  <div
                    key={c.code}
                    onMouseDown={() => { setAddress({ ...address, country: c.code }); setCountrySearch(""); setAddressErrors(prev => ({ ...prev, country: false })); }}
                    style={{
                      padding: ".625rem 1rem", fontSize: ".875rem", cursor: "pointer",
                      color: textPrimary, fontFamily: "sans-serif",
                      background: address.country === c.code ? `${accentColor}18` : "transparent",
                      borderBottom: `1px solid ${isMemorial ? "rgba(247,242,234,.06)" : "rgba(61,43,31,.05)"}`,
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = `${accentColor}12`)}
                    onMouseLeave={e => (e.currentTarget.style.background = address.country === c.code ? `${accentColor}18` : "transparent")}
                  >
                    {c.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {addressErrors.country && <span style={{ fontSize: ".7rem", color: "var(--ep-alert)", fontFamily: "sans-serif", marginTop: ".25rem", display: "block" }}>{locale === "fr" ? "Champ requis" : "Required"}</span>}

      {/* Shipping + price estimate (shown once country selected) */}
      {address.country && (
        <div style={{ marginTop: "1.25rem", background: isMemorial ? "rgba(200,129,58,.06)" : "rgba(200,129,58,.08)", border: "1px solid rgba(200,129,58,.18)", borderRadius: 14, padding: "1rem 1.25rem" }}>
          <div style={{ fontSize: ".7rem", fontWeight: 600, color: accentColor, marginBottom: ".75rem", fontFamily: "sans-serif" }}>
            {t.order.price_total_est}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".875rem", color: textPrimary, marginBottom: ".375rem" }}>
            <span>{t.order.price_book}</span>
            <span style={{ fontWeight: 500 }}>{price}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".875rem", color: textMuted }}>
            <span>{t.order.estimated_shipping}</span>
            <span>{shippingEstimate ?? t.order.shipping_calculated}</span>
          </div>
        </div>
      )}

      {/* Dedication textarea (Point 7) */}
      <div style={{ marginTop: "1.5rem" }}>
        <label style={{ fontSize: ".75rem", fontWeight: 500, color: labelColor, display: "block", marginBottom: ".4rem", fontFamily: "sans-serif" }}>
          {dedicationLabel}
        </label>
        <textarea
          value={dedicationText}
          onChange={e => setDedicationText(e.target.value)}
          maxLength={400}
          rows={4}
          placeholder={dedicationPlaceholder}
          style={{
            ...inputStyle,
            resize: "vertical",
            lineHeight: 1.6,
          }}
        />
        <div style={{ fontSize: ".7rem", color: dedicationText.length >= 360 ? "var(--ep-alert)" : textMuted, textAlign: "right", marginTop: ".25rem", fontFamily: "sans-serif" }}>
          {dedicationText.length}/400
        </div>
      </div>

      <button
        onClick={() => {
          const required = ["firstName", "lastName", "addressLine1", "city", "postCode", "country"];
          const errors: Record<string, boolean> = {};
          required.forEach(k => { if (!address[k as keyof typeof address]) errors[k] = true; });
          if (Object.keys(errors).length > 0) {
            setAddressErrors(errors);
            return;
          }
          setAddressErrors({});
          setStep("confirm");
        }}
        style={{ marginTop: "1.5rem", width: "100%", padding: ".75rem", borderRadius: 100, border: "none", background: accentColor, color: "var(--ep-bg-card)", fontFamily: "inherit", fontSize: ".9rem", fontWeight: 500, cursor: "pointer", opacity: 1 }}
      >
        {t.order.continue_to_payment}
      </button>
    </div>
  );

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      {previewHtml && (
        <PreviewModal
          previewHtml={previewHtml}
          previewStale={previewStale}
          previewLabel={previewLabel}
          closeLabel={closeLabel}
          onClose={closePreview}
        />
      )}
      <div style={{ minHeight: "100vh", background: bg, fontFamily: "'DM Sans', sans-serif", transition: "background .3s" }}>
        <nav style={{ background: isMemorial ? "rgba(28,20,16,.9)" : "rgba(247,242,234,0.9)", backdropFilter: "blur(12px)", borderBottom: `1px solid ${isMemorial ? "rgba(247,242,234,.06)" : "rgba(61,43,31,.08)"}`, padding: "1rem 2rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontFamily: "Georgia, serif", fontSize: "1.1rem", fontWeight: 600, color: textPrimary }}>
            {isMemorial && petName
              ? t.memorial.order_tribute.replace("{name}", petName)
              : t.order.title}
          </span>
        </nav>
        <main style={{ maxWidth: 900, margin: "0 auto", padding: "2.5rem 1.5rem" }}>
          {step !== "success" && (
            <Stepper
              step={step}
              isMemorial={isMemorial}
              accentColor={accentColor}
              textMuted={textMuted}
              stepLabels={stepLabels}
              onStepClick={setStep}
            />
          )}
          {renderUpsellBanners()}
          {step === "preview" && renderPreviewStep()}
          {step === "success" && renderSuccessStep()}
          {step === "confirm" && renderConfirmStep()}
          {step === "address" && renderAddressStep()}
        </main>
      </div>
    </>
  );
}

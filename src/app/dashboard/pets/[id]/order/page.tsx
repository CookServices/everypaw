"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/hooks/useLocale";
import { calcGelatoBookPrice } from "@/lib/gelato-pricing";
import { paginateBook, MAX_BOOK_PHOTOS } from "@/lib/book-pages";
import { collectOrphanPhotoUrls } from "@/lib/book-shared";
import { formatAmount, type Currency } from "@/lib/currency";
import type { Step, LayoutType, ThemeId, Story, Entry, Pet, Profile } from "./constants";
import { SHIPPING_BY_COUNTRY, COVER_THEMES } from "./constants";
import { estimateOrderPages, calcCoverPeriod, calcMonthsCount } from "./utils";
import PreviewModal from "./components/PreviewModal";
import Stepper from "./components/Stepper";
import SuccessStep from "./components/SuccessStep";
import UpsellBanners from "./components/UpsellBanners";
import ConfirmStep from "./components/ConfirmStep";
import YearAndTheme from "./components/YearAndTheme";
import BookCover from "./components/BookCover";
import ContentSummary from "./components/ContentSummary";
import ChapterSelector from "./components/ChapterSelector";
import PreviewActions from "./components/PreviewActions";
import AddressStep from "./components/AddressStep";

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
  const [milestones, setMilestones] = useState<{ id: string; achieved_at: string }[]>([]);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewStale, setPreviewStale] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const [renewalDate, setRenewalDate] = useState<string | null>(null);
  const [currency, setCurrency] = useState<Currency>("USD");
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
        supabase.from("milestones").select("id, achieved_at").eq("pet_id", id),
      ]).then(([{ data: petData }, { data: storiesData }, { data: entriesData }, { data: profileData }, { data: milestonesData }]) => {
        if (petData) {
          if ((petData as typeof petData & { user_id?: string }).user_id !== user.id) {
            window.location.href = "/dashboard";
            return;
          }
          setPet(petData);
        }
        if (storiesData) setStories(storiesData);
        if (entriesData) setEntries(entriesData);
        if (milestonesData) setMilestones(milestonesData);
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

  // Currency for displayed prices — same source as settings/upgrade, and the
  // same country header /api/stripe/book-checkout uses to pick the Stripe
  // currency, so the shown price matches what is actually charged.
  useEffect(() => {
    fetch("/api/currency").then(r => r.json()).then(d => setCurrency(d.currency as Currency)).catch(() => {});
  }, []);

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
          let paid: { storyIds: string[]; year: number | null } | undefined;
          try {
            const raw = sessionStorage.getItem(`ep_order_${id}_sel`);
            if (raw) {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed?.storyIds)) {
                paid = { storyIds: parsed.storyIds, year: typeof parsed.year === "number" ? parsed.year : null };
                setSelectedStoryIds(parsed.storyIds);
                setYearFilter(paid.year);
              }
            }
            sessionStorage.removeItem(`ep_order_${id}_addr`);
            sessionStorage.removeItem(`ep_order_${id}_sel`);
          } catch {}
          handleOrder(paid);
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
        // The request reached the server, so this is never the user's connection:
        // don't tell them to check it.
        const msg = locale === "fr"
          ? "Impossible de générer l'aperçu. Réessayez dans un instant."
          : "Could not generate the preview. Try again in a moment.";
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
  // The book now paginates photos, so the pill is capped by what a book can hold.
  const photoCount = Math.min(photoEntries.flatMap(e => e.photo_urls).length, MAX_BOOK_PHOTOS);

  // Estimated content page count (no dedication, filled at address step).
  // Total PDF pages = estimatedPages + 3 structural (cover, endpaper, back cover).
  const filteredMilestones = yearFilter === null
    ? milestones
    : milestones.filter(m => new Date(m.achieved_at).getFullYear() === yearFilter);
  const { estimatedPages, tooFewContent } = estimateOrderPages(
    visibleStories, filteredEntries, selectedStoryIds, filteredMilestones.length, storyLayouts,
  );

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
      try {
        sessionStorage.setItem(`ep_order_${id}_addr`, JSON.stringify(address));
        // The book being paid for, so the order placed on the way back is the
        // same book. Stripe's redirect remounts the page and the selection
        // would otherwise reset to every chapter.
        sessionStorage.setItem(`ep_order_${id}_sel`, JSON.stringify({ storyIds: selectedStoryIds, year: yearFilter }));
      } catch {}
      const res = await fetch("/api/stripe/book-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // The book about to be ordered, so the price is that book's price.
        // The server re-reads the content behind these ids and gelato/order
        // refuses to print more pages than were paid for.
        body: JSON.stringify({ petId: id, storyIds: selectedStoryIds, year: yearFilter ?? undefined }),
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

  // `paid` carries the selection that was priced at checkout, restored from
  // sessionStorage after the Stripe redirect. Without it the page would default
  // back to every chapter and order a book larger than the one paid for, which
  // /api/gelato/order now refuses.
  const handleOrder = async (paid?: { storyIds: string[]; year: number | null }) => {
    const orderStoryIds = paid?.storyIds ?? selectedStoryIds;
    const orderYear = paid ? paid.year : yearFilter;
    setLoading(true);
    try {
      const res = await fetch("/api/gelato/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          petId: id,
          shippingAddress: address,
          memorial: isMemorial,
          selectedStoryIds: orderStoryIds,
          dedicationText: dedicationText.trim() || null,
          coverPhotoUrl,
          yearFilter: orderYear,
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
      } else if (data.error === "book_larger_than_paid") {
        // The selection grew between paying and ordering: say so rather than
        // showing a generic failure the user cannot act on.
        alert(t.order.book_larger_than_paid
          .replace("{paid}", String(data.paidPages))
          .replace("{pages}", String(data.pages)));
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
  // Same inputs as /api/stripe/book-checkout for the same declaration: the
  // selected chapters, the same year, the photos no selected chapter claims,
  // dedication and tributes assumed present. The shown price is the charged
  // price; the server recomputes it from the database rather than trusting
  // anything sent from here.
  const selectedStories = visibleStories.filter(s => selectedStoryIds.includes(s.id));
  const worstCasePages = paginateBook({
    // Same worst case as /api/stripe/book-checkout: tightest layout, four photos.
    chapters: selectedStories.map(story => ({
      contentLength: (story.content ?? "").trim().length,
      layout: "split",
      photoCount: 4,
    })),
    orphanPhotoCount: collectOrphanPhotoUrls(filteredEntries, selectedStories).length,
    milestoneCount: filteredMilestones.length,
    hasDedication: true,
    hasTributes: true,
  }).declaredPages;
  const extraBookPrice = calcGelatoBookPrice(worstCasePages);
  const extraBookPriceLabel = formatAmount(currency, extraBookPrice);
  // Memorial books go through the same checkout and the same dynamic pricing,
  // so they show the computed price too, never a fixed string.
  const price = extraBookPriceLabel;
  const paidPriceSuffix = `${extraBookPriceLabel} ${locale === "fr" ? "+ livraison" : "+ shipping"}`;
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
          <UpsellBanners
            profile={profile}
            step={step}
            isMemorial={isMemorial}
            textPrimary={textPrimary}
            textMuted={textMuted}
            accentColor={accentColor}
            locale={locale}
            t={t}
            renewalDate={renewalDate}
            petName={petName}
          />
          {step === "preview" && (
            <div>
              <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.25rem", color: textPrimary, marginBottom: "1.25rem", textAlign: "center" }}>
                {t.order.preview_title}
              </h2>
              <YearAndTheme
                availableYears={availableYears}
                labelColor={labelColor}
                bookYearLabel={bookYearLabel}
                yearFilter={yearFilter}
                handleYearChange={handleYearChange}
                inputStyle={inputStyle}
                allYearsLabel={allYearsLabel}
                isMemorial={isMemorial}
                cardBg={cardBg}
                cardBorder={cardBorder}
                locale={locale}
                coverTheme={coverTheme}
                setCoverTheme={setCoverTheme}
                accentColor={accentColor}
                customTitle={customTitle}
                setCustomTitle={setCustomTitle}
                defaultCoverTitle={defaultCoverTitle}
                textMuted={textMuted}
              />
              <BookCover
                coverPhotoUrl={coverPhotoUrl}
                bookBg={bookBg}
                bookAccentColor={bookAccentColor}
                bookTitleColor={bookTitleColor}
                displayCoverTitle={displayCoverTitle}
                isMemorial={isMemorial}
                coverPeriod={coverPeriod}
                petName={petName}
                bookCoverLabel={t.order.book_cover_label}
                coverPhotoLabel={coverPhotoLabel}
                availablePhotos={availablePhotos}
                setCoverPhotoUrl={setCoverPhotoUrl}
                coverDefaultLabel={coverDefaultLabel}
                uploadingCover={uploadingCover}
                handleCoverUpload={handleCoverUpload}
                textMuted={textMuted}
                labelColor={labelColor}
                locale={locale}
              />
              <ContentSummary
                cardBg={cardBg}
                cardBorder={cardBorder}
                selectedStoryIds={selectedStoryIds}
                visibleStories={visibleStories}
                locale={locale}
                t={t}
                photoCount={photoCount}
                monthsCount={monthsCount}
                estimatedPages={estimatedPages}
                petId={id}
                accentColor={accentColor}
                textPrimary={textPrimary}
                textMuted={textMuted}
                isMemorial={isMemorial}
              />
              <ChapterSelector
                visibleStories={visibleStories}
                labelColor={labelColor}
                chaptersLabel={chaptersLabel}
                selectedStoryIds={selectedStoryIds}
                setSelectedStoryIds={setSelectedStoryIds}
                cardBg={cardBg}
                cardBorder={cardBorder}
                accentColor={accentColor}
                isMemorial={isMemorial}
                t={t}
                locale={locale}
                textMuted={textMuted}
                textPrimary={textPrimary}
                petName={petName}
                storyLayouts={storyLayouts}
                setStoryLayouts={setStoryLayouts}
              />
              <PreviewActions
                photoEntries={photoEntries}
                labelColor={labelColor}
                t={t}
                isMemorial={isMemorial}
                pet={pet}
                approvedTributesCount={approvedTributesCount}
                includeTributes={includeTributes}
                setIncludeTributes={setIncludeTributes}
                textPrimary={textPrimary}
                locale={locale}
                visibleStories={visibleStories}
                selectedStoryIds={selectedStoryIds}
                tooFewContent={tooFewContent}
                checkoutLoading={checkoutLoading}
                paidPriceSuffix={paidPriceSuffix}
                profile={profile}
                setStep={setStep}
                accentColor={accentColor}
                checkoutError={checkoutError}
                handleFullPreview={handleFullPreview}
                previewLoading={previewLoading}
                previewLabel={previewLabel}
                handleDownloadPdf={handleDownloadPdf}
                downloadLoading={downloadLoading}
                handleSave={handleSave}
                saving={saving}
                saveSuccess={saveSuccess}
                saveError={saveError}
                textMuted={textMuted}
              />
            </div>
          )}
          {step === "success" && (
            <SuccessStep
              isMemorial={isMemorial}
              cardBg={cardBg}
              cardBorder={cardBorder}
              textPrimary={textPrimary}
              textMuted={textMuted}
              accentColor={accentColor}
              orderId={orderId}
              successTitle={t.order.success_title}
              successDesc={t.order.success_desc}
              orderIdLabel={t.order.order_id}
              backDashboardLabel={t.order.back_dashboard}
            />
          )}
          {step === "confirm" && (
            <ConfirmStep
              awaitingCredit={awaitingCredit}
              paymentPending={paymentPending}
              cardBg={cardBg}
              cardBorder={cardBorder}
              textPrimary={textPrimary}
              textMuted={textMuted}
              locale={locale}
              handleOrder={handleOrder}
              loading={loading}
              accentColor={accentColor}
              t={t}
              isMemorial={isMemorial}
              labelColor={labelColor}
              address={address}
              petName={petName}
              price={price}
              shippingEstimate={shippingEstimate}
              selectedStoryIds={selectedStoryIds}
              setStep={setStep}
              profile={profile}
              checkoutLoading={checkoutLoading}
              startBookCheckout={startBookCheckout}
              checkoutError={checkoutError}
            />
          )}
          {step === "address" && (
            <AddressStep
              cardBg={cardBg}
              cardBorder={cardBorder}
              isMemorial={isMemorial}
              productName={productName}
              productSpecs={productSpecs}
              textPrimary={textPrimary}
              textMuted={textMuted}
              price={price}
              profile={profile}
              locale={locale}
              t={t}
              fields={fields}
              address={address}
              setAddress={setAddress}
              addressErrors={addressErrors}
              setAddressErrors={setAddressErrors}
              labelColor={labelColor}
              inputStyle={inputStyle}
              countrySearch={countrySearch}
              setCountrySearch={setCountrySearch}
              accentColor={accentColor}
              shippingEstimate={shippingEstimate}
              dedicationLabel={dedicationLabel}
              dedicationText={dedicationText}
              setDedicationText={setDedicationText}
              dedicationPlaceholder={dedicationPlaceholder}
              setStep={setStep}
            />
          )}
        </main>
      </div>
    </>
  );
}

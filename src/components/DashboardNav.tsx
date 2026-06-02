"use client";

import Link from "next/link";
import { usePathname, useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/hooks/useLocale";
import LanguageSwitcher from "@/components/LanguageSwitcher";

function SuggestionModal({ isFR, onClose }: { isFR: boolean; onClose: () => void }) {
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setStatus("sending");
    try {
      const res = await fetch("/api/suggestion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      setStatus(res.ok ? "sent" : "error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(61,43,31,.45)", backdropFilter: "blur(2px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "1rem",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#FDFAF5", borderRadius: 16, padding: "1.75rem",
          width: "100%", maxWidth: 420,
          boxShadow: "0 8px 40px rgba(61,43,31,.18)",
        }}
      >
        <h2 style={{ margin: "0 0 .375rem", fontSize: "1.125rem", fontWeight: 600, color: "#3D2B1F" }}>
          {isFR ? "Envoyer une suggestion" : "Send a suggestion"}
        </h2>
        <p style={{ margin: "0 0 1.25rem", fontSize: ".875rem", color: "#7A5C44" }}>
          {isFR
            ? "Une idée de fonctionnalité, un bug, ou juste un retour ? On lit tout."
            : "A feature idea, a bug, or just feedback? We read everything."}
        </p>

        {status === "sent" ? (
          <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
            <p style={{ fontSize: "2rem", margin: "0 0 .5rem" }}>🐾</p>
            <p style={{ color: "#3D2B1F", fontWeight: 500 }}>
              {isFR ? "Merci pour ta suggestion !" : "Thanks for your suggestion!"}
            </p>
            <button
              onClick={onClose}
              style={{
                marginTop: "1rem", padding: ".5rem 1.25rem", borderRadius: 8,
                background: "#C8813A", color: "#FDFAF5", border: "none",
                fontSize: ".875rem", fontWeight: 500, cursor: "pointer",
              }}
            >
              {isFR ? "Fermer" : "Close"}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder={isFR ? "Ta suggestion…" : "Your suggestion…"}
              rows={5}
              maxLength={2000}
              required
              style={{
                width: "100%", boxSizing: "border-box",
                padding: ".75rem", borderRadius: 10,
                border: "1.5px solid rgba(61,43,31,.15)",
                background: "#FAF6EF", color: "#3D2B1F",
                fontSize: ".875rem", resize: "vertical",
                fontFamily: "inherit", outline: "none",
              }}
            />
            {status === "error" && (
              <p style={{ color: "#c0392b", fontSize: ".8rem", margin: ".5rem 0 0" }}>
                {isFR ? "Erreur lors de l'envoi. Réessaie." : "Something went wrong. Please try again."}
              </p>
            )}
            <div style={{ display: "flex", gap: ".75rem", marginTop: "1rem", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: ".5rem 1rem", borderRadius: 8,
                  border: "1.5px solid rgba(61,43,31,.15)", background: "transparent",
                  color: "#7A5C44", fontSize: ".875rem", cursor: "pointer",
                }}
              >
                {isFR ? "Annuler" : "Cancel"}
              </button>
              <button
                type="submit"
                disabled={status === "sending" || !message.trim()}
                style={{
                  padding: ".5rem 1.25rem", borderRadius: 8,
                  background: "#C8813A", color: "#FDFAF5", border: "none",
                  fontSize: ".875rem", fontWeight: 500, cursor: "pointer",
                  opacity: status === "sending" || !message.trim() ? .6 : 1,
                }}
              >
                {status === "sending"
                  ? (isFR ? "Envoi…" : "Sending…")
                  : (isFR ? "Envoyer" : "Send")}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

const SPECIES_EMOJI: Record<string, string> = {
  dog: "🐶", cat: "🐱", rabbit: "🐰", bird: "🐦", other: "🐾",
};

const SPECIES_LABEL: Record<string, { fr: string; en: string }> = {
  dog: { fr: "Chien", en: "Dog" },
  cat: { fr: "Chat", en: "Cat" },
  rabbit: { fr: "Lapin", en: "Rabbit" },
  bird: { fr: "Oiseau", en: "Bird" },
  other: { fr: "Animal", en: "Pet" },
};

const LAST_PET_KEY = "lastPetId";

// ── SVG icons ────────────────────────────────────────────────────────────────

function IconHome() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
      <path d="M9 21V12h6v9" />
    </svg>
  );
}

function IconBook() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
      <path d="M8 7h8M8 11h5" />
    </svg>
  );
}

function IconSparkles() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v2M12 19v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
      <circle cx="12" cy="12" r="4" />
    </svg>
  );
}

function IconTrophy() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 21h8M12 17v4" />
      <path d="M7 4H4a2 2 0 00-2 2v1c0 3.31 2.69 6 6 6" />
      <path d="M17 4h3a2 2 0 012 2v1c0 3.31-2.69 6-6 6" />
      <path d="M12 13c-3.31 0-6-2.69-6-6V4h12v3c0 3.31-2.69 6-6 6z" />
    </svg>
  );
}

function IconBookCover() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
      <path d="M9 2v17" />
    </svg>
  );
}

function IconBooks() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
      <path d="M9 2v17" />
      <path d="M16 6h2M16 10h2" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}

function IconLogout() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}

function IconChevron({ open }: { open: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ transition: "transform .15s", transform: open ? "rotate(180deg)" : "none" }}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

// ── Pet selector ─────────────────────────────────────────────────────────────

interface PetOption { id: string; name: string; species: string; breed?: string | null; photo_url?: string | null; }

function PetSelector({
  pets,
  selectedId,
  showAll,
  onSelect,
  onSelectAll,
  isFR,
}: {
  pets: PetOption[];
  selectedId: string | null;
  showAll: boolean;
  onSelect: (id: string) => void;
  onSelectAll: () => void;
  isFR: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = showAll ? null : (pets.find(p => p.id === selectedId) ?? pets[0] ?? null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (pets.length === 0) return null;

  const emoji = selected ? (SPECIES_EMOJI[selected.species] ?? "🐾") : "🐾";
  const petName = selected ? selected.name : (isFR ? "Tous mes animaux" : "All my pets");
  const speciesText = selected
    ? (selected.breed || ((isFR ? SPECIES_LABEL[selected.species]?.fr : SPECIES_LABEL[selected.species]?.en) ?? selected.species))
    : `${pets.length} ${isFR ? (pets.length > 1 ? "animaux" : "animal") : (pets.length > 1 ? "pets" : "pet")}`;

  return (
    <div ref={ref} style={{ position: "relative", borderBottom: "1px solid rgba(61,43,31,.06)" }}>
      <button
        onClick={() => setOpen(v => !v)}
        aria-label={isFR ? "Choisir un animal" : "Select a pet"}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: ".75rem",
          background: open ? "rgba(61,43,31,.05)" : "rgba(61,43,31,.025)",
          border: "none", padding: ".875rem 1rem",
          cursor: "pointer", fontFamily: "inherit",
          transition: "background .12s",
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(61,43,31,.05)"; }}
        onMouseLeave={e => { if (!open) (e.currentTarget as HTMLElement).style.background = "rgba(61,43,31,.025)"; }}
      >
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: selected && !selected.photo_url ? "#C8813A" : "rgba(200,129,58,.15)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: selected?.photo_url ? undefined : ".9rem",
          overflow: "hidden", color: "#FDFAF5", fontWeight: 600,
        }}>
          {selected?.photo_url
            ? <img src={selected.photo_url} alt={selected.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : selected ? selected.name.slice(0, 2).toUpperCase() : "🐾"}
        </div>
        <div style={{ flex: 1, textAlign: "left", overflow: "hidden" }}>
          <p style={{ margin: 0, fontSize: ".875rem", fontWeight: 600, color: "#3D2B1F", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1.3 }}>
            {petName}
          </p>
          <p style={{ margin: 0, fontSize: ".72rem", color: "#9A8070", fontWeight: 400, lineHeight: 1.3 }}>
            {speciesText}
          </p>
        </div>
        <IconChevron open={open} />
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100%)", left: ".75rem", right: ".75rem",
          background: "#FDFAF5", border: "1px solid rgba(61,43,31,.1)",
          borderRadius: 12, boxShadow: "0 8px 24px rgba(61,43,31,.12)",
          zIndex: 60, overflow: "hidden", padding: ".35rem",
        }}>
          <button
            onClick={() => { onSelectAll(); setOpen(false); }}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: ".5rem",
              padding: ".5rem .625rem", border: "none", borderRadius: 8,
              background: showAll ? "rgba(200,129,58,.1)" : "transparent",
              color: showAll ? "#C8813A" : "#3D2B1F",
              fontFamily: "inherit", fontSize: ".85rem", fontWeight: showAll ? 500 : 400,
              cursor: "pointer", textAlign: "left", transition: "background .1s",
            }}
            onMouseEnter={e => { if (!showAll) (e.currentTarget as HTMLElement).style.background = "rgba(61,43,31,.04)"; }}
            onMouseLeave={e => { if (!showAll) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
          >
            <span style={{ fontSize: "1rem", lineHeight: 1 }}>🐾</span>
            <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {isFR ? "Tous mes animaux" : "All my pets"}
            </span>
            {showAll && <span style={{ fontSize: ".7rem", color: "#C8813A" }}>✓</span>}
          </button>

          {pets.length > 0 && <div style={{ height: 1, background: "rgba(61,43,31,.06)", margin: ".25rem .25rem" }} />}

          {pets.map(pet => {
            const isActive = !showAll && pet.id === selectedId;
            return (
              <button
                key={pet.id}
                onClick={() => { onSelect(pet.id); setOpen(false); }}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: ".5rem",
                  padding: ".5rem .625rem", border: "none", borderRadius: 8,
                  background: isActive ? "rgba(200,129,58,.1)" : "transparent",
                  color: isActive ? "#C8813A" : "#3D2B1F",
                  fontFamily: "inherit", fontSize: ".85rem", fontWeight: isActive ? 500 : 400,
                  cursor: "pointer", textAlign: "left", transition: "background .1s",
                }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "rgba(61,43,31,.04)"; }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                {pet.photo_url ? (
                  <img src={pet.photo_url} alt={pet.name} style={{ width: 20, height: 20, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                ) : (
                  <span style={{ fontSize: "1rem", lineHeight: 1 }}>{SPECIES_EMOJI[pet.species] ?? "🐾"}</span>
                )}
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pet.name}</span>
                {isActive && <span style={{ fontSize: ".7rem", color: "#C8813A" }}>✓</span>}
              </button>
            );
          })}

          <div style={{ borderTop: "1px solid rgba(61,43,31,.06)", marginTop: ".35rem", paddingTop: ".35rem" }}>
            <Link
              href="/dashboard/pets/new"
              onClick={() => setOpen(false)}
              style={{
                display: "flex", alignItems: "center", gap: ".5rem",
                padding: ".5rem .625rem", borderRadius: 8,
                color: "#7A5C44", fontSize: ".8rem", textDecoration: "none",
                transition: "background .1s",
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(61,43,31,.04)"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
            >
              <span style={{ fontSize: ".9rem" }}>+</span>
              <span>{isFR ? "Ajouter un animal" : "Add a pet"}</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function DashboardNav() {
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab");
  const { locale } = useLocale();

  const petId = params?.id as string | undefined;

  const [pets, setPets] = useState<PetOption[]>([]);
  const [resolvedPetId, setResolvedPetId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [suggestionOpen, setSuggestionOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("pets")
      .select("id, name, species, breed, photo_url")
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (data && data.length > 0) setPets(data as PetOption[]);
      });
  }, []);

  useEffect(() => {
    if (petId) {
      setResolvedPetId(petId);
      setShowAll(false);
      try { localStorage.setItem(LAST_PET_KEY, petId); } catch {}
    } else if (pathname === "/dashboard") {
      setShowAll(true);
    } else {
      try {
        const stored = localStorage.getItem(LAST_PET_KEY);
        if (stored) { setResolvedPetId(stored); return; }
      } catch {}
    }
  }, [petId, pathname]);

  useEffect(() => {
    if (resolvedPetId) return;
    if (pets.length === 0) return;
    const stored = (() => { try { return localStorage.getItem(LAST_PET_KEY); } catch { return null; } })();
    const candidate = stored && pets.find(p => p.id === stored) ? stored : pets[0].id;
    setResolvedPetId(candidate);
  }, [pets, resolvedPetId]);

  const handleSelectPet = (newId: string) => {
    setResolvedPetId(newId);
    setShowAll(false);
    try { localStorage.setItem(LAST_PET_KEY, newId); } catch {}

    const currentSearch = typeof window !== "undefined" ? window.location.search : "";
    const tabParam = new URLSearchParams(currentSearch).get("tab");

    if (pathname.includes("/order")) {
      router.push(`/dashboard/pets/${newId}/order`);
    } else if (tabParam === "stories" || tabParam === "milestones") {
      router.push(`/dashboard/pets/${newId}?tab=${tabParam}`);
    } else {
      router.push(`/dashboard/pets/${newId}?tab=journal`);
    }
  };

  const handleSelectAll = () => {
    setShowAll(true);
    router.push("/dashboard");
  };

  const isPetPage    = pathname.includes("/dashboard/pets/") && !pathname.includes("/order") && !pathname.includes("/books") && !pathname.includes("/new") && !pathname.includes("/edit");
  const isOrderPage  = pathname.includes("/order");
  const isBooksPage  = pathname.includes("/books");
  const isSettingsPage = pathname.startsWith("/dashboard/settings");
  const isDashboard  = !isPetPage && !isOrderPage && !isBooksPage && !isSettingsPage;

  const petLink        = resolvedPetId ? `/dashboard/pets/${resolvedPetId}?tab=journal`    : "/dashboard";
  const storiesLink    = resolvedPetId ? `/dashboard/pets/${resolvedPetId}?tab=stories`    : "/dashboard";
  const milestonesLink = resolvedPetId ? `/dashboard/pets/${resolvedPetId}?tab=milestones` : "/dashboard";
  const orderLink      = resolvedPetId ? `/dashboard/pets/${resolvedPetId}/order`           : "/dashboard";
  const booksLink      = resolvedPetId ? `/dashboard/pets/${resolvedPetId}/books`           : "/dashboard";
  const addMomentLink  = resolvedPetId ? `/dashboard/pets/${resolvedPetId}?tab=journal`    : "/dashboard/pets/new";

  const isFR = locale === "fr";

  const mainItems = [
    { href: "/dashboard",   label: isFR ? "Accueil"      : "Home",       shortLabel: isFR ? "Accueil"   : "Home",    icon: <IconHome />,      active: isDashboard,    mobileOnly: false },
    { href: petLink,        label: "Journal",                              shortLabel: "Journal",                      icon: <IconBook />,      active: isPetPage && currentTab !== "stories" && currentTab !== "milestones", mobileOnly: false },
    { href: storiesLink,    label: isFR ? "Histoires IA" : "AI Stories",  shortLabel: isFR ? "Histoires" : "Stories", icon: <IconSparkles />, active: isPetPage && currentTab === "stories",      mobileOnly: false },
    { href: orderLink,      label: isFR ? "Livre"        : "Book",        shortLabel: isFR ? "Livre"     : "Book",    icon: <IconBookCover />, active: isOrderPage,     mobileOnly: false },
    { href: milestonesLink, label: isFR ? "Étapes"       : "Milestones",  shortLabel: isFR ? "Étapes"    : "Steps",   icon: <IconTrophy />,   active: isPetPage && currentTab === "milestones", mobileOnly: false },
    { href: booksLink,      label: isFR ? "Mes livres"   : "My books",    shortLabel: isFR ? "Livres"    : "Books",   icon: <IconBooks />,     active: isBooksPage,     mobileOnly: true  },
  ];

  const mobileNavItems = mainItems.filter(item => !item.mobileOnly);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  // ── Sidebar (desktop ≥768px) ──────────────────────────────────────────────

  const Sidebar = (
    <aside className="ep-sidebar" style={{
      width: 220, minHeight: "100vh", position: "fixed", left: 0, top: 0, bottom: 0,
      background: "#FDFAF5", borderRight: "1px solid rgba(61,43,31,.08)",
      display: "flex", flexDirection: "column", zIndex: 40,
    }}>
      {/* Logo */}
      <Link href="/dashboard" style={{
        display: "flex", alignItems: "center", gap: ".5rem",
        padding: "1.375rem 1.25rem 1.25rem", textDecoration: "none",
        borderBottom: "1px solid rgba(61,43,31,.06)",
      }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#C8813A", display: "inline-block", flexShrink: 0 }} />
        <span style={{ fontFamily: "Georgia, serif", fontSize: "1rem", fontWeight: 600, color: "#3D2B1F" }}>Everypaw</span>
      </Link>

      {/* Pet selector */}
      <PetSelector
        pets={pets} selectedId={resolvedPetId} showAll={showAll}
        onSelect={handleSelectPet} onSelectAll={handleSelectAll} isFR={isFR}
      />

      {/* Main nav */}
      <nav style={{ flex: 1, padding: ".875rem .75rem", display: "flex", flexDirection: "column", gap: ".2rem" }}>
        {mainItems.map(item => (
          <Link
            key={item.label}
            href={item.href}
            style={{
              display: "flex", alignItems: "center", gap: ".75rem",
              padding: ".625rem .75rem", borderRadius: 10, textDecoration: "none",
              background: item.active ? "rgba(200,129,58,.1)" : "transparent",
              color: item.active ? "#C8813A" : "#7A5C44",
              fontWeight: item.active ? 500 : 400,
              fontSize: ".875rem", transition: "background .15s, color .15s",
            }}
            onMouseEnter={e => {
              if (!item.active) {
                (e.currentTarget as HTMLElement).style.background = "rgba(61,43,31,.04)";
                (e.currentTarget as HTMLElement).style.color = "#3D2B1F";
              }
            }}
            onMouseLeave={e => {
              if (!item.active) {
                (e.currentTarget as HTMLElement).style.background = "transparent";
                (e.currentTarget as HTMLElement).style.color = "#7A5C44";
              }
            }}
          >
            <span style={{ flexShrink: 0, opacity: item.active ? 1 : 0.7 }}>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* CTA — Suggestion */}
      <div style={{ padding: "0 .75rem .875rem" }}>
        <button
          onClick={() => setSuggestionOpen(true)}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: ".5rem",
            width: "100%", padding: ".5rem .75rem", borderRadius: 8,
            background: "transparent", color: "#9A8070",
            border: "1px solid rgba(61,43,31,.12)",
            fontSize: ".8rem", fontWeight: 400, cursor: "pointer",
            transition: "background .12s, color .12s, border-color .12s",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(61,43,31,.04)"; (e.currentTarget as HTMLElement).style.color = "#7A5C44"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(61,43,31,.2)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#9A8070"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(61,43,31,.12)"; }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
          {isFR ? "Suggestion" : "Suggestion"}
        </button>
      </div>

      {/* Secondary section: Settings, Language, Logout */}
      <div style={{ borderTop: "1px solid rgba(61,43,31,.08)", padding: ".75rem 1rem 1.25rem", display: "flex", flexDirection: "column", gap: ".2rem" }}>
        <Link
          href="/dashboard/settings"
          style={{
            display: "flex", alignItems: "center", gap: ".625rem",
            padding: ".45rem .5rem", borderRadius: 8,
            color: isSettingsPage ? "#C8813A" : "#9A8070",
            fontSize: ".8rem", fontWeight: isSettingsPage ? 500 : 400,
            textDecoration: "none",
            background: isSettingsPage ? "rgba(200,129,58,.08)" : "transparent",
            transition: "background .12s, color .12s",
          }}
          onMouseEnter={e => {
            if (!isSettingsPage) {
              (e.currentTarget as HTMLElement).style.background = "rgba(61,43,31,.04)";
              (e.currentTarget as HTMLElement).style.color = "#7A5C44";
            }
          }}
          onMouseLeave={e => {
            if (!isSettingsPage) {
              (e.currentTarget as HTMLElement).style.background = "transparent";
              (e.currentTarget as HTMLElement).style.color = "#9A8070";
            }
          }}
        >
          <IconSettings />
          {isFR ? "Paramètres" : "Settings"}
        </Link>
        <div style={{ padding: ".2rem .25rem" }}>
          <LanguageSwitcher />
        </div>
        <button
          onClick={handleLogout}
          style={{
            display: "flex", alignItems: "center", gap: ".625rem",
            background: "none", border: "none", cursor: "pointer",
            fontSize: ".8rem", color: "#9A8070", padding: ".45rem .5rem",
            fontFamily: "inherit", textAlign: "left", borderRadius: 8,
            transition: "background .12s, color .12s", width: "100%",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = "rgba(61,43,31,.04)";
            (e.currentTarget as HTMLElement).style.color = "#7A5C44";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = "transparent";
            (e.currentTarget as HTMLElement).style.color = "#9A8070";
          }}
        >
          <IconLogout />
          {isFR ? "Déconnexion" : "Sign out"}
        </button>
      </div>
    </aside>
  );

  // ── Mobile: FAB + bottom nav (5 items, no Settings) ──────────────────────

  const BottomNav = (
    <>
      {/* Floating Action Button — Suggestion */}
      <button
        onClick={() => setSuggestionOpen(true)}
        className="ep-fab"
        aria-label={isFR ? "Suggestion" : "Suggestion"}
        style={{
          position: "fixed",
          bottom: "calc(56px + env(safe-area-inset-bottom, 0px) + 12px)",
          left: "50%", transform: "translateX(-50%)",
          width: 50, height: 50, borderRadius: "50%",
          background: "#C8813A", color: "#FDFAF5", border: "none",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 20px rgba(200,129,58,.5)",
          zIndex: 50, cursor: "pointer",
          minHeight: "unset",
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </svg>
      </button>

      {/* Bottom nav */}
      <nav className="ep-bottom-nav" style={{
        position: "fixed", bottom: 0, left: 0, right: 0, height: 56,
        background: "#F7F2EA", borderTop: "0.5px solid rgba(61,43,31,.12)",
        zIndex: 40, display: "flex", alignItems: "stretch",
      }}>
        {mobileNavItems.map(item => (
          <Link
            key={item.label}
            href={item.href}
            style={{
              flex: 1, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: "2px",
              textDecoration: "none", minHeight: 44,
              color: item.active ? "#C8813A" : "#7A5C44",
            }}
          >
            <span style={{ opacity: item.active ? 1 : 0.6, lineHeight: 1 }}>{item.icon}</span>
            <span style={{ fontSize: ".575rem", fontWeight: item.active ? 600 : 400, letterSpacing: ".01em", lineHeight: 1 }}>
              {item.shortLabel}
            </span>
          </Link>
        ))}
      </nav>
    </>
  );

  return (
    <>
      {Sidebar}
      {BottomNav}
      {suggestionOpen && (
        <SuggestionModal isFR={isFR} onClose={() => setSuggestionOpen(false)} />
      )}
    </>
  );
}

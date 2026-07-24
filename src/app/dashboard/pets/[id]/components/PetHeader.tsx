"use client";

import Link from "next/link";
import { Pet } from "@/types";
import { translateMilestone, MilestoneDefinition } from "@/lib/milestones";
import { SPECIES_EMOJI } from "../constants";
import { Translations, MilestoneRow } from "./types";

export default function PetHeader({
  t, isFR, pet, petId, locale, dateLocale,
  kebabRef, showKebabMenu, setShowKebabMenu, showDeleteConfirm, setShowDeleteConfirm,
  onOpenMemorial, onDeletePet, deletingPet,
  milestones, totalMilestoneCount, milestoneDefinitions,
  bioExpanded, setBioExpanded,
}: {
  t: Translations;
  isFR: boolean;
  pet: Pet;
  petId: string;
  locale: string;
  dateLocale: string;
  kebabRef: React.RefObject<HTMLDivElement>;
  showKebabMenu: boolean;
  setShowKebabMenu: React.Dispatch<React.SetStateAction<boolean>>;
  showDeleteConfirm: boolean;
  setShowDeleteConfirm: React.Dispatch<React.SetStateAction<boolean>>;
  onOpenMemorial: () => void;
  onDeletePet: () => void;
  deletingPet: boolean;
  milestones: MilestoneRow[];
  totalMilestoneCount: number;
  milestoneDefinitions: MilestoneDefinition[];
  bioExpanded: boolean;
  setBioExpanded: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  return (
    <>
      {/* Page header row: pet name + share button */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(1.25rem, 3vw, 1.75rem)", fontWeight: 600, color: "var(--ep-text)", margin: 0 }}>
          {pet?.name ?? ""}
        </h1>
        <button
          onClick={() => {
            navigator.clipboard.writeText(`${window.location.origin}/pets/${petId}?lang=${locale}`);
            alert(t.pet.link_copied);
          }}
          style={{ display: "inline-flex", alignItems: "center", gap: ".35rem", padding: ".4rem .875rem", borderRadius: 100, border: "1.5px solid rgba(61,43,31,.2)", background: "transparent", color: "var(--ep-text-muted)", fontSize: ".8rem", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", flexShrink: 0, transition: "border-color .12s, color .12s" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--ep-brand)"; (e.currentTarget as HTMLElement).style.color = "var(--ep-brand)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(61,43,31,.2)"; (e.currentTarget as HTMLElement).style.color = "var(--ep-text-muted)"; }}
        >
          {t.nav.share_profile}
        </button>
      </div>

      {/* Pet header */}
      <div style={{ background: "var(--ep-bg-card)", borderRadius: 20, padding: "1.25rem 1.5rem", marginBottom: "1.5rem", border: "1px solid rgba(61,43,31,.08)", position: "relative" }}>

        {/* Kebab, absolute top-right */}
        <div ref={kebabRef} style={{ position: "absolute", top: "1rem", right: "1rem", zIndex: 10 }}>
          <button
            onClick={() => { setShowKebabMenu(v => !v); setShowDeleteConfirm(false); }}
            style={{ width: 36, height: 36, borderRadius: "50%", border: "1px solid rgba(61,43,31,.12)", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", color: "var(--ep-text-muted)", fontFamily: "inherit", minHeight: "unset", flexShrink: 0 }}
            aria-label="Options"
          >
            ···
          </button>
          {showKebabMenu && (
            <div style={{ position: "absolute", top: "calc(100% + .5rem)", right: 0, background: "var(--ep-bg-card)", border: "1px solid rgba(61,43,31,.1)", borderRadius: 14, boxShadow: "0 8px 30px rgba(61,43,31,.12)", minWidth: 200, overflow: "hidden", zIndex: 60 }}>
              {!showDeleteConfirm ? (
                <>
                  <Link href={`/dashboard/pets/${petId}/edit`} style={{ display: "block", padding: ".75rem 1rem", fontSize: ".875rem", color: "var(--ep-text)", textDecoration: "none", fontFamily: "inherit" }} onClick={() => setShowKebabMenu(false)}>
                    {t.pet.edit_profile}
                  </Link>
                  <button onClick={() => { setShowKebabMenu(false); onOpenMemorial(); }} style={{ display: "block", width: "100%", padding: ".75rem 1rem", fontSize: ".875rem", color: "var(--ep-memorial)", background: "none", border: "none", borderTop: "1px solid rgba(61,43,31,.06)", textAlign: "left", cursor: "pointer", fontFamily: "inherit" }}>
                    {pet.deceased_at ? (isFR ? "Modifier le mémorial" : "Edit memorial") : t.memorial.mark_passed}
                  </button>
                  <button onClick={() => setShowDeleteConfirm(true)} style={{ display: "block", width: "100%", padding: ".75rem 1rem", fontSize: ".875rem", color: "var(--ep-alert)", background: "none", border: "none", borderTop: "1px solid rgba(61,43,31,.06)", textAlign: "left", cursor: "pointer", fontFamily: "inherit" }}>
                    {t.pet.delete_pet}
                  </button>
                </>
              ) : (
                <div style={{ padding: "1rem" }}>
                  <p style={{ fontSize: ".8rem", color: "var(--ep-text)", margin: "0 0 .875rem", lineHeight: 1.5 }}>{t.pet.delete_confirm.replace("{name}", pet.name)}</p>
                  <div style={{ display: "flex", gap: ".5rem" }}>
                    <button onClick={() => setShowDeleteConfirm(false)} style={{ flex: 1, padding: ".5rem", borderRadius: 100, border: "1px solid rgba(61,43,31,.15)", background: "transparent", fontSize: ".8rem", color: "var(--ep-text-muted)", cursor: "pointer", fontFamily: "inherit" }}>{t.pet.delete_cancel}</button>
                    <button onClick={onDeletePet} disabled={deletingPet} style={{ flex: 1, padding: ".5rem", borderRadius: 100, border: "none", background: "var(--ep-alert)", color: "#fff", fontSize: ".8rem", fontWeight: 500, cursor: "pointer", fontFamily: "inherit", opacity: deletingPet ? .6 : 1 }}>{t.pet.delete_yes}</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Top row: photo + name + breed */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", paddingRight: "2.5rem" }}>
          <div style={{ width: 72, height: 72, borderRadius: 18, background: "rgba(200,129,58,.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2.2rem", flexShrink: 0, overflow: "hidden" }}>
            {pet.photo_url
              ? <img src={pet.photo_url} alt={pet.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : SPECIES_EMOJI[pet.species]}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: ".5rem", flexWrap: "wrap" }}>
              <h1 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(1.7rem, 4vw, 2.2rem)", fontWeight: 600, letterSpacing: "-.01em", color: "var(--ep-text)", margin: 0 }}>{pet.name}</h1>
              {pet.deceased_at && (
                <span style={{ fontSize: ".7rem", background: "rgba(139,107,74,.12)", color: "var(--ep-memorial)", border: "1px solid rgba(139,107,74,.25)", borderRadius: 100, padding: ".2rem .6rem", fontWeight: 500, letterSpacing: ".04em", whiteSpace: "nowrap" }}>
                  🕊️ {t.memorial.badge}
                </span>
              )}
            </div>
            <p style={{ fontSize: ".82rem", color: "var(--ep-text-muted)", fontWeight: 300, margin: ".2rem 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {pet.breed || pet.species}{pet.birthdate ? ` · ${t.pet.born} ${new Date(pet.birthdate).toLocaleDateString(dateLocale, { month: "long", year: "numeric" })}` : ""}
            </p>
          </div>
        </div>

        {/* Milestone badge, inline pill below name */}
        {milestones.length > 0 && (
          <div style={{ display: "inline-flex", alignItems: "center", gap: ".5rem", marginTop: ".875rem", background: "rgba(200,129,58,.1)", borderRadius: 100, padding: ".35rem .875rem" }}>
            <span style={{ fontFamily: "Georgia, serif", fontSize: ".95rem", fontWeight: 600, color: "var(--ep-brand)" }}>{milestones.length} / {totalMilestoneCount}</span>
            <span style={{ fontSize: ".7rem", color: "var(--ep-text-muted)" }}>{t.milestones.label}</span>
            {milestones[0] && (() => {
              const localTitle = translateMilestone(milestones[0].type, isFR, milestoneDefinitions, milestones[0].title);
              return <span style={{ fontSize: ".7rem", color: "var(--ep-brand)", opacity: .85 }}>· 🏆 {localTitle.slice(0, 20)}{localTitle.length > 20 ? "…" : ""}</span>;
            })()}
          </div>
        )}

        {/* Bio, full width */}
        {pet.bio && (
          <div style={{ marginTop: ".875rem" }}>
            <p style={{
              fontSize: ".85rem", color: "var(--ep-text-muted)", fontStyle: "italic", margin: 0, lineHeight: 1.55,
              ...(bioExpanded ? {} : { overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" as const }),
            }}>{pet.bio}</p>
            {pet.bio.length > 120 && (
              <button onClick={() => setBioExpanded(v => !v)} style={{ background: "none", border: "none", padding: ".25rem 0 0", cursor: "pointer", fontSize: ".75rem", color: "var(--ep-brand)", fontFamily: "inherit", display: "block" }}>
                {bioExpanded ? (isFR ? "Voir moins" : "See less") : (isFR ? "Voir plus" : "See more")}
              </button>
            )}
          </div>
        )}

        {/* Memorial links, full width */}
        {pet.deceased_at && (
          <div style={{ display: "flex", gap: ".75rem", marginTop: ".875rem", flexWrap: "wrap" }}>
            <Link href={`/memorial/${petId}`} style={{ fontSize: ".8rem", color: "var(--ep-memorial)", textDecoration: "none", border: "1px solid rgba(139,107,74,.25)", borderRadius: 100, padding: ".375rem .875rem" }}>
              {t.memorial.view_memorial}
            </Link>
            <button
              onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/memorial/${petId}?lang=${locale}`); alert(t.pet.link_copied); }}
              style={{ fontSize: ".8rem", color: "var(--ep-memorial)", background: "none", border: "1px solid rgba(139,107,74,.25)", borderRadius: 100, padding: ".375rem .875rem", cursor: "pointer", fontFamily: "inherit" }}
            >
              {t.memorial.share_memorial}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

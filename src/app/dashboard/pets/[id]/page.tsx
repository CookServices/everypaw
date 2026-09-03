"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Pet, Entry, Story } from "@/types";
import { detectMilestones, MILESTONE_TYPES, translateMilestone, MilestoneDefinition } from "@/lib/milestones";
import { useLocale } from "@/hooks/useLocale";
import { evaluateFirstStoryNudge } from "@/lib/story";
import type { Plan } from "@/lib/plan";
import { compressImage } from "@/lib/image";
import { useEntryComposer } from "./useEntryComposer";
import MemorialModal from "./components/MemorialModal";
import UpsellModal from "./components/UpsellModal";
import ShareCardModal from "./components/ShareCardModal";
import DeleteEntryModal from "./components/DeleteEntryModal";
import EditEntryModal from "./components/EditEntryModal";
import GenerateStoryModal from "./components/GenerateStoryModal";
import Lightbox from "./components/Lightbox";
import PetHeader from "./components/PetHeader";
import TabBar from "./components/TabBar";
import JournalTab from "./components/JournalTab";
import StoriesTab from "./components/StoriesTab";
import MilestonesTab from "./components/MilestonesTab";
import TributesTab from "./components/TributesTab";
import MembersTab from "./components/MembersTab";
import CoachMarks from "./components/CoachMarks";

export default function PetPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { t, locale } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTab = searchParams.get("tab");
  const tab: "journal" | "stories" | "milestones" | "tributes" | "members" =
    rawTab === "stories" ? "stories" : rawTab === "milestones" ? "milestones" : rawTab === "tributes" ? "tributes" : rawTab === "members" ? "members" : "journal";
  const dateLocale = locale === "fr" ? "fr-FR" : "en-US";

  const [pet, setPet] = useState<Pet | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [allEntryDates, setAllEntryDates] = useState<string[]>([]);
  const [entriesPage, setEntriesPage] = useState(0);
  const [hasMoreEntries, setHasMoreEntries] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [stories, setStories] = useState<Story[]>([]);
  const [milestones, setMilestones] = useState<{ id: string; type: string; title: string; achieved_at: string }[]>([]);
  const composer = useEntryComposer(id);
  const [filterYear, setFilterYear] = useState<string | null>(null);
  const [filterMonth, setFilterMonth] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatingMsgIdx, setGeneratingMsgIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [newMilestone, setNewMilestone] = useState<{ type: string; title: string } | null>(null);
  const [milestoneDefinitions, setMilestoneDefinitions] = useState<MilestoneDefinition[]>([]);
  const [showMemorialModal, setShowMemorialModal] = useState(false);
  const [deceasedAt, setDeceasedAt] = useState("");
  const [memorialMessage, setMemorialMessage] = useState("");
  const [memorialPhotoUrl, setMemorialPhotoUrl] = useState<string | null>(null);
  const [memorialPhotoFile, setMemorialPhotoFile] = useState<File | null>(null);
  const [memorialPhotoPreview, setMemorialPhotoPreview] = useState<string | null>(null);
  const [showMemorialPhotoGrid, setShowMemorialPhotoGrid] = useState(false);
  const [savingMemorial, setSavingMemorial] = useState(false);
  const [showKebabMenu, setShowKebabMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingPet, setDeletingPet] = useState(false);
  const [bioExpanded, setBioExpanded] = useState(false);
  const [sharingStoryId, setSharingStoryId] = useState<string | null>(null);
  const [shareLinkCopied, setShareLinkCopied] = useState(false);
  const [shareCardStory, setShareCardStory] = useState<Story | null>(null);
  const [shareCardFormat, setShareCardFormat] = useState<"square" | "story">("square");
  const [shareCardLoading, setShareCardLoading] = useState(false);
  const [shareCardError, setShareCardError] = useState(false);
  const [shareCardBlob, setShareCardBlob] = useState<Blob | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [userPlan, setUserPlan] = useState<string>("free");
  const [bookCredits, setBookCredits] = useState(0);
  const [userTotalStoryCount, setUserTotalStoryCount] = useState(0);
  const [pendingTributes, setPendingTributes] = useState<{ id: string; author_name: string; message: string; created_at: string }[]>([]);
  const [tributesLoaded, setTributesLoaded] = useState(false);
  const [tributesError, setTributesError] = useState(false);
  const [showUpsellModal, setShowUpsellModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editMood, setEditMood] = useState<string | null>(null);
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [members, setMembers] = useState<{ id: string; invited_email: string; status: string; display_name: string; accepted_at: string | null; created_at: string }[]>([]);
  const [membersLoaded, setMembersLoaded] = useState(false);
  const [membersError, setMembersError] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ success?: boolean; resent?: boolean; error?: string } | null>(null);
  const [revokeConfirmId, setRevokeConfirmId] = useState<string | null>(null);
  const [memberProfiles, setMemberProfiles] = useState<Record<string, string>>({});
  const [editPhotos, setEditPhotos] = useState<string[]>([]);
  const [editPendingPhotos, setEditPendingPhotos] = useState<{ file: File; preview: string }[]>([]);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [storyStyle, setStoryStyle] = useState<string | null>(null);
  const [genPeriodStart, setGenPeriodStart] = useState("");
  const [genPeriodEnd, setGenPeriodEnd] = useState("");
  const [showEditEmojiPicker, setShowEditEmojiPicker] = useState(false);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const memorialPhotoInputRef = useRef<HTMLInputElement>(null);
  const kebabRef = useRef<HTMLDivElement>(null);
  const editEmojiPickerRef = useRef<HTMLDivElement>(null);

  // The composer's emoji picker and the per-entry menu close themselves, in
  // useEntryComposer and JournalTab respectively.
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (kebabRef.current && !kebabRef.current.contains(e.target as Node)) {
        setShowKebabMenu(false);
        setShowDeleteConfirm(false);
      }
      if (editEmojiPickerRef.current && !editEmojiPickerRef.current.contains(e.target as Node)) {
        setShowEditEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!generating) { setGeneratingMsgIdx(0); return; }
    const interval = setInterval(() => setGeneratingMsgIdx(i => (i + 1) % 3), 3000);
    return () => clearInterval(interval);
  }, [generating]);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const [{ data: { user } }, { data: petData }, { data: entriesData, count: entriesCount }, { data: datesData }, { data: storiesData }, { data: milestonesData }, { data: profile }, { data: definitionsData }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from("pets").select("*").eq("id", id).single(),
        supabase.from("entries").select("*", { count: "exact" }).eq("pet_id", id).order("entry_date", { ascending: false }).range(0, 19),
        supabase.from("entries").select("entry_date").eq("pet_id", id),
        supabase.from("stories").select("*").eq("pet_id", id).order("created_at", { ascending: false }),
        supabase.from("milestones").select("*").eq("pet_id", id).order("achieved_at", { ascending: false }),
        supabase.from("profiles").select("is_premium, plan, book_credits").single(),
        supabase.from("milestone_definitions").select("*").order("order_index"),
      ]);
      const uid = user?.id ?? null;
      setCurrentUserId(uid);
      setPet(petData);
      setEntries(entriesData || []);
      setAllEntryDates((datesData || []).map((e: { entry_date: string }) => e.entry_date));
      setHasMoreEntries((entriesCount ?? 0) > 20);
      setStories(storiesData || []);
      setMilestones(milestonesData || []);
      setIsPremium(profile?.is_premium ?? false);
      setUserPlan(profile?.plan ?? "free");
      setBookCredits(profile?.book_credits ?? 0);
      if (definitionsData?.length) setMilestoneDefinitions(definitionsData);

      // Fetch display names for contributor entries (entries by others)
      if (uid && entriesData) {
        const seen = new Set<string>();
        const contributorIds: string[] = [];
        for (const e of entriesData as { user_id: string }[]) {
          if (e.user_id !== uid && !seen.has(e.user_id)) {
            seen.add(e.user_id);
            contributorIds.push(e.user_id);
          }
        }
        if (contributorIds.length > 0) {
          const { data: contribProfiles } = await supabase
            .from("profiles")
            .select("id, full_name, email")
            .in("id", contributorIds);
          if (contribProfiles) {
            const map: Record<string, string> = {};
            for (const p of contribProfiles) {
              map[p.id] = p.full_name || p.email || "Member";
            }
            setMemberProfiles(map);
          }
        }

        // Total story count across all pets, excluding origins/birthday, mirrors
        // the /api/generate plan gate (canGenerateStory) for the first-story nudge.
        const { count: totalStoryCount } = await supabase
          .from("stories")
          .select("*", { count: "exact", head: true })
          .eq("user_id", uid)
          .not("story_type", "in", "(origins,birthday)");
        setUserTotalStoryCount(totalStoryCount ?? 0);
      }

      setLoading(false);
    };
    load();
  }, [id]);

  // Auto-open memorial modal when coming from the memorial page edit link (?openMemorial=1)
  useEffect(() => {
    if (pet && searchParams.get("openMemorial") === "1") {
      openMemorialModal();
    }
  }, [pet, searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load household members when members tab is active
  useEffect(() => {
    if (tab !== "members" || membersLoaded || !pet) return;
    const load = async () => {
      // A failed load must not fall through to the empty state: that reads as
      // "no members" and hides the real error.
      try {
        const res = await fetch(`/api/pet-members?petId=${id}`);
        if (!res.ok) {
          setMembersError(true);
        } else {
          const data = await res.json();
          setMembers(data.members ?? []);
          setMembersError(false);
        }
      } catch {
        setMembersError(true);
      }
      setMembersLoaded(true);
    };
    load();
  }, [tab, membersLoaded, pet, id]);

  // Load pending tributes when tributes tab is active
  useEffect(() => {
    if (tab !== "tributes" || tributesLoaded || !pet?.deceased_at) return;
    const load = async () => {
      // Same as members: never let a failure look like "no pending tributes".
      try {
        const res = await fetch(`/api/memorial/tributes?petId=${id}&status=pending`);
        if (!res.ok) {
          setTributesError(true);
        } else {
          const data = await res.json();
          setPendingTributes(data.tributes ?? []);
          setTributesError(false);
        }
      } catch {
        setTributesError(true);
      }
      setTributesLoaded(true);
    };
    load();
  }, [tab, tributesLoaded, pet, id]);

  const addEntry = async () => {
    if (composer.isEmpty) {
      composer.setError(true);
      return;
    }
    setSaving(true);
    setUploadingPhotos(composer.photos.length > 0);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    let photoUrls: string[] = [];
    if (composer.photos.length > 0) photoUrls = await composer.uploadPhotos(user!.id);

    const { data, error: insertErr } = await supabase.from("entries").insert({
      pet_id: id, user_id: user!.id,
      content: composer.text.trim() || " ", mood: composer.mood, photo_urls: photoUrls,
      entry_date: composer.date,
    }).select().single();

    // Free-plan cap enforced by DB trigger (enforce_free_entry_limit): show upsell.
    if (insertErr?.message?.includes("entry_limit")) {
      setSaving(false);
      setUploadingPhotos(false);
      setShowUpsellModal(true);
      return;
    }

    if (data) {
      const newEntries = [data, ...entries];
      setEntries(newEntries);

      if (!isPremium && newEntries.length >= 10) {
        const UPSELL_KEY = "ep_upsell_shown";
        const lastShown = localStorage.getItem(UPSELL_KEY);
        const sevenDays = 7 * 24 * 60 * 60 * 1000;
        if (!lastShown || Date.now() - Number(lastShown) > sevenDays) {
          setShowUpsellModal(true);
          localStorage.setItem(UPSELL_KEY, String(Date.now()));
        }
      }

      const existingMilestoneTypes = milestones.map(m => m.type);
      const detected = detectMilestones({ content: composer.text }, entries, existingMilestoneTypes, milestoneDefinitions);

      for (const milestone of detected) {
        const { data: savedMilestone } = await supabase.from("milestones").insert({
          pet_id: id, user_id: user!.id,
          type: milestone.type, title: milestone.title,
          entry_id: data.id,
        }).select().single();
        if (savedMilestone) {
          setMilestones(prev => [savedMilestone, ...prev]);
          setNewMilestone(milestone);
          setTimeout(() => setNewMilestone(null), 4000);
        }
      }
    }

    composer.reset();
    setUploadingPhotos(false);
    setSaving(false);
  };

  const generateStory = async () => {
    setShowGenerateModal(false);
    const today = new Date().toISOString().split("T")[0];
    const supabase = createClient();
    let q = supabase.from("entries").select("*").eq("pet_id", id).order("entry_date", { ascending: false });
    if (genPeriodStart) q = q.gte("entry_date", genPeriodStart);
    if (genPeriodEnd) q = q.lte("entry_date", genPeriodEnd);
    const { data: fetchedEntries } = await q;
    let filteredEntries = fetchedEntries || [];
    if (filteredEntries.length < 3) { alert(t.journal.min_entries_alert); return; }
    const lastEntryDate = filteredEntries[0]?.entry_date ?? today;
    const effectivePeriodEnd = genPeriodEnd
      ? [genPeriodEnd, lastEntryDate, today].sort().at(0)!
      : lastEntryDate;
    const style = storyStyle ?? "classic";
    const finalPeriodStart = (genPeriodStart || filteredEntries[filteredEntries.length - 1]?.entry_date || "").slice(0, 10);
    const finalPeriodEnd = effectivePeriodEnd.slice(0, 10);
    setGenerating(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          petId: id, petName: pet?.name, species: pet?.species, bio: pet?.bio,
          entries: filteredEntries.slice(0, 20), style,
          periodStart: finalPeriodStart, periodEnd: finalPeriodEnd,
        }),
      });
      const data = await res.json();
      if (data.story && data.id) {
        const supabase = createClient();
        const { data: saved } = await supabase.from("stories").select("*").eq("id", data.id).single();
        if (saved) setStories([saved, ...stories]);
        router.push(`/dashboard/pets/${id}?tab=stories`);
      } else if (data.story) {
        router.push(`/dashboard/pets/${id}?tab=stories`);
      } else {
        alert(t.journal.generation_failed);
      }
    } catch { alert(t.journal.generation_failed); }
    setGenerating(false);
  };

  const handleShare = async (story: Story) => {
    if (!pet) return;
    setSharingStoryId(story.id);
    try {
      const url = `${window.location.origin}/pets/${id}?lang=${locale}#story-${story.id}`;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const ta = document.createElement("textarea");
        ta.value = url;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setShareLinkCopied(true);
      setTimeout(() => setShareLinkCopied(false), 3000);
    } catch {
      alert(t.stories.share_error);
    }
    setSharingStoryId(null);
  };

  const openShareCard = (story: Story) => {
    setShareCardStory(story);
    setShareCardFormat("square");
    setShareCardError(false);
  };

  // Prefetch the card image into a blob so the share/download triggers
  // synchronously on click, awaiting a fetch first would drop the transient
  // user activation that navigator.share() requires (silent failure on mobile).
  useEffect(() => {
    if (!shareCardStory) { setShareCardBlob(null); return; }
    let cancelled = false;
    setShareCardBlob(null);
    setShareCardLoading(true);
    setShareCardError(false);
    (async () => {
      try {
        const res = await fetch(`/api/share-card?story_id=${shareCardStory.id}&format=${shareCardFormat}`);
        if (!res.ok) throw new Error("failed");
        const blob = await res.blob();
        if (!cancelled) setShareCardBlob(blob);
      } catch {
        if (!cancelled) setShareCardError(true);
      } finally {
        if (!cancelled) setShareCardLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [shareCardStory, shareCardFormat]);

  const downloadShareCard = () => {
    if (!shareCardStory || !shareCardBlob) return;
    setShareCardError(false);
    const filename = `everypaw-${shareCardFormat}.png`;
    const file = new File([shareCardBlob], filename, { type: "image/png" });
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      // Fire synchronously to keep the user activation; ignore user-cancel.
      navigator.share({ files: [file] }).catch(() => {});
    } else {
      const a = document.createElement("a");
      const objectUrl = URL.createObjectURL(shareCardBlob);
      a.href = objectUrl;
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    }
  };

  const deletePet = async () => {
    setDeletingPet(true);
    const supabase = createClient();
    await supabase.from("entries").delete().eq("pet_id", id);
    await supabase.from("stories").delete().eq("pet_id", id);
    await supabase.from("milestones").delete().eq("pet_id", id);
    await supabase.from("pets").delete().eq("id", id);
    window.location.href = "/dashboard";
  };

  const updateEntry = async () => {
    if (!editingEntry) return;
    setSavingEdit(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    let finalPhotoUrls = [...editPhotos];
    for (const { file } of editPendingPhotos) {
      const compressed = await compressImage(file);
      const filename = `${user!.id}/${id}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
      const { error } = await supabase.storage.from("pet-photos").upload(filename, compressed, { contentType: "image/jpeg" });
      if (!error) {
        const { data: urlData } = supabase.storage.from("pet-photos").getPublicUrl(filename);
        finalPhotoUrls.push(urlData.publicUrl);
      }
    }
    const { data } = await supabase.from("entries")
      .update({ content: editContent.trim() || " ", mood: editMood, photo_urls: finalPhotoUrls })
      .eq("id", editingEntry.id)
      .select().single();
    if (data) setEntries(prev => prev.map(e => e.id === data.id ? data : e));
    setEditingEntry(null);
    setEditPendingPhotos([]);
    setSavingEdit(false);
  };

  const deleteEntry = async (entryId: string) => {
    const supabase = createClient();
    await supabase.from("entries").delete().eq("id", entryId);
    setEntries(prev => prev.filter(e => e.id !== entryId));
    setDeletingEntryId(null);
  };

  const openMemorialModal = () => {
    // Pre-populate if editing an already-deceased pet
    setDeceasedAt(pet?.deceased_at ? pet.deceased_at.slice(0, 10) : "");
    setMemorialMessage(pet?.memorial_message ?? "");
    setMemorialPhotoUrl(pet?.memorial_photo_url ?? null);
    setMemorialPhotoFile(null);
    if (memorialPhotoPreview) URL.revokeObjectURL(memorialPhotoPreview);
    setMemorialPhotoPreview(null);
    setShowMemorialPhotoGrid(false);
    setShowMemorialModal(true);
  };

  const saveMemorial = async () => {
    if (!deceasedAt) return;
    setSavingMemorial(true);
    const supabase = createClient();

    // Upload new file if provided
    let finalPhotoUrl: string | null = memorialPhotoUrl;
    if (memorialPhotoFile) {
      const { data: { user } } = await supabase.auth.getUser();
      const compressed = await compressImage(memorialPhotoFile);
      const filename = `${user!.id}/${id}/memorial-${Date.now()}.jpg`;
      const { error } = await supabase.storage.from("pet-photos").upload(filename, compressed, { contentType: "image/jpeg" });
      if (!error) {
        const { data: urlData } = supabase.storage.from("pet-photos").getPublicUrl(filename);
        finalPhotoUrl = urlData.publicUrl;
      }
    }

    const { data } = await supabase
      .from("pets")
      .update({ deceased_at: deceasedAt, memorial_message: memorialMessage || null, memorial_photo_url: finalPhotoUrl })
      .eq("id", id)
      .select()
      .single();
    if (data) setPet(data);

    // Cleanup preview blob URL
    if (memorialPhotoPreview) URL.revokeObjectURL(memorialPhotoPreview);
    setMemorialPhotoFile(null);
    setMemorialPhotoPreview(null);
    setSavingMemorial(false);
    setShowMemorialModal(false);
  };


  if (loading) return (
    <div style={{ minHeight: "100dvh", background: "var(--ep-bg)", padding: "2rem 1.5rem", maxWidth: 900, margin: "0 auto" }}>
      {/* Pet header skeleton */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem" }}>
        <div className="ep-skeleton" style={{ width: 56, height: 56, borderRadius: "50%" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: ".5rem" }}>
          <div className="ep-skeleton" style={{ width: 140, height: 22 }} />
          <div className="ep-skeleton" style={{ width: 90, height: 14 }} />
        </div>
      </div>
      {/* Tabs skeleton */}
      <div style={{ display: "flex", gap: ".5rem", marginBottom: "1.5rem" }}>
        {[80, 100, 90].map(w => <div key={w} className="ep-skeleton" style={{ width: w, height: 32, borderRadius: 100 }} />)}
      </div>
      {/* Entry cards skeleton */}
      <div style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}>
        {[1, 2, 3, 4].map(i => <div key={i} className="ep-skeleton" style={{ height: 72, borderRadius: 14 }} />)}
      </div>
    </div>
  );
  if (!pet) return (
    <div className="ep-page-centered" style={{ flexDirection: "column", gap: "1.25rem", textAlign: "center" }}>
      <p style={{ color: "var(--ep-text-muted)", fontSize: "1rem" }}>{t.pet.not_found}</p>
      <a
        href="https://everypaw.app/dashboard/pets/new"
        style={{
          display: "inline-block",
          padding: ".65rem 1.5rem",
          background: "var(--ep-brand)",
          color: "#fff",
          borderRadius: "var(--ep-radius-pill, 100px)",
          fontWeight: 600,
          fontSize: ".95rem",
          textDecoration: "none",
        }}
      >
        {t.pet.create_profile_cta}
      </a>
    </div>
  );

  const loadMoreEntries = async () => {
    setLoadingMore(true);
    const supabase = createClient();
    const nextPage = entriesPage + 1;
    const { data } = await supabase.from("entries").select("*").eq("pet_id", id).order("entry_date", { ascending: false }).range(nextPage * 20, nextPage * 20 + 19);
    if (data) {
      setEntries(prev => [...prev, ...data]);
      setHasMoreEntries(data.length === 20);
      setEntriesPage(nextPage);
    }
    setLoadingMore(false);
  };

  const isFR = locale === "fr";

  // Total milestone count = defined (from DB or fallback) + orphans not in definitions
  const definedMilestoneKeys = new Set(milestoneDefinitions.map(d => d.key));
  const orphanMilestoneCount = milestones.filter(m => !definedMilestoneKeys.has(m.type)).length;
  const totalMilestoneCount = (milestoneDefinitions.length || MILESTONE_TYPES.length) + orphanMilestoneCount;

  const isOwner = !!pet && !!currentUserId && pet.user_id === currentUserId;
  const showFirstStoryNudge = !!pet && evaluateFirstStoryNudge({
    deceasedAt: pet.deceased_at,
    plan: userPlan as Plan,
    totalStories: userTotalStoryCount,
    entryCount: allEntryDates.length,
    existingStoryCount: stories.length,
  });
  const tabs: { key: "journal" | "stories" | "milestones" | "tributes" | "members"; label: string }[] = [
    { key: "journal", label: t.pet.tab_journal },
    { key: "stories", label: t.pet.tab_stories },
    { key: "milestones", label: t.pet.tab_milestones },
    ...(pet?.deceased_at ? [{ key: "tributes" as const, label: isFR ? "Hommages" : "Tributes" }] : []),
    ...(isOwner ? [{ key: "members" as const, label: t.members.tab }] : []),
  ];

  return (
    <div style={{ minHeight: "100vh", background: "var(--ep-bg)", fontFamily: "'DM Sans', sans-serif" }}>

      {/* Milestone notification */}
      {newMilestone && (
        <div className="ep-toast" style={{ background: "var(--ep-text)", color: "var(--ep-bg-card)", padding: "1rem 1.5rem", borderRadius: 100, fontSize: ".9rem", fontWeight: 500, zIndex: 200, boxShadow: "0 8px 30px rgba(0,0,0,.2)", display: "flex", alignItems: "center", gap: ".75rem", whiteSpace: "nowrap" }}>
          🏆 {t.milestones.new_notification.replace("{title}", translateMilestone(newMilestone.type, isFR, milestoneDefinitions))}
        </div>
      )}

      {/* Share link copied notification */}
      {shareLinkCopied && (
        <div className="ep-toast" style={{ background: "#2E5E1E", color: "var(--ep-bg-card)", padding: "1rem 1.5rem", borderRadius: 100, fontSize: ".9rem", fontWeight: 500, zIndex: 200, boxShadow: "0 8px 30px rgba(0,0,0,.2)", display: "flex", alignItems: "center", gap: ".75rem", whiteSpace: "nowrap" }}>
          🔗 {isFR ? "Lien copié !" : "Link copied!"}
        </div>
      )}

      {/* Memorial modal */}
      {showMemorialModal && (
        <MemorialModal
          t={t} isFR={isFR} petName={pet.name} entries={entries}
          deceasedAt={deceasedAt} setDeceasedAt={setDeceasedAt}
          memorialMessage={memorialMessage} setMemorialMessage={setMemorialMessage}
          memorialPhotoUrl={memorialPhotoUrl} setMemorialPhotoUrl={setMemorialPhotoUrl}
          setMemorialPhotoFile={setMemorialPhotoFile}
          memorialPhotoPreview={memorialPhotoPreview} setMemorialPhotoPreview={setMemorialPhotoPreview}
          showMemorialPhotoGrid={showMemorialPhotoGrid} setShowMemorialPhotoGrid={setShowMemorialPhotoGrid}
          memorialPhotoInputRef={memorialPhotoInputRef} savingMemorial={savingMemorial}
          onSave={saveMemorial} onClose={() => setShowMemorialModal(false)}
        />
      )}

      {/* Upsell modal */}
      {showUpsellModal && (
        <UpsellModal t={t} petName={pet?.name ?? ""} onClose={() => setShowUpsellModal(false)} />
      )}

      {/* Share card modal */}
      {shareCardStory && (
        <ShareCardModal
          t={t} story={shareCardStory}
          format={shareCardFormat} setFormat={setShareCardFormat}
          error={shareCardError} setError={setShareCardError}
          loading={shareCardLoading} blob={shareCardBlob}
          onDownload={downloadShareCard} onClose={() => setShareCardStory(null)}
        />
      )}

      {/* Delete entry confirmation modal */}
      {deletingEntryId && (
        <DeleteEntryModal isFR={isFR} onCancel={() => setDeletingEntryId(null)} onConfirm={() => deleteEntry(deletingEntryId)} />
      )}

      {/* Edit entry modal */}
      {editingEntry && (
        <EditEntryModal
          isFR={isFR}
          editContent={editContent} setEditContent={setEditContent}
          editMood={editMood} setEditMood={setEditMood}
          showEditEmojiPicker={showEditEmojiPicker} setShowEditEmojiPicker={setShowEditEmojiPicker}
          editEmojiPickerRef={editEmojiPickerRef}
          editPhotos={editPhotos} setEditPhotos={setEditPhotos}
          editPendingPhotos={editPendingPhotos} setEditPendingPhotos={setEditPendingPhotos}
          editFileInputRef={editFileInputRef}
          savingEdit={savingEdit} onSave={updateEntry} onClose={() => setEditingEntry(null)}
        />
      )}

      {/* Generate story modal */}
      {showGenerateModal && (
        <GenerateStoryModal
          isFR={isFR} entries={entries}
          storyStyle={storyStyle} setStoryStyle={setStoryStyle}
          genPeriodStart={genPeriodStart} setGenPeriodStart={setGenPeriodStart}
          genPeriodEnd={genPeriodEnd} setGenPeriodEnd={setGenPeriodEnd}
          onGenerate={generateStory} onClose={() => setShowGenerateModal(false)}
        />
      )}

      {/* Lightbox */}
      {lightboxUrl && (
        <Lightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />
      )}

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "2rem 1.5rem" }}>

        <PetHeader
          t={t} isFR={isFR} pet={pet} petId={id} locale={locale} dateLocale={dateLocale}
          kebabRef={kebabRef}
          showKebabMenu={showKebabMenu} setShowKebabMenu={setShowKebabMenu}
          showDeleteConfirm={showDeleteConfirm} setShowDeleteConfirm={setShowDeleteConfirm}
          onOpenMemorial={openMemorialModal} onDeletePet={deletePet} deletingPet={deletingPet}
          milestones={milestones} totalMilestoneCount={totalMilestoneCount} milestoneDefinitions={milestoneDefinitions}
          bioExpanded={bioExpanded} setBioExpanded={setBioExpanded}
        />

        <TabBar tabs={tabs} activeTab={tab} petId={id} />

        {tab === "journal" && (
          <JournalTab
            t={t} isFR={isFR} locale={locale} dateLocale={dateLocale} pet={pet}
            entries={entries} allEntryDates={allEntryDates} stories={stories} userPlan={userPlan}
            currentUserId={currentUserId} memberProfiles={memberProfiles}
            composer={composer} saving={saving} uploadingPhotos={uploadingPhotos} onAddEntry={addEntry}
            generating={generating} generatingMsgIdx={generatingMsgIdx}
            onOpenGenerateModal={() => { setStoryStyle(null); setGenPeriodStart(""); setGenPeriodEnd(""); setShowGenerateModal(true); }}
            filterYear={filterYear} setFilterYear={setFilterYear}
            filterMonth={filterMonth} setFilterMonth={setFilterMonth}
            deletingEntryId={deletingEntryId} setDeletingEntryId={setDeletingEntryId}
            onEditEntry={entry => {
              setEditingEntry(entry);
              setEditContent(entry.content.trim());
              setEditMood(entry.mood ?? null);
              setEditPhotos(entry.photo_urls ?? []);
              setEditPendingPhotos([]);
            }}
            onOpenLightbox={setLightboxUrl}
          />
        )}

        {tab === "stories" && (
          <StoriesTab
            t={t} isFR={isFR} dateLocale={dateLocale} pet={pet} petName={pet.name}
            stories={stories} entries={entries} allEntryDates={allEntryDates}
            showFirstStoryNudge={showFirstStoryNudge}
            onOpenGenerateModal={() => { setStoryStyle(null); setGenPeriodStart(""); setGenPeriodEnd(""); setShowGenerateModal(true); }}
            generating={generating} generatingMsgIdx={generatingMsgIdx}
            userPlan={userPlan} sharingStoryId={sharingStoryId}
            onShare={handleShare} onOpenShareCard={openShareCard}
            hasMoreEntries={hasMoreEntries} filterYear={filterYear} filterMonth={filterMonth}
            onLoadMore={loadMoreEntries} loadingMore={loadingMore}
          />
        )}
        {tab === "milestones" && (
          <MilestonesTab
            t={t} isFR={isFR} milestones={milestones}
            totalMilestoneCount={totalMilestoneCount} milestoneDefinitions={milestoneDefinitions}
          />
        )}

        {/* ── Tributes moderation (deceased pets only) ──────────────────── */}
        {tab === "tributes" && pet?.deceased_at && (
          <TributesTab
            isFR={isFR} dateLocale={dateLocale} tributesLoaded={tributesLoaded} loadError={tributesError}
            pendingTributes={pendingTributes} setPendingTributes={setPendingTributes}
          />
        )}

        {/* ── Household members tab ────────────────────────────────────────── */}
        {tab === "members" && (
          <MembersTab
            t={t} isFR={isFR} petId={id} userPlan={userPlan}
            inviteEmail={inviteEmail} setInviteEmail={setInviteEmail}
            inviteLoading={inviteLoading} setInviteLoading={setInviteLoading}
            inviteResult={inviteResult} setInviteResult={setInviteResult}
            membersLoaded={membersLoaded} setMembersLoaded={setMembersLoaded} loadError={membersError}
            members={members} setMembers={setMembers}
            revokeConfirmId={revokeConfirmId} setRevokeConfirmId={setRevokeConfirmId}
          />
        )}
      </main>

      {/* ── Coach marks ─────────────────────────────────────────────────────── */}
      <CoachMarks
        isFR={isFR} petId={id}
        entryCount={entries.length} storyCount={stories.length}
        userPlan={userPlan} bookCredits={bookCredits}
      />
    </div>
  );
}

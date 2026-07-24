"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Pet, Entry, Story } from "@/types";
import Link from "next/link";
import { detectMilestones, MILESTONE_TYPES, translateMilestone, MilestoneDefinition } from "@/lib/milestones";
import { useLocale } from "@/hooks/useLocale";
import { fmtDateOrdinal } from "@/lib/date";
import { evaluateFirstStoryNudge } from "@/lib/story";
import type { Plan } from "@/lib/plan";
import { compressImage } from "@/lib/image";
import { MOOD_OPTIONS, EMOJI_CATEGORIES, ALL_EMOJIS } from "./constants";
import { groupEntriesByMonth } from "./utils";
import MemorialModal from "./components/MemorialModal";
import UpsellModal from "./components/UpsellModal";
import ShareCardModal from "./components/ShareCardModal";
import DeleteEntryModal from "./components/DeleteEntryModal";
import EditEntryModal from "./components/EditEntryModal";
import GenerateStoryModal from "./components/GenerateStoryModal";
import Lightbox from "./components/Lightbox";
import PetHeader from "./components/PetHeader";
import TabBar from "./components/TabBar";
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
  const [newEntry, setNewEntry] = useState("");
  const [mood, setMood] = useState<string | null>(null);
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [filterYear, setFilterYear] = useState<string | null>(null);
  const [filterMonth, setFilterMonth] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [entryError, setEntryError] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatingMsgIdx, setGeneratingMsgIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [pendingPhotos, setPendingPhotos] = useState<{ file: File; preview: string }[]>([]);
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
  const [showUpsellModal, setShowUpsellModal] = useState(false);
  const [entryMenuId, setEntryMenuId] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editMood, setEditMood] = useState<string | null>(null);
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [members, setMembers] = useState<{ id: string; invited_email: string; status: string; display_name: string; accepted_at: string | null; created_at: string }[]>([]);
  const [membersLoaded, setMembersLoaded] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ success?: boolean; resent?: boolean; error?: string } | null>(null);
  const [revokeConfirmId, setRevokeConfirmId] = useState<string | null>(null);
  const [memberProfiles, setMemberProfiles] = useState<Record<string, string>>({});
  const [editPhotos, setEditPhotos] = useState<string[]>([]);
  const [editPendingPhotos, setEditPendingPhotos] = useState<{ file: File; preview: string }[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [textareaFocused, setTextareaFocused] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [storyStyle, setStoryStyle] = useState<string | null>(null);
  const [genPeriodStart, setGenPeriodStart] = useState("");
  const [genPeriodEnd, setGenPeriodEnd] = useState("");
  const [showEditEmojiPicker, setShowEditEmojiPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const memorialPhotoInputRef = useRef<HTMLInputElement>(null);
  const kebabRef = useRef<HTMLDivElement>(null);
  const entryMenuRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const editEmojiPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (kebabRef.current && !kebabRef.current.contains(e.target as Node)) {
        setShowKebabMenu(false);
        setShowDeleteConfirm(false);
      }
      if (entryMenuRef.current && !entryMenuRef.current.contains(e.target as Node)) {
        setEntryMenuId(null);
      }
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
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
      const res = await fetch(`/api/pet-members?petId=${id}`);
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members ?? []);
      }
      setMembersLoaded(true);
    };
    load();
  }, [tab, membersLoaded, pet, id]);

  // Load pending tributes when tributes tab is active
  useEffect(() => {
    if (tab !== "tributes" || tributesLoaded || !pet?.deceased_at) return;
    const load = async () => {
      const res = await fetch(`/api/memorial/tributes?petId=${id}&status=pending`);
      if (res.ok) {
        const data = await res.json();
        setPendingTributes(data.tributes ?? []);
      }
      setTributesLoaded(true);
    };
    load();
  }, [tab, tributesLoaded, pet, id]);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = 5 - pendingPhotos.length;
    const selected = files.slice(0, remaining);
    const newPhotos = selected.map(file => ({ file, preview: URL.createObjectURL(file) }));
    setPendingPhotos(prev => [...prev, ...newPhotos]);
  };

  const removePhoto = (index: number) => {
    setPendingPhotos(prev => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const uploadPhotos = async (userId: string): Promise<string[]> => {
    const supabase = createClient();
    const urls: string[] = [];
    for (const { file } of pendingPhotos) {
      const compressed = await compressImage(file);
      const filename = `${userId}/${id}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
      const { error } = await supabase.storage.from("pet-photos").upload(filename, compressed, { contentType: "image/jpeg" });
      if (!error) {
        const { data } = supabase.storage.from("pet-photos").getPublicUrl(filename);
        urls.push(data.publicUrl);
      }
    }
    return urls;
  };

  const addEntry = async () => {
    if (!newEntry.trim() && pendingPhotos.length === 0) {
      setEntryError(true);
      return;
    }
    setSaving(true);
    setUploadingPhotos(pendingPhotos.length > 0);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    let photoUrls: string[] = [];
    if (pendingPhotos.length > 0) photoUrls = await uploadPhotos(user!.id);

    const { data, error: insertErr } = await supabase.from("entries").insert({
      pet_id: id, user_id: user!.id,
      content: newEntry.trim() || " ", mood, photo_urls: photoUrls,
      entry_date: entryDate,
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
      const detected = detectMilestones({ content: newEntry }, entries, existingMilestoneTypes, milestoneDefinitions);

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

    setNewEntry("");
    setPendingPhotos([]);
    setUploadingPhotos(false);
    setSaving(false);
    setEntryDate(new Date().toISOString().split("T")[0]);
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

  const availableYears = Array.from(new Set(allEntryDates.map(d => d.slice(0, 4)))).sort().reverse();
  const MONTHS = Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1).padStart(2, "0"),
    label: new Date(2000, i, 1).toLocaleDateString(dateLocale, { month: "long" }).replace(/^./, s => s.toUpperCase()),
  }));
  const filteredEntries = entries.filter(e => {
    if (filterYear && e.entry_date.slice(0, 4) !== filterYear) return false;
    if (filterMonth && e.entry_date.slice(5, 7) !== filterMonth) return false;
    return true;
  });
  const groupedEntries = groupEntriesByMonth(filteredEntries, locale);
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
          <>
            {/* Mo17, monthly progress pill */}
            {(() => {
              const now = new Date();
              const monthPrefix = now.toISOString().slice(0, 7);
              const thisMonthCount = entries.filter(e => e.entry_date?.slice(0, 7) === monthPrefix).length;
              const firstOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
              const daysUntil = Math.ceil((firstOfNextMonth.getTime() - now.getTime()) / 864e5);
              const hasThisMonthStory = stories.some(s => s.created_at?.slice(0, 7) === monthPrefix);
              let progressLabel: string;
              if (hasThisMonthStory) {
                progressLabel = t.journal.month_progress_done.replace("{count}", String(thisMonthCount));
              } else if (daysUntil <= 0) {
                progressLabel = t.journal.month_progress_soon.replace("{count}", String(thisMonthCount));
              } else if (daysUntil === 1) {
                progressLabel = t.journal.month_progress_tomorrow.replace("{count}", String(thisMonthCount));
              } else {
                progressLabel = t.journal.month_progress_days.replace("{count}", String(thisMonthCount)).replace("{days}", String(daysUntil));
              }
              return (
                <div style={{ display: "inline-flex", alignItems: "center", gap: ".4rem", background: hasThisMonthStory ? "rgba(107,123,94,.1)" : "rgba(200,129,58,.08)", borderRadius: 100, padding: ".3rem .75rem", marginBottom: "1rem", border: `1px solid ${hasThisMonthStory ? "rgba(107,123,94,.25)" : "rgba(200,129,58,.2)"}` }}>
                  <span style={{ fontSize: ".75rem", color: hasThisMonthStory ? "#6B7B5E" : "var(--ep-brand)", fontWeight: 500 }}>
                    {progressLabel}
                  </span>
                </div>
              );
            })()}

            {/* Date filter dropdowns */}
            {availableYears.length >= 1 && (
              <div style={{ display: "flex", gap: ".5rem", marginBottom: "1.25rem" }}>
                <select
                  value={filterYear ?? ""}
                  onChange={e => { setFilterYear(e.target.value || null); setFilterMonth(null); }}
                  style={{ flex: "0 0 auto", height: 36, padding: "0 .625rem", borderRadius: 8, border: "1.5px solid #D4C5B0", background: "var(--ep-bg)", color: "var(--ep-text)", fontFamily: "inherit", fontSize: ".875rem", cursor: "pointer", outline: "none" }}
                >
                  <option value="">{isFR ? "Toutes les années" : "All years"}</option>
                  {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <select
                  value={filterMonth ?? ""}
                  onChange={e => setFilterMonth(e.target.value || null)}
                  style={{ flex: "0 0 auto", height: 36, padding: "0 .625rem", borderRadius: 8, border: "1.5px solid #D4C5B0", background: "var(--ep-bg)", color: "var(--ep-text)", fontFamily: "inherit", fontSize: ".875rem", cursor: "pointer", outline: "none" }}
                >
                  <option value="">{isFR ? "Tous les mois" : "All months"}</option>
                  {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
            )}

            {userPlan === "free" && allEntryDates.length >= 5 && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: ".5rem", background: allEntryDates.length >= 9 ? "var(--ep-brand)" : "#FFF3E0", border: `1px solid ${allEntryDates.length >= 9 ? "var(--ep-brand)" : "#F7C27A"}`, borderRadius: 8, padding: "8px 12px", marginBottom: "1rem" }}>
                <span style={{ fontSize: "13px", color: allEntryDates.length >= 9 ? "#fff" : "var(--ep-text-muted)", fontWeight: 400 }}>
                  {t.journal.entry_counter.replace("{count}", String(allEntryDates.length))}
                </span>
                <Link href="/dashboard/settings" style={{ fontSize: "13px", color: allEntryDates.length >= 9 ? "#fff" : "var(--ep-brand)", fontWeight: 500, textDecoration: "none" }}>
                  {t.journal.upgrade_unlimited}
                </Link>
              </div>
            )}

            <div style={{ background: "var(--ep-bg-card)", borderRadius: 20, padding: "1.25rem", marginBottom: "1.5rem", border: "1px solid rgba(61,43,31,.08)" }}>
              <textarea
                value={newEntry}
                onChange={e => { setNewEntry(e.target.value); if (e.target.value.trim()) setEntryError(false); }}
                onFocus={() => setTextareaFocused(true)}
                onBlur={() => setTextareaFocused(false)}
                placeholder={t.journal.placeholder.replace("{name}", pet.name)}
                rows={3}
                maxLength={1000}
                style={{ width: "100%", border: entryError ? "1.5px solid var(--ep-alert)" : "none", background: entryError ? "rgba(163,45,45,.04)" : "transparent", borderRadius: entryError ? 8 : 0, fontFamily: "inherit", fontSize: ".95rem", color: "var(--ep-text)", outline: "none", resize: "none", lineHeight: 1.6, boxSizing: "border-box", padding: entryError ? ".5rem" : 0, transition: "border-color .15s" }}
              />
              {entryError && (
                <p style={{ fontSize: ".8rem", color: "var(--ep-alert)", margin: ".25rem 0 0", lineHeight: 1.4 }}>
                  {t.journal.entry_required}
                </p>
              )}
              {(textareaFocused || newEntry.length > 0) && (
                <p style={{ fontSize: ".72rem", textAlign: "right", margin: ".2rem 0 0", color: newEntry.length > 950 ? "var(--ep-alert)" : newEntry.length > 800 ? "var(--ep-brand)" : "var(--ep-text-faint)" }}>
                  {newEntry.length} / 1000
                </p>
              )}
              {pendingPhotos.length > 0 && (
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", margin: ".75rem 0" }}>
                  {pendingPhotos.map((photo, i) => (
                    <div key={i} style={{ position: "relative", width: 72, height: 72 }}>
                      <img src={photo.preview} alt="" style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 10 }} />
                      <button onClick={() => removePhoto(i)} style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%", background: "var(--ep-text)", color: "var(--ep-bg-card)", border: "none", cursor: "pointer", fontSize: "11px", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "unset", padding: 0 }}>×</button>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: ".75rem", flexWrap: "wrap", gap: ".5rem" }}>
                <div style={{ display: "flex", gap: ".5rem", alignItems: "center" }}>
                  <div ref={emojiPickerRef} style={{ position: "relative" }}>
                    <div style={{ position: "relative", display: "inline-block" }}>
                      <button onClick={() => setShowEmojiPicker(v => !v)}
                        style={{ width: 36, height: 36, borderRadius: "50%", border: `1.5px solid ${mood ? "var(--ep-brand)" : "rgba(61,43,31,.2)"}`, background: mood ? "rgba(200,129,58,.1)" : "transparent", cursor: "pointer", fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "unset" }}
                        title={isFR ? "Ajouter une émoticône" : "Add an emoji"}>
                        {mood ? (ALL_EMOJIS.find(e => e.value === mood)?.emoji ?? "😊") : "😊"}
                      </button>
                      {mood && (
                        <button onClick={e => { e.stopPropagation(); setMood(null); }}
                          style={{ position: "absolute", top: -5, right: -5, width: 18, height: 18, borderRadius: "50%", background: "rgba(61,43,31,.25)", color: "var(--ep-text)", border: "none", cursor: "pointer", fontSize: "9px", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1, padding: 0, fontWeight: 700, minHeight: "unset" }}>
                          ✕
                        </button>
                      )}
                    </div>
                    {showEmojiPicker && (
                      <div style={{ position: "absolute", top: "calc(100% + .5rem)", left: 0, background: "var(--ep-bg-card)", border: "1px solid rgba(61,43,31,.1)", borderRadius: 16, boxShadow: "0 8px 30px rgba(61,43,31,.15)", padding: "1rem", zIndex: 60, width: 280, maxHeight: 340, overflowY: "auto" }}>
                        {EMOJI_CATEGORIES.map(cat => (
                          <div key={cat.label} style={{ marginBottom: ".75rem" }}>
                            <p style={{ fontSize: ".65rem", fontWeight: 600, color: "var(--ep-text-faint)", margin: "0 0 .4rem" }}>{cat.label}</p>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: ".2rem" }}>
                              {cat.emojis.map(e => (
                                <button key={e.value} onClick={() => { setMood(mood === e.value ? null : e.value); setShowEmojiPicker(false); }}
                                  title={e.label}
                                  style={{ width: 32, height: 32, borderRadius: 8, border: `1.5px solid ${mood === e.value ? "var(--ep-brand)" : "transparent"}`, background: mood === e.value ? "rgba(200,129,58,.1)" : "transparent", cursor: "pointer", fontSize: "1.1rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                  {e.emoji}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {pendingPhotos.length < 5 && (
                    <button onClick={() => fileInputRef.current?.click()} style={{ width: 32, height: 32, borderRadius: "50%", border: "1.5px solid rgba(61,43,31,.2)", background: "transparent", cursor: "pointer", fontSize: ".9rem", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ep-text-muted)" }} title="Add photos">
                      📷
                    </button>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handlePhotoSelect} style={{ display: "none" }} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
                  <input
                    type="date"
                    value={entryDate}
                    min={pet?.birthdate ?? undefined}
                    max={new Date().toISOString().split("T")[0]}
                    onChange={e => setEntryDate(e.target.value)}
                    style={{ height: 32, padding: "0 .5rem", borderRadius: 8, border: `1.5px solid ${entryDate !== new Date().toISOString().split("T")[0] ? "var(--ep-brand)" : "rgba(61,43,31,.2)"}`, background: entryDate !== new Date().toISOString().split("T")[0] ? "rgba(200,129,58,.08)" : "transparent", fontFamily: "inherit", fontSize: ".78rem", color: "var(--ep-text)", outline: "none", cursor: "pointer" }}
                  />
                  <button onClick={addEntry} disabled={saving || (!newEntry.trim() && pendingPhotos.length === 0)} style={{ padding: ".5rem 1.25rem", borderRadius: 100, border: "none", background: "var(--ep-brand)", color: "var(--ep-bg-card)", fontFamily: "inherit", fontSize: ".85rem", fontWeight: 500, cursor: "pointer", opacity: saving || (!newEntry.trim() && pendingPhotos.length === 0) ? .5 : 1 }}>
                    {uploadingPhotos ? t.journal.uploading : saving ? t.journal.saving : t.journal.add_moment}
                  </button>
                </div>
              </div>
            </div>

            {(() => {
              const generatingMessages = pet ? [
                t.journal.generating_1.replace("{name}", pet.name),
                t.journal.generating_2,
                t.journal.generating_3,
              ] : [t.journal.generating, t.journal.generating_2, t.journal.generating_3];
              return (
                <button onClick={() => { if (entries.length >= 3) { setStoryStyle(null); setGenPeriodStart(""); setGenPeriodEnd(""); setShowGenerateModal(true); } }} disabled={generating || entries.length < 3} style={{ width: "100%", padding: ".875rem", borderRadius: 16, border: "1.5px dashed rgba(200,129,58,.4)", background: "rgba(200,129,58,.05)", color: "var(--ep-brand)", fontFamily: "inherit", fontSize: ".9rem", fontWeight: 500, cursor: entries.length < 3 ? "not-allowed" : "pointer", marginBottom: "1.5rem", opacity: entries.length < 3 ? .5 : 1 }}>
                  {generating ? generatingMessages[generatingMsgIdx] : t.journal.generate_story.replace("{name}", pet.name)}
                  {entries.length < 3 && <span style={{ fontSize: ".75rem", display: "block", fontWeight: 300, marginTop: ".2rem" }}>{t.journal.add_more.replace("{count}", String(3 - entries.length)).replace("{entries}", 3 - entries.length === 1 ? t.journal.entry : t.journal.entries)}</span>}
                </button>
              );
            })()}

            {filteredEntries.length === 0 ? (
              <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--ep-text-muted)", fontSize: ".9rem" }}>
                <img src="/illustrations/paw.svg" alt="" aria-hidden style={{ width: 52, display: "block", margin: "0 auto 1rem", opacity: .9 }} />
                {(filterYear || filterMonth) ? (isFR ? "Aucune entrée pour cette période." : "No entries for this period.") : t.journal.no_entries}
              </div>
            ) : groupedEntries.map(group => (
              <div key={group.month} style={{ marginBottom: "2rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
                  <span style={{ fontFamily: "Georgia, serif", fontSize: ".9rem", fontWeight: 600, color: "var(--ep-text-muted)" }}>{group.month}</span>
                  <div style={{ flex: 1, height: "0.5px", background: "rgba(61,43,31,.1)" }} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}>
                  {group.entries.map(entry => (
                    <div key={entry.id} style={{ background: "var(--ep-bg-card)", borderRadius: 16, border: "1px solid rgba(61,43,31,.06)" }}>
                      <div style={{ padding: ".875rem 1rem" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: entry.content.trim() ? ".5rem" : 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: ".5rem", flexWrap: "wrap" }}>
                            <span style={{ fontSize: ".75rem", color: "var(--ep-text-muted)", fontWeight: 300 }}>
                              {fmtDateOrdinal(new Date(entry.entry_date), isFR, { weekday: "short", month: "short" })}
                            </span>
                            {entry.mood && <span style={{ fontSize: ".9rem" }}>{ALL_EMOJIS.find(m => m.value === entry.mood)?.emoji ?? MOOD_OPTIONS.find(m => m.value === entry.mood)?.emoji}</span>}
                            {currentUserId && entry.user_id !== currentUserId && (
                              <span style={{ fontSize: ".7rem", color: "var(--ep-text-faint)", background: "rgba(61,43,31,.06)", borderRadius: 100, padding: "1px 7px" }}>
                                {t.members.added_by.replace("{name}", memberProfiles[entry.user_id] ?? (isFR ? "Membre" : "Member"))}
                              </span>
                            )}
                          </div>
                          <div ref={entryMenuId === entry.id ? entryMenuRef : null} style={{ position: "relative" }}>
                            <button onClick={() => setEntryMenuId(entryMenuId === entry.id ? null : entry.id)}
                              style={{ width: 32, height: 32, borderRadius: "50%", border: "1px solid rgba(61,43,31,.12)", background: "transparent", cursor: "pointer", fontSize: ".9rem", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ep-text-muted)", fontFamily: "inherit", lineHeight: 1, minHeight: "unset", flexShrink: 0 }}>···</button>
                            {entryMenuId === entry.id && !deletingEntryId && (
                              <div style={{ position: "absolute", top: "calc(100% + .3rem)", right: 0, background: "var(--ep-bg-card)", border: "1px solid rgba(61,43,31,.1)", borderRadius: 10, boxShadow: "0 4px 16px rgba(61,43,31,.12)", minWidth: 140, zIndex: 30 }}>
                                <button onClick={() => { setEditingEntry(entry); setEditContent(entry.content.trim()); setEditMood(entry.mood ?? null); setEditPhotos(entry.photo_urls ?? []); setEditPendingPhotos([]); setEntryMenuId(null); }}
                                  style={{ display: "block", width: "100%", padding: ".625rem .875rem", fontSize: ".8rem", color: "var(--ep-text)", background: "none", border: "none", textAlign: "left", cursor: "pointer", fontFamily: "inherit" }}>
                                  {isFR ? "Modifier" : "Edit"}
                                </button>
                                <button onClick={() => { setDeletingEntryId(entry.id); setEntryMenuId(null); }}
                                  style={{ display: "block", width: "100%", padding: ".625rem .875rem", fontSize: ".8rem", color: "var(--ep-alert)", background: "none", border: "none", borderTop: "1px solid rgba(61,43,31,.06)", textAlign: "left", cursor: "pointer", fontFamily: "inherit" }}>
                                  {isFR ? "Supprimer" : "Delete"}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                        {entry.content.trim() && <p style={{ fontSize: ".9rem", color: "var(--ep-text)", lineHeight: 1.65, margin: 0 }}>{entry.content}</p>}
                      </div>
                      {entry.photo_urls && entry.photo_urls.length > 0 && (
                        <div style={{ display: "grid", gridTemplateColumns: entry.photo_urls.length === 1 ? "1fr" : entry.photo_urls.length === 2 ? "1fr 1fr" : "1fr 1fr 1fr", gap: "2px", borderRadius: "0 0 14px 14px", overflow: "hidden" }}>
                          {entry.photo_urls.slice(0, 3).map((url: string, i: number) => (
                            <div key={i} style={{ position: "relative" }}>
                              <img src={url} alt="" onClick={() => setLightboxUrl(url)}
                                style={{ width: "100%", height: entry.photo_urls.length === 1 ? 280 : 160, objectFit: "cover", display: "block", cursor: "pointer" }} />
                              {i === 2 && entry.photo_urls.length > 3 && (
                                <div onClick={() => setLightboxUrl(entry.photo_urls[2])} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                                  <span style={{ color: "#fff", fontSize: "1.25rem", fontWeight: 500 }}>+{entry.photo_urls.length - 3}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}

        {tab === "stories" && (
          <StoriesTab
            t={t} isFR={isFR} dateLocale={dateLocale} petName={pet.name}
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
            isFR={isFR} dateLocale={dateLocale} tributesLoaded={tributesLoaded}
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
            membersLoaded={membersLoaded} setMembersLoaded={setMembersLoaded}
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

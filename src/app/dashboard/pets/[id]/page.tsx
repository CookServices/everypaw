"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Pet, Entry, Story } from "@/types";
import Link from "next/link";
import { detectMilestones, MILESTONE_TYPES, translateMilestone, MilestoneDefinition } from "@/lib/milestones";
import { useLocale } from "@/hooks/useLocale";
import { fmtDateOrdinal } from "@/lib/date";
import CoachMark from "@/components/CoachMark";

const MOOD_OPTIONS = [
  { value: "happy", emoji: "😄", label: "Happy" },
  { value: "funny", emoji: "😂", label: "Funny" },
  { value: "tender", emoji: "🥰", label: "Tender" },
  { value: "sad", emoji: "😢", label: "Sad" },
  { value: "proud", emoji: "🏆", label: "Proud" },
];

const EMOJI_CATEGORIES = [
  {
    label: "Humeurs",
    emojis: [
      { value: "happy", emoji: "😄", label: "Heureux" },
      { value: "funny", emoji: "😂", label: "Drôle" },
      { value: "tender", emoji: "🥰", label: "Tendre" },
      { value: "sad", emoji: "😢", label: "Triste" },
      { value: "proud", emoji: "🏆", label: "Fier" },
      { value: "love", emoji: "❤️", label: "Amour" },
      { value: "surprised", emoji: "😲", label: "Surpris" },
      { value: "sleepy", emoji: "😴", label: "Endormi" },
      { value: "silly", emoji: "🤪", label: "Fou" },
      { value: "nervous", emoji: "😰", label: "Nerveux" },
    ],
  },
  {
    label: "Activités",
    emojis: [
      { value: "walk", emoji: "🐾", label: "Promenade" },
      { value: "play", emoji: "🎾", label: "Jouer" },
      { value: "swim", emoji: "🏊", label: "Nager" },
      { value: "run", emoji: "🏃", label: "Courir" },
      { value: "sleep_act", emoji: "🛌", label: "Dormir" },
      { value: "bath", emoji: "🛁", label: "Bain" },
      { value: "car", emoji: "🚗", label: "Voiture" },
      { value: "park", emoji: "🌳", label: "Parc" },
      { value: "beach", emoji: "🏖️", label: "Plage" },
      { value: "home", emoji: "🏠", label: "Maison" },
    ],
  },
  {
    label: "Santé",
    emojis: [
      { value: "vet", emoji: "🏥", label: "Vétérinaire" },
      { value: "medicine", emoji: "💊", label: "Médicament" },
      { value: "healthy", emoji: "💪", label: "En forme" },
      { value: "sick", emoji: "🤒", label: "Malade" },
      { value: "vaccine", emoji: "💉", label: "Vaccin" },
      { value: "grooming", emoji: "✂️", label: "Toilettage" },
      { value: "checkup", emoji: "🩺", label: "Bilan" },
      { value: "recovered", emoji: "🌟", label: "Rétabli" },
    ],
  },
  {
    label: "Nourriture",
    emojis: [
      { value: "food", emoji: "🍖", label: "Manger" },
      { value: "treat", emoji: "🦴", label: "Friandise" },
      { value: "fish", emoji: "🐟", label: "Poisson" },
      { value: "carrot", emoji: "🥕", label: "Carotte" },
      { value: "hungry", emoji: "😋", label: "Affamé" },
      { value: "yummy", emoji: "🤤", label: "Délicieux" },
    ],
  },
  {
    label: "Nature",
    emojis: [
      { value: "sun", emoji: "☀️", label: "Soleil" },
      { value: "rain", emoji: "🌧️", label: "Pluie" },
      { value: "snow", emoji: "❄️", label: "Neige" },
      { value: "flower", emoji: "🌸", label: "Fleur" },
      { value: "leaf", emoji: "🍂", label: "Feuille" },
      { value: "moon", emoji: "🌙", label: "Nuit" },
      { value: "star", emoji: "⭐", label: "Étoile" },
      { value: "rainbow", emoji: "🌈", label: "Arc-en-ciel" },
    ],
  },
];

const ALL_EMOJIS = EMOJI_CATEGORIES.flatMap(c => c.emojis);

const SPECIES_EMOJI: Record<string, string> = { dog: "🐶", cat: "🐱", rabbit: "🐰", bird: "🐦", other: "🐾" };

const STORY_STYLES = [
  { value: "poetic",    icon: "🎭", labelFR: "Poétique",    labelEN: "Poetic",    descFR: "Lyrique, métaphores, émotionnel",          descEN: "Lyrical, metaphors, emotional" },
  { value: "humorous",  icon: "😄", labelFR: "Humoristique", labelEN: "Humorous",  descFR: "Léger, décalé, autodérision",             descEN: "Light, quirky, self-deprecating" },
  { value: "classic",   icon: "📖", labelFR: "Classique",    labelEN: "Classic",   descFR: "Narratif, sobre, intemporel",             descEN: "Narrative, sober, timeless" },
  { value: "epic",      icon: "🌟", labelFR: "Épique",       labelEN: "Epic",      descFR: "Aventurier, dramatique, héroïque",       descEN: "Adventurous, dramatic, heroic" },
  { value: "tender",    icon: "💝", labelFR: "Tendre",       labelEN: "Tender",    descFR: "Doux, intime, comme une lettre d'amour", descEN: "Soft, intimate, like a love letter" },
];

async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const maxSize = 1200;
      let { width, height } = img;
      if (width > maxSize || height > maxSize) {
        if (width > height) { height = (height / width) * maxSize; width = maxSize; }
        else { width = (width / height) * maxSize; height = maxSize; }
      }
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => resolve(blob!), "image/jpeg", 0.85);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

function groupEntriesByMonth(entries: Entry[], locale: string) {
  const dateLocale = locale === "fr" ? "fr-FR" : "en-US";
  const groups: { month: string; entries: Entry[] }[] = [];
  entries.forEach(entry => {
    const month = new Date(entry.entry_date).toLocaleDateString(dateLocale, { month: "long", year: "numeric" });
    const existing = groups.find(g => g.month === month);
    if (existing) existing.entries.push(entry);
    else groups.push({ month, entries: [entry] });
  });
  return groups;
}

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
  const [isPremium, setIsPremium] = useState(false);
  const [userPlan, setUserPlan] = useState<string>("free");
  const [bookCredits, setBookCredits] = useState(0);
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

    const { data } = await supabase.from("entries").insert({
      pet_id: id, user_id: user!.id,
      content: newEntry.trim() || " ", mood, photo_urls: photoUrls,
      entry_date: entryDate,
    }).select().single();

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

  const downloadShareCard = async () => {
    if (!shareCardStory) return;
    setShareCardLoading(true);
    setShareCardError(false);
    try {
      const url = `/api/share-card?story_id=${shareCardStory.id}&format=${shareCardFormat}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("failed");
      const blob = await res.blob();
      const filename = `everypaw-${shareCardFormat}.png`;
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [new File([blob], filename, { type: "image/png" })] })) {
        await navigator.share({ files: [new File([blob], filename, { type: "image/png" })] });
      } else {
        const a = document.createElement("a");
        const objectUrl = URL.createObjectURL(blob);
        a.href = objectUrl;
        a.download = filename;
        a.click();
        setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      }
    } catch {
      setShareCardError(true);
    }
    setShareCardLoading(false);
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
    <div style={{ minHeight: "100dvh", background: "#F7F2EA", padding: "2rem 1.5rem", maxWidth: 900, margin: "0 auto" }}>
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
      <p style={{ color: "#7A5C44", fontSize: "1rem" }}>{t.pet.not_found}</p>
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
  const tabs: { key: "journal" | "stories" | "milestones" | "tributes" | "members"; label: string }[] = [
    { key: "journal", label: t.pet.tab_journal },
    { key: "stories", label: t.pet.tab_stories },
    { key: "milestones", label: t.pet.tab_milestones },
    ...(pet?.deceased_at ? [{ key: "tributes" as const, label: isFR ? "Hommages" : "Tributes" }] : []),
    ...(isOwner ? [{ key: "members" as const, label: t.members.tab }] : []),
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#F7F2EA", fontFamily: "'DM Sans', sans-serif" }}>

      {/* Milestone notification */}
      {newMilestone && (
        <div className="ep-toast" style={{ background: "#3D2B1F", color: "#FDFAF5", padding: "1rem 1.5rem", borderRadius: 100, fontSize: ".9rem", fontWeight: 500, zIndex: 200, boxShadow: "0 8px 30px rgba(0,0,0,.2)", display: "flex", alignItems: "center", gap: ".75rem", whiteSpace: "nowrap" }}>
          🏆 {t.milestones.new_notification.replace("{title}", translateMilestone(newMilestone.type, isFR, milestoneDefinitions))}
        </div>
      )}

      {/* Share link copied notification */}
      {shareLinkCopied && (
        <div className="ep-toast" style={{ background: "#2E5E1E", color: "#FDFAF5", padding: "1rem 1.5rem", borderRadius: 100, fontSize: ".9rem", fontWeight: 500, zIndex: 200, boxShadow: "0 8px 30px rgba(0,0,0,.2)", display: "flex", alignItems: "center", gap: ".75rem", whiteSpace: "nowrap" }}>
          🔗 {isFR ? "Lien copié !" : "Link copied!"}
        </div>
      )}

      {/* Memorial modal */}
      {showMemorialModal && (
        <div onClick={() => setShowMemorialModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(28,20,16,.75)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#FDFAF5", borderRadius: 24, padding: "2rem", maxWidth: 400, width: "100%", boxShadow: "0 24px 60px rgba(0,0,0,.25)" }}>
            <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
              <div style={{ fontSize: "2rem", marginBottom: ".75rem" }}>🕊️</div>
              <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.25rem", fontWeight: 600, color: "#3D2B1F", margin: "0 0 .4rem" }}>{t.memorial.modal_title.replace("{name}", pet.name)}</h2>
              <p style={{ fontSize: ".8rem", color: "#7A5C44", fontWeight: 300, margin: 0 }}>{t.memorial.modal_subtitle}</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ fontSize: ".75rem", fontWeight: 500, color: "#7A5C44", textTransform: "uppercase", letterSpacing: ".06em", display: "block", marginBottom: ".4rem" }}>{t.memorial.date_label}</label>
                <input type="date" value={deceasedAt} onChange={e => setDeceasedAt(e.target.value)} style={{ width: "100%", padding: ".75rem 1rem", borderRadius: 12, border: "1.5px solid rgba(61,43,31,.15)", background: "#F7F2EA", fontFamily: "inherit", fontSize: ".9rem", color: "#3D2B1F", outline: "none", boxSizing: "border-box" as const }} />
              </div>
              <div>
                <label style={{ fontSize: ".75rem", fontWeight: 500, color: "#7A5C44", textTransform: "uppercase", letterSpacing: ".06em", display: "block", marginBottom: ".4rem" }}>{t.memorial.message_label}</label>
                <textarea value={memorialMessage} onChange={e => setMemorialMessage(e.target.value)} placeholder={t.memorial.message_placeholder} rows={3} style={{ width: "100%", padding: ".75rem 1rem", borderRadius: 12, border: "1.5px solid rgba(61,43,31,.15)", background: "#F7F2EA", fontFamily: "inherit", fontSize: ".9rem", color: "#3D2B1F", outline: "none", resize: "none", boxSizing: "border-box" as const, lineHeight: 1.6 }} />
              </div>

              {/* Photo du mémorial */}
              {(() => {
                const entryPhotos = Array.from(new Set(entries.flatMap(e => e.photo_urls ?? []).filter(Boolean)));
                const displaySrc = memorialPhotoPreview ?? memorialPhotoUrl;
                return (
                  <div>
                    <label style={{ fontSize: ".75rem", fontWeight: 500, color: "#7A5C44", textTransform: "uppercase", letterSpacing: ".06em", display: "block", marginBottom: ".75rem" }}>
                      {isFR ? "Photo du mémorial (optionnel)" : "Memorial photo (optional)"}
                    </label>
                    <div style={{ display: "flex", gap: "1rem", alignItems: "center", marginBottom: showMemorialPhotoGrid ? ".75rem" : 0 }}>
                      {/* Preview */}
                      <div style={{ width: 76, height: 76, borderRadius: 14, overflow: "hidden", background: "rgba(61,43,31,.07)", border: "1.5px solid rgba(61,43,31,.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {displaySrc
                          ? <img src={displaySrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          : <span style={{ fontSize: "1.75rem" }}>🕊️</span>}
                      </div>
                      {/* Actions */}
                      <div style={{ display: "flex", flexDirection: "column", gap: ".4rem" }}>
                        <button
                          type="button"
                          onClick={() => memorialPhotoInputRef.current?.click()}
                          style={{ display: "inline-flex", alignItems: "center", gap: ".4rem", padding: ".375rem .75rem", borderRadius: 100, border: "1.5px solid rgba(61,43,31,.15)", background: "transparent", fontFamily: "inherit", fontSize: ".78rem", color: "#7A5C44", cursor: "pointer" }}
                        >
                          {isFR ? "Uploader une photo" : "Upload a photo"}
                        </button>
                        {entryPhotos.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setShowMemorialPhotoGrid(v => !v)}
                            style={{ display: "inline-flex", alignItems: "center", gap: ".4rem", padding: ".375rem .75rem", borderRadius: 100, border: "1.5px solid rgba(61,43,31,.15)", background: "transparent", fontFamily: "inherit", fontSize: ".78rem", color: "#7A5C44", cursor: "pointer" }}
                          >
                            {isFR ? "Choisir dans le journal" : "Pick from journal"} {showMemorialPhotoGrid ? "▲" : "▼"}
                          </button>
                        )}
                        {displaySrc && (
                          <button
                            type="button"
                            onClick={() => {
                              setMemorialPhotoUrl(null);
                              setMemorialPhotoFile(null);
                              if (memorialPhotoPreview) URL.revokeObjectURL(memorialPhotoPreview);
                              setMemorialPhotoPreview(null);
                            }}
                            style={{ display: "inline-flex", alignItems: "center", gap: ".3rem", padding: ".375rem .5rem", borderRadius: 100, border: "none", background: "transparent", fontFamily: "inherit", fontSize: ".72rem", color: "#9A8070", cursor: "pointer" }}
                          >
                            × {isFR ? "Retirer" : "Remove"}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Grid de photos du journal */}
                    {showMemorialPhotoGrid && entryPhotos.length > 0 && (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4, maxHeight: 168, overflowY: "auto", borderRadius: 10, padding: 2 }}>
                        {entryPhotos.map((url, i) => (
                          <div
                            key={i}
                            onClick={() => {
                              setMemorialPhotoUrl(url);
                              setMemorialPhotoFile(null);
                              if (memorialPhotoPreview) URL.revokeObjectURL(memorialPhotoPreview);
                              setMemorialPhotoPreview(null);
                              setShowMemorialPhotoGrid(false);
                            }}
                            style={{ position: "relative", cursor: "pointer", borderRadius: 6, overflow: "hidden", border: `2px solid ${memorialPhotoUrl === url ? "#C8813A" : "transparent"}`, aspectRatio: "1 / 1" }}
                          >
                            <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                          </div>
                        ))}
                      </div>
                    )}

                    <input
                      ref={memorialPhotoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (memorialPhotoPreview) URL.revokeObjectURL(memorialPhotoPreview);
                        setMemorialPhotoFile(file);
                        setMemorialPhotoPreview(URL.createObjectURL(file));
                        setMemorialPhotoUrl(null);
                        e.target.value = "";
                      }}
                      style={{ display: "none" }}
                    />
                  </div>
                );
              })()}
            </div>
            <div style={{ display: "flex", gap: ".75rem", marginTop: "1.5rem" }}>
              <button onClick={() => setShowMemorialModal(false)} style={{ flex: 1, padding: ".75rem", borderRadius: 100, border: "1.5px solid rgba(61,43,31,.15)", background: "transparent", fontFamily: "inherit", fontSize: ".875rem", color: "#7A5C44", cursor: "pointer" }}>
                {t.memorial.cancel}
              </button>
              <button onClick={saveMemorial} disabled={savingMemorial || !deceasedAt} style={{ flex: 2, padding: ".75rem", borderRadius: 100, border: "none", background: "#8B6B4A", color: "#FDFAF5", fontFamily: "inherit", fontSize: ".875rem", fontWeight: 500, cursor: "pointer", opacity: savingMemorial || !deceasedAt ? .6 : 1 }}>
                {savingMemorial ? t.memorial.saving : t.memorial.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upsell modal */}
      {showUpsellModal && (
        <div onClick={() => setShowUpsellModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(61,43,31,.55)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#FDFAF5", borderRadius: 24, padding: "2rem", maxWidth: 400, width: "100%", boxShadow: "0 24px 60px rgba(0,0,0,.2)", textAlign: "center" }}>
            <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>✦</div>
            <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.2rem", fontWeight: 600, color: "#3D2B1F", margin: "0 0 .75rem" }}>
              {t.dashboard.upsell_title}
            </h2>
            <p style={{ fontSize: ".875rem", color: "#7A5C44", fontWeight: 300, lineHeight: 1.65, margin: "0 0 1.75rem" }}>
              {t.dashboard.upsell_desc.replace("{name}", pet?.name ?? "")}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}>
              <Link href="/dashboard/upgrade" style={{ display: "block", padding: ".75rem 1.5rem", borderRadius: 100, background: "#C8813A", color: "#FDFAF5", textDecoration: "none", fontSize: ".875rem", fontWeight: 500 }}>
                {t.dashboard.upsell_cta}
              </Link>
              <button onClick={() => setShowUpsellModal(false)} style={{ padding: ".75rem", borderRadius: 100, border: "1.5px solid rgba(61,43,31,.15)", background: "transparent", color: "#7A5C44", fontFamily: "inherit", fontSize: ".875rem", cursor: "pointer" }}>
                {t.dashboard.upsell_later}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share card modal */}
      {shareCardStory && (
        <div onClick={() => setShareCardStory(null)} style={{ position: "fixed", inset: 0, background: "rgba(61,43,31,.6)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#FDFAF5", borderRadius: 24, padding: "1.75rem", maxWidth: 420, width: "100%", boxShadow: "0 24px 60px rgba(0,0,0,.22)" }}>
            <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.05rem", fontWeight: 600, color: "#3D2B1F", margin: "0 0 1.25rem", textAlign: "center" }}>
              {t.stories.share_card_modal_title}
            </h2>
            {/* Format picker */}
            <div style={{ display: "flex", gap: ".625rem", marginBottom: "1.25rem" }}>
              {(["square", "story"] as const).map(fmt => (
                <button
                  key={fmt}
                  onClick={() => setShareCardFormat(fmt)}
                  style={{
                    flex: 1, padding: ".625rem .5rem",
                    borderRadius: 12,
                    border: `1.5px solid ${shareCardFormat === fmt ? "#C8813A" : "rgba(61,43,31,.15)"}`,
                    background: shareCardFormat === fmt ? "rgba(200,129,58,.08)" : "transparent",
                    color: shareCardFormat === fmt ? "#C8813A" : "#7A5C44",
                    fontSize: ".78rem", fontWeight: shareCardFormat === fmt ? 600 : 400,
                    cursor: "pointer", fontFamily: "inherit",
                    transition: "all .15s",
                  }}
                >
                  {fmt === "square" ? t.stories.share_card_format_square : t.stories.share_card_format_story}
                </button>
              ))}
            </div>
            {/* Preview thumbnail */}
            <div style={{
              background: "#FAF6F0",
              borderRadius: 14,
              marginBottom: "1.25rem",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              aspectRatio: shareCardFormat === "story" ? "9/16" : "1/1",
              border: "1px solid rgba(61,43,31,.08)",
              maxHeight: 240,
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/share-card?story_id=${shareCardStory.id}&format=${shareCardFormat}`}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                onError={() => setShareCardError(true)}
              />
            </div>
            {shareCardError && (
              <p style={{ fontSize: ".78rem", color: "#C0392B", textAlign: "center", margin: "0 0 1rem" }}>
                {t.stories.share_error}
              </p>
            )}
            {/* Actions */}
            <div style={{ display: "flex", gap: ".625rem" }}>
              <button
                onClick={downloadShareCard}
                disabled={shareCardLoading}
                style={{
                  flex: 1, padding: ".75rem", borderRadius: 100,
                  background: "#C8813A", color: "#FDFAF5",
                  border: "none", fontSize: ".875rem", fontWeight: 500,
                  cursor: shareCardLoading ? "wait" : "pointer",
                  fontFamily: "inherit", opacity: shareCardLoading ? .65 : 1,
                  transition: "opacity .15s",
                }}
              >
                {shareCardLoading ? t.stories.share_generating : t.stories.share_card_share}
              </button>
              <button
                onClick={() => setShareCardStory(null)}
                style={{
                  padding: ".75rem 1.25rem", borderRadius: 100,
                  border: "1.5px solid rgba(61,43,31,.15)",
                  background: "transparent", color: "#7A5C44",
                  fontSize: ".875rem", cursor: "pointer", fontFamily: "inherit",
                }}
              >
                {t.stories.share_card_close}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete entry confirmation modal */}
      {deletingEntryId && (
        <div onClick={() => setDeletingEntryId(null)} style={{ position: "fixed", inset: 0, background: "rgba(61,43,31,.45)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#FDFAF5", borderRadius: 20, padding: "1.75rem", maxWidth: 360, width: "100%", boxShadow: "0 8px 40px rgba(61,43,31,.18)" }}>
            <p style={{ fontSize: ".9rem", color: "#3D2B1F", margin: "0 0 1.25rem", lineHeight: 1.5 }}>
              {isFR ? "Voulez-vous vraiment supprimer ce moment ?" : "Are you sure you want to delete this moment?"}
            </p>
            <div style={{ display: "flex", gap: ".625rem" }}>
              <button onClick={() => setDeletingEntryId(null)} style={{ flex: 1, padding: ".6rem 1rem", borderRadius: 100, border: "1px solid rgba(61,43,31,.15)", background: "transparent", color: "#7A5C44", fontFamily: "inherit", fontSize: ".85rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 40 }}>
                {isFR ? "Annuler" : "Cancel"}
              </button>
              <button onClick={() => deleteEntry(deletingEntryId)} style={{ flex: 1, padding: ".6rem 1rem", borderRadius: 100, border: "none", background: "#A32D2D", color: "#fff", fontFamily: "inherit", fontSize: ".85rem", fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 40 }}>
                {isFR ? "Supprimer" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit entry modal */}
      {editingEntry && (
        <div onClick={() => setEditingEntry(null)} style={{ position: "fixed", inset: 0, background: "rgba(61,43,31,.45)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#FDFAF5", borderRadius: 20, padding: "1.75rem", maxWidth: 440, width: "100%", boxShadow: "0 8px 40px rgba(61,43,31,.18)", maxHeight: "90vh", overflowY: "auto" }}>
            <h3 style={{ fontFamily: "Georgia, serif", fontSize: "1rem", fontWeight: 600, color: "#3D2B1F", margin: "0 0 1rem" }}>
              {isFR ? "Modifier ce moment" : "Edit this moment"}
            </h3>
            <textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={4} maxLength={1000}
              style={{ width: "100%", boxSizing: "border-box", padding: ".75rem", borderRadius: 10, border: "1.5px solid rgba(61,43,31,.15)", background: "#F7F2EA", fontFamily: "inherit", fontSize: ".9rem", color: "#3D2B1F", resize: "none", outline: "none", lineHeight: 1.6 }} />

            {/* Emoji / mood */}
            <div style={{ margin: ".75rem 0 1rem" }}>
              <div ref={editEmojiPickerRef} style={{ position: "relative", display: "inline-block" }}>
                <div style={{ position: "relative", display: "inline-block" }}>
                  <button onClick={() => setShowEditEmojiPicker(v => !v)}
                    style={{ width: 36, height: 36, borderRadius: "50%", border: `1.5px solid ${editMood ? "#C8813A" : "rgba(61,43,31,.2)"}`, background: editMood ? "rgba(200,129,58,.1)" : "transparent", cursor: "pointer", fontSize: "1.1rem", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "unset" }}
                    title={isFR ? "Ajouter une émoticône" : "Add an emoji"}>
                    {editMood ? (ALL_EMOJIS.find(e => e.value === editMood)?.emoji ?? "😊") : "😊"}
                  </button>
                  {editMood && (
                    <button onClick={e => { e.stopPropagation(); setEditMood(null); }}
                      style={{ position: "absolute", top: -5, right: -5, width: 18, height: 18, borderRadius: "50%", background: "rgba(61,43,31,.25)", color: "#3D2B1F", border: "none", cursor: "pointer", fontSize: "9px", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1, padding: 0, fontWeight: 700, minHeight: "unset" }}>
                      ✕
                    </button>
                  )}
                </div>
                {showEditEmojiPicker && (
                  <div style={{ position: "absolute", top: "calc(100% + .5rem)", left: 0, background: "#FDFAF5", border: "1px solid rgba(61,43,31,.1)", borderRadius: 16, boxShadow: "0 8px 30px rgba(61,43,31,.15)", padding: "1rem", zIndex: 60, width: 280, maxHeight: 300, overflowY: "auto" }}>
                    {EMOJI_CATEGORIES.map(cat => (
                      <div key={cat.label} style={{ marginBottom: ".75rem" }}>
                        <p style={{ fontSize: ".65rem", fontWeight: 600, color: "#9A8070", textTransform: "uppercase", letterSpacing: ".08em", margin: "0 0 .4rem" }}>{cat.label}</p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: ".2rem" }}>
                          {cat.emojis.map(e => (
                            <button key={e.value} onClick={() => { setEditMood(editMood === e.value ? null : e.value); setShowEditEmojiPicker(false); }}
                              title={e.label}
                              style={{ width: 32, height: 32, borderRadius: 8, border: `1.5px solid ${editMood === e.value ? "#C8813A" : "transparent"}`, background: editMood === e.value ? "rgba(200,129,58,.1)" : "transparent", cursor: "pointer", fontSize: "1.1rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              {e.emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Existing photos */}
            {editPhotos.length > 0 && (
              <div style={{ marginBottom: ".75rem" }}>
                <p style={{ fontSize: ".72rem", fontWeight: 500, color: "#7A5C44", textTransform: "uppercase", letterSpacing: ".06em", margin: "0 0 .5rem" }}>{isFR ? "Photos existantes" : "Existing photos"}</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {editPhotos.map((url, i) => (
                    <div key={i} style={{ position: "relative", width: 64, height: 64 }}>
                      <img src={url} alt="" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 8 }} />
                      <button onClick={() => setEditPhotos(prev => prev.filter((_, idx) => idx !== i))} style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%", background: "#A32D2D", color: "#fff", border: "none", cursor: "pointer", fontSize: "10px", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "unset", padding: 0 }}>×</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* New pending photos */}
            {editPendingPhotos.length > 0 && (
              <div style={{ marginBottom: ".75rem" }}>
                <p style={{ fontSize: ".72rem", fontWeight: 500, color: "#7A5C44", textTransform: "uppercase", letterSpacing: ".06em", margin: "0 0 .5rem" }}>{isFR ? "Nouvelles photos" : "New photos"}</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {editPendingPhotos.map((p, i) => (
                    <div key={i} style={{ position: "relative", width: 64, height: 64 }}>
                      <img src={p.preview} alt="" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 8 }} />
                      <button onClick={() => setEditPendingPhotos(prev => { URL.revokeObjectURL(prev[i].preview); return prev.filter((_, idx) => idx !== i); })} style={{ position: "absolute", top: -6, right: -6, width: 18, height: 18, borderRadius: "50%", background: "#3D2B1F", color: "#fff", border: "none", cursor: "pointer", fontSize: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add photo button */}
            {editPhotos.length + editPendingPhotos.length < 5 && (
              <button
                onClick={() => editFileInputRef.current?.click()}
                style={{ display: "flex", alignItems: "center", gap: ".4rem", padding: ".4rem .875rem", borderRadius: 100, border: "1.5px solid rgba(61,43,31,.15)", background: "transparent", color: "#7A5C44", fontFamily: "inherit", fontSize: ".8rem", cursor: "pointer", marginBottom: ".75rem" }}
              >
                <span>{isFR ? "Ajouter une photo" : "Add a photo"}</span>
              </button>
            )}
            <input
              ref={editFileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={e => {
                const files = Array.from(e.target.files || []);
                const remaining = 5 - editPhotos.length - editPendingPhotos.length;
                const newPhotos = files.slice(0, remaining).map(f => ({ file: f, preview: URL.createObjectURL(f) }));
                setEditPendingPhotos(prev => [...prev, ...newPhotos]);
                e.target.value = "";
              }}
              style={{ display: "none" }}
            />

            <div style={{ display: "flex", gap: ".625rem", marginTop: ".5rem" }}>
              <button onClick={() => setEditingEntry(null)} style={{ flex: 1, padding: ".6rem 1rem", borderRadius: 100, border: "1px solid rgba(61,43,31,.15)", background: "transparent", color: "#7A5C44", fontFamily: "inherit", fontSize: ".875rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 40 }}>
                {isFR ? "Annuler" : "Cancel"}
              </button>
              <button onClick={updateEntry} disabled={savingEdit} style={{ flex: 2, padding: ".6rem 1rem", borderRadius: 100, border: "none", background: "#C8813A", color: "#FDFAF5", fontFamily: "inherit", fontSize: ".875rem", fontWeight: 500, cursor: "pointer", opacity: savingEdit ? .7 : 1, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 40 }}>
                {savingEdit ? (isFR ? "Enregistrement…" : "Saving…") : (isFR ? "Enregistrer" : "Save")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generate story modal */}
      {showGenerateModal && (
        <div onClick={() => setShowGenerateModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(61,43,31,.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#FDFAF5", borderRadius: 24, padding: "2rem", maxWidth: 480, width: "100%", boxShadow: "0 16px 60px rgba(61,43,31,.2)", maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.2rem", fontWeight: 600, color: "#3D2B1F", margin: "0 0 1.5rem" }}>
              {isFR ? "Créer une histoire" : "Create a story"}
            </h2>

            {/* Style selector */}
            <p style={{ fontSize: ".72rem", fontWeight: 600, color: "#7A5C44", textTransform: "uppercase", letterSpacing: ".08em", margin: "0 0 .75rem" }}>
              {isFR ? "Style narratif" : "Narrative style"}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: ".5rem", marginBottom: "1.5rem" }}>
              {STORY_STYLES.map(s => (
                <button key={s.value} onClick={() => setStoryStyle(storyStyle === s.value ? null : s.value)}
                  style={{ display: "flex", alignItems: "center", gap: ".875rem", padding: ".75rem 1rem", borderRadius: 12, border: `1.5px solid ${storyStyle === s.value ? "#C8813A" : "rgba(61,43,31,.12)"}`, background: storyStyle === s.value ? "rgba(200,129,58,.08)" : "transparent", cursor: "pointer", fontFamily: "inherit", textAlign: "left", transition: "all .12s" }}>
                  <span style={{ fontSize: "1.25rem", flexShrink: 0 }}>{s.icon}</span>
                  <div>
                    <p style={{ fontSize: ".875rem", fontWeight: 600, color: storyStyle === s.value ? "#C8813A" : "#3D2B1F", margin: "0 0 .15rem" }}>{isFR ? s.labelFR : s.labelEN}</p>
                    <p style={{ fontSize: ".75rem", color: "#7A5C44", margin: 0, fontWeight: 300 }}>{isFR ? s.descFR : s.descEN}</p>
                  </div>
                  {storyStyle === s.value && <span style={{ marginLeft: "auto", fontSize: ".85rem", color: "#C8813A", flexShrink: 0 }}>✓</span>}
                </button>
              ))}
            </div>

            {/* Period selector */}
            <p style={{ fontSize: ".72rem", fontWeight: 600, color: "#7A5C44", textTransform: "uppercase", letterSpacing: ".08em", margin: "0 0 .75rem" }}>
              {isFR ? "Période (optionnel)" : "Period (optional)"}
            </p>
            {(() => {
              const firstEntry = entries.length > 0 ? entries[entries.length - 1].entry_date : undefined;
              const lastEntry = entries.length > 0 ? entries[0].entry_date : undefined;
              const today = new Date().toISOString().split("T")[0];
              const maxDate = lastEntry && lastEntry < today ? lastEntry : today;
              return (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".625rem", marginBottom: "1.5rem" }}>
                  <div>
                    <label style={{ fontSize: ".72rem", color: "#7A5C44", display: "block", marginBottom: ".3rem" }}>{isFR ? "Du" : "From"}</label>
                    <input type="date" value={genPeriodStart} min={firstEntry} max={maxDate}
                      onChange={e => setGenPeriodStart(e.target.value)}
                      style={{ width: "100%", padding: ".625rem .875rem", borderRadius: 10, border: "1.5px solid rgba(61,43,31,.15)", background: "#F7F2EA", fontFamily: "inherit", fontSize: ".85rem", color: "#3D2B1F", outline: "none", boxSizing: "border-box" as const }} />
                  </div>
                  <div>
                    <label style={{ fontSize: ".72rem", color: "#7A5C44", display: "block", marginBottom: ".3rem" }}>{isFR ? "Au" : "To"}</label>
                    <input type="date" value={genPeriodEnd} min={firstEntry} max={maxDate}
                      onChange={e => setGenPeriodEnd(e.target.value)}
                      style={{ width: "100%", padding: ".625rem .875rem", borderRadius: 10, border: "1.5px solid rgba(61,43,31,.15)", background: "#F7F2EA", fontFamily: "inherit", fontSize: ".85rem", color: "#3D2B1F", outline: "none", boxSizing: "border-box" as const }} />
                  </div>
                </div>
              );
            })()}
            <p style={{ fontSize: ".75rem", color: "#9A8070", margin: "-.5rem 0 1.5rem", lineHeight: 1.5 }}>
              {isFR ? "Sans période : toutes les entrées sont utilisées." : "Without a period: all entries are used."}
            </p>

            <div style={{ display: "flex", gap: ".75rem" }}>
              <button onClick={() => setShowGenerateModal(false)} style={{ flex: 1, padding: ".75rem 1rem", borderRadius: 100, border: "1.5px solid rgba(61,43,31,.15)", background: "transparent", color: "#7A5C44", fontFamily: "inherit", fontSize: ".875rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 44 }}>
                {isFR ? "Annuler" : "Cancel"}
              </button>
              <button onClick={generateStory} style={{ flex: 2, padding: ".75rem 1rem", borderRadius: 100, border: "none", background: "#C8813A", color: "#FDFAF5", fontFamily: "inherit", fontSize: ".9rem", fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 44 }}>
                {isFR ? "Générer ✨" : "Generate ✨"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxUrl && (
        <div onClick={() => setLightboxUrl(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.85)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", cursor: "pointer" }}>
          <img src={lightboxUrl} alt="" style={{ maxWidth: "100%", maxHeight: "90vh", borderRadius: 12, objectFit: "contain" }} />
          <button onClick={() => setLightboxUrl(null)} style={{ position: "absolute", top: "1rem", right: "1rem", background: "rgba(255,255,255,.15)", border: "none", color: "#fff", width: 36, height: 36, borderRadius: "50%", cursor: "pointer", fontSize: "1.1rem", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>
      )}

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "2rem 1.5rem" }}>

        {/* Page header row: pet name + share button */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(1.25rem, 3vw, 1.75rem)", fontWeight: 600, color: "#3D2B1F", margin: 0 }}>
            {pet?.name ?? ""}
          </h1>
          <button
            onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}/pets/${id}?lang=${locale}`);
              alert(t.pet.link_copied);
            }}
            style={{ display: "inline-flex", alignItems: "center", gap: ".35rem", padding: ".4rem .875rem", borderRadius: 100, border: "1.5px solid rgba(61,43,31,.2)", background: "transparent", color: "#7A5C44", fontSize: ".8rem", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", flexShrink: 0, transition: "border-color .12s, color .12s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#C8813A"; (e.currentTarget as HTMLElement).style.color = "#C8813A"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(61,43,31,.2)"; (e.currentTarget as HTMLElement).style.color = "#7A5C44"; }}
          >
            {t.nav.share_profile}
          </button>
        </div>

        {/* Pet header */}
        <div style={{ background: "#FDFAF5", borderRadius: 20, padding: "1.25rem 1.5rem", marginBottom: "1.5rem", border: "1px solid rgba(61,43,31,.08)", position: "relative" }}>

          {/* Kebab — absolute top-right */}
          <div ref={kebabRef} style={{ position: "absolute", top: "1rem", right: "1rem", zIndex: 10 }}>
            <button
              onClick={() => { setShowKebabMenu(v => !v); setShowDeleteConfirm(false); }}
              style={{ width: 36, height: 36, borderRadius: "50%", border: "1px solid rgba(61,43,31,.12)", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", color: "#7A5C44", fontFamily: "inherit", minHeight: "unset", flexShrink: 0 }}
              aria-label="Options"
            >
              ···
            </button>
            {showKebabMenu && (
              <div style={{ position: "absolute", top: "calc(100% + .5rem)", right: 0, background: "#FDFAF5", border: "1px solid rgba(61,43,31,.1)", borderRadius: 14, boxShadow: "0 8px 30px rgba(61,43,31,.12)", minWidth: 200, overflow: "hidden", zIndex: 60 }}>
                {!showDeleteConfirm ? (
                  <>
                    <Link href={`/dashboard/pets/${id}/edit`} style={{ display: "block", padding: ".75rem 1rem", fontSize: ".875rem", color: "#3D2B1F", textDecoration: "none", fontFamily: "inherit" }} onClick={() => setShowKebabMenu(false)}>
                      {t.pet.edit_profile}
                    </Link>
                    <button onClick={() => { setShowKebabMenu(false); openMemorialModal(); }} style={{ display: "block", width: "100%", padding: ".75rem 1rem", fontSize: ".875rem", color: "#8B6B4A", background: "none", border: "none", borderTop: "1px solid rgba(61,43,31,.06)", textAlign: "left", cursor: "pointer", fontFamily: "inherit" }}>
                      {pet.deceased_at ? (isFR ? "Modifier le mémorial" : "Edit memorial") : t.memorial.mark_passed}
                    </button>
                    <button onClick={() => setShowDeleteConfirm(true)} style={{ display: "block", width: "100%", padding: ".75rem 1rem", fontSize: ".875rem", color: "#A32D2D", background: "none", border: "none", borderTop: "1px solid rgba(61,43,31,.06)", textAlign: "left", cursor: "pointer", fontFamily: "inherit" }}>
                      {t.pet.delete_pet}
                    </button>
                  </>
                ) : (
                  <div style={{ padding: "1rem" }}>
                    <p style={{ fontSize: ".8rem", color: "#3D2B1F", margin: "0 0 .875rem", lineHeight: 1.5 }}>{t.pet.delete_confirm.replace("{name}", pet.name)}</p>
                    <div style={{ display: "flex", gap: ".5rem" }}>
                      <button onClick={() => setShowDeleteConfirm(false)} style={{ flex: 1, padding: ".5rem", borderRadius: 100, border: "1px solid rgba(61,43,31,.15)", background: "transparent", fontSize: ".8rem", color: "#7A5C44", cursor: "pointer", fontFamily: "inherit" }}>{t.pet.delete_cancel}</button>
                      <button onClick={deletePet} disabled={deletingPet} style={{ flex: 1, padding: ".5rem", borderRadius: 100, border: "none", background: "#A32D2D", color: "#fff", fontSize: ".8rem", fontWeight: 500, cursor: "pointer", fontFamily: "inherit", opacity: deletingPet ? .6 : 1 }}>{t.pet.delete_yes}</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Top row: photo + name + breed */}
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", paddingRight: "2.5rem" }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(200,129,58,.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.75rem", flexShrink: 0, overflow: "hidden" }}>
              {pet.photo_url
                ? <img src={pet.photo_url} alt={pet.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : SPECIES_EMOJI[pet.species]}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: ".5rem", flexWrap: "wrap" }}>
                <h1 style={{ fontFamily: "Georgia, serif", fontSize: "1.3rem", fontWeight: 600, color: "#3D2B1F", margin: 0 }}>{pet.name}</h1>
                {pet.deceased_at && (
                  <span style={{ fontSize: ".7rem", background: "rgba(139,107,74,.12)", color: "#8B6B4A", border: "1px solid rgba(139,107,74,.25)", borderRadius: 100, padding: ".2rem .6rem", fontWeight: 500, letterSpacing: ".04em", whiteSpace: "nowrap" }}>
                    🕊️ {t.memorial.badge}
                  </span>
                )}
              </div>
              <p style={{ fontSize: ".82rem", color: "#7A5C44", fontWeight: 300, margin: ".2rem 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {pet.breed || pet.species}{pet.birthdate ? ` · ${t.pet.born} ${new Date(pet.birthdate).toLocaleDateString(dateLocale, { month: "long", year: "numeric" })}` : ""}
              </p>
            </div>
          </div>

          {/* Milestone badge — inline pill below name */}
          {milestones.length > 0 && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: ".5rem", marginTop: ".875rem", background: "rgba(200,129,58,.1)", borderRadius: 100, padding: ".35rem .875rem" }}>
              <span style={{ fontFamily: "Georgia, serif", fontSize: ".95rem", fontWeight: 600, color: "#C8813A" }}>{milestones.length} / {totalMilestoneCount}</span>
              <span style={{ fontSize: ".7rem", color: "#7A5C44" }}>{t.milestones.label}</span>
              {milestones[0] && (() => {
                const localTitle = translateMilestone(milestones[0].type, isFR, milestoneDefinitions, milestones[0].title);
                return <span style={{ fontSize: ".7rem", color: "#C8813A", opacity: .85 }}>· 🏆 {localTitle.slice(0, 20)}{localTitle.length > 20 ? "…" : ""}</span>;
              })()}
            </div>
          )}

          {/* Bio — full width */}
          {pet.bio && (
            <div style={{ marginTop: ".875rem" }}>
              <p style={{
                fontSize: ".85rem", color: "#7A5C44", fontStyle: "italic", margin: 0, lineHeight: 1.55,
                ...(bioExpanded ? {} : { overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" as const }),
              }}>{pet.bio}</p>
              {pet.bio.length > 120 && (
                <button onClick={() => setBioExpanded(v => !v)} style={{ background: "none", border: "none", padding: ".25rem 0 0", cursor: "pointer", fontSize: ".75rem", color: "#C8813A", fontFamily: "inherit", display: "block" }}>
                  {bioExpanded ? (isFR ? "Voir moins" : "See less") : (isFR ? "Voir plus" : "See more")}
                </button>
              )}
            </div>
          )}

          {/* Memorial links — full width */}
          {pet.deceased_at && (
            <div style={{ display: "flex", gap: ".75rem", marginTop: ".875rem", flexWrap: "wrap" }}>
              <Link href={`/memorial/${id}`} style={{ fontSize: ".8rem", color: "#8B6B4A", textDecoration: "none", border: "1px solid rgba(139,107,74,.25)", borderRadius: 100, padding: ".375rem .875rem" }}>
                {t.memorial.view_memorial}
              </Link>
              <button
                onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/memorial/${id}?lang=${locale}`); alert(t.pet.link_copied); }}
                style={{ fontSize: ".8rem", color: "#8B6B4A", background: "none", border: "1px solid rgba(139,107,74,.25)", borderRadius: 100, padding: ".375rem .875rem", cursor: "pointer", fontFamily: "inherit" }}
              >
                {t.memorial.share_memorial}
              </button>
            </div>
          )}
        </div>

        {/* Tab bar */}
        <div style={{ display: "flex", gap: ".375rem", marginBottom: "1.5rem", overflowX: "auto", scrollbarWidth: "none", msOverflowStyle: "none" as const }}>
          {tabs.map(t => (
            <Link
              key={t.key}
              href={`/dashboard/pets/${id}?tab=${t.key}`}
              style={{
                padding: ".5rem 1.125rem", borderRadius: 100, fontSize: ".85rem",
                whiteSpace: "nowrap", textDecoration: "none", flexShrink: 0,
                background: tab === t.key ? "#C8813A" : "rgba(61,43,31,.07)",
                color: tab === t.key ? "#FDFAF5" : "#7A5C44",
                fontWeight: tab === t.key ? 500 : 400,
                transition: "background .15s, color .15s",
              }}
            >
              {t.label}
            </Link>
          ))}
        </div>

        {tab === "journal" && (
          <>
            {/* Mo17 — monthly progress pill */}
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
                  <span style={{ fontSize: ".75rem", color: hasThisMonthStory ? "#6B7B5E" : "#C8813A", fontWeight: 500 }}>
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
                  style={{ flex: "0 0 auto", height: 36, padding: "0 .625rem", borderRadius: 8, border: "1.5px solid #D4C5B0", background: "#F7F2EA", color: "#3D2B1F", fontFamily: "inherit", fontSize: ".875rem", cursor: "pointer", outline: "none" }}
                >
                  <option value="">{isFR ? "Toutes les années" : "All years"}</option>
                  {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <select
                  value={filterMonth ?? ""}
                  onChange={e => setFilterMonth(e.target.value || null)}
                  style={{ flex: "0 0 auto", height: 36, padding: "0 .625rem", borderRadius: 8, border: "1.5px solid #D4C5B0", background: "#F7F2EA", color: "#3D2B1F", fontFamily: "inherit", fontSize: ".875rem", cursor: "pointer", outline: "none" }}
                >
                  <option value="">{isFR ? "Tous les mois" : "All months"}</option>
                  {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
            )}

            {userPlan === "free" && allEntryDates.length >= 5 && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: ".5rem", background: allEntryDates.length >= 9 ? "#C8813A" : "#FFF3E0", border: `1px solid ${allEntryDates.length >= 9 ? "#C8813A" : "#F7C27A"}`, borderRadius: 8, padding: "8px 12px", marginBottom: "1rem" }}>
                <span style={{ fontSize: "13px", color: allEntryDates.length >= 9 ? "#fff" : "#7A5C44", fontWeight: 400 }}>
                  {t.journal.entry_counter.replace("{count}", String(allEntryDates.length))}
                </span>
                <Link href="/dashboard/settings" style={{ fontSize: "13px", color: allEntryDates.length >= 9 ? "#fff" : "#C8813A", fontWeight: 500, textDecoration: "none" }}>
                  {t.journal.upgrade_unlimited}
                </Link>
              </div>
            )}

            <div style={{ background: "#FDFAF5", borderRadius: 20, padding: "1.25rem", marginBottom: "1.5rem", border: "1px solid rgba(61,43,31,.08)" }}>
              <textarea
                value={newEntry}
                onChange={e => { setNewEntry(e.target.value); if (e.target.value.trim()) setEntryError(false); }}
                onFocus={() => setTextareaFocused(true)}
                onBlur={() => setTextareaFocused(false)}
                placeholder={t.journal.placeholder.replace("{name}", pet.name)}
                rows={3}
                maxLength={1000}
                style={{ width: "100%", border: entryError ? "1.5px solid #A32D2D" : "none", background: entryError ? "rgba(163,45,45,.04)" : "transparent", borderRadius: entryError ? 8 : 0, fontFamily: "inherit", fontSize: ".95rem", color: "#3D2B1F", outline: "none", resize: "none", lineHeight: 1.6, boxSizing: "border-box", padding: entryError ? ".5rem" : 0, transition: "border-color .15s" }}
              />
              {entryError && (
                <p style={{ fontSize: ".8rem", color: "#A32D2D", margin: ".25rem 0 0", lineHeight: 1.4 }}>
                  {t.journal.entry_required}
                </p>
              )}
              {(textareaFocused || newEntry.length > 0) && (
                <p style={{ fontSize: ".72rem", textAlign: "right", margin: ".2rem 0 0", color: newEntry.length > 950 ? "#A32D2D" : newEntry.length > 800 ? "#C8813A" : "#9A8070" }}>
                  {newEntry.length} / 1000
                </p>
              )}
              {pendingPhotos.length > 0 && (
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", margin: ".75rem 0" }}>
                  {pendingPhotos.map((photo, i) => (
                    <div key={i} style={{ position: "relative", width: 72, height: 72 }}>
                      <img src={photo.preview} alt="" style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 10 }} />
                      <button onClick={() => removePhoto(i)} style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%", background: "#3D2B1F", color: "#FDFAF5", border: "none", cursor: "pointer", fontSize: "11px", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "unset", padding: 0 }}>×</button>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: ".75rem", flexWrap: "wrap", gap: ".5rem" }}>
                <div style={{ display: "flex", gap: ".5rem", alignItems: "center" }}>
                  <div ref={emojiPickerRef} style={{ position: "relative" }}>
                    <div style={{ position: "relative", display: "inline-block" }}>
                      <button onClick={() => setShowEmojiPicker(v => !v)}
                        style={{ width: 36, height: 36, borderRadius: "50%", border: `1.5px solid ${mood ? "#C8813A" : "rgba(61,43,31,.2)"}`, background: mood ? "rgba(200,129,58,.1)" : "transparent", cursor: "pointer", fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "unset" }}
                        title={isFR ? "Ajouter une émoticône" : "Add an emoji"}>
                        {mood ? (ALL_EMOJIS.find(e => e.value === mood)?.emoji ?? "😊") : "😊"}
                      </button>
                      {mood && (
                        <button onClick={e => { e.stopPropagation(); setMood(null); }}
                          style={{ position: "absolute", top: -5, right: -5, width: 18, height: 18, borderRadius: "50%", background: "rgba(61,43,31,.25)", color: "#3D2B1F", border: "none", cursor: "pointer", fontSize: "9px", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1, padding: 0, fontWeight: 700, minHeight: "unset" }}>
                          ✕
                        </button>
                      )}
                    </div>
                    {showEmojiPicker && (
                      <div style={{ position: "absolute", top: "calc(100% + .5rem)", left: 0, background: "#FDFAF5", border: "1px solid rgba(61,43,31,.1)", borderRadius: 16, boxShadow: "0 8px 30px rgba(61,43,31,.15)", padding: "1rem", zIndex: 60, width: 280, maxHeight: 340, overflowY: "auto" }}>
                        {EMOJI_CATEGORIES.map(cat => (
                          <div key={cat.label} style={{ marginBottom: ".75rem" }}>
                            <p style={{ fontSize: ".65rem", fontWeight: 600, color: "#9A8070", textTransform: "uppercase", letterSpacing: ".08em", margin: "0 0 .4rem" }}>{cat.label}</p>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: ".2rem" }}>
                              {cat.emojis.map(e => (
                                <button key={e.value} onClick={() => { setMood(mood === e.value ? null : e.value); setShowEmojiPicker(false); }}
                                  title={e.label}
                                  style={{ width: 32, height: 32, borderRadius: 8, border: `1.5px solid ${mood === e.value ? "#C8813A" : "transparent"}`, background: mood === e.value ? "rgba(200,129,58,.1)" : "transparent", cursor: "pointer", fontSize: "1.1rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
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
                    <button onClick={() => fileInputRef.current?.click()} style={{ width: 32, height: 32, borderRadius: "50%", border: "1.5px solid rgba(61,43,31,.2)", background: "transparent", cursor: "pointer", fontSize: ".9rem", display: "flex", alignItems: "center", justifyContent: "center", color: "#7A5C44" }} title="Add photos">
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
                    style={{ height: 32, padding: "0 .5rem", borderRadius: 8, border: `1.5px solid ${entryDate !== new Date().toISOString().split("T")[0] ? "#C8813A" : "rgba(61,43,31,.2)"}`, background: entryDate !== new Date().toISOString().split("T")[0] ? "rgba(200,129,58,.08)" : "transparent", fontFamily: "inherit", fontSize: ".78rem", color: "#3D2B1F", outline: "none", cursor: "pointer" }}
                  />
                  <button onClick={addEntry} disabled={saving || (!newEntry.trim() && pendingPhotos.length === 0)} style={{ padding: ".5rem 1.25rem", borderRadius: 100, border: "none", background: "#C8813A", color: "#FDFAF5", fontFamily: "inherit", fontSize: ".85rem", fontWeight: 500, cursor: "pointer", opacity: saving || (!newEntry.trim() && pendingPhotos.length === 0) ? .5 : 1 }}>
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
                <button onClick={() => { if (entries.length >= 3) { setStoryStyle(null); setGenPeriodStart(""); setGenPeriodEnd(""); setShowGenerateModal(true); } }} disabled={generating || entries.length < 3} style={{ width: "100%", padding: ".875rem", borderRadius: 16, border: "1.5px dashed rgba(200,129,58,.4)", background: "rgba(200,129,58,.05)", color: "#C8813A", fontFamily: "inherit", fontSize: ".9rem", fontWeight: 500, cursor: entries.length < 3 ? "not-allowed" : "pointer", marginBottom: "1.5rem", opacity: entries.length < 3 ? .5 : 1 }}>
                  {generating ? generatingMessages[generatingMsgIdx] : t.journal.generate_story.replace("{name}", pet.name)}
                  {entries.length < 3 && <span style={{ fontSize: ".75rem", display: "block", fontWeight: 300, marginTop: ".2rem" }}>{t.journal.add_more.replace("{count}", String(3 - entries.length)).replace("{entries}", 3 - entries.length === 1 ? t.journal.entry : t.journal.entries)}</span>}
                </button>
              );
            })()}

            {filteredEntries.length === 0 ? (
              <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#7A5C44", fontSize: ".9rem" }}>
                {(filterYear || filterMonth) ? (isFR ? "Aucune entrée pour cette période." : "No entries for this period.") : t.journal.no_entries}
              </div>
            ) : groupedEntries.map(group => (
              <div key={group.month} style={{ marginBottom: "2rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
                  <span style={{ fontFamily: "Georgia, serif", fontSize: ".9rem", fontWeight: 600, color: "#7A5C44" }}>{group.month}</span>
                  <div style={{ flex: 1, height: "0.5px", background: "rgba(61,43,31,.1)" }} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}>
                  {group.entries.map(entry => (
                    <div key={entry.id} style={{ background: "#FDFAF5", borderRadius: 16, overflow: "hidden", border: "1px solid rgba(61,43,31,.06)" }}>
                      <div style={{ padding: ".875rem 1rem" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: entry.content.trim() ? ".5rem" : 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: ".5rem", flexWrap: "wrap" }}>
                            <span style={{ fontSize: ".75rem", color: "#7A5C44", fontWeight: 300 }}>
                              {fmtDateOrdinal(new Date(entry.entry_date), isFR, { weekday: "short", month: "short" })}
                            </span>
                            {entry.mood && <span style={{ fontSize: ".9rem" }}>{ALL_EMOJIS.find(m => m.value === entry.mood)?.emoji ?? MOOD_OPTIONS.find(m => m.value === entry.mood)?.emoji}</span>}
                            {currentUserId && entry.user_id !== currentUserId && (
                              <span style={{ fontSize: ".7rem", color: "#9A8070", background: "rgba(61,43,31,.06)", borderRadius: 100, padding: "1px 7px" }}>
                                {t.members.added_by.replace("{name}", memberProfiles[entry.user_id] ?? (isFR ? "Membre" : "Member"))}
                              </span>
                            )}
                          </div>
                          <div ref={entryMenuId === entry.id ? entryMenuRef : null} style={{ position: "relative" }}>
                            <button onClick={() => setEntryMenuId(entryMenuId === entry.id ? null : entry.id)}
                              style={{ width: 32, height: 32, borderRadius: "50%", border: "1px solid rgba(61,43,31,.12)", background: "transparent", cursor: "pointer", fontSize: ".9rem", display: "flex", alignItems: "center", justifyContent: "center", color: "#7A5C44", fontFamily: "inherit", lineHeight: 1, minHeight: "unset", flexShrink: 0 }}>···</button>
                            {entryMenuId === entry.id && !deletingEntryId && (
                              <div style={{ position: "absolute", top: "calc(100% + .3rem)", right: 0, background: "#FDFAF5", border: "1px solid rgba(61,43,31,.1)", borderRadius: 10, boxShadow: "0 4px 16px rgba(61,43,31,.12)", minWidth: 140, zIndex: 30 }}>
                                <button onClick={() => { setEditingEntry(entry); setEditContent(entry.content.trim()); setEditMood(entry.mood ?? null); setEditPhotos(entry.photo_urls ?? []); setEditPendingPhotos([]); setEntryMenuId(null); }}
                                  style={{ display: "block", width: "100%", padding: ".625rem .875rem", fontSize: ".8rem", color: "#3D2B1F", background: "none", border: "none", textAlign: "left", cursor: "pointer", fontFamily: "inherit" }}>
                                  {isFR ? "Modifier" : "Edit"}
                                </button>
                                <button onClick={() => { setDeletingEntryId(entry.id); setEntryMenuId(null); }}
                                  style={{ display: "block", width: "100%", padding: ".625rem .875rem", fontSize: ".8rem", color: "#A32D2D", background: "none", border: "none", borderTop: "1px solid rgba(61,43,31,.06)", textAlign: "left", cursor: "pointer", fontFamily: "inherit" }}>
                                  {isFR ? "Supprimer" : "Delete"}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                        {entry.content.trim() && <p style={{ fontSize: ".9rem", color: "#3D2B1F", lineHeight: 1.65, margin: 0 }}>{entry.content}</p>}
                      </div>
                      {entry.photo_urls && entry.photo_urls.length > 0 && (
                        <div style={{ display: "grid", gridTemplateColumns: entry.photo_urls.length === 1 ? "1fr" : entry.photo_urls.length === 2 ? "1fr 1fr" : "1fr 1fr 1fr", gap: "2px" }}>
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
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* Next chapter indicator */}
            {(() => {
              const now = new Date();
              const firstOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
              const daysUntil = Math.ceil((firstOfNextMonth.getTime() - now.getTime()) / 864e5);
              const thisMonthPrefix = now.toISOString().slice(0, 7);
              const hasThisMonthStory = stories.some(s => s.created_at.slice(0, 7) === thisMonthPrefix);
              const nextDay = firstOfNextMonth.getDate();
              const nextMonthName = firstOfNextMonth.toLocaleDateString(dateLocale, { month: "long" });
              const ordinal = isFR
                ? (nextDay === 1 ? `1er` : `${nextDay}`)
                : (nextDay === 1 ? "1st" : nextDay === 2 ? "2nd" : nextDay === 3 ? "3rd" : `${nextDay}th`);
              const nextDate = isFR ? `${ordinal} ${nextMonthName}` : `${nextMonthName} ${ordinal}`;
              return (
                <div style={{ background: hasThisMonthStory ? "rgba(61,43,31,.04)" : "rgba(200,129,58,.06)", borderRadius: 12, padding: ".625rem 1rem", border: `1px solid ${hasThisMonthStory ? "rgba(61,43,31,.08)" : "rgba(200,129,58,.2)"}`, display: "flex", flexDirection: "column", gap: ".35rem" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: ".5rem", flexWrap: "wrap" }}>
                    <span style={{ fontSize: ".8rem", color: hasThisMonthStory ? "#7A5C44" : "#C8813A", fontWeight: hasThisMonthStory ? 300 : 500 }}>
                      {hasThisMonthStory
                        ? (isFR ? `✓ Chapitre de ${now.toLocaleDateString(dateLocale, { month: "long" })} généré` : `✓ ${now.toLocaleDateString(dateLocale, { month: "long" })} chapter generated`)
                        : (isFR ? `✨ Générez le chapitre de ${now.toLocaleDateString(dateLocale, { month: "long" })}` : `✨ Generate ${now.toLocaleDateString(dateLocale, { month: "long" })}'s chapter`)}
                    </span>
                    <span style={{ fontSize: ".72rem", color: "#9A8070", fontWeight: 300, flexShrink: 0 }}>
                      {isFR ? `Prochain : ${nextDate} (dans ${daysUntil}j)` : `Next: ${nextDate} (in ${daysUntil}d)`}
                    </span>
                  </div>
                  <span style={{ fontSize: ".72rem", color: "#9A8070", fontWeight: 300 }}>
                    {isFR ? "Généré automatiquement" : "Auto-generated"}
                  </span>
                </div>
              );
            })()}
            {/* Generate button — mirrors journal tab CTA */}
            {(() => {
              const generatingMessages = pet ? [
                t.journal.generating_1.replace("{name}", pet.name),
                t.journal.generating_2,
                t.journal.generating_3,
              ] : [t.journal.generating, t.journal.generating_2, t.journal.generating_3];
              return (
                <button
                  onClick={() => { if (entries.length >= 3) { setStoryStyle(null); setGenPeriodStart(""); setGenPeriodEnd(""); setShowGenerateModal(true); } }}
                  disabled={generating || entries.length < 3}
                  style={{ width: "100%", padding: ".875rem", borderRadius: 16, border: "1.5px dashed rgba(200,129,58,.4)", background: "rgba(200,129,58,.05)", color: "#C8813A", fontFamily: "inherit", fontSize: ".9rem", fontWeight: 500, cursor: entries.length < 3 ? "not-allowed" : "pointer", opacity: entries.length < 3 ? .5 : 1 }}
                >
                  {generating ? generatingMessages[generatingMsgIdx] : t.journal.generate_story.replace("{name}", pet.name)}
                  {entries.length < 3 && <span style={{ fontSize: ".75rem", display: "block", fontWeight: 300, marginTop: ".2rem" }}>{t.journal.add_more.replace("{count}", String(3 - entries.length)).replace("{entries}", 3 - entries.length === 1 ? t.journal.entry : t.journal.entries)}</span>}
                </button>
              );
            })()}
            {stories.length === 0 ? (
              <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>✨</div>
                <p style={{ color: "#7A5C44", fontFamily: "Georgia, serif", fontSize: "1rem" }}>{t.stories.no_stories.replace("{name}", pet.name)}</p>
              </div>
            ) : stories.map(story => (
              <div key={story.id}>
              <div style={{ background: "#FDFAF5", borderRadius: 20, padding: "1.5rem", border: "1px solid rgba(61,43,31,.08)" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1rem", gap: ".75rem" }}>
                  <h3 style={{ fontFamily: "Georgia, serif", fontSize: "1.1rem", fontWeight: 600, color: "#3D2B1F", margin: 0 }}>{story.title || `${pet.name}'s Story`}</h3>
                  <span style={{ fontSize: ".72rem", color: "#9A8070", fontWeight: 300, flexShrink: 0 }}>{fmtDateOrdinal(new Date(story.created_at), isFR, { month: "short", year: "numeric" })}</span>
                </div>
                {(story.period_start && story.period_end || story.style) && (
                  <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap", marginBottom: ".875rem", alignItems: "center" }}>
                    {story.period_start && story.period_end && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: ".35rem", background: "rgba(200,129,58,.07)", borderRadius: 100, padding: ".25rem .75rem", fontSize: ".72rem", color: "#C8813A", fontWeight: 500 }}>
                        {fmtDateOrdinal(new Date(story.period_start + "T12:00:00"), isFR, { month: "short" })} – {fmtDateOrdinal(new Date(story.period_end + "T12:00:00"), isFR, { month: "short", year: "numeric" })}
                      </span>
                    )}
                    {story.style && (() => {
                      const s = STORY_STYLES.find(st => st.value === story.style);
                      return s ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: ".3rem", background: "rgba(61,43,31,.05)", borderRadius: 100, padding: ".25rem .75rem", fontSize: ".72rem", color: "#7A5C44", fontWeight: 400 }}>
                          <span>{s.icon}</span>
                          <span>{isFR ? s.labelFR : s.labelEN}</span>
                        </span>
                      ) : null;
                    })()}
                  </div>
                )}
                <div style={{ fontSize: ".9rem", color: "#3D2B1F", lineHeight: 1.75, marginBottom: "1.25rem", fontFamily: "Georgia, serif", fontStyle: "italic" }}>
                  {story.content
                    .replace(/\*\*(INTRO|INTRODUCTION|DÉVELOPPEMENT|DEVELOPPEMENT|DEVELOPMENT|CHUTE|CONCLUSION|ENDING)\*\*/gi, "")
                    .split(/\n{2,}/)
                    .map((para, i) => para.trim())
                    .filter(para => para.length > 0)
                    .map((para, i) => <p key={i} style={{ margin: i === 0 ? "0 0 1rem" : "0 0 1rem" }}>{para}</p>)
                  }
                </div>
                <div style={{ borderTop: "1px solid rgba(61,43,31,.06)", paddingTop: "1rem", display: "flex", gap: ".625rem", flexWrap: "wrap" }}>
                  <button
                    onClick={() => handleShare(story)}
                    disabled={sharingStoryId === story.id}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: ".5rem",
                      background: "transparent",
                      border: "1.5px solid rgba(200,129,58,.35)",
                      color: "#C8813A",
                      borderRadius: 100, padding: ".5rem 1.125rem",
                      fontSize: ".8rem", fontWeight: 500, cursor: "pointer",
                      fontFamily: "inherit", opacity: sharingStoryId === story.id ? .65 : 1,
                      transition: "background .15s, opacity .15s", minHeight: 36,
                    }}
                    onMouseEnter={e => { if (sharingStoryId !== story.id) (e.currentTarget as HTMLElement).style.background = "rgba(200,129,58,.08)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                  >
                    {sharingStoryId === story.id ? (
                      <>
                        <span style={{ fontSize: ".9rem" }}>⏳</span>
                        {t.stories.share_generating}
                      </>
                    ) : (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                        </svg>
                        {t.stories.share_chapter}
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => openShareCard(story)}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: ".5rem",
                      background: "transparent",
                      border: "1.5px solid rgba(61,43,31,.18)",
                      color: "#7A5C44",
                      borderRadius: 100, padding: ".5rem 1.125rem",
                      fontSize: ".8rem", fontWeight: 500, cursor: "pointer",
                      fontFamily: "inherit",
                      transition: "background .15s", minHeight: 36,
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(61,43,31,.05)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                      <polyline points="21 15 16 10 5 21"/>
                    </svg>
                    {t.stories.share_card_open}
                  </button>
                </div>
              </div>
              {userPlan === "free" && (
                <div style={{ background: "#FFF3E0", borderRadius: 12, padding: "20px", border: "1px solid rgba(200,129,58,.2)" }}>
                  <p style={{ fontSize: ".875rem", color: "#3D2B1F", lineHeight: 1.6, margin: "0 0 1rem", fontFamily: "Georgia, serif" }}>
                    {t.stories.free_upsell_text}
                  </p>
                  <Link
                    href="/dashboard/settings"
                    style={{ display: "inline-block", padding: ".625rem 1.25rem", borderRadius: 100, background: "#C8813A", color: "#FDFAF5", fontSize: ".875rem", fontWeight: 500, textDecoration: "none" }}
                  >
                    {t.stories.free_upsell_cta}
                  </Link>
                  <p style={{ fontSize: ".75rem", color: "#9A8070", margin: ".75rem 0 0", fontWeight: 300 }}>
                    {t.stories.free_upsell_refresh}
                  </p>
                </div>
              )}
              </div>
            ))}

            {hasMoreEntries && !filterYear && !filterMonth && (
              <div style={{ textAlign: "center", marginTop: "1rem" }}>
                <button
                  onClick={loadMoreEntries}
                  disabled={loadingMore}
                  style={{ display: "inline-flex", alignItems: "center", gap: ".5rem", padding: ".5rem 1.25rem", borderRadius: 100, border: "1.5px solid rgba(61,43,31,.2)", background: "transparent", color: "#7A5C44", fontSize: ".8rem", fontFamily: "inherit", cursor: loadingMore ? "wait" : "pointer", opacity: loadingMore ? .6 : 1 }}
                >
                  {loadingMore ? (isFR ? "Chargement…" : "Loading…") : (isFR ? "Charger plus" : "Load more")}
                </button>
              </div>
            )}
          </div>
        )}

        {tab === "milestones" && (
          <div>
            {/* Auto-detection info box */}
            <div style={{ background: "rgba(200,129,58,.06)", borderRadius: 14, padding: ".875rem 1rem", marginBottom: "1.25rem", border: "1px solid rgba(200,129,58,.2)", display: "flex", gap: ".625rem", alignItems: "flex-start" }}>
              <span style={{ fontSize: "1rem", flexShrink: 0, marginTop: ".05rem" }}>💡</span>
              <p style={{ fontSize: ".8rem", color: "#7A5C44", margin: 0, lineHeight: 1.55 }}>
                {t.milestones.auto_hint}
              </p>
            </div>

            {/* Progress bar */}
            <div style={{ background: "#FDFAF5", borderRadius: 16, padding: "1rem 1.25rem", marginBottom: "1.25rem", border: "1px solid rgba(61,43,31,.08)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: ".625rem" }}>
                <span style={{ fontSize: ".85rem", fontWeight: 500, color: "#3D2B1F" }}>
                  {milestones.length} / {totalMilestoneCount} {t.milestones.steps_completed}
                </span>
                <span style={{ fontSize: ".8rem", color: "#C8813A", fontWeight: 600 }}>
                  {Math.round(milestones.length / (totalMilestoneCount) * 100)}%
                </span>
              </div>
              <div style={{ height: 6, borderRadius: 100, background: "rgba(61,43,31,.1)", overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 100, background: "#C8813A", width: `${milestones.length / (totalMilestoneCount) * 100}%`, transition: "width .5s ease" }} />
              </div>
            </div>

            {(() => {
              // Build full list with achieved flag, then sort:
              // 1. achieved first, 2. alphabetical within each group
              const definedItems = (milestoneDefinitions.length
                ? milestoneDefinitions.map(def => ({ key: def.key, icon: def.icon ?? "🏆", localTitle: isFR ? def.name_fr : def.name_en, keywords: def.keywords ?? [] }))
                : MILESTONE_TYPES.map(mt => ({ key: mt.type, icon: mt.icon, localTitle: isFR ? mt.titleFR : mt.title, keywords: mt.keywords }))
              ).map(item => ({ ...item, achieved: milestones.find(m => m.type === item.key) ?? null }));

              // Orphan milestones: recorded in DB but not present in milestone_definitions
              // (e.g. "in_memory" set when marking a pet as deceased, or legacy "first_entry")
              const definedKeys = new Set(definedItems.map(i => i.key));
              const orphanItems = milestones
                .filter(m => !definedKeys.has(m.type))
                .map(m => {
                  const fallback = MILESTONE_TYPES.find(mt => mt.type === m.type);
                  return {
                    key: m.type,
                    icon: fallback?.icon ?? "🏆",
                    localTitle: fallback ? (isFR ? fallback.titleFR : fallback.title) : (m.title ?? m.type),
                    keywords: fallback?.keywords ?? [],
                    achieved: m,
                  };
                });

              const allItems = [...definedItems, ...orphanItems].sort((a, b) => {
                if (!!a.achieved !== !!b.achieved) return a.achieved ? -1 : 1;
                return a.localTitle.localeCompare(b.localTitle, isFR ? "fr" : "en", { sensitivity: "base" });
              });

              const achievedItems = allItems.filter(i => i.achieved);
              const pendingItems = allItems.filter(i => !i.achieved);

              const renderItem = ({ key, icon, localTitle, achieved, keywords }: typeof allItems[number]) => {
                const lockHint = !achieved && keywords.length > 0
                  ? t.milestones.unlock_hint.replace("{keyword}", isFR ? (keywords[1] ?? keywords[0]) : keywords[0])
                  : null;
                return (
                  <div key={key} style={{ background: "#FDFAF5", borderRadius: 14, padding: ".875rem 1.125rem", border: `1px solid ${achieved ? "rgba(200,129,58,.2)" : "rgba(61,43,31,.06)"}`, display: "flex", alignItems: "center", gap: ".875rem", opacity: achieved ? 1 : 0.6 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: achieved ? "rgba(200,129,58,.12)" : "rgba(61,43,31,.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.15rem", flexShrink: 0 }}>
                      {achieved ? icon : "🔒"}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: ".875rem", fontWeight: 500, color: achieved ? "#3D2B1F" : "#7A5C44", margin: "0 0 .15rem" }}>{localTitle}</p>
                      <p style={{ fontSize: ".72rem", color: achieved ? "#7A5C44" : "#9A8070", margin: 0, fontWeight: 300 }}>
                        {achieved
                          ? fmtDateOrdinal(new Date(achieved.achieved_at), isFR, { month: "long", year: "numeric" })
                          : (lockHint ?? t.milestones.not_yet)}
                      </p>
                    </div>
                    {achieved && <span style={{ fontSize: ".9rem", flexShrink: 0 }}>✅</span>}
                  </div>
                );
              };

              return (
                <div style={{ display: "flex", flexDirection: "column", gap: ".625rem" }}>
                  {achievedItems.length > 0 && (
                    <>
                      <p style={{ fontSize: ".68rem", fontWeight: 600, color: "#C8813A", textTransform: "uppercase", letterSpacing: ".08em", margin: "0 0 .1rem", fontFamily: "sans-serif" }}>
                        {t.milestones.unlocked.replace("{n}", String(achievedItems.length))}
                      </p>
                      {achievedItems.map(renderItem)}
                    </>
                  )}
                  {pendingItems.length > 0 && (
                    <>
                      <p style={{ fontSize: ".68rem", fontWeight: 600, color: "#9A8070", textTransform: "uppercase", letterSpacing: ".08em", margin: `${achievedItems.length > 0 ? ".5rem" : "0"} 0 .1rem`, fontFamily: "sans-serif" }}>
                        {t.milestones.locked.replace("{n}", String(pendingItems.length))}
                      </p>
                      {pendingItems.map(renderItem)}
                    </>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* ── Tributes moderation (deceased pets only) ──────────────────── */}
        {tab === "tributes" && pet?.deceased_at && (
          <div>
            <div style={{ background: "rgba(200,129,58,.06)", borderRadius: 14, padding: ".875rem 1rem", marginBottom: "1.25rem", border: "1px solid rgba(200,129,58,.2)", display: "flex", gap: ".625rem", alignItems: "flex-start" }}>
              <span style={{ fontSize: "1rem", flexShrink: 0, marginTop: ".05rem" }}>🕊️</span>
              <p style={{ fontSize: ".8rem", color: "#7A5C44", margin: 0, lineHeight: 1.55 }}>
                {isFR
                  ? "Les hommages soumis par les proches apparaissent ici avant publication. Approuvez ceux que vous souhaitez afficher sur la page mémorial."
                  : "Tributes submitted by family and friends appear here before publishing. Approve the ones you want to display on the memorial page."}
              </p>
            </div>

            {!tributesLoaded ? (
              <p style={{ fontSize: ".85rem", color: "#9A8070", fontStyle: "italic" }}>{isFR ? "Chargement…" : "Loading…"}</p>
            ) : pendingTributes.length === 0 ? (
              <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#9A8070", fontSize: ".9rem" }}>
                <div style={{ fontSize: "2rem", marginBottom: ".75rem" }}>🕊️</div>
                <p style={{ margin: 0, fontStyle: "italic" }}>
                  {isFR ? "Aucun hommage en attente de validation." : "No tributes pending review."}
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {pendingTributes.map(tribute => (
                  <div key={tribute.id} style={{ background: "#FDFAF5", borderRadius: 16, padding: "1.125rem 1.25rem", border: "1px solid rgba(61,43,31,.08)" }}>
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: ".5rem" }}>
                      <span style={{ fontSize: ".9rem", fontWeight: 600, color: "#3D2B1F" }}>{tribute.author_name}</span>
                      <span style={{ fontSize: ".72rem", color: "#9A8070" }}>
                        {new Date(tribute.created_at).toLocaleDateString(dateLocale, { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    </div>
                    <p style={{ fontSize: ".875rem", color: "#7A5C44", lineHeight: 1.65, margin: "0 0 1rem", fontStyle: "italic" }}>
                      {tribute.message}
                    </p>
                    <div style={{ display: "flex", gap: ".625rem" }}>
                      <button
                        onClick={async () => {
                          const res = await fetch(`/api/memorial/tributes/${tribute.id}/approve`, { method: "POST" });
                          if (res.ok) setPendingTributes(prev => prev.filter(t => t.id !== tribute.id));
                        }}
                        style={{ display: "inline-flex", alignItems: "center", gap: ".35rem", padding: ".5rem 1rem", borderRadius: 100, background: "#C8813A", color: "#FDFAF5", border: "none", cursor: "pointer", fontSize: ".8rem", fontWeight: 500, fontFamily: "inherit" }}
                      >
                        ✓ {isFR ? "Approuver" : "Approve"}
                      </button>
                      <button
                        onClick={async () => {
                          const res = await fetch(`/api/memorial/tributes/${tribute.id}/reject`, { method: "POST" });
                          if (res.ok) setPendingTributes(prev => prev.filter(t => t.id !== tribute.id));
                        }}
                        style={{ display: "inline-flex", alignItems: "center", gap: ".35rem", padding: ".5rem 1rem", borderRadius: 100, background: "transparent", color: "#9A8070", border: "1.5px solid rgba(61,43,31,.12)", cursor: "pointer", fontSize: ".8rem", fontFamily: "inherit" }}
                      >
                        {isFR ? "Rejeter" : "Reject"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Household members tab ────────────────────────────────────────── */}
        {tab === "members" && (
          <div style={{ padding: "0 1.5rem 2rem" }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "#3D2B1F", margin: "0 0 .5rem", fontFamily: "Georgia, serif" }}>
              {t.members.title}
            </h2>
            <p style={{ fontSize: ".85rem", color: "#7A5C44", margin: "0 0 1.5rem", lineHeight: 1.5 }}>
              {t.members.subtitle}
            </p>

            {/* Upgrade upsell for non-paid plan owners */}
            {(userPlan === "free" || userPlan === "book_only") && (
              <div style={{ background: "#FFF3E0", border: "1px solid #F7C27A", borderRadius: 14, padding: "1.25rem 1.5rem", marginBottom: "1.5rem" }}>
                <p style={{ fontWeight: 600, color: "#3D2B1F", margin: "0 0 .4rem", fontSize: ".95rem" }}>{t.members.upgrade_title}</p>
                <p style={{ color: "#7A5C44", fontSize: ".85rem", margin: "0 0 1rem", lineHeight: 1.5 }}>{t.members.upgrade_desc}</p>
                <a href="/dashboard/upgrade" style={{ display: "inline-block", background: "#C8813A", color: "#FDFAF5", textDecoration: "none", padding: "10px 20px", borderRadius: 100, fontWeight: 600, fontSize: ".85rem", fontFamily: "inherit" }}>
                  {t.members.upgrade_cta}
                </a>
              </div>
            )}

            {/* Invite form — for paid plan owners */}
            {(userPlan === "digital" || userPlan === "print") && (
              <div style={{ background: "#FDFAF5", border: "1px solid rgba(61,43,31,.1)", borderRadius: 14, padding: "1.25rem 1.5rem", marginBottom: "1.5rem" }}>
                <label style={{ display: "block", fontSize: ".8rem", fontWeight: 500, color: "#7A5C44", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: ".5rem" }}>
                  {t.members.invite_label}
                </label>
                <div style={{ display: "flex", gap: ".625rem", flexWrap: "wrap" }}>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={e => { setInviteEmail(e.target.value); setInviteResult(null); }}
                    placeholder={t.members.invite_placeholder}
                    style={{ flex: 1, minWidth: 200, padding: "10px 14px", borderRadius: 8, border: "1.5px solid #D4C5B0", background: "#F7F2EA", color: "#3D2B1F", fontSize: ".9rem", fontFamily: "inherit", outline: "none" }}
                  />
                  <button
                    disabled={inviteLoading || !inviteEmail.trim()}
                    onClick={async () => {
                      setInviteLoading(true);
                      setInviteResult(null);
                      const res = await fetch("/api/pet-members", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ petId: id, email: inviteEmail.trim() }),
                      });
                      const data = await res.json();
                      setInviteLoading(false);
                      if (res.ok) {
                        setInviteResult({ success: true, resent: data.resent });
                        setInviteEmail("");
                        setMembersLoaded(false); // reload list
                      } else {
                        const errKey = data.error as string;
                        const errMsg =
                          errKey === "cannot_invite_self" ? t.members.error_cannot_invite_self :
                          errKey === "already_member" ? t.members.error_already_member :
                          errKey === "member_limit" ? t.members.error_member_limit :
                          errKey === "upgrade_required" ? t.members.error_upgrade_required :
                          errKey === "Invalid email" ? t.members.error_invalid_email :
                          t.members.error_generic;
                        setInviteResult({ error: errMsg });
                      }
                    }}
                    style={{ padding: "10px 18px", borderRadius: 100, background: "#C8813A", color: "#FDFAF5", border: "none", cursor: inviteLoading || !inviteEmail.trim() ? "not-allowed" : "pointer", fontWeight: 600, fontSize: ".85rem", fontFamily: "inherit", opacity: inviteLoading || !inviteEmail.trim() ? .6 : 1, flexShrink: 0 }}
                  >
                    {inviteLoading ? t.members.invite_sending : t.members.invite_cta}
                  </button>
                </div>
                {inviteResult?.success && (
                  <p style={{ color: "#2E7D32", fontSize: ".8rem", margin: ".6rem 0 0" }}>
                    ✓ {inviteResult.resent ? t.members.invite_resent : t.members.invite_success}
                  </p>
                )}
                {inviteResult?.error && (
                  <p style={{ color: "#A32D2D", fontSize: ".8rem", margin: ".6rem 0 0" }}>{inviteResult.error}</p>
                )}
                <p style={{ color: "#9A8070", fontSize: ".75rem", margin: ".75rem 0 0" }}>{t.members.max_members}</p>
              </div>
            )}

            {/* Member list */}
            {!membersLoaded ? (
              <p style={{ color: "#9A8070", fontSize: ".85rem", fontStyle: "italic" }}>{isFR ? "Chargement…" : "Loading…"}</p>
            ) : members.length === 0 ? (
              <p style={{ color: "#9A8070", fontSize: ".875rem", fontStyle: "italic", textAlign: "center", padding: "2rem 0" }}>{t.members.empty}</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: ".625rem" }}>
                {members.map(member => (
                  <div key={member.id} style={{ background: "#FDFAF5", border: "1px solid rgba(61,43,31,.08)", borderRadius: 12, padding: "1rem 1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: "0 0 .2rem", fontWeight: 500, color: "#3D2B1F", fontSize: ".9rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {member.display_name}
                      </p>
                      <p style={{ margin: 0, fontSize: ".75rem", color: "#9A8070", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {member.invited_email}
                      </p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: ".625rem", flexShrink: 0 }}>
                      <span style={{
                        fontSize: ".72rem", fontWeight: 500, padding: "3px 10px", borderRadius: 100,
                        background: member.status === "accepted" ? "rgba(46,94,30,.1)" : "rgba(61,43,31,.07)",
                        color: member.status === "accepted" ? "#2E5E1E" : "#7A5C44",
                      }}>
                        {member.status === "accepted" ? t.members.status_accepted : t.members.status_pending}
                      </span>
                      {revokeConfirmId === member.id ? (
                        <div style={{ display: "flex", gap: ".4rem" }}>
                          <button
                            onClick={async () => {
                              const res = await fetch(`/api/pet-members/${member.id}/revoke`, { method: "POST" });
                              if (res.ok) {
                                setMembers(prev => prev.filter(m => m.id !== member.id));
                              }
                              setRevokeConfirmId(null);
                            }}
                            style={{ padding: "5px 12px", borderRadius: 100, background: "#A32D2D", color: "#fff", border: "none", cursor: "pointer", fontSize: ".78rem", fontWeight: 500, fontFamily: "inherit" }}>
                            {t.members.revoke_yes}
                          </button>
                          <button
                            onClick={() => setRevokeConfirmId(null)}
                            style={{ padding: "5px 12px", borderRadius: 100, background: "transparent", color: "#7A5C44", border: "1px solid rgba(61,43,31,.15)", cursor: "pointer", fontSize: ".78rem", fontFamily: "inherit" }}>
                            {t.members.revoke_no}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setRevokeConfirmId(member.id)}
                          style={{ padding: "5px 12px", borderRadius: 100, background: "transparent", color: "#9A8070", border: "1px solid rgba(61,43,31,.12)", cursor: "pointer", fontSize: ".78rem", fontFamily: "inherit" }}>
                          {t.members.revoke_cta}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── Coach marks ─────────────────────────────────────────────────────── */}
      {/* 1. First entry added → push to generate AI story */}
      {entries.length >= 1 && stories.length === 0 && (
        <CoachMark
          id="first_entry"
          title={isFR ? "✨ Génère ta première histoire IA" : "✨ Generate your first AI story"}
          body={isFR
            ? "Tu as ajouté ta première entrée ! Rends-toi dans l'onglet Histoires pour créer un récit magique."
            : "You added your first entry! Head to the Stories tab to create a magical narrative."}
          cta={isFR ? "Voir les histoires" : "See stories"}
          ctaHref={`/dashboard/pets/${id}?tab=stories`}
          delay={1500}
        />
      )}

      {/* 2. First story generated → push to create book */}
      {stories.length >= 1 && (
        <CoachMark
          id="first_story"
          title={isFR ? "📖 Ton livre prend forme" : "📖 Your book is taking shape"}
          body={isFR
            ? "Avec plusieurs histoires, tu peux créer un livre imprimé. Plus tu en génères, plus le livre sera riche."
            : "With several stories, you can create a printed book. The more you generate, the richer it gets."}
          cta={isFR ? "Créer mon livre" : "Create my book"}
          ctaHref={`/dashboard/pets/${id}/order`}
          delay={2000}
        />
      )}

      {/* 3. Print plan with unused book credit */}
      {userPlan === "print" && bookCredits > 0 && (
        <CoachMark
          id="book_credit"
          title={isFR ? "🎁 Tu as un livre offert !" : "🎁 You have a free book!"}
          body={isFR
            ? "Ton abonnement Print inclut un livre offert par an. Il t'attend — commence ta configuration."
            : "Your Print plan includes one free book per year. It's waiting for you — start your configuration."}
          cta={isFR ? "Configurer mon livre" : "Configure my book"}
          ctaHref={`/dashboard/pets/${id}/order`}
          delay={2500}
        />
      )}
    </div>
  );
}

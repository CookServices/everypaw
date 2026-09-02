import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/image";

/** Photos attached to an entry before it is saved. */
export const MAX_ENTRY_PHOTOS = 5;

const todayISO = () => new Date().toISOString().split("T")[0];

export type EntryComposer = ReturnType<typeof useEntryComposer>;

/**
 * Everything the "add a moment" form owns: text, mood, date, pending photos,
 * the emoji picker and the validation error.
 *
 * Pulled out of the pet page so the journal tab can be a component with a
 * handful of props instead of thirty. The hook deliberately stops at the
 * composer's own state: saving an entry also touches entries, milestones and
 * the upsell modal, which belong to the page, so `addEntry` stays there and
 * calls `reset()` when it is done.
 */
export function useEntryComposer(petId: string) {
  const [text, setText] = useState("");
  const [mood, setMood] = useState<string | null>(null);
  const [date, setDate] = useState(todayISO);
  const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([]);
  const [error, setError] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [textareaFocused, setTextareaFocused] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  // Close the emoji picker on any click outside it.
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setEmojiPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const selected = files.slice(0, MAX_ENTRY_PHOTOS - photos.length);
    const newPhotos = selected.map(file => ({ file, preview: URL.createObjectURL(file) }));
    setPhotos(prev => [...prev, ...newPhotos]);
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  /** Uploads the pending photos and returns the public URLs that made it. */
  const uploadPhotos = async (userId: string): Promise<string[]> => {
    const supabase = createClient();
    const urls: string[] = [];
    for (const { file } of photos) {
      const compressed = await compressImage(file);
      const filename = `${userId}/${petId}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
      const { error: uploadError } = await supabase.storage.from("pet-photos").upload(filename, compressed, { contentType: "image/jpeg" });
      if (!uploadError) {
        const { data } = supabase.storage.from("pet-photos").getPublicUrl(filename);
        urls.push(data.publicUrl);
      }
    }
    return urls;
  };

  /** Back to an empty form, as after a successful save. */
  const reset = () => {
    setText("");
    setPhotos([]);
    setDate(todayISO());
  };

  const isEmpty = !text.trim() && photos.length === 0;

  return {
    text, setText,
    mood, setMood,
    date, setDate,
    photos,
    error, setError,
    emojiPickerOpen, setEmojiPickerOpen,
    textareaFocused, setTextareaFocused,
    fileInputRef,
    emojiPickerRef,
    handlePhotoSelect,
    removePhoto,
    uploadPhotos,
    reset,
    isEmpty,
  };
}

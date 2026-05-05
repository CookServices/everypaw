export type Species = "dog" | "cat" | "rabbit" | "bird" | "other";
export type Mood = "happy" | "funny" | "tender" | "sad" | "proud";
export type StoryStatus = "draft" | "ready" | "ordered";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Pet {
  id: string;
  user_id: string;
  name: string;
  species: Species;
  breed: string | null;
  birthdate: string | null;
  photo_url: string | null;
  bio: string | null;
  created_at: string;
}

export interface Entry {
  id: string;
  pet_id: string;
  user_id: string;
  content: string;
  photo_urls: string[];
  mood: Mood | null;
  tags: string[];
  entry_date: string;
  created_at: string;
}

export interface Story {
  id: string;
  pet_id: string;
  user_id: string;
  title: string | null;
  content: string;
  period_start: string | null;
  period_end: string | null;
  status: StoryStatus;
  created_at: string;
}

import { createClient } from "@supabase/supabase-js";

export type ParticipantRow = {
  id: string;
  event_id: string;
  name: string;
  created_at: string;
};

export type AvailabilitySlotRow = {
  participant_id: string;
  slot_key: string;
  created_at: string;
};

export type ProjectRow = {
  id: string;
  event_id: string;
  name: string;
  created_at: string;
};

export type ProjectMemberRow = {
  project_id: string;
  participant_id: string;
};

export type EventDay = {
  key: string;
  label: string;
  date: string;
};

export type EventRow = {
  id: string;
  slug: string;
  title: string;
  days: EventDay[];
  created_at: string;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: false,
      },
    })
  : null;

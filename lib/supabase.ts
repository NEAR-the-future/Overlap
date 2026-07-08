import { createClient } from "@supabase/supabase-js";

export type ParticipantRow = {
  id: string;
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
  name: string;
  created_at: string;
};

export type ProjectMemberRow = {
  project_id: string;
  participant_id: string;
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

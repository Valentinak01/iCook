import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config.js';

// null, solange keine Zugangsdaten eingetragen sind – die App läuft dann rein lokal
export const supabaseClient =
  SUPABASE_URL && SUPABASE_ANON_KEY && typeof createClient === 'function'
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

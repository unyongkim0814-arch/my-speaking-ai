import { createClient } from '@supabase/supabase-js';
import { SUPABASE_DB_URL, SUPABASE_DB_PUBLIC_KEY } from '$env/static/private';

export const supabase = createClient(SUPABASE_DB_URL, SUPABASE_DB_PUBLIC_KEY);

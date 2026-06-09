// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js';

// NOTA: Estas variables se configurarán en el archivo .env una vez iniciada la integración
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-url.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

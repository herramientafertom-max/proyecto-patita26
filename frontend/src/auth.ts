import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Solo la URL del proyecto y la clave pública (anon/publishable) llegan al navegador;
// la autorización real la resuelve el backend desde la base de datos vía auth_user_id.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

export const supabase: SupabaseClient | null = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true } })
  : null;

export async function signInWithPassword(email: string, password: string): Promise<string> {
  if (!supabase) throw new Error('El acceso con cuenta no está configurado.');
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session) throw new Error('Correo o contraseña incorrectos.');
  return data.session.access_token;
}

export async function signOut() {
  await supabase?.auth.signOut();
}

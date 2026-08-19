import { createClient } from '@supabase/supabase-js'

// Përdoret VETËM te dashboard (client-side), për Realtime — leximet e tjera
// të serverit shkojnë përmes Prisma (lib/prisma.ts). Anon key është publik
// nga dizajni i Supabase, por RLS (Row Level Security) duhet aktivizuar te
// çdo tabelë përpara se dashboard-i të vihet online publikisht (shih README).
export const supabaseBrowser = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

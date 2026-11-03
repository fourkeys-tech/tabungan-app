import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

  const rememberMe = cookieStore.get('tabungku_remember')?.value === 'true';
  const MAX_SESSION_SECONDS = 10 * 60 * 60; // 10 jam batas maksimal

  return createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              const customOptions: any = { ...options };

              if (!rememberMe) {
                // OPSI 1: Session Cookie murni (otomatis terhapus saat browser ditutup)
                delete customOptions.maxAge;
                delete customOptions.expires;
              } else {
                // OPSI 2: Batas waktu maksimal 10 jam
                customOptions.maxAge = Math.min(customOptions.maxAge ?? MAX_SESSION_SECONDS, MAX_SESSION_SECONDS);
              }

              cookieStore.set(name, value, customOptions)
            })
          } catch (error) {
          }
        },
      },
    }
  )
}

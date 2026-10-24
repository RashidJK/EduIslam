import { z } from 'zod';

const optionalUrl = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined))
  .pipe(z.url().optional());

const EnvSchema = z.object({
  VITE_SUPABASE_URL: optionalUrl,
  VITE_SUPABASE_ANON_KEY: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined)),
  VITE_QURAN_PROVIDER: z.enum(['alquran-cloud']).default('alquran-cloud'),
  VITE_QURAN_API_BASE: z.url().default('https://api.alquran.cloud/v1'),
});

export type AppEnv = z.infer<typeof EnvSchema>;

export function parseEnv(raw: Record<string, unknown>): AppEnv {
  const result = EnvSchema.safeParse(raw);
  if (!result.success) {
    // Misconfiguration should be loud in development but must not crash learners' sessions.
    console.error('Invalid environment configuration', z.treeifyError(result.error));
    return EnvSchema.parse({});
  }
  return result.data;
}

export const env = parseEnv(import.meta.env);

export const isSupabaseConfigured = Boolean(env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY);

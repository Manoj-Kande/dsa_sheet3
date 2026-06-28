function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required environment variable: ${key}`);
  return val;
}

export const env = {
  DATABASE_URL:                      requireEnv("DATABASE_URL"),
  CLERK_SECRET_KEY:                  requireEnv("CLERK_SECRET_KEY"),
  CLERK_WEBHOOK_SECRET:              requireEnv("CLERK_WEBHOOK_SECRET"),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: requireEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"),
};

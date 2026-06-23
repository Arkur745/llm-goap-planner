import { z } from "zod";

const envSchema = z.object({
  VITE_API_BASE_URL: z.string().url().default("http://localhost:8080"),
  VITE_API_PROXY_TARGET: z.string().url().default("http://localhost:8080"),
  VITE_APP_NAME: z.string().default("LLM-GOAP"),
  VITE_DEFAULT_THEME: z.enum(["light", "dark", "system"]).default("system"),
});

const parsedEnv = envSchema.safeParse(import.meta.env);

if (!parsedEnv.success) {
  throw new Error("Invalid Vite environment configuration");
}

export const env = parsedEnv.data;

export type AppEnv = typeof env;

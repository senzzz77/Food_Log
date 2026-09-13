import dotenv from "dotenv";
import { resolve } from "node:path";
import { z } from "zod";

dotenv.config({ path: resolve(process.cwd(), "server/.env") });

const configSchema = z.object({
  API_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  API_HOST: z.string().default("127.0.0.1"),
  CORS_ORIGIN: z.string().url().default("http://127.0.0.1:5173"),
  DATABASE_HOST: z.string().default("127.0.0.1"),
  DATABASE_PORT: z.coerce.number().int().default(3307),
  DATABASE_NAME: z.string().default("diet_assistant"),
  DATABASE_USER: z.string().default("diet_app"),
  DATABASE_PASSWORD: z.string().default("diet_app_dev_password"),
  JWT_SECRET: z.string().min(32).default("local-development-secret-change-before-public-deployment"),
  DASHSCOPE_API_KEY: z.string().default(""),
  DASHSCOPE_MODEL: z.string().default("qwen3.5-plus"),
  DASHSCOPE_BASE_URL: z.string().default("https://dashscope.aliyuncs.com/compatible-mode/v1"),
});

export const config = configSchema.parse(process.env);

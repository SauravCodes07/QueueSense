import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('8000').transform((v) => parseInt(v, 10)),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().default('file:./dev.db'),
  DIRECT_URL: z.string().optional(),
  JWT_SECRET: z.string().default('queuesense_super_secret_jwt_key_at_least_32_characters_long_12345'),
  JWT_EXPIRES_IN: z.string().default('8h'),
  CORS_ORIGINS: z.string().default('http://localhost:5173,http://localhost:3000'),
  CORS_ORIGIN: z.string().optional(),
  NO_SHOW_GRACE_MINUTES: z.string().default('7').transform((v) => parseInt(v, 10)),
  ETA_NOTIFICATION_THRESHOLD_MINUTES: z.string().default('5').transform((v) => parseInt(v, 10)),
  WEIGHT_COUNT: z.string().default('1.0').transform((v) => parseFloat(v)),
  WEIGHT_DURATION: z.string().default('1.0').transform((v) => parseFloat(v)),
  WEIGHT_REMAINING: z.string().default('1.0').transform((v) => parseFloat(v)),
  WEIGHT_PRIORITY: z.string().default('1.0').transform((v) => parseFloat(v)),
});

export const config = envSchema.parse(process.env);

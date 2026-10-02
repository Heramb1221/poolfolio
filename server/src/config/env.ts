import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load environment variables from .env in current working dir or repository root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/poolfolio?schema=public'),
  JWT_SECRET: z.string().min(16).default('dev-jwt-secret-key-poolfolio-at-least-32-chars-long'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CLIENT_ORIGIN: z.string().default('http://localhost:8081,http://localhost:19006'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  // eslint-disable-next-line no-console
  console.error('❌ Invalid environment variables:', JSON.stringify(parsedEnv.error.format(), null, 2));
  process.exit(1);
}

export const env = {
  ...parsedEnv.data,
  corsOrigins: parsedEnv.data.CLIENT_ORIGIN.split(',').map((origin) => origin.trim()),
  isProduction: parsedEnv.data.NODE_ENV === 'production',
  isDevelopment: parsedEnv.data.NODE_ENV === 'development',
  isTest: parsedEnv.data.NODE_ENV === 'test',
};

export type Env = typeof env;

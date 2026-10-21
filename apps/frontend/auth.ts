import { betterAuth } from 'better-auth';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
const secret = process.env.BETTER_AUTH_SECRET;
if (!connectionString || !secret) {
  throw new Error('DATABASE_URL and BETTER_AUTH_SECRET environment variables are required');
}

export const auth = betterAuth({
  database: new Pool({ connectionString }),
  secret,
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3847',
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 6,
  },
  plugins: [],
});

export type Session = typeof auth.$Infer.Session.session;
export type User = typeof auth.$Infer.Session.user;

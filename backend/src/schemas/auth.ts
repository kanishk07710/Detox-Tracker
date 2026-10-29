/**
 * schemas/auth.ts — Zod validation for auth request bodies.
 */
import { z } from 'zod';

export const PASSWORD_MIN_LENGTH = 8;
// bcrypt only uses the first 72 bytes; capping length also prevents huge-body hashing DoS.
export const PASSWORD_MAX_LENGTH = 72;

// Normalise email so "A@x.com" and "a@x.com" are the same account.
const email = z.string().trim().toLowerCase().email('Enter a valid email address').max(254);

export const registerSchema = z.object({
  email,
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
    .max(PASSWORD_MAX_LENGTH, `Password must be at most ${PASSWORD_MAX_LENGTH} characters`),
});

// Login does NOT enforce min length: the rule only matters when choosing a password,
// and a specific message here could hint at what valid passwords look like.
export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required').max(PASSWORD_MAX_LENGTH),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

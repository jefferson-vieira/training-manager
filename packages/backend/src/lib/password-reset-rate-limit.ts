import { env } from '../config/env.js';

interface AttemptWindow {
  count: number;
  windowStartedAt: number;
}

const windowByEmail = new Map<string, AttemptWindow>();

const windowInMs = env.PASSWORD_RESET_RATE_LIMIT_WINDOW * 1000;

// better-auth buckets its own rate limit by IP only, which does nothing against
// flooding one person's inbox from many origins. This counter closes that gap.
//
// It MUST be consumed for every request, whether or not the address has an
// account: counting only real accounts would make the 429 itself reveal which
// addresses exist.
export function consumePasswordResetAttempt(email: string) {
  const now = Date.now();

  pruneExpired(now);

  const key = normalize(email);

  const current = windowByEmail.get(key);

  if (!current || now - current.windowStartedAt > windowInMs) {
    windowByEmail.set(key, { count: 1, windowStartedAt: now });

    return { allowed: true };
  }

  if (current.count >= env.PASSWORD_RESET_RATE_LIMIT_MAX) {
    return { allowed: false };
  }

  current.count += 1;

  return { allowed: true };
}

function normalize(email: string) {
  return email.trim().toLowerCase();
}

function pruneExpired(now: number) {
  for (const [key, window] of windowByEmail) {
    if (now - window.windowStartedAt > windowInMs) {
      windowByEmail.delete(key);
    }
  }
}

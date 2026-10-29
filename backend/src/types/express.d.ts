/**
 * Type augmentation: teaches TypeScript that `requireAuth` attaches `req.user`.
 * WHY: without this, every route would need a cast to read the user id, and a
 * typo like `req.userId` would compile. Declared optional because the property
 * only exists AFTER requireAuth ran.
 */
declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string };
    }
  }
}

export {};

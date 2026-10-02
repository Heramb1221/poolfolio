import argon2 from 'argon2';

/**
 * Hash a plain text password using Argon2id.
 */
export const hashPassword = async (password: string): Promise<string> => {
  return argon2.hash(password, {
    type: argon2.argon2id,
  });
};

/**
 * Verify a plain text password against an Argon2 hash.
 */
export const verifyPassword = async (hash: string, plain: string): Promise<boolean> => {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    return false;
  }
};

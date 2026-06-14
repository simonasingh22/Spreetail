import bcrypt from 'bcrypt';

/**
 * Hashes a plain text password using bcrypt.
 * @param password Plain text password
 * @returns Hashed password
 */
export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS) || 12;
  return bcrypt.hash(password, saltRounds);
};

/**
 * Compares a plain text password with a hash.
 * @param password Plain text password
 * @param hash Brypt hash
 * @returns Promise boolean match
 */
export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

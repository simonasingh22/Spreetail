import jwt from 'jsonwebtoken';

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'fallback_access_secret_key_at_least_64_characters';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret_key_at_least_64_characters';

interface AccessPayload {
  userId: string;
  email: string;
}

interface RefreshPayload {
  userId: string;
  tokenId: string;
}

/**
 * Generates an Access JWT.
 * Expires in 15 minutes.
 */
export const generateAccessToken = (payload: AccessPayload): string => {
  return jwt.sign(payload, JWT_ACCESS_SECRET, { expiresIn: '15m' });
};

/**
 * Generates a Refresh JWT.
 * Expires in 7 days.
 */
export const generateRefreshToken = (payload: RefreshPayload): string => {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });
};

/**
 * Verifies an Access JWT. Throws error if invalid.
 */
export const verifyAccessToken = (token: string): AccessPayload => {
  const decoded = jwt.verify(token, JWT_ACCESS_SECRET);
  return decoded as AccessPayload;
};

/**
 * Verifies a Refresh JWT. Throws error if invalid.
 */
export const verifyRefreshToken = (token: string): RefreshPayload => {
  const decoded = jwt.verify(token, JWT_REFRESH_SECRET);
  return decoded as RefreshPayload;
};

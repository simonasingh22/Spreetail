import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { hashPassword, comparePassword } from '../utils/hash.utils';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken
} from '../utils/jwt.utils';

const prisma = new PrismaClient();

/**
 * Registers a new user.
 */
export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password } = req.body;

    // 1. Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // 2. Hash password
    const passwordHash = await hashPassword(password);

    // 3. Create user in database
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash
      }
    });

    // 4. Generate access token
    const accessToken = generateAccessToken({ userId: user.id, email: user.email });

    // 5. Generate refresh token
    const tokenId = uuidv4();
    const refreshToken = generateRefreshToken({ userId: user.id, tokenId });

    // 6. Save hashed refresh token to DB
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    const hashedRefreshToken = await hashPassword(refreshToken);

    await prisma.refreshToken.create({
      data: {
        id: tokenId,
        userId: user.id,
        token: hashedRefreshToken,
        expiresAt
      }
    });

    // 7. Set refresh token in httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
    });

    // 8. Return success response
    return res.status(201).json({
      data: {
        accessToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        }
      },
      message: 'User registered successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Log in an existing user.
 */
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    // 1. Find user by email
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // 2. Compare passwords
    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // 3. Delete ALL existing refresh tokens for this user (single session rule)
    await prisma.refreshToken.deleteMany({
      where: { userId: user.id }
    });

    // 4. Generate access + refresh tokens
    const accessToken = generateAccessToken({ userId: user.id, email: user.email });
    const tokenId = uuidv4();
    const refreshToken = generateRefreshToken({ userId: user.id, tokenId });

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const hashedRefreshToken = await hashPassword(refreshToken);

    await prisma.refreshToken.create({
      data: {
        id: tokenId,
        userId: user.id,
        token: hashedRefreshToken,
        expiresAt
      }
    });

    // Set cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    // 5. Return success response
    return res.status(200).json({
      data: {
        accessToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        }
      },
      message: 'Logged in successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh the user's access token using a valid refresh token.
 */
export const refresh = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 1. Read refresh token from cookies
    const incomingRefreshToken = req.cookies.refreshToken;
    if (!incomingRefreshToken) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // 2. Verify token signature and expiry
    let decoded;
    try {
      decoded = verifyRefreshToken(incomingRefreshToken);
    } catch (err) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // 3. Find RefreshToken row by tokenId
    const storedToken = await prisma.refreshToken.findUnique({
      where: { id: decoded.tokenId }
    });

    if (!storedToken) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check expiry date manually just in case
    if (new Date() > storedToken.expiresAt) {
      await prisma.refreshToken.delete({ where: { id: storedToken.id } });
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // 4. Compare token hash
    const isMatch = await comparePassword(incomingRefreshToken, storedToken.token);
    if (!isMatch) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // 5. Delete the old token record
    await prisma.refreshToken.delete({
      where: { id: storedToken.id }
    });

    // Fetch user details
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // 6. Generate new access + refresh tokens
    const accessToken = generateAccessToken({ userId: user.id, email: user.email });
    const newTokenId = uuidv4();
    const newRefreshToken = generateRefreshToken({ userId: user.id, tokenId: newTokenId });

    // 7. Save new refresh token
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const hashedNewRefreshToken = await hashPassword(newRefreshToken);

    await prisma.refreshToken.create({
      data: {
        id: newTokenId,
        userId: user.id,
        token: hashedNewRefreshToken,
        expiresAt
      }
    });

    // 8. Set new cookie and return access token
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.status(200).json({
      data: {
        accessToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        }
      },
      message: 'Token refreshed successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Log out user by deleting their refresh token and clearing cookies.
 */
export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 1. Read refresh token from cookies
    const incomingRefreshToken = req.cookies.refreshToken;
    if (!incomingRefreshToken) {
      res.clearCookie('refreshToken');
      return res.status(200).json({ data: { message: 'Logged out successfully' } });
    }

    // 2. Verify token signature and delete it if valid
    try {
      const decoded = verifyRefreshToken(incomingRefreshToken);
      await prisma.refreshToken.delete({
        where: { id: decoded.tokenId }
      }).catch(() => {
        // Ignore errors if token is already gone
      });
    } catch (err) {
      // Ignore token verification errors during logout
    }

    // 3. Clear cookie
    res.clearCookie('refreshToken');

    // 4. Return success
    return res.status(200).json({
      data: {
        message: 'Logged out successfully'
      }
    });
  } catch (error) {
    next(error);
  }
};

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

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: (process.env.NODE_ENV === 'production' ? 'none' : 'lax') as 'none' | 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000
};

const clearCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: (process.env.NODE_ENV === 'production' ? 'none' : 'lax') as 'none' | 'lax'
};

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash
      }
    });

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

    res.cookie('refreshToken', refreshToken, cookieOptions);

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

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await comparePassword(password, user.passwordHash);

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    await prisma.refreshToken.deleteMany({
      where: { userId: user.id }
    });

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

    res.cookie('refreshToken', refreshToken, cookieOptions);

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

export const refresh = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const incomingRefreshToken = req.cookies.refreshToken;

    if (!incomingRefreshToken) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    let decoded;

    try {
      decoded = verifyRefreshToken(incomingRefreshToken);
    } catch (err) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const storedToken = await prisma.refreshToken.findUnique({
      where: { id: decoded.tokenId }
    });

    if (!storedToken) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (new Date() > storedToken.expiresAt) {
      await prisma.refreshToken.delete({
        where: { id: storedToken.id }
      });

      return res.status(401).json({ error: 'Unauthorized' });
    }

    const isMatch = await comparePassword(incomingRefreshToken, storedToken.token);

    if (!isMatch) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await prisma.refreshToken.delete({
      where: { id: storedToken.id }
    });

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const accessToken = generateAccessToken({ userId: user.id, email: user.email });

    const newTokenId = uuidv4();
    const newRefreshToken = generateRefreshToken({
      userId: user.id,
      tokenId: newTokenId
    });

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

    res.cookie('refreshToken', newRefreshToken, cookieOptions);

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

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const incomingRefreshToken = req.cookies.refreshToken;

    if (!incomingRefreshToken) {
      res.clearCookie('refreshToken', clearCookieOptions);

      return res.status(200).json({
        data: {
          message: 'Logged out successfully'
        }
      });
    }

    try {
      const decoded = verifyRefreshToken(incomingRefreshToken);

      await prisma.refreshToken
        .delete({
          where: { id: decoded.tokenId }
        })
        .catch(() => {});
    } catch (err) {}

    res.clearCookie('refreshToken', clearCookieOptions);

    return res.status(200).json({
      data: {
        message: 'Logged out successfully'
      }
    });
  } catch (error) {
    next(error);
  }
};
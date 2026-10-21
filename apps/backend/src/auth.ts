import { type Request, type Response, type NextFunction } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from './session-auth.js';
import { prisma } from './db.js';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'SPONSOR' | 'PUBLISHER' | null;
    sponsorId?: string;
    publisherId?: string;
  };
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
      query: { disableCookieCache: true },
    });
    if (!session?.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const [sponsor, publisher] = await Promise.all([
      prisma.sponsor.findUnique({ where: { userId: session.user.id }, select: { id: true } }),
      prisma.publisher.findUnique({ where: { userId: session.user.id }, select: { id: true } }),
    ]);
    req.user = {
      id: session.user.id,
      email: session.user.email,
      role: sponsor ? 'SPONSOR' : publisher ? 'PUBLISHER' : null,
      sponsorId: sponsor?.id,
      publisherId: publisher?.id,
    };
    next();
  } catch (error) {
    console.error('Error validating session:', error);
    res.status(500).json({ error: 'Failed to authenticate request' });
  }
}

export function roleMiddleware(allowedRoles: Array<'SPONSOR' | 'PUBLISHER'>) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    if (!req.user.role || !allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    next();
  };
}

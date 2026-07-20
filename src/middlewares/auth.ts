import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];

  // Also check cookies if available (in case client is sending via cookie)
  if (!token && req.headers.cookie) {
    const rawCookies = req.headers.cookie.split(';');
    const parsedCookies: Record<string, string> = {};
    rawCookies.forEach(c => {
      const [name, val] = c.trim().split('=');
      if (name && val) parsedCookies[name] = val;
    });
    token = parsedCookies['token'];
  }

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const jwtSecret = process.env.JWT_SECRET || 'projectpilot-secret-key-1234';

  jwt.verify(token, jwtSecret, (err, decoded: any) => {
    if (err) {
      return res.status(403).json({ error: 'Token is invalid or expired' });
    }
    
    req.user = {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name
    };
    next();
  });
};

import { getAuth } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";

export interface AuthedRequest extends Request {
  clerkUserId: string;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const auth = getAuth(req);
  if (!auth?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  (req as AuthedRequest).clerkUserId = auth.userId;
  next();
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const auth = getAuth(req);
  if (auth?.userId) (req as AuthedRequest).clerkUserId = auth.userId;
  next();
}

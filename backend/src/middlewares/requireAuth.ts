import { getAuth } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";
import {
  findLocalSession,
  type PublicUser,
} from "../lib/localAuth";

type AuthenticatedRequest = Request & {
  userId?: string;
  user?: PublicUser;
  localSessionToken?: string;
};

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authMode = process.env.AUTH_MODE ?? "disabled";
  const auth = authMode === "clerk" ? getAuth(req) : undefined;
  const headerUserId = req.header("x-user-id")?.trim();
  let userId = auth?.userId;

  if (authMode === "local") {
    const token = getBearerToken(req);
    const localSession = token ? await findLocalSession(token) : null;

    if (!localSession) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    userId = localSession.user.id;
    (req as AuthenticatedRequest).user = localSession.user;
    (req as AuthenticatedRequest).localSessionToken = token;
  } else if (authMode !== "clerk") {
    userId = headerUserId ?? process.env.DEFAULT_USER_ID ?? "demo-user";
  }

  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  (req as AuthenticatedRequest).userId = userId;
  next();
}

export function getUserId(req: Request): string {
  return (req as AuthenticatedRequest).userId as string;
}

export function getRequestUser(req: Request): PublicUser | undefined {
  return (req as AuthenticatedRequest).user;
}

export function getLocalSessionToken(req: Request): string | undefined {
  return (req as AuthenticatedRequest).localSessionToken;
}

function getBearerToken(req: Request): string | undefined {
  const authorization = req.header("authorization");

  if (!authorization) {
    return undefined;
  }

  const [scheme, token] = authorization.split(/\s+/, 2);
  return scheme?.toLowerCase() === "bearer" && token ? token : undefined;
}

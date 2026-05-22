import {
  createHash,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import {
  SessionModel,
  UserModel,
  type SessionDocument,
  type UserDocument,
} from "../models";

const scrypt = promisify(scryptCallback);
const PASSWORD_KEY_LENGTH = 64;
const SESSION_DAYS = 30;

export type PublicUser = {
  id: string;
  name: string;
  email: string;
};

export type LocalSession = {
  user: PublicUser;
  session: SessionDocument;
};

export async function createLocalUser(input: {
  name: string;
  email: string;
  password: string;
}): Promise<UserDocument> {
  const passwordSalt = randomBytes(16).toString("hex");
  const passwordHash = await hashPassword(input.password, passwordSalt);

  return UserModel.create({
    name: input.name.trim(),
    email: normalizeEmail(input.email),
    passwordHash,
    passwordSalt,
  });
}

export async function verifyLocalCredentials(input: {
  email: string;
  password: string;
}): Promise<UserDocument | null> {
  const user = await UserModel.findOne({ email: normalizeEmail(input.email) });

  if (!user) {
    return null;
  }

  const candidateHash = await hashPassword(input.password, user.passwordSalt);
  const candidate = Buffer.from(candidateHash, "hex");
  const expected = Buffer.from(user.passwordHash, "hex");

  if (candidate.length !== expected.length) {
    return null;
  }

  return timingSafeEqual(candidate, expected) ? user : null;
}

export async function createLocalSession(userId: string): Promise<{
  token: string;
  session: SessionDocument;
}> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DAYS);

  const session = await SessionModel.create({
    userId,
    tokenHash: hashToken(token),
    expiresAt,
  });

  return { token, session };
}

export async function findLocalSession(
  token: string,
): Promise<LocalSession | null> {
  const session = await SessionModel.findOne({
    tokenHash: hashToken(token),
    expiresAt: { $gt: new Date() },
  });

  if (!session) {
    return null;
  }

  const user = await UserModel.findById(session.userId);

  if (!user) {
    await SessionModel.deleteOne({ _id: session._id });
    return null;
  }

  return {
    user: mapPublicUser(user),
    session,
  };
}

export async function deleteLocalSession(token: string): Promise<void> {
  await SessionModel.deleteOne({ tokenHash: hashToken(token) });
}

export function mapPublicUser(user: UserDocument): PublicUser {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
  };
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const derivedKey = (await scrypt(
    password,
    salt,
    PASSWORD_KEY_LENGTH,
  )) as Buffer;

  return derivedKey.toString("hex");
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

import { Router, type IRouter } from "express";
import {
  LoginBody,
  RegisterAccountBody,
} from "@workspace/api-zod";
import { UserModel } from "../models";
import {
  createLocalSession,
  createLocalUser,
  deleteLocalSession,
  mapPublicUser,
  normalizeEmail,
  verifyLocalCredentials,
} from "../lib/localAuth";
import {
  getLocalSessionToken,
  getRequestUser,
  requireAuth,
} from "../middlewares/requireAuth";

const router: IRouter = Router();

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterAccountBody.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { name, email, password } = parsed.data;
  const normalizedEmail = normalizeEmail(email);
  const existingUser = await UserModel.exists({ email: normalizedEmail });

  if (existingUser) {
    res.status(409).json({ error: "Email is already registered." });
    return;
  }

  const user = await createLocalUser({
    name,
    email: normalizedEmail,
    password,
  });
  const { token } = await createLocalSession(user._id.toString());

  res.status(201).json({
    token,
    user: mapPublicUser(user),
  });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, password } = parsed.data;
  const user = await verifyLocalCredentials({ email, password });

  if (!user) {
    res.status(401).json({ error: "Invalid email or password." });
    return;
  }

  const { token } = await createLocalSession(user._id.toString());

  res.json({
    token,
    user: mapPublicUser(user),
  });
});

router.post("/auth/logout", requireAuth, async (req, res): Promise<void> => {
  const token = getLocalSessionToken(req);

  if (token) {
    await deleteLocalSession(token);
  }

  res.sendStatus(204);
});

router.get("/auth/me", requireAuth, (req, res) => {
  const user = getRequestUser(req);

  if (!user) {
    res.status(404).json({ error: "User not found." });
    return;
  }

  res.json({ user });
});

export default router;

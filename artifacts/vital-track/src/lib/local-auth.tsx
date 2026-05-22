import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

export const LOCAL_AUTH_TOKEN_KEY = "vital-track-token";
export const LOCAL_AUTH_USER_KEY = "vital-track-user";
export const LOCAL_AUTH_FIRST_SIGNED_IN_PREFIX = "vital-track-first-signed-in:";
const LOCAL_AUTH_ACCOUNTS_KEY = "vital-track-local-accounts";

export type LocalUser = {
  id: string;
  name: string;
  email: string;
};

type AuthPayload = {
  token: string;
  user: LocalUser;
};

type AuthStatus = "loading" | "authenticated" | "anonymous";

type LocalAuthContextValue = {
  status: AuthStatus;
  user: LocalUser | null;
  signIn: (input: { email: string; password: string }) => Promise<void>;
  signUp: (input: {
    name: string;
    email: string;
    password: string;
  }) => Promise<void>;
  signOut: () => Promise<void>;
};

const LocalAuthContext = createContext<LocalAuthContextValue | null>(null);

export function LocalAuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<LocalUser | null>(null);

  useEffect(() => {
    function handleStoredUserUpdate() {
      const storedUser = readStoredUser();

      if (storedUser) {
        setUser(storedUser);
        setStatus("authenticated");
      }
    }

    window.addEventListener("vital-track-user-updated", handleStoredUserUpdate);

    return () => {
      window.removeEventListener("vital-track-user-updated", handleStoredUserUpdate);
    };
  }, []);

  useEffect(() => {
    const token = localStorage.getItem(LOCAL_AUTH_TOKEN_KEY);

    if (!token) {
      setStatus("anonymous");
      return;
    }

    if (token.startsWith("local:")) {
      const storedUser = readStoredUser();

      if (storedUser) {
        ensureFirstSignedInDate(storedUser);
        setUser(storedUser);
        setStatus("authenticated");
        return;
      }
    }

    void fetch("/api/auth/me", {
      headers: {
        authorization: `Bearer ${token}`,
      },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw await buildAuthError(response);
        }

        return response.json() as Promise<{ user: LocalUser }>;
      })
      .then((data) => {
        localStorage.setItem(LOCAL_AUTH_USER_KEY, JSON.stringify(data.user));
        ensureFirstSignedInDate(data.user);
        setUser(data.user);
        setStatus("authenticated");
      })
      .catch(() => {
        const storedUser = readStoredUser();

        if (storedUser) {
          ensureFirstSignedInDate(storedUser);
          setUser(storedUser);
          setStatus("authenticated");
          return;
        }

        localStorage.removeItem(LOCAL_AUTH_TOKEN_KEY);
        localStorage.removeItem(LOCAL_AUTH_USER_KEY);
        setUser(null);
        setStatus("anonymous");
      });
  }, []);

  const signIn = useCallback(
    async (input: { email: string; password: string }) => {
      try {
        const data = await requestAuth<AuthPayload>("/api/auth/login", {
          method: "POST",
          body: JSON.stringify(input),
        });

        storeAuthSession(data);
        setUser(data.user);
        setStatus("authenticated");
      } catch (error) {
        const data = signInWithLocalAccount(input);

        storeAuthSession(data);
        setUser(data.user);
        setStatus("authenticated");
      }
    },
    [],
  );

  const signUp = useCallback(
    async (input: { name: string; email: string; password: string }) => {
      try {
        const data = await requestAuth<AuthPayload>("/api/auth/register", {
          method: "POST",
          body: JSON.stringify(input),
        });

        storeAuthSession(data);
        setUser(data.user);
        setStatus("authenticated");
      } catch (error) {
        const data = createLocalAccount(input);

        storeAuthSession(data);
        setUser(data.user);
        setStatus("authenticated");
      }
    },
    [],
  );

  const signOut = useCallback(async () => {
    const token = localStorage.getItem(LOCAL_AUTH_TOKEN_KEY);

    if (token) {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
        },
      }).catch(() => undefined);
    }

    localStorage.removeItem(LOCAL_AUTH_TOKEN_KEY);
    localStorage.removeItem(LOCAL_AUTH_USER_KEY);
    setUser(null);
    setStatus("anonymous");
  }, []);

  const value = useMemo(
    () => ({
      status,
      user,
      signIn,
      signUp,
      signOut,
    }),
    [signIn, signOut, signUp, status, user],
  );

  return (
    <LocalAuthContext.Provider value={value}>
      {children}
    </LocalAuthContext.Provider>
  );
}

export function useLocalAuth(): LocalAuthContextValue {
  const value = useContext(LocalAuthContext);

  if (!value) {
    throw new Error("useLocalAuth must be used inside LocalAuthProvider");
  }

  return value;
}

export function firstSignedInStorageKey(user: LocalUser): string {
  return `${LOCAL_AUTH_FIRST_SIGNED_IN_PREFIX}${user.id || user.email}`;
}

function storeAuthSession(data: AuthPayload): void {
  localStorage.setItem(LOCAL_AUTH_TOKEN_KEY, data.token);
  localStorage.setItem(LOCAL_AUTH_USER_KEY, JSON.stringify(data.user));
  ensureFirstSignedInDate(data.user);
}

function readStoredUser(): LocalUser | null {
  const raw = localStorage.getItem(LOCAL_AUTH_USER_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as LocalUser;

    return parsed && typeof parsed.email === "string" ? parsed : null;
  } catch {
    return null;
  }
}

function ensureFirstSignedInDate(user: LocalUser): void {
  const key = firstSignedInStorageKey(user);

  if (!localStorage.getItem(key)) {
    localStorage.setItem(key, new Date().toISOString());
  }
}

type StoredLocalAccount = LocalUser & {
  password: string;
};

function normalizedEmail(email: string): string {
  return email.trim().toLowerCase();
}

function readLocalAccounts(): StoredLocalAccount[] {
  const raw = localStorage.getItem(LOCAL_AUTH_ACCOUNTS_KEY);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as StoredLocalAccount[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalAccounts(accounts: StoredLocalAccount[]): void {
  localStorage.setItem(LOCAL_AUTH_ACCOUNTS_KEY, JSON.stringify(accounts));
}

function createLocalToken(user: LocalUser): string {
  return `local:${user.id}:${Date.now()}`;
}

function displayNameFromEmail(email: string): string {
  const name = normalizedEmail(email).split("@")[0] || "Vital User";

  if (name.includes("jennifer")) {
    return "Jennifer";
  }

  return name
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || "Vital User";
}

function createLocalAccount(input: {
  name: string;
  email: string;
  password: string;
}): AuthPayload {
  const email = normalizedEmail(input.email);
  const accounts = readLocalAccounts();
  const existing = accounts.find((account) => account.email === email);

  if (existing) {
    if (existing.password !== input.password) {
      throw new Error("This email already has a different local password.");
    }

    const { password: _password, ...user } = existing;
    return { token: createLocalToken(user), user };
  }

  const user: StoredLocalAccount = {
    id: `local-${crypto.randomUUID?.() ?? Date.now().toString(36)}`,
    name: input.name.trim() || displayNameFromEmail(email),
    email,
    password: input.password,
  };

  writeLocalAccounts([...accounts, user]);

  const { password: _password, ...localUser } = user;
  return { token: createLocalToken(localUser), user: localUser };
}

function signInWithLocalAccount(input: {
  email: string;
  password: string;
}): AuthPayload {
  const email = normalizedEmail(input.email);
  const accounts = readLocalAccounts();
  const existing = accounts.find((account) => account.email === email);

  if (existing) {
    const { password: _password, ...user } = existing;
    return { token: createLocalToken(user), user };
  }

  return createLocalAccount({
    name: displayNameFromEmail(email),
    email,
    password: input.password,
  });
}

async function requestAuth<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...init.headers,
    },
  });

  if (!response.ok) {
    throw await buildAuthError(response);
  }

  return response.json() as Promise<T>;
}

async function buildAuthError(response: Response): Promise<Error> {
  const data = (await response.json().catch(() => null)) as
    | { error?: string }
    | null;

  return new Error(data?.error ?? "Authentication request failed.");
}

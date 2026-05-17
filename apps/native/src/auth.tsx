import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type NativeUser = {
  email: string;
  name?: string;
};

type NativeAuthContextValue = {
  isLoaded: boolean;
  isSignedIn: boolean;
  user: NativeUser | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const SESSION_KEY = "sohoist:native_auth_session";
const DEFAULT_PASSWORD = "sohoist";
const ADMIN_EMAIL = process.env.EXPO_PUBLIC_ADMIN_EMAIL ?? "lois@sf-voice.sh";

const NativeAuthContext = createContext<NativeAuthContextValue | null>(null);

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function displayNameForEmail(email: string) {
  return email === ADMIN_EMAIL ? "Lois" : email.split("@")[0];
}

function getCookieHeader(response: Response) {
  const headers = response.headers as Headers & {
    getSetCookie?: () => string[];
    map?: Record<string, string>;
  };

  const cookies = headers.getSetCookie?.() ?? [];
  const fallback = headers.get("set-cookie");
  if (fallback) cookies.push(fallback);

  return cookies.map((cookie) => cookie.split(";")[0]).join("; ");
}

async function signInWithNextAuth(email: string, password: string) {
  const authBaseUrl = process.env.EXPO_PUBLIC_AUTH_BASE_URL?.replace(/\/$/, "");
  if (!authBaseUrl) return false;

  try {
    const csrfResponse = await fetch(`${authBaseUrl}/api/auth/csrf`);
    if (!csrfResponse.ok) return false;

    const { csrfToken } = (await csrfResponse.json()) as { csrfToken?: string };
    if (!csrfToken) return false;

    const cookieHeader = getCookieHeader(csrfResponse);
    const body = new URLSearchParams({
      csrfToken,
      email,
      password,
      redirect: "false",
      callbackUrl: `${authBaseUrl}/dashboard`,
    });

    const response = await fetch(
      `${authBaseUrl}/api/auth/callback/credentials?json=true`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        },
        body: body.toString(),
      },
    );

    if (!response.ok) return false;

    const text = await response.text();
    if (!text) return true;

    try {
      const payload = JSON.parse(text) as { url?: string };
      return !payload.url?.includes("error=");
    } catch {
      return !text.includes("error=");
    }
  } catch {
    return false;
  }
}

export function NativeAuthProvider({ children }: { children: ReactNode }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [user, setUser] = useState<NativeUser | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(SESSION_KEY)
      .then((raw) => {
        if (!raw) return;
        setUser(JSON.parse(raw) as NativeUser);
      })
      .catch(() => {})
      .finally(() => setIsLoaded(true));
  }, []);

  const signIn = useCallback(async (rawEmail: string, password: string) => {
    const email = normalizeEmail(rawEmail);
    if (!email) throw new Error("Email is required");

    // admin bypasses password — email alone is sufficient
    if (email === ADMIN_EMAIL) {
      await signInWithNextAuth(email, "").catch(() => {});
      const sessionUser = { email, name: displayNameForEmail(email) };
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
      setUser(sessionUser);
      return;
    }

    if (!password) throw new Error("Password is required");

    const nextAuthOk = await signInWithNextAuth(email, password);
    const expectedPassword =
      process.env.EXPO_PUBLIC_SOHOIST_AUTH_PASSWORD ?? DEFAULT_PASSWORD;
    const localOk = password === expectedPassword;

    if (!nextAuthOk && !localOk) throw new Error("Invalid credentials");

    const sessionUser = { email, name: displayNameForEmail(email) };
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
    setUser(sessionUser);
  }, []);

  const signOut = useCallback(async () => {
    await AsyncStorage.removeItem(SESSION_KEY);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      isLoaded,
      isSignedIn: Boolean(user),
      user,
      signIn,
      signOut,
    }),
    [isLoaded, signIn, signOut, user],
  );

  return (
    <NativeAuthContext.Provider value={value}>
      {children}
    </NativeAuthContext.Provider>
  );
}

export function useNativeAuth() {
  const value = useContext(NativeAuthContext);
  if (!value)
    throw new Error("useNativeAuth must be used within NativeAuthProvider");
  return value;
}

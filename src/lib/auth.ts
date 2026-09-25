/**
 * Google sign-in, the token-only half of it.
 *
 * Google Identity Services hands the page a signed ID token in the browser — no redirect, no
 * cookie, nothing shared with the app's own OAuth login on another domain. The token goes to our
 * backend as a bearer credential and is verified there; this file's only jobs are to load Google's
 * script, render their button, and remember the token until it expires.
 *
 * The token is kept in localStorage so a refresh does not sign the visitor out. It is a short-lived
 * credential for our API and nothing else, and it is dropped the moment it expires.
 */

const STORAGE_KEY = "aio.google.credential";
const WELCOME_KEY = "aio.google.welcomeClosed";
const SCRIPT_URL = "https://accounts.google.com/gsi/client";

export interface GoogleUser {
  name?: string;
  email?: string;
  picture?: string;
  expiresAt: number;
}

interface StoredCredential extends GoogleUser {
  token: string;
}

let scriptPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_URL}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Google sign-in failed to load")));
      if (window.google?.accounts?.id) resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google sign-in failed to load"));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

/** Reads name, picture and expiry out of the ID token. The signature is checked on the server. */
function describe(token: string): StoredCredential | null {
  try {
    const [, payload] = token.split(".");
    const claims = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) as {
      name?: string;
      email?: string;
      picture?: string;
      exp?: number;
    };
    if (!claims.exp) return null;
    return {
      token,
      name: claims.name,
      email: claims.email,
      picture: claims.picture,
      expiresAt: claims.exp * 1000,
    };
  } catch {
    return null;
  }
}

export function storedCredential(): StoredCredential | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const stored = JSON.parse(raw) as StoredCredential;
    // A token past its expiry is worth nothing to the server, so it is not worth keeping here.
    if (!stored?.token || stored.expiresAt <= Date.now()) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return stored;
  } catch {
    return null;
  }
}

export function signOut() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.google?.accounts?.id?.disableAutoSelect?.();
  } catch {
    /* storage unavailable */
  }
}

export interface SignInHandles {
  /**
   * Draws Google's own button into [container]; theirs, because only theirs may say "Google" — and
   * because only a real click on it opens Google's account chooser. [overrides] tune its shape for
   * callers that lay it invisibly over a button of their own.
   */
  renderButton: (container: HTMLElement, overrides?: Record<string, string | number>) => void;
}

type IdentityApi = NonNullable<NonNullable<Window["google"]>["accounts"]>["id"];

// One identity client for the whole page — Google's initialize() may only run once per client id.
// The callback it fires into is swapped out per caller instead, so the welcome card, the header
// button and the wall at the end of the free questions all resolve through the same session no
// matter which one the visitor actually used.
let identityPromise: Promise<IdentityApi | null> | null = null;
let activeCallback: ((user: GoogleUser) => void) | null = null;

function ensureIdentity(clientId: string): Promise<IdentityApi | null> {
  if (identityPromise) return identityPromise;
  identityPromise = loadScript()
    .then(() => {
      const identity = window.google?.accounts?.id;
      if (!identity) return null;
      identity.initialize({
        client_id: clientId,
        auto_select: false,
        callback: (response: { credential?: string }) => {
          const credential = response.credential ? describe(response.credential) : null;
          if (!credential) return;
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(credential));
          } catch {
            /* storage unavailable; the session still works until reload */
          }
          activeCallback?.(credential);
        },
      });
      return identity;
    })
    .catch(() => null);
  return identityPromise;
}

/**
 * Initialises Google sign-in for [clientId] and calls [onSignedIn] once the visitor picks an
 * account. Resolves to null when Google's script cannot be reached, so the page can carry on
 * without sign-in rather than break.
 */
export async function initGoogleSignIn(
  clientId: string,
  onSignedIn: (user: GoogleUser) => void
): Promise<SignInHandles | null> {
  activeCallback = onSignedIn;
  const identity = await ensureIdentity(clientId);
  if (!identity) return null;

  return {
    renderButton: (container: HTMLElement, overrides?: Record<string, string | number>) => {
      container.replaceChildren();
      identity.renderButton(container, {
        // White button on a dark card: the one light element on the page, so it reads as the
        // thing to press. Google's "outline" theme is their white treatment.
        theme: "outline",
        size: "large",
        shape: "pill",
        text: "continue_with",
        logo_alignment: "center",
        ...overrides,
      });
    },
  };
}

/**
 * Whether the first-visit sign-in card has already been closed in this browser. Asking once is an
 * offer; asking on every reload is a wall, which this demo is not.
 */
export function welcomeClosed(): boolean {
  try {
    return localStorage.getItem(WELCOME_KEY) === "1";
  } catch {
    // Storage unavailable: the card shows once per page load, which is the safer of the two errors.
    return false;
  }
}

export function rememberWelcomeClosed() {
  try {
    localStorage.setItem(WELCOME_KEY, "1");
  } catch {
    /* storage unavailable */
  }
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
            auto_select?: boolean;
          }) => void;
          renderButton: (parent: HTMLElement, options: Record<string, string | number>) => void;
          disableAutoSelect?: () => void;
        };
      };
    };
  }
}

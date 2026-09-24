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
const SCRIPT_URL = "https://accounts.google.com/gsi/client";

export interface GoogleUser {
  name?: string;
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
      picture?: string;
      exp?: number;
    };
    if (!claims.exp) return null;
    return { token, name: claims.name, picture: claims.picture, expiresAt: claims.exp * 1000 };
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
  /** Draws Google's own button into [container]; theirs, because only theirs may say "Google". */
  renderButton: (container: HTMLElement) => void;
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
  try {
    await loadScript();
  } catch {
    return null;
  }
  const identity = window.google?.accounts?.id;
  if (!identity) return null;

  identity.initialize({
    client_id: clientId,
    callback: (response: { credential?: string }) => {
      const credential = response.credential ? describe(response.credential) : null;
      if (!credential) return;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(credential));
      } catch {
        /* storage unavailable; the session still works until reload */
      }
      onSignedIn(credential);
    },
  });

  return {
    renderButton: (container: HTMLElement) => {
      container.replaceChildren();
      identity.renderButton(container, {
        theme: "filled_black",
        size: "large",
        shape: "pill",
        text: "continue_with",
        logo_alignment: "center",
      });
    },
  };
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (config: { client_id: string; callback: (response: { credential?: string }) => void }) => void;
          renderButton: (parent: HTMLElement, options: Record<string, string>) => void;
          disableAutoSelect?: () => void;
        };
      };
    };
  }
}

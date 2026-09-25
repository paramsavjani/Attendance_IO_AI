/**
 * Choosing which of the server's suggested questions to put on screen.
 *
 * Kept out of the component because the rule is not about rendering: the server sends its whole
 * list, only four fit, and someone who comes back has already read the ones they did not pick.
 * Showing those again wastes the only part of an empty page that says what this assistant is for.
 */

/** Questions offered at once. Four fills two rows of two without the grid becoming a menu. */
export const SUGGESTIONS_SHOWN = 4;

/** The set last offered, so the next visit can deliberately avoid it. */
const LAST_SUGGESTIONS_KEY = "attendance-io-ai.last-suggestions";

/**
 * Four questions from [pool], none of them in [avoid].
 *
 * Picking at random is not enough on its own: with a handful of slots a random draw repeats often
 * enough to look broken, so the previous set is excluded outright rather than merely made unlikely.
 *
 * Tops up from the full list when the pool is too small to fill every slot with a fresh question —
 * showing two questions would be worse than showing one of yesterday's.
 */
export function pickSuggestions(pool: string[], avoid: string[], count = SUGGESTIONS_SHOWN): string[] {
  const chosen = shuffled(pool.filter((question) => !avoid.includes(question))).slice(0, count);
  if (chosen.length < count) {
    chosen.push(...shuffled(pool.filter((question) => !chosen.includes(question))).slice(0, count - chosen.length));
  }
  return chosen;
}

function shuffled<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * What the *previous* visit showed, read once per page load and then held.
 *
 * Held rather than re-read on purpose: this visit overwrites the stored set as soon as it has drawn
 * one, so anything reading storage a second time within the same load would see its own choice and
 * exclude the wrong four. That is not hypothetical — React mounts the tree twice in development, and
 * the empty state comes back whenever someone starts a new chat.
 */
let previousVisit: string[] | null = null;

export function lastSuggestions(): string[] {
  previousVisit ??= readStored();
  return previousVisit;
}

/**
 * Storage here is best-effort: a private window, cleared site data or a strict privacy setting makes
 * it throw, and the only cost of losing it is that one refresh may repeat a question.
 */
function readStored(): string[] {
  try {
    const raw = window.localStorage.getItem(LAST_SUGGESTIONS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function rememberSuggestions(questions: string[]) {
  try {
    window.localStorage.setItem(LAST_SUGGESTIONS_KEY, JSON.stringify(questions));
  } catch {
    // Nothing to do — the next visit simply picks without knowing what this one showed.
  }
}

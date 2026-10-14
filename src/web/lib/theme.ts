import { useSyncExternalStore } from "react";

// Light/dark preference of the admin UI. "system" follows the OS setting.
// theme-init.js applies the same logic before the app loads.

export type ThemePreference = "system" | "light" | "dark";

const STORAGE_KEY = "short-theme";
const media = matchMedia("(prefers-color-scheme: dark)");
const listeners = new Set<() => void>();

function readPreference(): ThemePreference {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "light" || stored === "dark" ? stored : "system";
}

let preference = readPreference();

function resolved(): "light" | "dark" {
  return preference === "system" ? (media.matches ? "dark" : "light") : preference;
}

function apply() {
  document.documentElement.dataset.theme = resolved();
  listeners.forEach((l) => l());
}

media.addEventListener("change", () => {
  if (preference === "system") apply();
});

export function setThemePreference(next: ThemePreference) {
  preference = next;
  if (next === "system") localStorage.removeItem(STORAGE_KEY);
  else localStorage.setItem(STORAGE_KEY, next);
  apply();
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function useThemePreference(): ThemePreference {
  return useSyncExternalStore(subscribe, () => preference);
}

export function useResolvedTheme(): "light" | "dark" {
  return useSyncExternalStore(subscribe, resolved);
}

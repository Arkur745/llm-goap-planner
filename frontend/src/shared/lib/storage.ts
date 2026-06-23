const hasWindow = typeof window !== "undefined";

export function readJsonStorage<T>(key: string, fallback: T): T {
  if (!hasWindow) {
    return fallback;
  }

  const rawValue = window.localStorage.getItem(key);
  if (!rawValue) {
    return fallback;
  }

  try {
    return JSON.parse(rawValue) as T;
  } catch {
    return fallback;
  }
}

export function writeJsonStorage<T>(key: string, value: T): void {
  if (!hasWindow) {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

export function removeStorage(key: string): void {
  if (!hasWindow) {
    return;
  }

  window.localStorage.removeItem(key);
}

const STORAGE_NAMESPACE = 'quranApp';
const GUEST_SCOPE_ID = 'guest';
const LEGACY_MIGRATION_FLAG_KEY = 'quranLegacyMigratedToCloud';
export const SNAPSHOT_UPDATED_AT_KEY = 'quranLastStateSyncAt';

export const APP_STORAGE_CHANGED_EVENT = 'quran-app-storage-changed';

export const USER_STORAGE_KEYS = [
  'quranUserProgress',
  'quranDarkMode',
  'quranFontSize',
  'quranShowTranslation',
  'quranSelectedReciter',
  'quranBookmarks',
  'quranCurrentSurah',
  'quranCurrentPage',
  'quranLastVisitedRoute',
  'quranLastReadingPosition',
  'quranAzkarProgress',
  'quranAzkarActiveTab',
  'quranMemorizeSelectedSurah',
  'quranMemorizeCurrentVerse',
  'quranMemorizeProgressBySurah',
  'quranMemorizeSelectedPlan',
  'quranMemorizeRepeatCount',
  'quranMemorizeTestQuestions',
  SNAPSHOT_UPDATED_AT_KEY
] as const;

export type UserStorageKey = (typeof USER_STORAGE_KEYS)[number];
export type UserStorageSnapshot = Record<string, string>;

let activeStorageScope = GUEST_SCOPE_ID;

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function buildScopedStorageKey(rawKey: string, scopeId = activeStorageScope): string {
  return `${STORAGE_NAMESPACE}:${scopeId}:${rawKey}`;
}

function emitStorageChanged(key: string): void {
  if (!isBrowser()) {
    return;
  }

  window.dispatchEvent(new CustomEvent(APP_STORAGE_CHANGED_EVENT, { detail: { key } }));
}

function readRawLocalStorageItem(rawKey: string): string | null {
  if (!isBrowser()) {
    return null;
  }

  try {
    return window.localStorage.getItem(rawKey);
  } catch {
    return null;
  }
}

function writeRawLocalStorageItem(rawKey: string, value: string): void {
  if (!isBrowser()) {
    return;
  }

  try {
    window.localStorage.setItem(rawKey, value);
  } catch {
    // Ignore write failures (quota/private mode).
  }
}

function removeRawLocalStorageItem(rawKey: string): void {
  if (!isBrowser()) {
    return;
  }

  try {
    window.localStorage.removeItem(rawKey);
  } catch {
    // Ignore remove failures.
  }
}

export function setStorageScope(scopeId?: string | null): void {
  activeStorageScope = scopeId?.trim() || GUEST_SCOPE_ID;
}

export function getStorageScope(): string {
  return activeStorageScope;
}

export function getLegacyStorageItem(rawKey: string): string | null {
  return readRawLocalStorageItem(rawKey);
}

export function getStoredValue(rawKey: string): string | null {
  const scopedValue = readRawLocalStorageItem(buildScopedStorageKey(rawKey));
  if (scopedValue !== null) {
    return scopedValue;
  }

  if (activeStorageScope === GUEST_SCOPE_ID) {
    return getLegacyStorageItem(rawKey);
  }

  return null;
}

export function setStoredValue(rawKey: string, value: string): void {
  const scopedKey = buildScopedStorageKey(rawKey);
  const previousValue = readRawLocalStorageItem(scopedKey);

  writeRawLocalStorageItem(scopedKey, value);
  if (rawKey !== SNAPSHOT_UPDATED_AT_KEY) {
    writeRawLocalStorageItem(buildScopedStorageKey(SNAPSHOT_UPDATED_AT_KEY), new Date().toISOString());
  }

  if (previousValue !== value) {
    emitStorageChanged(rawKey);
  }
}

export function removeStoredValue(rawKey: string): void {
  const scopedKey = buildScopedStorageKey(rawKey);
  const existed = readRawLocalStorageItem(scopedKey) !== null;
  removeRawLocalStorageItem(scopedKey);
  if (existed && rawKey !== SNAPSHOT_UPDATED_AT_KEY) {
    writeRawLocalStorageItem(buildScopedStorageKey(SNAPSHOT_UPDATED_AT_KEY), new Date().toISOString());
  }

  if (existed) {
    emitStorageChanged(rawKey);
  }
}

export function getStoredJson<T>(rawKey: string, fallback: T): T {
  const raw = getStoredValue(rawKey);
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function setStoredJson(rawKey: string, value: unknown): void {
  setStoredValue(rawKey, JSON.stringify(value));
}

export function exportUserStorageSnapshot(keys: ReadonlyArray<string> = USER_STORAGE_KEYS): UserStorageSnapshot {
  const snapshot: UserStorageSnapshot = {};
  keys.forEach((key) => {
    const value = getStoredValue(key);
    if (typeof value === 'string') {
      snapshot[key] = value;
    }
  });
  return snapshot;
}

export function exportLegacyStorageSnapshot(keys: ReadonlyArray<string> = USER_STORAGE_KEYS): UserStorageSnapshot {
  const snapshot: UserStorageSnapshot = {};
  keys.forEach((key) => {
    const value = getLegacyStorageItem(key);
    if (typeof value === 'string') {
      snapshot[key] = value;
    }
  });
  return snapshot;
}

export function applyUserStorageSnapshot(snapshot: UserStorageSnapshot, options?: { emitChange?: boolean }): void {
  const shouldEmit = options?.emitChange ?? true;
  Object.entries(snapshot).forEach(([key, value]) => {
    const scopedKey = buildScopedStorageKey(key);
    const previousValue = readRawLocalStorageItem(scopedKey);
    writeRawLocalStorageItem(scopedKey, value);
    if (shouldEmit && previousValue !== value) {
      emitStorageChanged(key);
    }
  });
}

export function isSnapshotEmpty(snapshot: UserStorageSnapshot): boolean {
  return Object.keys(snapshot).length === 0;
}

export function hasLegacyMigrationFlag(): boolean {
  return readRawLocalStorageItem(LEGACY_MIGRATION_FLAG_KEY) === '1';
}

export function setLegacyMigrationFlag(): void {
  writeRawLocalStorageItem(LEGACY_MIGRATION_FLAG_KEY, '1');
}

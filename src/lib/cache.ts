import { Cache } from "@raycast/api";
import { fetchDay, fetchRange } from "./ultrahuman";
import { DailyMetrics, DailyMetricsRange } from "./types";

const cache = new Cache({ namespace: "ultrahuman" });
const TTL_MS = 5 * 60 * 1000;

interface Entry<T> {
  data: T;
  fetchedAt: number;
}

export interface Memoized<T> {
  data: T;
  /** True when we returned cached data after a network failure. */
  stale: boolean;
}

async function memoize<T>(
  key: string,
  fetcher: () => Promise<T>,
): Promise<Memoized<T>> {
  const raw = cache.get(key);
  const cached: Entry<T> | null = raw ? (JSON.parse(raw) as Entry<T>) : null;

  if (cached && Date.now() - cached.fetchedAt < TTL_MS) {
    return { data: cached.data, stale: false };
  }

  try {
    const data = await fetcher();
    cache.set(key, JSON.stringify({ data, fetchedAt: Date.now() }));
    return { data, stale: false };
  } catch (e) {
    if (cached) return { data: cached.data, stale: true };
    throw e;
  }
}

export function getDay(date: string): Promise<Memoized<DailyMetrics>> {
  return memoize(`daily:${date}`, () => fetchDay(date));
}

export function getRange(
  startEpoch: number,
  endEpoch: number,
): Promise<Memoized<DailyMetricsRange>> {
  return memoize(`range:${startEpoch}:${endEpoch}`, () =>
    fetchRange(startEpoch, endEpoch),
  );
}

/** Force a refresh for one day on next read. */
export function clearDay(date: string): void {
  cache.remove(`daily:${date}`);
}

/** Wipe everything. Useful for a "Reset cache" debug action. */
export function clearAll(): void {
  cache.clear();
}

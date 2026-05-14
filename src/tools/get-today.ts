import { getDay } from "../lib/cache";
import { today } from "../lib/format";

type Input = Record<string, never>;

/**
 * Returns a snapshot of all of today's available Ultrahuman metrics.
 * Use when the user asks "how am I today", "how did I sleep", "what's my recovery",
 * or any unscoped question about current health state.
 */
export default async function tool(_: Input) {
  const { data, stale } = await getDay(today());
  return {
    date: today(),
    stale,
    metrics: data,
  };
}

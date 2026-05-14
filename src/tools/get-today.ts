import { getDay } from "../lib/cache";
import { today } from "../lib/format";

/**
 * Returns a snapshot of all of today's available Ultrahuman metrics.
 * Use when the user asks "how am I today", "how did I sleep", "what's my recovery",
 * or any unscoped question about current health state.
 */
export default async function tool() {
  const { data, stale } = await getDay(today());
  return {
    date: today(),
    stale,
    metrics: data,
  };
}

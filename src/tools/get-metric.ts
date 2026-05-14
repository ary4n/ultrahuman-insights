import { getDay } from "../lib/cache";
import { today } from "../lib/format";
import { METRIC_LABELS, MetricName } from "../lib/types";

type Input = {
  /**
   * Which metric to return. One of: sleep_score, total_sleep, rem_sleep, deep_sleep,
   * light_sleep, sleep_efficiency, hrv, night_rhr, hr, recovery_index, movement_index,
   * temp, spo2, vo2_max, steps, active_minutes.
   */
  metric: MetricName;
  /**
   * Optional date in YYYY-MM-DD. Defaults to today.
   */
  date?: string;
};

/**
 * Returns a single named metric for a specific date.
 * Use when the user asks about one specific metric like "what was my HRV on Monday".
 */
export default async function tool(input: Input) {
  const date = input.date ?? today();
  const { data, stale } = await getDay(date);
  const value = data[input.metric];
  return {
    date,
    stale,
    metric: input.metric,
    label: METRIC_LABELS[input.metric] ?? input.metric,
    value: value ?? null,
    available: value != null,
  };
}

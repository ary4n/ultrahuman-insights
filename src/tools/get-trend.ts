import { getRange } from "../lib/cache";
import { lastNDaysEpoch } from "../lib/format";
import { METRIC_LABELS, MetricName } from "../lib/types";

type Input = {
  /** Which metric. See get-metric for the list of allowed values. */
  metric: MetricName;
  /** Number of days of history (1–7). Defaults to 7. */
  days?: number;
};

/**
 * Returns N days of history for a single metric.
 * Use when the user asks about trends: "is my HRV trending up", "how has my sleep
 * been this week", "show me my recovery over the past 5 days".
 */
export default async function tool(input: Input) {
  const days = Math.min(7, Math.max(1, input.days ?? 7));
  const { start, end } = lastNDaysEpoch(days);
  const { data, stale } = await getRange(start, end);

  const series = [...data]
    .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""))
    .map((d) => ({
      date: d.date,
      value: d[input.metric] ?? null,
    }));

  return {
    metric: input.metric,
    label: METRIC_LABELS[input.metric] ?? input.metric,
    days,
    stale,
    series,
  };
}

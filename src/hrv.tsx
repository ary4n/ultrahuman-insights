import {
  Detail,
  ActionPanel,
  Action,
  Icon,
  openExtensionPreferences,
} from "@raycast/api";
import { useCallback, useMemo } from "react";
import { getRange, clearRange } from "./lib/cache";
import { DailyMetricsRange } from "./lib/types";
import { fmt, lastNDaysEpoch, sparkline } from "./lib/format";
import { useMetrics } from "./lib/use-metrics";

function markdownFor(
  range: DailyMetricsRange,
  stale: boolean,
  error: Error | null,
): string {
  const sorted = [...range].sort((a, b) =>
    (a.date ?? "").localeCompare(b.date ?? ""),
  );
  const todayEntry = sorted[sorted.length - 1];
  const hrvSeries = sorted.map((d) => d.hrv);
  const rhrSeries = sorted.map((d) => d.night_rhr);
  const error_note = error ? `\n> ❌ Refresh failed: ${error.message}\n` : "";
  const stale_note = stale ? "\n> ⚠️ Cached — network unreachable\n" : "";

  const lines: string[] = [
    "# HRV & Heart Rate",
    error_note,
    stale_note,
    `**Today's HRV:** ${fmt(todayEntry?.hrv, "ms")} · **Night RHR:** ${fmt(todayEntry?.night_rhr, "bpm")}`,
    `**HR Drop:** ${fmt(todayEntry?.hr_drop, "bpm")} · **Resting HR:** ${fmt(todayEntry?.hr, "bpm")}`,
    "",
    "## 7-Day Trend",
    "```",
    `HRV  ${sparkline(hrvSeries)}`,
    `RHR  ${sparkline(rhrSeries)}`,
    "```",
    "",
    "## Daily Values",
    "",
    "| Date | HRV (ms) | Night RHR (bpm) |",
    "|---|---|---|",
    ...sorted.map(
      (d) => `| ${d.date ?? "?"} | ${fmt(d.hrv)} | ${fmt(d.night_rhr)} |`,
    ),
  ];
  return lines.join("\n");
}

export default function Hrv() {
  const range = useMemo(() => lastNDaysEpoch(7), []);
  const fetcher = useCallback(() => getRange(range.start, range.end), [range]);
  const { data, stale, loading, missingToken, error, reload } =
    useMetrics<DailyMetricsRange>(fetcher);

  const refresh = useCallback(async () => {
    clearRange(range.start, range.end);
    await reload();
  }, [range, reload]);

  const markdown = missingToken
    ? "# Set your Ultrahuman API token\n\nOpen preferences and paste your Partner API token."
    : data
      ? markdownFor(data, stale, error)
      : loading
        ? "Loading…"
        : "No data yet.";

  return (
    <Detail
      isLoading={loading}
      markdown={markdown}
      actions={
        <ActionPanel>
          {missingToken ? (
            <Action
              title="Open Preferences"
              onAction={openExtensionPreferences}
            />
          ) : (
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={refresh}
            />
          )}
        </ActionPanel>
      }
    />
  );
}

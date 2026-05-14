import {
  Detail,
  ActionPanel,
  Action,
  Icon,
  openExtensionPreferences,
} from "@raycast/api";
import { useCallback, useMemo } from "react";
import { getRange, clearRange } from "./lib/cache";
import { DailyMetricsRange, MetricName } from "./lib/types";
import { fmt, lastNDaysEpoch } from "./lib/format";
import { useMetrics } from "./lib/use-metrics";
import { insightFor, deltaVsAverage, Insight } from "./lib/insights";
import { lineChart, colorToHex } from "./lib/charts";

interface IndexDef {
  metric: MetricName;
  label: string;
  unit?: string;
}

const INDICES: IndexDef[] = [
  { metric: "recovery_index", label: "Recovery Index" },
  { metric: "movement_index", label: "Movement Index" },
  { metric: "sleep_score", label: "Sleep Index" },
];

function indexSection(
  def: IndexDef,
  value: number | undefined,
  series: Array<number | undefined>,
  shortLabels: string[],
): string {
  const insight: Insight = insightFor(def.metric, value, series);
  const lines: string[] = [];

  const displayVal =
    value != null ? `${def.unit ? fmt(value, def.unit) : fmt(value)}` : "—";
  lines.push(`## ${insight.emoji} ${def.label}: ${displayVal}`);
  lines.push("");

  if (insight.status !== "neutral" && insight.context) {
    const statusLine = insight.label
      ? `**${insight.label}** — ${insight.context}`
      : insight.context;
    lines.push(statusLine);
  }
  if (insight.recommendation) {
    lines.push("");
    lines.push(`**Recommend:** ${insight.recommendation}`);
  }

  // Delta vs 7-day average
  const delta = deltaVsAverage(value, series);
  if (delta && Math.abs(delta.pct) > 1) {
    const up = delta.delta > 0;
    const bigMove = Math.abs(delta.pct) > 5;
    const arrow = up ? (bigMove ? "⏫" : "⬆️") : bigMove ? "⏬" : "⬇️";
    const sign = delta.delta > 0 ? "+" : "";
    const deltaStr = `${sign}${Number.isInteger(delta.delta) ? delta.delta : delta.delta.toFixed(1)}`;
    lines.push("");
    lines.push(
      `${arrow} **${deltaStr}** vs 7-day average (avg: ${delta.avg.toFixed(0)})`,
    );
  }

  // Mini line chart (600×80) when ≥3 valid data points
  const validCount = series.filter((v) => v != null).length;
  if (validCount >= 3) {
    const hexColor = colorToHex(insight.color);
    const chart = lineChart(series, {
      height: 80,
      color: hexColor,
      labels: shortLabels,
    });
    if (chart) {
      lines.push("");
      lines.push(chart);
    }
  }

  return lines.join("\n");
}

function markdownFor(
  range: DailyMetricsRange,
  stale: boolean,
  error: Error | null,
): string {
  const sorted = [...range].sort((a, b) =>
    (a.date ?? "").localeCompare(b.date ?? ""),
  );
  const d = sorted[sorted.length - 1];

  const error_note = error ? `\n> ❌ Refresh failed: ${error.message}\n` : "";
  const stale_note = stale ? "\n> ⚠️ Cached — network unreachable\n" : "";

  const shortLabels = sorted.map((r) => {
    if (!r.date) return "";
    const date = new Date(r.date + "T12:00:00");
    return date.toLocaleDateString("en-US", { weekday: "short" });
  });

  const lines: string[] = ["# Recovery & Movement", error_note, stale_note, ""];

  for (const def of INDICES) {
    const value = d?.[def.metric];
    const series = sorted.map((r) => r[def.metric]);
    lines.push(indexSection(def, value, series, shortLabels));
    lines.push("");
  }

  return lines.join("\n");
}

export default function Recovery() {
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

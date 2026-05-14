import {
  List,
  ActionPanel,
  Action,
  Icon,
  openExtensionPreferences,
} from "@raycast/api";
import { useCallback } from "react";
import { getRange, clearRange } from "./lib/cache";
import { DailyMetricsRange, METRIC_LABELS, MetricName } from "./lib/types";
import { formatDuration, fmt, lastNDaysEpoch, sparkline } from "./lib/format";
import { useMetrics } from "./lib/use-metrics";
import { insightFor, deltaVsAverage, Insight } from "./lib/insights";
import { metricIcon } from "./lib/icons";
import { lineChart, colorToHex } from "./lib/charts";

// Duration-based metrics (display as "Xh Ym")
const DURATION_METRICS = new Set<MetricName>([
  "total_sleep",
  "rem_sleep",
  "deep_sleep",
  "light_sleep",
]);

// Unit map for non-duration metrics
const METRIC_UNITS: Partial<Record<MetricName, string>> = {
  hrv: "ms",
  night_rhr: "bpm",
  hr: "bpm",
  temp: "°C",
  sleep_efficiency: "%",
  spo2: "%",
};

function formatValue(metric: MetricName, value: number | undefined): string {
  if (value == null) return "—";
  if (DURATION_METRICS.has(metric)) return formatDuration(value);
  const unit = METRIC_UNITS[metric];
  return fmt(value, unit ?? "");
}

/** Build the big heading value string for the markdown detail */
function headingValue(metric: MetricName, value: number | undefined): string {
  if (value == null) return "—";
  if (DURATION_METRICS.has(metric)) return formatDuration(value);
  const unit = METRIC_UNITS[metric];
  return fmt(value, unit ?? "");
}

function trendLine(
  metric: MetricName,
  value: number | undefined,
  series: Array<number | undefined>,
): string {
  const delta = deltaVsAverage(value, series);
  if (!delta) return "";
  const { delta: d, pct, avg } = delta;
  if (Math.abs(pct) <= 1) return "";

  const bigMove = Math.abs(pct) > 5;
  const up = d > 0;
  const arrow = up ? (bigMove ? "⏫" : "⬆️") : bigMove ? "⏬" : "⬇️";
  const sign = d > 0 ? "+" : "";
  const deltaStr = DURATION_METRICS.has(metric)
    ? formatDuration(Math.abs(d))
    : `${sign}${Number.isInteger(d) ? d : d.toFixed(1)}`;
  const avgStr = DURATION_METRICS.has(metric) ? formatDuration(avg) : fmt(avg);

  return `${arrow} **${deltaStr}** vs 7-day average (${avgStr})`;
}

function detailMarkdown(
  metric: MetricName,
  value: number | undefined,
  series: Array<number | undefined>,
  dates: Array<string | undefined>,
  insight: Insight,
): string {
  const heading = headingValue(metric, value);
  const lines: string[] = [];

  lines.push(`# ${heading}`);
  lines.push(`## ${METRIC_LABELS[metric]}`);
  lines.push("");

  if (insight.status !== "neutral") {
    const statusLine = insight.label
      ? `**${insight.label}** — ${insight.context}`
      : insight.context;
    lines.push(statusLine);
  }

  if (insight.recommendation) {
    lines.push("");
    lines.push(`**Recommend:** ${insight.recommendation}`);
  }

  const trend = trendLine(metric, value, series);
  if (trend) {
    lines.push("");
    lines.push(trend);
  }

  // SVG line chart — only when ≥3 valid data points
  const validCount = series.filter((v) => v != null).length;
  if (validCount >= 3) {
    const hexColor = colorToHex(insight.color);
    // Short date labels like "Mon", "Tue" from YYYY-MM-DD
    const shortLabels = dates.map((d) => {
      if (!d) return "";
      const date = new Date(d + "T12:00:00");
      return date.toLocaleDateString("en-US", { weekday: "short" });
    });
    const chart = lineChart(series, { color: hexColor, labels: shortLabels });
    if (chart) {
      lines.push("");
      lines.push(chart);
    }
  } else {
    // Fall back to unicode sparkline for <3 data points
    const spark = sparkline(series);
    if (spark) {
      lines.push("");
      lines.push("```");
      lines.push(spark);
      lines.push("```");
    }
  }

  return lines.join("\n");
}

export default function Today() {
  const range = useCallback(() => lastNDaysEpoch(7), [])();
  const fetcher = useCallback(() => getRange(range.start, range.end), [range]);
  const { data, stale, loading, missingToken, error, reload } =
    useMetrics<DailyMetricsRange>(fetcher);

  const refresh = useCallback(async () => {
    clearRange(range.start, range.end);
    await reload();
  }, [range, reload]);

  if (missingToken) {
    return (
      <List>
        <List.EmptyView
          title="Set your Ultrahuman API token"
          description="Open extension preferences and paste your Partner API token."
          actions={
            <ActionPanel>
              <Action
                title="Open Preferences"
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  // Today is the last element of the sorted range
  const sorted = data
    ? [...data].sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""))
    : [];
  const todayData = sorted[sorted.length - 1] ?? null;

  const metrics = Object.keys(METRIC_LABELS) as MetricName[];
  const availableMetrics = todayData
    ? metrics.filter((m) => todayData[m] != null)
    : [];

  return (
    <List
      isLoading={loading}
      isShowingDetail={!loading && !!data}
      navigationTitle={`Today's Health`}
    >
      {error && (
        <List.Section title="⚠️ Refresh failed">
          <List.Item title={error.message.slice(0, 80)} />
        </List.Section>
      )}
      {stale && (
        <List.Section title="⚠️ Cached — network unreachable">
          <List.Item title="Showing last successful fetch" />
        </List.Section>
      )}
      <List.Section title="Metrics">
        {availableMetrics.map((metric) => {
          const value = todayData?.[metric];
          const series = sorted.map((d) => d[metric]);
          const dates = sorted.map((d) => d.date);
          const insight = insightFor(metric, value, series);

          return (
            <List.Item
              key={metric}
              title={METRIC_LABELS[metric]}
              icon={metricIcon(metric, insight.status)}
              accessories={[{ text: formatValue(metric, value) }]}
              detail={
                <List.Item.Detail
                  markdown={detailMarkdown(
                    metric,
                    value,
                    series,
                    dates,
                    insight,
                  )}
                />
              }
              actions={
                <ActionPanel>
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={refresh}
                  />
                </ActionPanel>
              }
            />
          );
        })}
        {!loading && availableMetrics.length === 0 && (
          <List.Item
            title="No data yet today"
            subtitle="Charge and sync your Ring, then refresh."
          />
        )}
      </List.Section>
    </List>
  );
}

import {
  List,
  ActionPanel,
  Action,
  Icon,
  openExtensionPreferences,
} from "@raycast/api";
import { useCallback, useMemo } from "react";
import { getRange, clearRange } from "./lib/cache";
import { DailyMetricsRange, METRIC_LABELS, MetricName } from "./lib/types";
import {
  fmt,
  formatDuration,
  lastNDaysEpoch,
  sparkline,
  todayDateKey,
} from "./lib/format";
import { useMetrics } from "./lib/use-metrics";
import { insightFor, deltaVsAverage, Insight } from "./lib/insights";
import { metricIcon } from "./lib/icons";
import { lineChart, colorToHex } from "./lib/charts";

// Duration-based metrics
const DURATION_METRICS = new Set<MetricName>([
  "total_sleep",
  "rem_sleep",
  "deep_sleep",
  "light_sleep",
]);

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

function trendSummary(
  metric: MetricName,
  values: Array<number | undefined>,
  todayValue: number | undefined,
): string {
  const delta = deltaVsAverage(todayValue, values, values.length - 1);
  if (!delta) return "";
  const { pct } = delta;
  if (Math.abs(pct) <= 1) return "";
  const dir = pct > 0 ? "up" : "down";
  return `${METRIC_LABELS[metric]} is trending ${dir} ${Math.abs(pct).toFixed(0)}% over the last 7 days.`;
}

function trendMarkdown(
  metric: MetricName,
  values: Array<number | undefined>,
  dates: Array<string | undefined>,
  insight: Insight,
): string {
  const todayValue = values[values.length - 1];
  const lines: string[] = [];

  // Big heading: today's value
  lines.push(`# ${formatValue(metric, todayValue)}`);
  lines.push(`## ${METRIC_LABELS[metric]}`);
  lines.push("");

  // Status + context
  if (insight.status !== "neutral" && insight.context) {
    const statusLine = insight.label
      ? `**${insight.label}** — ${insight.context}`
      : insight.context;
    lines.push(statusLine);
    lines.push("");
  }

  // SVG line chart when ≥3 valid points, otherwise unicode sparkline
  const validCount = values.filter((v) => v != null).length;
  if (validCount >= 3) {
    const hexColor = colorToHex(insight.color);
    const shortLabels = dates.map((d) => {
      if (!d) return "";
      const date = new Date(d + "T12:00:00");
      return date.toLocaleDateString("en-US", { weekday: "short" });
    });
    const chart = lineChart(values, { color: hexColor, labels: shortLabels });
    if (chart) {
      lines.push(chart);
      lines.push("");
    }
  } else {
    const spark = sparkline(values);
    if (spark) {
      lines.push("```");
      lines.push(spark);
      lines.push("```");
      lines.push("");
    }
  }

  // Table
  lines.push("| Date | Value |");
  lines.push("|---|---|");
  dates.forEach((date, i) => {
    lines.push(`| ${date ?? "?"} | ${formatValue(metric, values[i])} |`);
  });

  // Trend summary
  const summary = trendSummary(metric, values, todayValue);
  if (summary) {
    lines.push("");
    lines.push(`*${summary}*`);
  }

  return lines.join("\n");
}

export default function Trends() {
  const dateKey = todayDateKey();
  const range = useMemo(() => lastNDaysEpoch(7), [dateKey]);
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

  // Sort range chronologically; today is the last element
  const sorted = useMemo(
    () =>
      data
        ? [...data].sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""))
        : [],
    [data],
  );

  const metrics = Object.keys(METRIC_LABELS) as MetricName[];

  return (
    <List isLoading={loading} isShowingDetail navigationTitle="7-Day Trends">
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
      {data && (
        <List.Section title="Metrics">
          {metrics
            .filter((m) => sorted.some((d) => d[m] != null))
            .map((m) => {
              const values = sorted.map((d) => d[m]);
              const dates = sorted.map((d) => d.date);
              const todayValue = values[values.length - 1];
              const insight = insightFor(m, todayValue, values);

              return (
                <List.Item
                  key={m}
                  title={METRIC_LABELS[m]}
                  icon={metricIcon(m, insight.status)}
                  accessories={[{ text: sparkline(values) }]}
                  detail={
                    <List.Item.Detail
                      markdown={trendMarkdown(m, values, dates, insight)}
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
        </List.Section>
      )}
    </List>
  );
}

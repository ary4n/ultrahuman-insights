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
import { formatDuration, fmt, lastNDaysEpoch, todayDateKey } from "./lib/format";
import { useMetrics } from "./lib/use-metrics";
import { insightFor, deltaVsAverage } from "./lib/insights";
import { lineChart, stagesBar, colorToHex } from "./lib/charts";

function markdownFor(
  range: DailyMetricsRange,
  stale: boolean,
  error: Error | null,
): string {
  const sorted = [...range].sort((a, b) =>
    (a.date ?? "").localeCompare(b.date ?? ""),
  );
  const d = sorted[sorted.length - 1];
  if (!d) return "No data yet.";

  const scoreSeries = sorted.map((r) => r.sleep_score);
  const score = d.sleep_score;
  const insight = insightFor("sleep_score", score, scoreSeries);

  const error_note = error ? `\n> ❌ Refresh failed: ${error.message}\n` : "";
  const stale_note = stale ? "\n> ⚠️ Cached — network unreachable\n" : "";

  const lines: string[] = [];

  // Headline
  const headline =
    score != null ? `# ${insight.emoji} Sleep Score: ${score}` : "# Sleep";
  lines.push(headline);
  lines.push(error_note);
  lines.push(stale_note);

  // Insight context
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

  // Trend delta
  const delta = deltaVsAverage(score, scoreSeries, scoreSeries.length - 1);
  if (delta && Math.abs(delta.pct) > 1) {
    const up = delta.delta > 0;
    const bigMove = Math.abs(delta.pct) > 5;
    const arrow = up ? (bigMove ? "⏫" : "⬆️") : bigMove ? "⏬" : "⬇️";
    lines.push("");
    lines.push(
      `${arrow} **${Math.abs(delta.pct).toFixed(0)}%** vs 7-day average (avg: ${delta.avg.toFixed(0)})`,
    );
  }

  lines.push("");
  lines.push(
    `**Total:** ${formatDuration(d.total_sleep)} · **Efficiency:** ${fmt(d.sleep_efficiency, "%")}`,
  );

  // Sleep stages bar
  lines.push("");
  lines.push("## Stages");
  const deep = d.deep_sleep ?? 0;
  const rem = d.rem_sleep ?? 0;
  const light = d.light_sleep ?? 0;
  if (deep + rem + light > 0) {
    const bar = stagesBar({ deep, rem, light });
    lines.push(bar);
  } else {
    lines.push("_No stage data available_");
  }

  // Sleep score trend chart (7 days)
  const validScoreCount = scoreSeries.filter((v) => v != null).length;
  if (validScoreCount >= 3) {
    lines.push("");
    lines.push("## 7-Day Sleep Score");
    const hexColor = colorToHex(insight.color);
    const shortLabels = sorted.map((r) => {
      if (!r.date) return "";
      const date = new Date(r.date + "T12:00:00");
      return date.toLocaleDateString("en-US", { weekday: "short" });
    });
    const chart = lineChart(scoreSeries, {
      color: hexColor,
      labels: shortLabels,
    });
    if (chart) lines.push(chart);
  }

  // Vitals during sleep
  lines.push("");
  lines.push("## Vitals During Sleep");
  lines.push(`- **HRV:** ${fmt(d.hrv, "ms")}`);
  lines.push(`- **Night RHR:** ${fmt(d.night_rhr, "bpm")}`);
  lines.push(`- **HR Drop:** ${fmt(d.hr_drop, "bpm")}`);
  lines.push(
    `- **Average Body Temperature:** ${fmt(d.avg_body_temperature, "°C")}`,
  );
  lines.push(
    `- **Temperature Deviation:** ${fmt(d.temperature_deviation, "°C")}`,
  );

  // Quality
  lines.push("");
  lines.push("## Quality");
  lines.push(`- **Restorative Sleep:** ${fmt(d.restorative_sleep, "%")}`);
  lines.push(`- **Sleep Cycles:** ${fmt(d.sleep_cycles)}`);
  lines.push(`- **Tosses & Turns:** ${fmt(d.tosses_turns)}`);
  lines.push(`- **Morning Alertness:** ${fmt(d.morning_alertness)}`);

  return lines.join("\n");
}

export default function Sleep() {
  const dateKey = todayDateKey();
  const range = useMemo(() => lastNDaysEpoch(7), [dateKey]);
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

import { Detail, ActionPanel, Action, Icon, openExtensionPreferences } from "@raycast/api";
import { useCallback } from "react";
import { getDay, clearDay } from "./lib/cache";
import { DailyMetrics } from "./lib/types";
import { formatDuration, fmt, scoreEmoji, today } from "./lib/format";
import { useMetrics } from "./lib/use-metrics";

function stagesBar(d: DailyMetrics): string {
  const stages = [
    { label: "Deep", mins: d.deep_sleep ?? 0, char: "█" },
    { label: "REM", mins: d.rem_sleep ?? 0, char: "▓" },
    { label: "Light", mins: d.light_sleep ?? 0, char: "░" },
  ];
  const total = stages.reduce((a, s) => a + s.mins, 0);
  if (total === 0) return "_(no stage data)_";
  const width = 40;
  const bar = stages.map((s) => s.char.repeat(Math.round((s.mins / total) * width))).join("");
  const legend = stages.map((s) => `${s.char} ${s.label} ${formatDuration(s.mins)}`).join("  ·  ");
  return "```\n" + bar + "\n```\n\n" + legend;
}

function markdownFor(d: DailyMetrics, stale: boolean, error: Error | null): string {
  const score = d.sleep_score;
  const header = score != null ? `# ${scoreEmoji(score)} Sleep Score: ${score}` : "# Sleep";
  const error_note = error ? `\n> ❌ Refresh failed: ${error.message}\n` : "";
  const stale_note = stale ? "\n> ⚠️ Cached — network unreachable\n" : "";
  return [
    header,
    error_note,
    stale_note,
    `**Total:** ${formatDuration(d.total_sleep)} · **Efficiency:** ${fmt(d.sleep_efficiency, "%")}`,
    "",
    "## Stages",
    stagesBar(d),
    "",
    "## Vitals During Sleep",
    `- **HRV:** ${fmt(d.hrv, "ms")}`,
    `- **Night RHR:** ${fmt(d.night_rhr, "bpm")}`,
    `- **HR Drop:** ${fmt(d.hr_drop, "bpm")}`,
    `- **Average Body Temperature:** ${fmt(d.avg_body_temperature, "°C")}`,
    `- **Temperature Deviation:** ${fmt(d.temperature_deviation, "°C")}`,
    "",
    "## Quality",
    `- **Restorative Sleep:** ${formatDuration(d.restorative_sleep)}`,
    `- **Sleep Cycles:** ${fmt(d.sleep_cycles)}`,
    `- **Tosses & Turns:** ${fmt(d.tosses_turns)}`,
    `- **Morning Alertness:** ${fmt(d.morning_alertness)}`,
  ].join("\n");
}

export default function Sleep() {
  const fetcher = useCallback(() => getDay(today()), []);
  const { data, stale, loading, missingToken, error, reload } = useMetrics<DailyMetrics>(fetcher);

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
            <Action title="Open Preferences" onAction={openExtensionPreferences} />
          ) : (
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={async () => {
                clearDay(today());
                await reload();
              }}
            />
          )}
        </ActionPanel>
      }
    />
  );
}

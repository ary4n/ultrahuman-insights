import {
  Detail,
  ActionPanel,
  Action,
  Icon,
  openExtensionPreferences,
} from "@raycast/api";
import { useCallback } from "react";
import { getDay, clearDay } from "./lib/cache";
import { DailyMetrics } from "./lib/types";
import { fmt, scoreEmoji, today } from "./lib/format";
import { useMetrics } from "./lib/use-metrics";

function row(
  emoji: string,
  label: string,
  value: number | undefined,
  blurb: string,
): string {
  return `### ${emoji} ${label}\n**${fmt(value)}** — ${blurb}\n`;
}

function markdownFor(
  d: DailyMetrics,
  stale: boolean,
  error: Error | null,
): string {
  const error_note = error ? `\n> ❌ Refresh failed: ${error.message}\n` : "";
  const stale_note = stale ? "\n> ⚠️ Cached — network unreachable\n" : "";
  return [
    "# Recovery & Movement",
    error_note,
    stale_note,
    "",
    row(
      scoreEmoji(d.recovery_index),
      "Recovery Index",
      d.recovery_index,
      "How well-prepared your body is for today's demands, based on sleep + HRV + RHR.",
    ),
    row(
      scoreEmoji(d.movement_index),
      "Movement Index",
      d.movement_index,
      "Composite of yesterday's steps, motion, and active minutes vs your baseline.",
    ),
    row(
      scoreEmoji(d.sleep_score),
      "Sleep Index",
      d.sleep_score,
      "Composite quality of last night's sleep — stages, efficiency, and disturbances.",
    ),
  ].join("\n");
}

export default function Recovery() {
  const fetcher = useCallback(() => getDay(today()), []);
  const { data, stale, loading, missingToken, error, reload } =
    useMetrics<DailyMetrics>(fetcher);

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

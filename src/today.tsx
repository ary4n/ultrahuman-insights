import { List, ActionPanel, Action, Color, Icon, openExtensionPreferences } from "@raycast/api";
import { useCallback } from "react";
import { getDay, clearDay } from "./lib/cache";
import { DailyMetrics } from "./lib/types";
import { formatDuration, fmt, scoreColor, today } from "./lib/format";
import { useMetrics } from "./lib/use-metrics";

interface Row {
  id: string;
  title: string;
  value: string;
  color?: Color;
}

function rowsFor(d: DailyMetrics): Row[] {
  const rows: Row[] = [];
  if (d.sleep_score != null)
    rows.push({ id: "sleep_score", title: "Sleep Score", value: String(d.sleep_score), color: scoreColor(d.sleep_score) });
  if (d.total_sleep != null)
    rows.push({ id: "total_sleep", title: "Total Sleep", value: formatDuration(d.total_sleep) });
  if (d.sleep_efficiency != null)
    rows.push({ id: "sleep_efficiency", title: "Sleep Efficiency", value: fmt(d.sleep_efficiency, "%") });
  if (d.rem_sleep != null) rows.push({ id: "rem_sleep", title: "REM Sleep", value: formatDuration(d.rem_sleep) });
  if (d.deep_sleep != null) rows.push({ id: "deep_sleep", title: "Deep Sleep", value: formatDuration(d.deep_sleep) });
  if (d.light_sleep != null) rows.push({ id: "light_sleep", title: "Light Sleep", value: formatDuration(d.light_sleep) });
  if (d.hrv != null) rows.push({ id: "hrv", title: "HRV", value: fmt(d.hrv, "ms") });
  if (d.night_rhr != null) rows.push({ id: "night_rhr", title: "Night RHR", value: fmt(d.night_rhr, "bpm") });
  if (d.hr != null) rows.push({ id: "hr", title: "Heart Rate", value: fmt(d.hr, "bpm") });
  if (d.recovery_index != null)
    rows.push({
      id: "recovery_index",
      title: "Recovery Index",
      value: String(d.recovery_index),
      color: scoreColor(d.recovery_index),
    });
  if (d.movement_index != null)
    rows.push({
      id: "movement_index",
      title: "Movement Index",
      value: String(d.movement_index),
      color: scoreColor(d.movement_index),
    });
  if (d.temp != null) rows.push({ id: "temp", title: "Body Temperature", value: fmt(d.temp, "°C") });
  if (d.spo2 != null) rows.push({ id: "spo2", title: "SpO₂", value: fmt(d.spo2, "%") });
  if (d.vo2_max != null) rows.push({ id: "vo2_max", title: "VO₂ Max", value: fmt(d.vo2_max) });
  if (d.steps != null) rows.push({ id: "steps", title: "Steps", value: fmt(d.steps) });
  if (d.active_minutes != null)
    rows.push({ id: "active_minutes", title: "Active Minutes", value: fmt(d.active_minutes, "min") });
  if (d.avg_glucose != null) rows.push({ id: "avg_glucose", title: "Average Glucose", value: fmt(d.avg_glucose, "mg/dL") });
  return rows;
}

export default function Today() {
  const fetcher = useCallback(() => getDay(today()), []);
  const { data, stale, loading, missingToken, error, reload } = useMetrics<DailyMetrics>(fetcher);

  if (missingToken) {
    return (
      <List>
        <List.EmptyView
          title="Set your Ultrahuman API token"
          description="Open extension preferences and paste your Partner API token."
          actions={
            <ActionPanel>
              <Action title="Open Preferences" onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const rows = data ? rowsFor(data) : [];

  return (
    <List isLoading={loading} navigationTitle={`Today · ${today()}`}>
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
        {rows.map((row) => (
          <List.Item
            key={row.id}
            title={row.title}
            accessories={[{ tag: { value: row.value, color: row.color ?? Color.PrimaryText } }]}
            actions={
              <ActionPanel>
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={async () => {
                    clearDay(today());
                    await reload();
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
        {!loading && rows.length === 0 && (
          <List.Item title="No data yet today" subtitle="Charge and sync your Ring, then refresh." />
        )}
      </List.Section>
    </List>
  );
}

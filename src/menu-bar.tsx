import {
  MenuBarExtra,
  openExtensionPreferences,
  launchCommand,
  LaunchType,
} from "@raycast/api";
import { useCallback, useEffect } from "react";
import { getDay, clearDay } from "./lib/cache";
import { today, formatDuration, scoreEmoji, fmt } from "./lib/format";
import { useMetrics } from "./lib/use-metrics";
import { cleanupOldCharts } from "./lib/charts";

export default function MenuBar() {
  const dateKey = today();
  const fetcher = useCallback(() => getDay(dateKey), [dateKey]);

  useEffect(() => {
    cleanupOldCharts().catch(() => {});
  }, []);
  const { data, stale, loading, missingToken, error, reload } =
    useMetrics(fetcher);

  if (missingToken) {
    return (
      <MenuBarExtra icon="⚙️" title="Ultrahuman">
        <MenuBarExtra.Item
          title="Set API Token"
          onAction={openExtensionPreferences}
        />
      </MenuBarExtra>
    );
  }

  const score = data?.sleep_score;
  const hasError = error != null;
  const baseTitle = score == null ? "—" : `${scoreEmoji(score)} ${score}`;
  const title = hasError ? `⚠️ ${baseTitle}` : baseTitle;

  return (
    <MenuBarExtra icon="⚪" title={title} isLoading={loading}>
      {hasError && (
        <MenuBarExtra.Item
          title="Refresh failed"
          subtitle={error.message.slice(0, 80)}
        />
      )}
      {stale && <MenuBarExtra.Item title="⚠️ Showing cached data" />}
      <MenuBarExtra.Section title="Sleep">
        <MenuBarExtra.Item
          title="Total"
          subtitle={formatDuration(data?.total_sleep)}
        />
        <MenuBarExtra.Item
          title="REM"
          subtitle={formatDuration(data?.rem_sleep)}
        />
        <MenuBarExtra.Item
          title="Deep"
          subtitle={formatDuration(data?.deep_sleep)}
        />
        <MenuBarExtra.Item
          title="Light"
          subtitle={formatDuration(data?.light_sleep)}
        />
        <MenuBarExtra.Item
          title="Efficiency"
          subtitle={fmt(data?.sleep_efficiency, "%")}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section title="Recovery">
        <MenuBarExtra.Item title="HRV" subtitle={fmt(data?.hrv, "ms")} />
        <MenuBarExtra.Item
          title="Night RHR"
          subtitle={fmt(data?.night_rhr, "bpm")}
        />
        <MenuBarExtra.Item
          title="Recovery Index"
          subtitle={fmt(data?.recovery_index)}
        />
        <MenuBarExtra.Item
          title="Movement Index"
          subtitle={fmt(data?.movement_index)}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open Today's Health"
          onAction={() =>
            launchCommand({ name: "today", type: LaunchType.UserInitiated })
          }
        />
        <MenuBarExtra.Item
          title="Refresh Now"
          onAction={async () => {
            clearDay(today());
            await reload();
          }}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

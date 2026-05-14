import {
  MenuBarExtra,
  openExtensionPreferences,
  launchCommand,
  LaunchType,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { getDay, clearDay } from "./lib/cache";
import { today, formatDuration, scoreEmoji, fmt } from "./lib/format";
import { DailyMetrics } from "./lib/types";
import { MissingTokenError } from "./lib/ultrahuman";

export default function MenuBar() {
  const [data, setData] = useState<DailyMetrics | null>(null);
  const [stale, setStale] = useState(false);
  const [loading, setLoading] = useState(true);
  const [missingToken, setMissingToken] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await getDay(today());
      setData(r.data);
      setStale(r.stale);
      setMissingToken(false);
    } catch (e) {
      if (e instanceof MissingTokenError) setMissingToken(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

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
  const title = score == null ? "—" : `${scoreEmoji(score)} ${score}`;

  return (
    <MenuBarExtra icon="⚪" title={title} isLoading={loading}>
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
            await load();
          }}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

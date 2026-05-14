import {
  List,
  Detail,
  ActionPanel,
  Action,
  Icon,
  openExtensionPreferences,
} from "@raycast/api";
import { useCallback } from "react";
import { getRange, clearRange } from "./lib/cache";
import { DailyMetricsRange, METRIC_LABELS, MetricName } from "./lib/types";
import { fmt, lastNDaysEpoch, sparkline } from "./lib/format";
import { useMetrics } from "./lib/use-metrics";

function seriesFor(
  range: DailyMetricsRange,
  metric: MetricName,
): Array<number | undefined> {
  return [...range]
    .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""))
    .map((d) => d[metric]);
}

function MetricDetail({
  range,
  metric,
}: {
  range: DailyMetricsRange;
  metric: MetricName;
}) {
  const sorted = [...range].sort((a, b) =>
    (a.date ?? "").localeCompare(b.date ?? ""),
  );
  const values = seriesFor(range, metric);
  const rows = sorted
    .map((d, i) => `| ${d.date ?? "?"} | ${fmt(values[i])} |`)
    .join("\n");
  const markdown = [
    `# ${METRIC_LABELS[metric]} — Last 7 Days`,
    "",
    "```",
    sparkline(values),
    "```",
    "",
    "| Date | Value |",
    "|---|---|",
    rows,
  ].join("\n");
  return <Detail markdown={markdown} />;
}

export default function Trends() {
  const fetcher = useCallback(() => {
    const { start, end } = lastNDaysEpoch(7);
    return getRange(start, end);
  }, []);
  const { data, stale, loading, missingToken, error, reload } =
    useMetrics<DailyMetricsRange>(fetcher);

  const refresh = useCallback(async () => {
    const { start, end } = lastNDaysEpoch(7);
    clearRange(start, end);
    await reload();
  }, [reload]);

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

  const metrics = Object.keys(METRIC_LABELS) as MetricName[];

  return (
    <List isLoading={loading} navigationTitle="7-Day Trends">
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
            .filter((m) => data.some((d) => d[m] != null))
            .map((m) => {
              const values = seriesFor(data, m);
              return (
                <List.Item
                  key={m}
                  title={METRIC_LABELS[m]}
                  accessories={[{ text: sparkline(values) }]}
                  actions={
                    <ActionPanel>
                      <Action.Push
                        title="See Daily Values"
                        target={<MetricDetail range={data} metric={m} />}
                        icon={Icon.LineChart}
                      />
                      <Action
                        title="Refresh"
                        icon={Icon.ArrowClockwise}
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

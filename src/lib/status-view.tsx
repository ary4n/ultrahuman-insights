import {
  List,
  Detail,
  ActionPanel,
  Action,
  Icon,
  openExtensionPreferences,
} from "@raycast/api";

export type StatusVariant =
  | "missing-token"
  | "no-data"
  | "refresh-failed"
  | "stale";

interface Props {
  variant: StatusVariant;
  message?: string;
  onRefresh?: () => void;
}

function variantProps(
  variant: StatusVariant,
  message?: string,
): { title: string; description: string; icon: Icon } {
  switch (variant) {
    case "missing-token":
      return {
        title: "Set your Ultrahuman API token",
        description:
          "Open extension preferences and paste your Partner API token.",
        icon: Icon.Key,
      };
    case "no-data":
      return {
        title: "No data yet",
        description: "Charge and sync your Ring, then refresh.",
        icon: Icon.Cloud,
      };
    case "refresh-failed":
      return {
        title: "Refresh failed",
        description: message ?? "An unknown error occurred.",
        icon: Icon.ExclamationMark,
      };
    case "stale":
      return {
        title: "Showing cached data",
        description: "Network unreachable — pull-to-refresh when back online.",
        icon: Icon.Clock,
      };
  }
}

function buildActions(variant: StatusVariant, onRefresh?: () => void) {
  if (variant === "missing-token") {
    return (
      <ActionPanel>
        <Action
          title="Open Preferences"
          icon={Icon.Cog}
          onAction={openExtensionPreferences}
        />
      </ActionPanel>
    );
  }
  return (
    <ActionPanel>
      {onRefresh && (
        <Action
          title="Retry"
          icon={Icon.ArrowClockwise}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={onRefresh}
        />
      )}
      <Action
        title="Open Preferences"
        icon={Icon.Cog}
        shortcut={{ modifiers: ["cmd"], key: "," }}
        onAction={openExtensionPreferences}
      />
    </ActionPanel>
  );
}

/** Use inside List-based commands (today, trends, recovery). */
export function ListStatus(props: Props) {
  const { variant, message, onRefresh } = props;

  if (variant === "missing-token") {
    const { title, description } = variantProps(variant, message);
    return (
      <List>
        <List.EmptyView
          title={title}
          description={description}
          icon={Icon.Key}
          actions={buildActions(variant, onRefresh)}
        />
      </List>
    );
  }

  if (variant === "stale" || variant === "refresh-failed") {
    const { title, description, icon } = variantProps(variant, message);
    return (
      <List.Section
        title={
          variant === "stale" ? "⚠️ Showing cached data" : "❌ Refresh failed"
        }
      >
        <List.Item
          title={title}
          subtitle={description}
          icon={icon}
          actions={buildActions(variant, onRefresh)}
        />
      </List.Section>
    );
  }

  // no-data
  const { title, description } = variantProps(variant, message);
  return (
    <List>
      <List.EmptyView
        title={title}
        description={description}
        icon={Icon.Cloud}
        actions={buildActions(variant, onRefresh)}
      />
    </List>
  );
}

/** Use inside Detail-based commands (sleep, hrv). */
export function DetailStatus(props: Props) {
  const { variant, message, onRefresh } = props;

  if (variant === "missing-token") {
    return (
      <Detail
        markdown={
          "# Set your Ultrahuman API token\n\nOpen extension preferences and paste your Partner API token."
        }
        actions={buildActions(variant, onRefresh)}
      />
    );
  }

  if (variant === "refresh-failed") {
    return (
      <Detail
        markdown={`# Refresh failed\n\n${message ?? "An unknown error occurred."}`}
        actions={buildActions(variant, onRefresh)}
      />
    );
  }

  if (variant === "no-data") {
    return (
      <Detail
        markdown={"# No data yet\n\nCharge and sync your Ring, then refresh."}
        actions={buildActions(variant, onRefresh)}
      />
    );
  }

  // stale — blockquote injected into existing markdown body in Detail views
  return (
    <Detail
      markdown={"> ⚠️ Showing cached data — network unreachable."}
      actions={buildActions(variant, onRefresh)}
    />
  );
}

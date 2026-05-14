import {
  getPreferenceValues,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";

interface Prefs {
  apiToken: string;
}

export function getApiToken(): string {
  const { apiToken } = getPreferenceValues<Prefs>();
  return apiToken?.trim() ?? "";
}

/** Show a toast prompting the user to open preferences. Use when the token is missing or 401s. */
export async function promptForToken(
  reason: "missing" | "invalid",
): Promise<void> {
  await showToast({
    style: Toast.Style.Failure,
    title:
      reason === "missing"
        ? "Ultrahuman API token not set"
        : "Ultrahuman API token rejected",
    message: "Open preferences to fix",
    primaryAction: {
      title: "Open Preferences",
      onAction: () => openExtensionPreferences(),
    },
  });
}

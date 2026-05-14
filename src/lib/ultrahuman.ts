import { DailyMetrics, DailyMetricsRange } from "./types";
import { getApiToken } from "./prefs";

const BASE_URL = "https://partner.ultrahuman.com/api/v1/partner";

export class UltrahumanError extends Error {
  constructor(
    public status: number,
    public body: string,
  ) {
    super(`Ultrahuman API ${status}: ${body.slice(0, 200)}`);
    this.name = "UltrahumanError";
  }
}

export class MissingTokenError extends Error {
  constructor() {
    super("Ultrahuman API token is not set");
    this.name = "MissingTokenError";
  }
}

async function call<T>(
  path: string,
  params: Record<string, string | number>,
): Promise<T> {
  const token = getApiToken();
  if (!token) throw new MissingTokenError();

  const query = new URLSearchParams(
    Object.entries(params).reduce<Record<string, string>>((acc, [k, v]) => {
      acc[k] = String(v);
      return acc;
    }, {}),
  );
  const url = `${BASE_URL}${path}?${query.toString()}`;

  const res = await fetch(url, {
    method: "GET",
    headers: { Authorization: token },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new UltrahumanError(res.status, body);
  }

  return (await res.json()) as T;
}

/** Fetch all metrics for a single date (YYYY-MM-DD). */
export function fetchDay(date: string): Promise<DailyMetrics> {
  return call<DailyMetrics>("/daily_metrics", { date });
}

/** Fetch metrics across an epoch range. Ultrahuman caps the window at 7 days. */
export function fetchRange(
  startEpoch: number,
  endEpoch: number,
): Promise<DailyMetricsRange> {
  return call<DailyMetricsRange>("/daily_metrics", {
    start_epoch: startEpoch,
    end_epoch: endEpoch,
  });
}

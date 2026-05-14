# Ultrahuman for Raycast

Surface your Ultrahuman Ring AIR daily metrics directly in Raycast — menu bar, commands, and AI tools.

## Setup

1. Get a personal API token from [partner.ultrahuman.com](https://partner.ultrahuman.com) (Personal API Token → name it "Raycast").
2. Install this extension.
3. On first launch, Raycast prompts you for your API token. Paste the JWT (without "Bearer"). The access code from the Ultrahuman portal is **not** needed here — save it somewhere safe for future token rotation.

## What you get

- **Menu bar** — last night's sleep score, color-coded. Click for a Sleep + Recovery breakdown.
- **Today's Health** — list of every available metric for today.
- **Sleep Detail** — score, ASCII stages bar, vitals during sleep.
- **HRV & Heart Rate** — today's values + 7-day sparkline.
- **Recovery & Movement** — the three composite indices with one-line explanations.
- **7-Day Trends** — sparkline overview of every metric; drill in for per-day values.
- **AI tools** — `Get Today's Metrics`, `Get One Metric`, `Get Metric Trend` for natural-language queries via Raycast AI.

## Notes

- Glucose metrics only populate if you also wear an Ultrahuman M1 CGM.
- Data refreshes every 5 minutes in the background. `⌘R` forces a refresh in any view.
- All API access is cached — opening multiple commands within 5 minutes hits the API once.

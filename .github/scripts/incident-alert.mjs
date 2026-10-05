// Posts the Slack alert for an issue Upptime opened or closed. For a vendor site it adds the vendor's
// own active incident (title, impact, latest update, link), which Upptime's built-in alert can't carry.
//   CONFIG_PATH=<.upptimerc.yml as JSON> SLACK_WEBHOOK_URL=... node .github/scripts/incident-alert.mjs
import { readFile } from "fs/promises";

const UPPTIME_TITLE = /^(🛑|⚠️) .+ (is down|has degraded performance)$/u;

const VENDOR_INCIDENT_READERS = {
  "status.claude.com": readStatuspageIncident,
  "status.clerk.com": readStatuspageIncident,
  "status.modal.com": readBetterStackIncident,
  "status.cloud.google.com": readGoogleCloudIncident,
};

const { action, issue } = JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, "utf8"));
const config = JSON.parse(await readFile(process.env.CONFIG_PATH, "utf8"));
const site = config.sites.find((site) => issue.labels.some((label) => label.name === site.slug));

if (!site || !UPPTIME_TITLE.test(issue.title)) {
  console.log(`skipped: "${issue.title}" is not an Upptime incident`);
  process.exit(0);
}

await postToSlack(action === "opened" ? await openedMessage(site, issue) : closedMessage(site, issue));

async function openedMessage(site, issue) {
  const isDown = issue.title.endsWith("is down");
  const headline = `${isDown ? "🟥" : "🟨"} *${escape(site.name)}*`;
  const incidentLink = `<${issue.html_url}|Incident>`;

  if (site.group !== "vendor") {
    const httpCode = issue.body.match(/HTTP code: (\d+)/)?.[1];
    return `${headline} is ${isDown ? "down" : "degraded"} (HTTP ${httpCode})\n${incidentLink}`;
  }

  const statusPage = new URL(site.url).origin;
  const incident = await readVendorIncident(site.url);
  if (!incident) {
    return [
      `${headline}: the vendor reports ${isDown ? "an outage" : "degraded service"}`,
      "No incident details published by the vendor yet.",
      `<${statusPage}|Vendor status> · ${incidentLink}`,
    ].join("\n");
  }

  return [
    `${headline}: the vendor reports ${isDown ? "an outage" : "degraded service"}`,
    `*${escape(incident.title)}* (${escape(incident.impact)})`,
    incident.update && `Latest: ${escape(truncate(incident.update))}`,
    `<${incident.link}|Vendor incident> · ${incidentLink}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function closedMessage(site, issue) {
  const minutes = Math.max(1, Math.round((new Date(issue.closed_at) - new Date(issue.created_at)) / 60000));
  const duration = minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  return `🟩 *${escape(site.name)}* is back to normal after ${duration}\n<${issue.html_url}|Incident>`;
}

// A failed lookup must not block the alert itself.
async function readVendorIncident(url) {
  try {
    return await VENDOR_INCIDENT_READERS[new URL(url).hostname]?.(url);
  } catch (error) {
    console.warn(`vendor incident lookup failed: ${error.message}`);
    return null;
  }
}

// Statuspage's summary lists only unresolved incidents; a component URL narrows them to that component.
async function readStatuspageIncident(url) {
  const page = new URL(url);
  const componentId = page.pathname.match(/\/components\/(\w+)\.json$/)?.[1];
  const { incidents } = await getJson(`${page.origin}/api/v2/summary.json`);
  const incident = incidents.find(
    (incident) => !componentId || incident.components?.some((component) => component.id === componentId),
  );
  if (!incident) return null;

  return {
    title: incident.name,
    impact: incident.impact,
    update: incident.incident_updates[0]?.body,
    link: incident.shortlink || page.origin,
  };
}

async function readBetterStackIncident(url) {
  const { included } = await getJson(url);
  const report = included.find((item) => item.type === "status_report" && item.attributes.aggregate_state !== "resolved");
  if (!report) return null;

  const updateIds = report.relationships.status_updates.data.map((update) => update.id);
  const [latest] = included
    .filter((item) => item.type === "status_update" && updateIds.includes(item.id))
    .sort((a, b) => b.attributes.published_at.localeCompare(a.attributes.published_at));
  return {
    title: report.attributes.title,
    impact: report.attributes.aggregate_state,
    update: latest?.attributes.message,
    link: `${new URL(url).origin}/incident/${report.id}`,
  };
}

// incidents.json holds recent history too; an active incident has no `end`. The most severe one wins.
async function readGoogleCloudIncident(url) {
  const origin = new URL(url).origin;
  const active = (await getJson(`${origin}/incidents.json`)).filter((incident) => !incident.end);
  const incident = active.find((incident) => incident.severity === "high") || active[0];
  if (!incident) return null;

  return {
    title: incident.external_desc,
    impact: incident.severity,
    update: incident.most_recent_update?.text,
    link: `${origin}/${incident.uri}`,
  };
}

async function getJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);

  return response.json();
}

async function postToSlack(text) {
  const response = await fetch(process.env.SLACK_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!response.ok) throw new Error(`Slack webhook returned ${response.status}: ${await response.text()}`);

  console.log(`posted:\n${text}`);
}

function truncate(text) {
  const line = text.replace(/\s+/g, " ").trim();
  return line.length > 300 ? `${line.slice(0, 297)}...` : line;
}

// Slack mrkdwn treats &, < and > as control characters.
function escape(text) {
  return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

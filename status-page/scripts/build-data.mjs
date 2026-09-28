// Builds the JSON the status page reads from /data, out of Upptime's own records:
// .upptimerc.yml (sites), history/<slug>.yml (current status, every 5 min),
// history/summary.json (uptime + daily downtime, daily) and GitHub issues (incidents).
//   node scripts/build-data.mjs
import { readFile, writeFile, mkdir } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { load } from "js-yaml";

const pageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(pageRoot, "..");
const dataDir = join(pageRoot, "static", "data");

const SERVICE_LABELS = { up: "Operational", degraded: "Degraded", down: "Down" };
const VENDOR_LABELS = { up: "Operational", degraded: "Elevated latency", down: "Outage" };
const DOWN_MINUTES = 30; // a day with this much downtime shows red; less shows orange
const GITHUB_HEADERS = {
  Accept: "application/vnd.github+json",
  ...(process.env.GITHUB_TOKEN && { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }),
};

const readJson = async (path, fallback) => {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    return fallback;
  }
};

const readHistory = async (slug) => {
  try {
    return load(await readFile(join(repoRoot, "history", `${slug}.yml`), "utf8")) || {};
  } catch (error) {
    return {};
  }
};

const formatUptime = (uptime) => (!uptime || uptime === "100.00%" ? "100%" : uptime);

// Last 90 calendar days, coloured by that day's recorded downtime.
const dayStrip = (dailyMinutesDown = {}) => {
  const days = [];
  for (let ago = 89; ago >= 0; ago--) {
    const minutes = dailyMinutesDown[new Date(Date.now() - ago * 86400000).toISOString().slice(0, 10)] || 0;
    days.push(minutes >= DOWN_MINUTES ? "dn" : minutes > 0 ? "dg" : "up");
  }

  return days;
};

const buildSites = async (config, summary) => {
  const services = [];
  const vendors = [];

  for (const site of config.sites || []) {
    const history = await readHistory(site.slug);
    const record = summary.find((entry) => entry.slug === site.slug) || {};
    const status = history.status || record.status || "up";

    if (site.group === "vendor") {
      vendors.push({
        name: site.name,
        tag: site.tag,
        core: !!site.core,
        status,
        label: VENDOR_LABELS[status],
      });
      continue;
    }

    services.push({
      name: site.name,
      slug: site.slug,
      core: !!site.core,
      status,
      label: SERVICE_LABELS[status],
      uptime: formatUptime(record.uptime),
      days: dayStrip(record.dailyMinutesDown),
    });
  }

  return { services, vendors };
};

// history/<slug>.yml is only rewritten when a status changes, so the last check is the last Uptime CI run.
const fetchLastCheck = async (owner, repo) => {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/actions/workflows/uptime.yml/runs?status=success&per_page=1`,
      { headers: GITHUB_HEADERS },
    );
    if (!response.ok) throw new Error(`GitHub API ${response.status}`);

    const [run] = (await response.json()).workflow_runs;
    return run ? run.updated_at : null;
  } catch (error) {
    console.warn(`last check time skipped: ${error.message}`);
    return null;
  }
};

const fetchIncidents = async (owner, repo) => {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/issues?state=all&labels=status&per_page=10`,
      { headers: GITHUB_HEADERS },
    );
    if (!response.ok) throw new Error(`GitHub API ${response.status}`);

    const issues = (await response.json()).filter((issue) => !issue.pull_request);
    return Promise.all(issues.map(toIncident));
  } catch (error) {
    console.warn(`incidents skipped: ${error.message}`);
    return [];
  }
};

const toIncident = async (issue) => ({
  status: issue.state === "closed" ? "resolved" : "monitoring",
  title: issue.title.replace(/🛑|⚠️|🟥|🟨/gu, "").trim(),
  date: formatIncidentDate(issue),
  message: await latestUpdate(issue),
});

// Open: "Today, 14:02 UTC". Closed: "31 Aug · 47m".
const formatIncidentDate = (issue) => {
  const created = new Date(issue.created_at);
  if (!issue.closed_at) {
    const time = created.toISOString().slice(11, 16);
    const isToday = created.toDateString() === new Date().toDateString();
    return `${isToday ? "Today" : created.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}, ${time} UTC`;
  }

  const minutes = Math.max(1, Math.round((new Date(issue.closed_at) - created) / 60000));
  const duration = minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  return `${created.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} · ${duration}`;
};

// The team's latest comment on the issue is the incident update; bot comments are skipped.
const latestUpdate = async (issue) => {
  if (!issue.comments) return "";

  const response = await fetch(issue.comments_url, { headers: GITHUB_HEADERS });
  if (!response.ok) return "";

  const comments = (await response.json()).filter((comment) => comment.user.type !== "Bot");
  return comments.length ? comments[comments.length - 1].body.trim() : "";
};

const config = load(await readFile(join(repoRoot, ".upptimerc.yml"), "utf8"));
const summary = await readJson(join(repoRoot, "history", "summary.json"), []);
const { services, vendors } = await buildSites(config, summary);

await mkdir(dataDir, { recursive: true });
await writeFile(join(dataDir, "services.json"), JSON.stringify(services, null, 2));
await writeFile(join(dataDir, "vendors.json"), JSON.stringify(vendors, null, 2));
await writeFile(join(dataDir, "incidents.json"), JSON.stringify(await fetchIncidents(config.owner, config.repo), null, 2));
await writeFile(join(dataDir, "notice.json"), JSON.stringify(await readJson(join(repoRoot, "notice.json"), null), null, 2));
await writeFile(join(dataDir, "meta.json"), JSON.stringify({ updatedAt: await fetchLastCheck(config.owner, config.repo) }, null, 2));
console.log(`wrote ${services.length} services, ${vendors.length} vendors to ${dataDir}`);

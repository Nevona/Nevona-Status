<script>
  import Loading from "../components/Loading.svelte";
  import { onMount } from "svelte";
  import config from "../data/config.json";

  let loading = true;
  let sites = [];
  let selected = "week";
  let maintenanceServices = new Set();

  // `period` is passed in (not read from the outer `selected`) so Svelte tracks it
  // as a dependency and re-renders the figures when the timeline toggle changes.
  const uptimeFor = (site, period) =>
    ({ day: site.uptimeDay, week: site.uptimeWeek, month: site.uptimeMonth, year: site.uptimeYear })[
      period
    ] || site.uptime;

  const timeFor = (site, period) =>
    ({ day: site.timeDay, week: site.timeWeek, month: site.timeMonth, year: site.timeYear })[
      period
    ] || site.time;

  // Inline sparkline of recent response times - real samples, no external PNGs.
  const spark = (samples) => {
    if (!samples || samples.length < 2) return null;
    const width = 140;
    const height = 40;
    const min = Math.min(...samples);
    const max = Math.max(...samples);
    const range = max - min || 1;
    const step = width / (samples.length - 1);
    const points = samples.map(
      (value, index) => [index * step, height - ((value - min) / range) * (height - 6) - 3],
    );
    const line = points
      .map((point, index) => `${index ? "L" : "M"}${point[0].toFixed(1)} ${point[1].toFixed(1)}`)
      .join(" ");
    return { line, area: `${line} L${width} ${height} L0 ${height} Z` };
  };

  onMount(async () => {
    try {
      const [summary, maintenance] = await Promise.all([
        fetch("/data/summary.json").then((response) => response.json()),
        fetch("/data/maintenance.json").then((response) => response.json()).catch(() => []),
      ]);
      sites = summary;
      const now = Date.now();
      maintenanceServices = new Set(
        maintenance
          .filter((window) => now >= new Date(window.start).getTime() && now <= new Date(window.end).getTime())
          .map((window) => window.service),
      );
    } catch (error) {}

    loading = false;
  });
</script>

<div class="f live-status-head">
  <h2>{config.i18n.liveStatus}</h2>
  <form class="r">
    {#each [["day", config.i18n.duration24H], ["week", config.i18n.duration7D], ["month", config.i18n.duration30D], ["year", config.i18n.duration1Y], ["all", config.i18n.durationAll]] as [value, label]}
      <div>
        <input {value} bind:group={selected} name="d" type="radio" id={`data_${value}`} />
        <label for={`data_${value}`}>{label}</label>
      </div>
    {/each}
  </form>
</div>

<section class="live-status">
  {#if loading}
    <Loading />
  {:else if sites.length}
    {#each sites as site}
      <article class={`${site.status} site`}>
        <div class="site-info">
          <h4>
            <img class="icon" alt="" src={site.icon} />
            <a href={site.url} target="_blank" rel="noopener">{site.name}</a>
            {#if maintenanceServices.has(site.name)}
              <span class="tag maintenance-chip">{config.i18n.scheduledMaintenance}</span>
            {/if}
          </h4>
          <div>
            {config.i18n.overallUptime.split("$UPTIME")[0]}
            <span class="data">{uptimeFor(site, selected)}</span>
          </div>
          <div>
            {config.i18n.averageResponseTime.split("$TIME")[0]}
            <span class="data">{timeFor(site, selected)}{config.i18n.ms}</span>
          </div>
        </div>
        {#if spark(site.samples)}
          {@const s = spark(site.samples)}
          <svg class="spark" viewBox="0 0 140 40" preserveAspectRatio="none" aria-hidden="true">
            <path class="spark-area" d={s.area} />
            <path class="spark-line" d={s.line} />
          </svg>
        {/if}
      </article>
    {/each}
  {/if}
</section>

<style>
  .icon {
    height: 1rem;
    margin-right: 0.33rem;
    vertical-align: middle;
  }
  a {
    text-decoration: none;
  }
  .r input {
    display: none;
  }
</style>

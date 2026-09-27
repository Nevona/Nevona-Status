<script>
  import { onMount } from "svelte";
  import config from "../data/config.json";

  export let past = false;

  let windows = [];

  const stateOf = (window) => {
    const now = Date.now();
    if (now < new Date(window.start).getTime()) return "scheduled";
    if (now <= new Date(window.end).getTime()) return "ongoing";
    return "completed";
  };

  const minutes = (window) =>
    Math.round((new Date(window.end).getTime() - new Date(window.start).getTime()) / 60000);

  const label = (state) =>
    ({ ongoing: config.i18n.incidentOngoing, scheduled: config.i18n.incidentScheduled })[state] ||
    config.i18n.incidentCompleted;

  onMount(async () => {
    try {
      const response = await fetch("/data/maintenance.json");
      windows = await response.json();
    } catch (error) {}
  });

  $: shown = windows
    .map((window) => ({ ...window, state: stateOf(window) }))
    .filter((window) => (past ? window.state === "completed" : window.state !== "completed"))
    .sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime());
</script>

{#if shown.length}
  <section>
    <h2>{past ? config.i18n.pastScheduledMaintenance : config.i18n.scheduledMaintenance}</h2>
    {#each shown as window}
      <article class={`maintenance ${window.state}`}>
        <div class="site-info">
          <h4>
            {window.title}
            <span class={`tag ${window.state}`}>{label(window.state)}</span>
          </h4>
          {#if window.service}<div class="muted">{window.service}</div>{/if}
          <div>
            {(window.state === "scheduled"
              ? config.i18n.scheduledMaintenanceSummaryStarts
              : config.i18n.scheduledMaintenanceSummaryStarted)
              .replace("$DATE", new Date(window.start).toLocaleString(config.i18n.locale))
              .replace("$DURATION", minutes(window))}
          </div>
          {#if window.body}<div class="muted">{window.body}</div>{/if}
        </div>
      </article>
    {/each}
  </section>
{/if}

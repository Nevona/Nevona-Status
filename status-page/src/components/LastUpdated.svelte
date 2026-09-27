<script>
  import { onMount } from "svelte";
  import config from "../data/config.json";

  let updatedAt = null;

  const relative = (date) => {
    const seconds = Math.round((date.getTime() - Date.now()) / 1000);
    const formatter = new Intl.RelativeTimeFormat(config.i18n.locale, { numeric: "auto" });
    for (const [unit, span] of [["day", 86400], ["hour", 3600], ["minute", 60]]) {
      if (Math.abs(seconds) >= span) return formatter.format(Math.round(seconds / span), unit);
    }

    return config.i18n.lastUpdatedJustNow;
  };

  onMount(async () => {
    try {
      const response = await fetch("/data/meta.json");
      const meta = await response.json();
      if (meta.updatedAt) updatedAt = new Date(meta.updatedAt);
    } catch (error) {}
  });
</script>

{#if updatedAt}
  <p class="last-updated" title={updatedAt.toLocaleString(config.i18n.locale)}>
    <span class="dot" aria-hidden="true"></span>
    {config.i18n.lastUpdated} {relative(updatedAt)}
  </p>
{/if}

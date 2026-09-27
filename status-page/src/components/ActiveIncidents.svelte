<script>
  import Loading from "../components/Loading.svelte";
  import { onMount } from "svelte";
  import config from "../data/config.json";

  let loading = true;
  let incidents = [];

  onMount(async () => {
    try {
      const response = await fetch("/data/incidents.json");
      incidents = (await response.json()).filter((incident) => incident.active);
    } catch (error) {}

    loading = false;
  });
</script>

{#if !incidents.length && !loading}
  <article class="up">✅ &nbsp; {config.i18n.allSystemsOperational}</article>
{/if}

<section>
  {#if loading}
    <Loading />
  {:else if incidents.length}
    <h2>{config.i18n.activeIncidents}</h2>
    {#each incidents as incident}
      <article class="down down-active">
        <div class="f">
          <div>
            <h4>{incident.title}</h4>
            <div>
              {config.i18n.activeIncidentSummary
                .replace(/\$DATE/g, new Date(incident.created_at).toLocaleString(config.i18n.locale))
                .replace(/\$POSTS/g, incident.comments)}
            </div>
          </div>
        </div>
      </article>
    {/each}
  {/if}
</section>

<style>
  section {
    margin-bottom: 2rem;
  }
</style>

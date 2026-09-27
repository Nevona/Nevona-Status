<script>
  export let incidents = [];
</script>

{#if incidents.length}
  <div class="sec-title">Past incidents</div>
  <div class="card">
    {#each incidents as incident}
      <div class="inc">
        <div class="ih">
          <span class={`pill ${incident.status === "resolved" ? "res" : "mon"}`}>
            {incident.status === "resolved" ? "Resolved" : "Monitoring"}
          </span>
          <span class="it">{incident.title}</span>
          {#if incident.date}<span class="idt">{incident.date}</span>{/if}
        </div>
        {#if incident.message}<div class="im">{incident.message}</div>{/if}
      </div>
    {/each}
  </div>
{/if}

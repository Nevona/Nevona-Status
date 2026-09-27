<script>
  export let services = [];

  const dot = (status) =>
    ({ up: { cls: "up", color: "success" }, degraded: { cls: "dg", color: "cancelled" }, down: { cls: "dn", color: "failed" } })[
      status
    ] || { cls: "up", color: "success" };
</script>

{#if services.length}
  <div class="sec-title">Nevona</div>
  <div class="card">
    {#each services as service}
      <div class="comp">
        <div class="row1">
          <span class="nm">{service.name}</span>
          {#if service.core}<span class="core">core</span>{/if}
          <span class={`st ${dot(service.status).cls}`}>
            <span class="d" style={`background:var(--${dot(service.status).color})`}></span>
            {service.label}
          </span>
        </div>
        <div class="strip">
          {#each service.days as day}<i class={day === "up" ? "" : day}></i>{/each}
        </div>
        <div class="strip-legend">
          <span>90 days ago</span>
          <span>{service.uptime} uptime</span>
          <span>Today</span>
        </div>
      </div>
    {/each}
  </div>
{/if}

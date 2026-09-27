<script>
  export let vendors = [];

  const dot = (status) =>
    ({ up: { cls: "up", color: "success" }, degraded: { cls: "dg", color: "cancelled" }, down: { cls: "dn", color: "failed" } })[
      status
    ] || { cls: "up", color: "success" };
</script>

{#if vendors.length}
  <div class="sec-title">Third-party dependencies</div>
  <div class="card">
    {#each vendors as vendor}
      <div class="comp">
        <div class="row1">
          <span class="nm">{vendor.name}</span>
          {#if vendor.core}<span class="core">core</span>{/if}
          {#if vendor.tag}<span class="vtag">{vendor.tag}</span>{/if}
          <span class={`st ${dot(vendor.status).cls}`}>
            <span class="d" style={`background:var(--${dot(vendor.status).color})`}></span>
            {vendor.label}
          </span>
        </div>
      </div>
    {/each}
  </div>
{/if}

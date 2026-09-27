<script>
  export let overall;
</script>

<div class={`hero ${overall.cls}`}>
  <div class="ring">
    {#if overall.cls === "ok"}
      <svg class="lu" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5" /></svg>
    {:else}
      <svg class="lu" viewBox="0 0 24 24">
        <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
        <path d="M12 9v4M12 17h.01" />
      </svg>
    {/if}
  </div>
  <div>
    <div class="h1">{overall.title}</div>
    <div class="h2">{overall.subtitle}</div>
  </div>
</div>

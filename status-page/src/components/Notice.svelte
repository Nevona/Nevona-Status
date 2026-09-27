<script>
  export let notice = null;
</script>

{#if notice && notice.title}
  <div class="notice">
    <div class="nt">
      {#if notice.tag}<span class="tag">{notice.tag}</span>{/if}
      {notice.title}
    </div>
    {#if notice.message}<div class="nm">{notice.message}</div>{/if}
    {#if notice.date}<div class="nd">{notice.date}</div>{/if}
  </div>
{/if}

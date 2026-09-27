<script>
  import { onMount } from "svelte";

  let dark = false;

  const systemDark = () =>
    typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;

  const apply = (mode) => {
    document.documentElement.dataset.theme = mode;
    dark = mode === "dark";
    try {
      localStorage.setItem("theme", mode);
    } catch (error) {}
  };

  const toggle = () => apply(dark ? "light" : "dark");

  onMount(() => {
    let stored = null;
    try {
      stored = localStorage.getItem("theme");
    } catch (error) {}
    dark = stored ? stored === "dark" : systemDark();
  });
</script>

<button
  class="theme-toggle"
  on:click={toggle}
  aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
  title={dark ? "Light mode" : "Dark mode"}
>
  {#if dark}
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  {:else}
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  {/if}
</button>

<script>
  import { onMount } from "svelte";
  import ThemeToggle from "../components/ThemeToggle.svelte";
  import Hero from "../components/Hero.svelte";
  import Notice from "../components/Notice.svelte";
  import Services from "../components/Services.svelte";
  import Vendors from "../components/Vendors.svelte";
  import Incidents from "../components/Incidents.svelte";
  import config from "../data/config.json";

  let services = [];
  let vendors = [];
  let incidents = [];
  let notice = null;
  let updatedAt = null;

  const worst = (items) => {
    if (items.some((item) => item.status === "down")) return "down";
    if (items.some((item) => item.status === "degraded")) return "degraded";
    return "up";
  };

  const relative = (date) => {
    const seconds = Math.round((date.getTime() - Date.now()) / 1000);
    const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
    for (const [unit, span] of [["day", 86400], ["hour", 3600], ["minute", 60]]) {
      if (Math.abs(seconds) >= span) return formatter.format(Math.round(seconds / span), unit);
    }

    return "just now";
  };

  $: overall = (() => {
    const state = worst([...services, ...vendors]);
    const title = {
      up: "All systems operational",
      degraded: "Partial system degradation",
      down: "Major service outage",
    }[state];
    const detail = {
      up: "All services running normally",
      degraded: "Some services are affected",
      down: "One or more services are down",
    }[state];
    return {
      cls: { up: "ok", degraded: "degraded", down: "down" }[state],
      title,
      subtitle: `${detail}${updatedAt ? ` · updated ${relative(updatedAt)}` : ""}`,
    };
  })();

  const load = async (path, fallback) => {
    try {
      // Pages caches files for 10 min; the timestamp skips that cache so status is always fresh.
      return await fetch(`${path}?t=${Date.now()}`, { cache: "no-store" }).then((response) => response.json());
    } catch (error) {
      return fallback;
    }
  };

  onMount(async () => {
    services = await load("/data/services.json", []);
    vendors = await load("/data/vendors.json", []);
    incidents = await load("/data/incidents.json", []);
    notice = await load("/data/notice.json", null);
    const meta = await load("/data/meta.json", {});
    if (meta.updatedAt) updatedAt = new Date(meta.updatedAt);
  });
</script>

<svelte:head>
  <title>{(config["status-website"] || {}).name || "Status"}</title>
</svelte:head>

<ThemeToggle />

<div class="wrap">
  <div class="top">
    <img class="mark" src="/nevona-mark.svg" alt="Nevona" />
    <div class="wm">Nevona <span>Status</span></div>
  </div>

  <Hero {overall} />
  <Notice {notice} />
  <Services {services} />
  <Vendors {vendors} />
  <Incidents {incidents} />

  <div class="foot">Live status of the Nevona platform · status.nevona.ai</div>
</div>

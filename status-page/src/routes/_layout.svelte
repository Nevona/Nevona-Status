<script>
  import config from "../data/config.json";

  const statusWebsite = config["status-website"] || {};
</script>

<svelte:head>
  <!-- Apply the saved light/dark choice before first paint to avoid a flash. -->
  <script>
    try {
      var theme = localStorage.getItem("theme");
      if (theme) document.documentElement.dataset.theme = theme;
    } catch (error) {}
  </script>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="true" />
  <link
    rel="stylesheet"
    href="https://fonts.googleapis.com/css2?family=Roboto+Condensed:wght@400;500;600;700;800&family=Roboto+Mono:wght@400;500&display=swap"
  />
  <link rel="stylesheet" href="/nevona.css" />
  <link rel="icon" type="image/svg+xml" href={statusWebsite.faviconSvg || "/nevona-mark.svg"} />
</svelte:head>

<slot />

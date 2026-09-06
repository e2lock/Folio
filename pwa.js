if ("serviceWorker" in navigator) {
  let reloading = false;

  function checkForUpdate(registration) {
    if (!registration) return;
    registration.update().catch(() => {});
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js", { updateViaCache: "none" })
      .then((registration) => {
        checkForUpdate(registration);
        setInterval(() => checkForUpdate(registration), 5 * 60 * 1000);
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") checkForUpdate(registration);
        });
        window.addEventListener("pageshow", () => checkForUpdate(registration));
      })
      .catch((error) => {
        console.warn("Folio SW:", error);
      });
  });

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloading) return;
    reloading = true;
    window.location.reload();
  });
}

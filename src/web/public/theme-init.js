// Applies the saved light/dark preference before the first paint to avoid a flash.
(function () {
  try {
    var pref = localStorage.getItem("short-theme") || "system";
    var dark = pref === "dark" || (pref === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  } catch (e) {}
})();

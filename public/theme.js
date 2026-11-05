// Runs before first paint: applies the saved theme and flags what the page can animate.
(() => {
  const root = document.documentElement;
  root.classList.add("js");
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) root.classList.add("motion");
  try {
    const theme = localStorage.getItem("theme");
    if (theme === "light" || theme === "dark") root.dataset.theme = theme;
  } catch {}
})();

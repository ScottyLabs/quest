const FADE = 220;

export function hideSplash(): void {
  const splash = document.getElementById("splash");
  if (splash === null || "leaving" in splash.dataset) return;

  splash.dataset.leaving = "";
  setTimeout(() => splash.remove(), FADE);
}

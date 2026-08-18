const ANNOUNCEMENT_ID = "terrier-trade-open-08-18";
const STAMP = `quest.announcement.seen.${ANNOUNCEMENT_ID}`;

export const announcement = $state({ open: false });

export function showAnnouncementOnce(): void {
  if (localStorage.getItem(STAMP) === "1") return;

  // Mark it seen immediately so reopening the app won't show it again.
  localStorage.setItem(STAMP, "1");
  announcement.open = true;
}

export function closeAnnouncement(): void {
  announcement.open = false;
}

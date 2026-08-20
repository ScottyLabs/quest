const ANNOUNCEMENT_ID = "secrets-08-20";
const STAMP = `quest.announcement.seen.${ANNOUNCEMENT_ID}`;

export const announcement = $state({
  open: false,
});

export function showAnnouncementOnce(): void {
  if (localStorage.getItem(STAMP) === "1") return;

  announcement.open = true;
}

export function closeAnnouncement(): void {
  localStorage.setItem(STAMP, "1");
  announcement.open = false;
}

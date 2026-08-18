export const announcement = $state({ open: false });

export function showAnnouncement(): void {
  announcement.open = true;
}

export function closeAnnouncement(): void {
  announcement.open = false;
}

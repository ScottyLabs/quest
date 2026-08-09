const STAMP = "quest.briefing.seen";

export const briefing = $state({ open: false });

function today(): string {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");

  return `${now.getFullYear()}-${month}-${day}`;
}

export function greet(): void {
  if (localStorage.getItem(STAMP) === today()) return;

  briefing.open = true;
}

export function acknowledge(): void {
  briefing.open = false;
  localStorage.setItem(STAMP, today());
}

export interface Holder {
  name: string;
  andrewId: string;
}

export const ticket = $state<{ current: Holder | null }>({ current: null });

export function showTicket(holder: Holder): void {
  ticket.current = holder;
}

export function hideTicket(): void {
  ticket.current = null;
}

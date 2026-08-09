export const scanning = $state<{ label: string | null }>({ label: null });

let controller: AbortController | null = null;

export function openScan(label: string): AbortSignal {
  controller = new AbortController();
  scanning.label = label;
  return controller.signal;
}

export function closeScan(): void {
  controller = null;
  scanning.label = null;
}

export function cancelScan(): void {
  controller?.abort();
}

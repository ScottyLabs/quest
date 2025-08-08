export function typedFromEntries<K extends string | number | symbol, V>(
	entries: ReadonlyArray<readonly [K, V]>,
): Record<K, V> {
	return Object.fromEntries(entries) as Record<K, V>;
}

export type ValueOf<T> = T[keyof T];

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

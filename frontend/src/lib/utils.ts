import { useEffect, useState } from "react";

export function typedFromEntries<K extends string | number | symbol, V>(
	entries: ReadonlyArray<readonly [K, V]>,
): Record<K, V> {
	return Object.fromEntries(entries) as Record<K, V>;
}

export type ValueOf<T> = T[keyof T];

export function useDebounce<T>(value: T, delay: number): T {
	const [debouncedValue, setDebouncedValue] = useState(value);

	useEffect(() => {
		const handler = setTimeout(() => {
			setDebouncedValue(value);
		}, delay);

		return () => {
			clearTimeout(handler);
		};
	}, [value, delay]);

	return debouncedValue;
}

// TODO: remove these
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

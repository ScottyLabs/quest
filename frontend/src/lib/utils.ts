import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export const snakeToCamel = (str: string) =>
	str
		.toLowerCase()
		.replace(/([-_][a-z])/g, (group) =>
			group.toUpperCase().replace("-", "").replace("_", ""),
		);
export const snakeToCamelObject = (obj: any): any => {
	if (typeof obj !== "object" || obj === null) {
		return obj; // Return as is if not an object
	}
	if (Array.isArray(obj)) {
		return obj.map(snakeToCamelObject); // Recursively convert arrays
	}
	const newObj: Record<string, any> = {};
	for (const key in obj) {
		if (Object.hasOwn(obj, key)) {
			const newKey = snakeToCamel(key);
			newObj[newKey] = obj[key];
			// Recursively convert nested objects
			if (typeof obj[key] === "object" && obj[key] !== null) {
				newObj[newKey] = snakeToCamelObject(obj[key]);
			}
		}
	}
	return newObj;
};

export const callWithGeolocation = async <T>(
	fn: (position: GeolocationPosition) => Promise<T>,
	samplePeriod: number = 0,
): Promise<T | null> => {
	// Finds the user's most precise geolocation that was sampled over the course of waiting for the sample period
	return new Promise((resolve) => {
		if (!navigator.geolocation) {
			resolve(null);
			return;
		}

		let bestPosition: GeolocationPosition | null = null;
		let bestAccuracy = Infinity;

		const startTime = Date.now();
		const sampleInterval = setInterval(() => {
			navigator.geolocation.getCurrentPosition(
				(position) => {
					if (position.coords.accuracy < bestAccuracy) {
						bestPosition = position;
						bestAccuracy = position.coords.accuracy;
					}
				},
				() => {}, // Ignore errors
				{
					enableHighAccuracy: true,
					timeout: 5000, // 5 seconds timeout for each sample
				},
			);

			if (Date.now() - startTime >= samplePeriod) {
				clearInterval(sampleInterval);
				if (bestPosition) {
					fn(bestPosition).then(resolve);
				} else {
					resolve(null);
				}
			}
		}, 500); // Sample every half second
	});
};

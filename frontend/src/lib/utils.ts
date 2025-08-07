export function typedFromEntries<K extends string | number | symbol, V>(
	entries: ReadonlyArray<readonly [K, V]>,
): Record<K, V> {
	return Object.fromEntries(entries) as Record<K, V>;
}

export type ValueOf<T> = T[keyof T];

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

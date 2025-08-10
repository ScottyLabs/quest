// Finds the user's most precise geolocation that was sampled
// over the course of waiting for the sample period
export const callWithGeolocation = async <T>(
	fn: (position: GeolocationPosition) => Promise<T>,
	samplePeriod: number = 5000,
): Promise<T | null> => {
	return new Promise((resolve) => {
		if (!navigator.geolocation) {
			resolve(null);
			return;
		}

		let bestPosition: GeolocationPosition | null = null;
		let bestAccuracy = Infinity;

		const watchId = navigator.geolocation.watchPosition(
			(position) => {
				if (position.coords.accuracy < bestAccuracy) {
					bestPosition = position;
					bestAccuracy = position.coords.accuracy;
				}
			},
			(e) => {
				console.error(e);
			},
			{
				enableHighAccuracy: true,
				maximumAge: 0,
			},
		);

		navigator.geolocation.getCurrentPosition(
			(position) => {
				bestPosition = position;
				bestAccuracy = position.coords.accuracy;
				// don't start the timer until we have the first position
				setTimeout(() => {
					navigator.geolocation.clearWatch(watchId);
					if (bestPosition) {
						fn(bestPosition).then(resolve);
					} else {
						resolve(null);
					}
				}, samplePeriod);
			},
			(e) => {
				console.error(e);
			},
			{
				enableHighAccuracy: true,
				maximumAge: 0,
			},
		);
	});
};

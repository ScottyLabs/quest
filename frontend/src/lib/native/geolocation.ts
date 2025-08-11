import { useCallback, useRef, useState } from "react";

type UseGeolocationResult<T> = {
	position: GeolocationPosition | null;
	isQuerying: boolean;
	queryPosition: (
		timeoutMs: number,
		fn: (position: GeolocationPosition) => Promise<T>,
	) => Promise<T | null>;
};

export function useGeolocation<T = unknown>(): UseGeolocationResult<T> {
	const [position, setPosition] = useState<GeolocationPosition | null>(null);
	const [isQuerying, setIsQuerying] = useState(false);

	const watchIdRef = useRef<number | null>(null);
	const bestPositionRef = useRef<GeolocationPosition | null>(null);

	const queryPosition = useCallback(
		(
			timeoutMs: number,
			fn: (position: GeolocationPosition) => Promise<T>,
		): Promise<T | null> => {
			return new Promise((resolve) => {
				if (!navigator.geolocation) {
					console.error("Geolocation not supported");
					resolve(null);
					return;
				}

				setIsQuerying(true);
				bestPositionRef.current = null;

				const finish = async () => {
					if (watchIdRef.current != null) {
						navigator.geolocation.clearWatch(watchIdRef.current);
						watchIdRef.current = null;
					}
					setIsQuerying(false);
					setPosition(bestPositionRef.current);

					if (bestPositionRef.current) {
						try {
							const result = await fn(bestPositionRef.current);
							resolve(result);
						} catch (error) {
							console.error("Error in callback function:", error);
							resolve(null);
						}
					} else {
						resolve(null);
					}
				};

				watchIdRef.current = navigator.geolocation.watchPosition(
					(pos) => {
						if (
							!bestPositionRef.current ||
							pos.coords.accuracy < bestPositionRef.current.coords.accuracy
						) {
							bestPositionRef.current = pos;
						}
					},
					(err) => {
						console.error("Geolocation error:", err);
						finish();
					},
					{
						enableHighAccuracy: true,
						maximumAge: 0,
					},
				);

				setTimeout(finish, timeoutMs);
			});
		},
		[],
	);

	return { position, isQuerying, queryPosition };
}

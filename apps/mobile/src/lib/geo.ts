import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";

export interface Fix {
  lat: number;
  lon: number;
  accuracy?: number;
}

const TIMEOUT = 4000;
const MAX_AGE = 5_000;

export async function permitted(): Promise<boolean> {
  try {
    const held = await Geolocation.checkPermissions();
    if (held.location === "granted" || held.coarseLocation === "granted") return true;
    if (held.location === "denied") return false;
  } catch {
    return false;
  }

  if (!Capacitor.isNativePlatform()) return true;

  try {
    const asked = await Geolocation.requestPermissions({ permissions: ["location"] });
    return asked.location === "granted" || asked.coarseLocation === "granted";
  } catch {
    return false;
  }
}

export async function fix(): Promise<Fix | null> {
  if (!(await permitted())) return null;

  try {
    const { coords } = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: TIMEOUT,
      maximumAge: MAX_AGE,
    });

    if (!Number.isFinite(coords.latitude) || !Number.isFinite(coords.longitude)) return null;

    const usable = Number.isFinite(coords.accuracy) && coords.accuracy >= 0;

    return {
      lat: coords.latitude,
      lon: coords.longitude,
      ...(usable ? { accuracy: coords.accuracy } : {}),
    };
  } catch {
    return null;
  }
}

import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";

export interface Fix {
  location_enabled: boolean;
  lat?: number;
  lon?: number;
  accuracy?: number;
}

const TIMEOUT = 4000;
const MAX_AGE = 5_000;

export async function permitted(): Promise<boolean> {
  try {
    const held = await Geolocation.checkPermissions();

    if (held.location === "granted" || held.coarseLocation === "granted") {
      return true;
    }

    if (held.location === "denied") return false;
  } catch {
    // On native platforms, Capacitor throws here if system
    // Location Services are disabled.
    return false;
  }

  if (!Capacitor.isNativePlatform()) return true;

  try {
    const asked = await Geolocation.requestPermissions({
      permissions: ["location"],
    });

    return asked.location === "granted" || asked.coarseLocation === "granted";
  } catch {
    return false;
  }
}

export async function fix(): Promise<Fix> {
  if (!(await permitted())) {
    return { location_enabled: false };
  }

  try {
    const { coords } = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: TIMEOUT,
      maximumAge: MAX_AGE,
    });

    if (!Number.isFinite(coords.latitude) || !Number.isFinite(coords.longitude)) {
      return { location_enabled: true };
    }

    const usable = Number.isFinite(coords.accuracy) && coords.accuracy >= 0;

    return {
      location_enabled: true,
      lat: coords.latitude,
      lon: coords.longitude,
      ...(usable ? { accuracy: coords.accuracy } : {}),
    };
  } catch {
    // Distinguish "GPS is on but couldn't get a fix" from
    // "Location Services were turned off while we were waiting."
    return { location_enabled: await permitted() };
  }
}

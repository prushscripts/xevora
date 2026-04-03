export type Coords = { lat: number; lng: number };

export function getLocation(): Promise<Coords> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocation not available"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    );
  });
}

const R = 6371000;

export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function isWithinGeofence(
  workerLat: number,
  workerLng: number,
  clientLat: number | null | undefined,
  clientLng: number | null | undefined,
  radiusMeters: number,
): boolean {
  if (clientLat == null || clientLng == null) return true;
  return haversineDistance(workerLat, workerLng, clientLat, clientLng) <= radiusMeters;
}

export type ClientGeo = {
  gps_enforcement: "warn" | "block" | "off";
  geofence_radius_meters: number | null | undefined;
  lat: number | null | undefined;
  lng: number | null | undefined;
};

export type GeofenceCheck = {
  allowed: boolean;
  within: boolean | null;
  warning: boolean;
  distanceMeters: number | null;
};

export function checkGeofenceEnforcement(
  client: ClientGeo,
  workerCoords: Coords | null,
): GeofenceCheck {
  if (client.gps_enforcement === "off") {
    return { allowed: true, within: null, warning: false, distanceMeters: null };
  }
  if (!workerCoords || client.lat == null || client.lng == null) {
    if (client.gps_enforcement === "block") {
      return { allowed: false, within: false, warning: false, distanceMeters: null };
    }
    return { allowed: true, within: null, warning: true, distanceMeters: null };
  }
  const radius = Number(client.geofence_radius_meters) || 300;
  const d = haversineDistance(workerCoords.lat, workerCoords.lng, client.lat, client.lng);
  const within = d <= radius;
  if (client.gps_enforcement === "block") {
    return { allowed: within, within, warning: false, distanceMeters: d };
  }
  return { allowed: true, within, warning: !within, distanceMeters: d };
}

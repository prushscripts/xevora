import * as Location from 'expo-location';

export type GPSResult = {
  lat: number;
  lng: number;
  withinGeofence: boolean;
  address?: string;
  error?: string;
};

/**
 * Haversine distance in meters between two lat/lng points
 */
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Request location permissions and get current position with geofence check
 */
export async function getCurrentLocationWithGeofence(
  geofenceLat: number,
  geofenceLng: number,
  radiusMeters: number = 300
): Promise<GPSResult> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    
    if (status !== 'granted') {
      return {
        lat: 0,
        lng: 0,
        withinGeofence: false,
        error: 'Location permission denied',
      };
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    const { latitude, longitude } = location.coords;
    const distance = haversineDistance(latitude, longitude, geofenceLat, geofenceLng);
    const withinGeofence = distance <= radiusMeters;

    let address: string | undefined;
    try {
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });
      if (reverseGeocode.length > 0) {
        const loc = reverseGeocode[0];
        address = `${loc.street || ''} ${loc.city || ''}, ${loc.region || ''}`.trim();
      }
    } catch (e) {
      // Reverse geocoding failed, continue without address
    }

    return {
      lat: latitude,
      lng: longitude,
      withinGeofence,
      address,
    };
  } catch (error) {
    return {
      lat: 0,
      lng: 0,
      withinGeofence: false,
      error: error instanceof Error ? error.message : 'Failed to get location',
    };
  }
}

import type { LocationCaptureData } from '../types';

export interface GeoLocationResult {
  success: boolean;
  data?: LocationCaptureData;
  error?: string;
  code?: 'PERMISSION_DENIED' | 'POSITION_UNAVAILABLE' | 'TIMEOUT' | 'INACCURATE' | 'NOT_SUPPORTED';
}

const STORAGE_KEY_LAST_LOCATION = 'fleet_last_exact_location';

// Check if browser/device supports Geolocation
export function isGeolocationSupported(): boolean {
  return typeof navigator !== 'undefined' && 'geolocation' in navigator;
}

// Get saved last exact location (only returns if user previously had valid session)
export function getSavedExactLocation(): LocationCaptureData | null {
  return null;
}

// Save confirmed location (for temporary audit)
export function saveExactLocation(loc: LocationCaptureData) {
  try {
    sessionStorage.setItem(STORAGE_KEY_LAST_LOCATION, JSON.stringify(loc));
  } catch {
    // Ignore
  }
}

// Helper: Query reverse geocode API with coordinate fallback
export async function reverseGeocodeCoordinates(lat: number, lon: number): Promise<{ address: string; city?: string; state?: string }> {
  try {
    const res = await fetch(`/api/attendance/reverse-geocode?lat=${lat}&lon=${lon}`);
    if (res.ok) {
      const data = await res.json();
      if (data.address) {
        return {
          address: data.address,
          city: data.city,
          state: data.state,
        };
      }
    }
  } catch (err) {
    // Ignore network error
  }
  return { address: `${lat.toFixed(5)}° N, ${lon.toFixed(5)}° E` };
}

/**
 * Capture Real High-Precision GPS from Device Hardware.
 * Automatically obtains the user's live physical location using browser Geolocation API
 * with high accuracy enabled and zero cache age.
 */
export async function captureCurrentLocation(
  targetAccuracyMeters = 30,
  maxWaitMs = 10000,
  onProgress?: (accuracy: number, lat: number, lon: number) => void
): Promise<GeoLocationResult> {
  if (!isGeolocationSupported()) {
    return {
      success: false,
      error: 'Location services are not supported on this browser or device.',
      code: 'NOT_SUPPORTED',
    };
  }

  return new Promise((resolve) => {
    let bestPosition: GeolocationPosition | null = null;
    let watchId: number | null = null;
    let timer: NodeJS.Timeout | null = null;
    let hasResolved = false;

    const finish = async (pos: GeolocationPosition | null, errorMsg?: string, code?: GeoLocationResult['code']) => {
      if (hasResolved) return;
      hasResolved = true;

      if (timer) clearTimeout(timer);
      if (watchId !== null) {
        try {
          navigator.geolocation.clearWatch(watchId);
        } catch {
          // Ignore
        }
        watchId = null;
      }

      if (pos) {
        const { latitude, longitude, accuracy } = pos.coords;
        const timestamp = new Date(pos.timestamp || Date.now()).toISOString();
        const isMockLocation = (pos.coords as any).isMock || false;

        const geoInfo = await reverseGeocodeCoordinates(latitude, longitude);
        const data: LocationCaptureData = {
          latitude: Number(latitude.toFixed(6)),
          longitude: Number(longitude.toFixed(6)),
          accuracy: Math.round(accuracy * 10) / 10,
          timestamp,
          address: geoInfo.address,
          is_mock_location: isMockLocation,
        };

        saveExactLocation(data);

        resolve({
          success: true,
          data,
        });
      } else {
        resolve({
          success: false,
          error: errorMsg || 'Unable to retrieve live GPS coordinates. Please allow location access in your browser.',
          code: code || 'POSITION_UNAVAILABLE',
        });
      }
    };

    // Safety timeout
    timer = setTimeout(() => {
      if (bestPosition) {
        finish(bestPosition);
      } else {
        finish(null, 'Live GPS lock timed out. Please check location permissions in your browser.', 'TIMEOUT');
      }
    }, maxWaitMs);

    // Fast Single-shot query
    try {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const acc = pos.coords.accuracy;
          if (onProgress) {
            onProgress(acc, pos.coords.latitude, pos.coords.longitude);
          }
          if (!bestPosition || acc < bestPosition.coords.accuracy) {
            bestPosition = pos;
          }
          if (acc <= targetAccuracyMeters) {
            finish(pos);
          }
        },
        (err) => {
          if (err.code === 1) {
            finish(null, 'Location permission denied. Please allow location access in your browser settings.', 'PERMISSION_DENIED');
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 8000,
          maximumAge: 0,
        }
      );
    } catch {
      // Ignore
    }

    // Continuous Watcher for high precision convergence
    try {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const acc = pos.coords.accuracy;
          if (onProgress) {
            onProgress(acc, pos.coords.latitude, pos.coords.longitude);
          }

          if (!bestPosition || acc < bestPosition.coords.accuracy) {
            bestPosition = pos;
          }

          if (acc <= targetAccuracyMeters) {
            finish(pos);
          }
        },
        (err) => {
          if (err.code === 1) {
            finish(null, 'Location permission denied. Please allow location access.', 'PERMISSION_DENIED');
          }
        },
        {
          enableHighAccuracy: true,
          timeout: maxWaitMs + 1000,
          maximumAge: 0,
        }
      );
    } catch {
      // Ignore
    }
  });
}

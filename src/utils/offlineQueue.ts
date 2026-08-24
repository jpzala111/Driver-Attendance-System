import type { OfflinePendingAttendance } from '../types';

const STORAGE_KEY = 'driver_attendance_offline_queue_v1';

export function getOfflineQueue(): OfflinePendingAttendance[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveOfflineRecord(record: OfflinePendingAttendance): void {
  const queue = getOfflineQueue();
  queue.push(record);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

export function clearOfflineQueue(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function removeOfflineRecord(id: string): void {
  const queue = getOfflineQueue().filter((item) => item.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

// Synchronize all pending records with server
export async function syncOfflineQueue(employeeId: string): Promise<{ syncedCount: number; errors: string[] }> {
  const queue = getOfflineQueue();
  if (queue.length === 0) return { syncedCount: 0, errors: [] };

  let syncedCount = 0;
  const errors: string[] = [];

  for (const item of [...queue]) {
    try {
      if (item.type === 'CHECK_IN') {
        const res = await fetch('/api/attendance/check-in', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employee_id: employeeId,
            latitude: item.location.latitude,
            longitude: item.location.longitude,
            accuracy: item.location.accuracy,
            address: item.location.address,
            is_mock_location: item.location.is_mock_location,
            starting_odometer: item.odometer.reading,
            starting_odometer_image: item.odometer.image,
            starting_odometer_input_method: item.odometer.input_method,
            starting_odometer_ocr_value: item.odometer.ocr_value,
            starting_odometer_ocr_confidence: item.odometer.ocr_confidence,
            client_timestamp: item.timestamp, // Maintain original captured timestamp
          }),
        });

        if (res.ok) {
          removeOfflineRecord(item.id);
          syncedCount++;
        } else {
          const errData = await res.json();
          errors.push(`Check-In sync error: ${errData.error || 'Failed'}`);
        }
      } else if (item.type === 'CHECK_OUT') {
        const res = await fetch('/api/attendance/check-out', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employee_id: employeeId,
            latitude: item.location.latitude,
            longitude: item.location.longitude,
            accuracy: item.location.accuracy,
            address: item.location.address,
            is_mock_location: item.location.is_mock_location,
            ending_odometer: item.odometer.reading,
            ending_odometer_image: item.odometer.image,
            ending_odometer_input_method: item.odometer.input_method,
            ending_odometer_ocr_value: item.odometer.ocr_value,
            ending_odometer_ocr_confidence: item.odometer.ocr_confidence,
            client_timestamp: item.timestamp,
          }),
        });

        if (res.ok) {
          removeOfflineRecord(item.id);
          syncedCount++;
        } else {
          const errData = await res.json();
          errors.push(`Check-Out sync error: ${errData.error || 'Failed'}`);
        }
      }
    } catch (err: any) {
      errors.push(`Network error syncing record ${item.id}: ${err.message || 'Offline'}`);
    }
  }

  return { syncedCount, errors };
}

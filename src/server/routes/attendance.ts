import { Router } from 'express';
import { db } from '../db';

export const attendanceRouter = Router();

// GET /api/attendance/status?employee_id=...
attendanceRouter.get('/status', (req, res) => {
  const employeeId = req.query.employee_id as string;
  if (!employeeId) {
    return res.status(400).json({ error: 'employee_id is required' });
  }

  const active = db.getActiveAttendanceForEmployee(employeeId);
  const employee = db.findEmployeeById(employeeId);

  return res.json({
    isCheckedIn: Boolean(active),
    activeAttendance: active || null,
    employee: employee || null,
  });
});

// GET /api/attendance/my?employee_id=...
attendanceRouter.get('/my', (req, res) => {
  const employeeId = req.query.employee_id as string;
  if (!employeeId) {
    return res.status(400).json({ error: 'employee_id is required' });
  }

  const list = db.getAttendance({ employee_id: employeeId });
  return res.json({ attendance: list });
});

// POST /api/attendance/check-in
attendanceRouter.post('/check-in', (req, res) => {
  try {
    const {
      employee_id,
      latitude,
      longitude,
      accuracy,
      address,
      is_mock_location,
      starting_odometer,
      starting_odometer_image,
      starting_odometer_input_method,
      starting_odometer_ocr_value,
      starting_odometer_ocr_confidence,
      client_timestamp,
    } = req.body;

    if (!employee_id) {
      return res.status(400).json({ error: 'employee_id is required.' });
    }

    if (latitude === undefined || longitude === undefined || accuracy === undefined) {
      return res.status(400).json({ error: 'GPS location (latitude, longitude, accuracy) is mandatory for Check-In.' });
    }

    if (starting_odometer === undefined || starting_odometer === null || isNaN(Number(starting_odometer))) {
      return res.status(400).json({ error: 'Starting odometer reading is mandatory for Check-In.' });
    }

    const result = db.checkIn({
      employee_id,
      latitude: Number(latitude),
      longitude: Number(longitude),
      accuracy: Number(accuracy),
      address: address || '',
      is_mock_location: Boolean(is_mock_location),
      starting_odometer: Number(starting_odometer),
      starting_odometer_image: starting_odometer_image || '',
      starting_odometer_input_method: starting_odometer_input_method === 'MANUAL' ? 'MANUAL' : 'OCR',
      starting_odometer_ocr_value: starting_odometer_ocr_value ? Number(starting_odometer_ocr_value) : null,
      starting_odometer_ocr_confidence: starting_odometer_ocr_confidence ? Number(starting_odometer_ocr_confidence) : null,
      client_timestamp,
    });

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    return res.json(result);
  } catch (err: any) {
    console.error('Check-In error:', err);
    return res.status(500).json({ error: 'Failed to record Check-In. Please check your data and retry.' });
  }
});

// POST /api/attendance/check-out
attendanceRouter.post('/check-out', (req, res) => {
  try {
    const {
      employee_id,
      latitude,
      longitude,
      accuracy,
      address,
      is_mock_location,
      ending_odometer,
      ending_odometer_image,
      ending_odometer_input_method,
      ending_odometer_ocr_value,
      ending_odometer_ocr_confidence,
      client_timestamp,
    } = req.body;

    if (!employee_id) {
      return res.status(400).json({ error: 'employee_id is required.' });
    }

    if (latitude === undefined || longitude === undefined || accuracy === undefined) {
      return res.status(400).json({ error: 'Fresh GPS location is mandatory for Check-Out.' });
    }

    if (ending_odometer === undefined || ending_odometer === null || isNaN(Number(ending_odometer))) {
      return res.status(400).json({ error: 'Ending odometer reading is mandatory for Check-Out.' });
    }

    const result = db.checkOut({
      employee_id,
      latitude: Number(latitude),
      longitude: Number(longitude),
      accuracy: Number(accuracy),
      address: address || '',
      is_mock_location: Boolean(is_mock_location),
      ending_odometer: Number(ending_odometer),
      ending_odometer_image: ending_odometer_image || '',
      ending_odometer_input_method: ending_odometer_input_method === 'MANUAL' ? 'MANUAL' : 'OCR',
      ending_odometer_ocr_value: ending_odometer_ocr_value ? Number(ending_odometer_ocr_value) : null,
      ending_odometer_ocr_confidence: ending_odometer_ocr_confidence ? Number(ending_odometer_ocr_confidence) : null,
      client_timestamp,
    });

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    return res.json(result);
  } catch (err: any) {
    console.error('Check-Out error:', err);
    return res.status(500).json({ error: 'Failed to record Check-Out. Please retry.' });
  }
});

// GET /api/attendance/search-places
attendanceRouter.get('/search-places', async (req, res) => {
  const { q } = req.query;
  if (!q || typeof q !== 'string' || q.trim().length < 2) {
    return res.json({ results: [] });
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q.trim())}&limit=8&addressdetails=1`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'FleetDriverAttendance/2.0 (fleet-attendance-live@fleet.internal)',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (response.ok) {
      const data = await response.json();
      const results = (Array.isArray(data) ? data : []).map((item: any) => {
        const addr = item.address || {};
        const shortName = item.name || item.display_name.split(',')[0];
        const secondary = [
          addr.suburb || addr.neighbourhood || addr.road,
          addr.city || addr.town || addr.district,
          addr.state,
          addr.country,
        ].filter(Boolean).join(', ');

        return {
          display_name: item.display_name,
          short_name: shortName,
          subtitle: secondary,
          lat: parseFloat(item.lat),
          lon: parseFloat(item.lon),
        };
      });
      return res.json({ results });
    }
    return res.json({ results: [] });
  } catch (err) {
    console.error('Place search error:', err);
    return res.json({ results: [] });
  }
});

// GET /api/attendance/reverse-geocode
attendanceRouter.get('/reverse-geocode', async (req, res) => {
  const { lat, lon } = req.query;
  if (!lat || !lon) {
    return res.status(400).json({ error: 'lat and lon are required' });
  }

  const numLat = Number(lat);
  const numLon = Number(lon);
  const fallbackStr = `${numLat.toFixed(5)}° N, ${numLon.toFixed(5)}° E`;

  // 1. Try Nominatim (OpenStreetMap)
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${numLat}&lon=${numLon}&zoom=18&addressdetails=1`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'FleetDriverAttendance/2.0 (fleet-attendance-live@fleet.internal)',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (response.ok) {
      const data = await response.json();
      const addr = data.address || {};
      
      const landmarkOrBuilding = data.name || addr.building || addr.amenity || addr.shop || addr.industrial || addr.office || addr.commercial;
      const road = addr.road || addr.street || addr.pedestrian || addr.footway || '';
      const area = addr.neighbourhood || addr.suburb || addr.residential || addr.industrial_area || addr.city_district || '';
      const city = addr.city || addr.town || addr.village || addr.municipality || addr.district || '';
      const state = addr.state || addr.province || '';
      const postcode = addr.postcode || '';

      const parts = [
        landmarkOrBuilding,
        road,
        area,
        city,
        state,
        postcode,
      ].filter(Boolean);

      const uniqueParts = parts.filter((item, index) => parts.indexOf(item) === index);

      if (uniqueParts.length >= 2) {
        return res.json({
          address: uniqueParts.join(', '),
          city,
          state,
          postcode,
          raw: data,
        });
      }

      if (data.display_name) {
        const cleaned = data.display_name.replace(/, India$/, '');
        return res.json({
          address: cleaned,
          city,
          state,
          postcode,
          raw: data,
        });
      }
    }
  } catch (err) {
    // Continue to fallback
  }

  // 2. Fallback: BigDataCloud free client reverse geocoding API
  try {
    const bdcUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${numLat}&longitude=${numLon}&localityLanguage=en`;
    const bdcRes = await fetch(bdcUrl);
    if (bdcRes.ok) {
      const bdcData = await bdcRes.json();
      const parts = [
        bdcData.localityInfo?.informative?.[0]?.name || bdcData.locality,
        bdcData.city || bdcData.principalSubdivision,
        bdcData.countryName,
      ].filter(Boolean);

      if (parts.length > 0) {
        return res.json({
          address: parts.join(', '),
          city: bdcData.city || '',
          state: bdcData.principalSubdivision || '',
          raw: bdcData,
        });
      }
    }
  } catch {
    // Ignore
  }

  return res.json({ address: fallbackStr });
});


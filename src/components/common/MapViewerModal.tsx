import React, { useEffect, useRef } from 'react';
import type { Attendance } from '../../types';
import { X, MapPin, Navigation, Clock, ShieldCheck, AlertCircle } from 'lucide-react';
import L from 'leaflet';

interface MapViewerModalProps {
  attendance: Attendance | null;
  onClose: () => void;
}

export const MapViewerModal: React.FC<MapViewerModalProps> = ({ attendance, onClose }) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!attendance || !mapContainerRef.current) return;

    // Destroy existing map if any
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const checkInLat = attendance.check_in_latitude;
    const checkInLon = attendance.check_in_longitude;
    const hasCheckOut = attendance.check_out_latitude !== null && attendance.check_out_longitude !== null && attendance.check_out_latitude !== undefined && attendance.check_out_longitude !== undefined;
    const checkOutLat = attendance.check_out_latitude || checkInLat;
    const checkOutLon = attendance.check_out_longitude || checkInLon;

    // Create Map
    const map = L.map(mapContainerRef.current, {
      center: [checkInLat, checkInLon],
      zoom: 13,
      attributionControl: false,
    });
    mapInstanceRef.current = map;

    // Tile Layer from OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    // Custom Icon helper
    const createCustomIcon = (color: string, label: string) => {
      return L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
          <div style="background-color: ${color}; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 11px; border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.35);">
            ${label}
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
        popupAnchor: [0, -18],
      });
    };

    // Check-In Marker (Green)
    const checkInIcon = createCustomIcon('#10b981', 'IN');
    const checkInMarker = L.marker([checkInLat, checkInLon], { icon: checkInIcon }).addTo(map);
    checkInMarker.bindPopup(`
      <div style="color: #0f172a; font-family: sans-serif; padding: 4px;">
        <strong style="color: #059669; font-size: 14px;">🟢 Check-In Location</strong><br/>
        <div style="margin-top: 4px; font-size: 12px;">${attendance.check_in_location_address || 'Captured Location'}</div>
        <div style="font-size: 11px; color: #64748b; margin-top: 4px;">
          Time: ${new Date(attendance.check_in).toLocaleTimeString()}<br/>
          Accuracy: ±${attendance.check_in_accuracy}m<br/>
          Coords: ${checkInLat.toFixed(5)}, ${checkInLon.toFixed(5)}
        </div>
      </div>
    `);

    // Accuracy Circle for Check-In
    L.circle([checkInLat, checkInLon], {
      radius: attendance.check_in_accuracy || 15,
      color: '#10b981',
      fillColor: '#10b981',
      fillOpacity: 0.15,
      weight: 1,
    }).addTo(map);

    const bounds = L.latLngBounds([[checkInLat, checkInLon]]);

    // Check-Out Marker (Red) if available
    if (hasCheckOut && attendance.check_out_latitude && attendance.check_out_longitude) {
      const checkOutIcon = createCustomIcon('#ef4444', 'OUT');
      const checkOutMarker = L.marker([checkOutLat, checkOutLon], { icon: checkOutIcon }).addTo(map);
      checkOutMarker.bindPopup(`
        <div style="color: #0f172a; font-family: sans-serif; padding: 4px;">
          <strong style="color: #dc2626; font-size: 14px;">🔴 Check-Out Location</strong><br/>
          <div style="margin-top: 4px; font-size: 12px;">${attendance.check_out_location_address || 'Captured Location'}</div>
          <div style="font-size: 11px; color: #64748b; margin-top: 4px;">
            Time: ${attendance.check_out ? new Date(attendance.check_out).toLocaleTimeString() : 'N/A'}<br/>
            Accuracy: ±${attendance.check_out_accuracy || 10}m<br/>
            Coords: ${checkOutLat.toFixed(5)}, ${checkOutLon.toFixed(5)}
          </div>
        </div>
      `);

      L.circle([checkOutLat, checkOutLon], {
        radius: attendance.check_out_accuracy || 15,
        color: '#ef4444',
        fillColor: '#ef4444',
        fillOpacity: 0.15,
        weight: 1,
      }).addTo(map);

      bounds.extend([checkOutLat, checkOutLon]);

      // Connect Check-In and Check-Out with visual path line
      L.polyline(
        [
          [checkInLat, checkInLon],
          [checkOutLat, checkOutLon],
        ],
        {
          color: '#3b82f6',
          weight: 3,
          dashArray: '6, 8',
          opacity: 0.8,
        }
      ).addTo(map);
    }

    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [attendance]);

  if (!attendance) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-slate-800/80 border-b border-slate-700/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-base">Attendance Location Map</h3>
              <p className="text-xs text-slate-400">
                Driver: <span className="text-slate-200 font-semibold">{attendance.employee_name}</span> ({attendance.employee_code}) &bull; Date: {new Date(attendance.check_in).toLocaleDateString()}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-700/60 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Map Container */}
        <div className="relative flex-1 min-h-[380px] bg-slate-950">
          <div ref={mapContainerRef} className="w-full h-full" />
        </div>

        {/* Location Breakdown Footer */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Check In Card */}
          <div className="p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-xl">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" /> Check-In Location
              </span>
              <span className="text-slate-400 font-mono flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> {new Date(attendance.check_in).toLocaleTimeString()}
              </span>
            </div>
            <p className="text-slate-200 font-medium line-clamp-2">{attendance.check_in_location_address}</p>
            <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-400 font-mono">
              <span>Lat: {attendance.check_in_latitude.toFixed(5)}</span>
              <span>Lon: {attendance.check_in_longitude.toFixed(5)}</span>
              <span>Accuracy: ±{attendance.check_in_accuracy}m</span>
            </div>
          </div>

          {/* Check Out Card */}
          <div className="p-3 bg-rose-950/30 border border-rose-800/40 rounded-xl">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-semibold text-rose-400 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Check-Out Location
              </span>
              {attendance.check_out ? (
                <span className="text-slate-400 font-mono flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> {new Date(attendance.check_out).toLocaleTimeString()}
                </span>
              ) : (
                <span className="text-amber-400 text-[11px] font-medium">In Progress</span>
              )}
            </div>
            {attendance.check_out ? (
              <>
                <p className="text-slate-200 font-medium line-clamp-2">{attendance.check_out_location_address}</p>
                <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-400 font-mono">
                  <span>Lat: {attendance.check_out_latitude?.toFixed(5)}</span>
                  <span>Lon: {attendance.check_out_longitude?.toFixed(5)}</span>
                  <span>Accuracy: ±{attendance.check_out_accuracy}m</span>
                </div>
              </>
            ) : (
              <p className="text-slate-400 italic">Driver has not checked out yet. Location will be captured at check-out.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

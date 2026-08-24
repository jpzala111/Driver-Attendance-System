import React, { useState, useEffect, useRef } from 'react';
import type { LocationCaptureData } from '../../types';
import {
  X,
  MapPin,
  Navigation,
  Search,
  Check,
  RefreshCw,
  Crosshair,
  AlertCircle,
  Building,
  Layers,
  Sparkles,
  Compass,
  Bookmark,
} from 'lucide-react';
import L from 'leaflet';
import { reverseGeocodeCoordinates, captureCurrentLocation, saveExactLocation, getSavedExactLocation } from '../../utils/geo';

interface LocationPickerModalProps {
  initialLocation: LocationCaptureData | null;
  onConfirm: (location: LocationCaptureData) => void;
  onClose: () => void;
}

interface PlaceSearchResult {
  display_name: string;
  short_name: string;
  subtitle: string;
  lat: number;
  lon: number;
}

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
  initialLocation,
  onConfirm,
  onClose,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const fallbackSaved = getSavedExactLocation();

  // Selected Pin Coordinates & Resolved Address
  const [selectedLat, setSelectedLat] = useState<number>(
    initialLocation?.latitude || fallbackSaved?.latitude || 23.0225
  );
  const [selectedLon, setSelectedLon] = useState<number>(
    initialLocation?.longitude || fallbackSaved?.longitude || 72.5714
  );
  const [resolvedAddress, setResolvedAddress] = useState<string>(
    initialLocation?.address || fallbackSaved?.address || 'Loading exact location...'
  );
  const [accuracyMeters, setAccuracyMeters] = useState<number>(
    initialLocation?.accuracy || 10
  );

  // Map Layer (Standard Street vs Satellite Imagery)
  const [mapType, setMapType] = useState<'streets' | 'satellite'>('streets');

  // Search & Coordinates Direct Input
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<PlaceSearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);

  // Live GPS Acquisition States
  const [isLocatingGPS, setIsLocatingGPS] = useState(false);
  const [liveGpsAccuracy, setLiveGpsAccuracy] = useState<number | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Direct Coordinates Input Mode Toggle
  const [showCoordInput, setShowCoordInput] = useState(false);
  const [manualLat, setManualLat] = useState(selectedLat.toString());
  const [manualLon, setManualLon] = useState(selectedLon.toString());

  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const startLat = selectedLat;
    const startLon = selectedLon;

    const map = L.map(mapContainerRef.current, {
      center: [startLat, startLon],
      zoom: initialLocation ? 17 : 14,
      attributionControl: false,
      zoomControl: true,
    });
    mapInstanceRef.current = map;

    // Add Base Tile Layer
    const streetUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    const satelliteUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

    const tileLayer = L.tileLayer(mapType === 'satellite' ? satelliteUrl : streetUrl, {
      maxZoom: 19,
    }).addTo(map);
    tileLayerRef.current = tileLayer;

    // Custom Draggable Pin Icon
    const pinIcon = L.divIcon({
      className: 'custom-exact-marker',
      html: `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate3d(0,0,0);">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); width: 44px; height: 44px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; border: 3px solid #ffffff; box-shadow: 0 8px 20px rgba(0,0,0,0.5);">
            <div style="transform: rotate(45deg); font-size: 16px; color: white; font-weight: 900;">📍</div>
          </div>
          <div style="width: 12px; height: 4px; background: rgba(0,0,0,0.4); border-radius: 50%; margin-top: 2px; filter: blur(1px);"></div>
        </div>
      `,
      iconSize: [44, 52],
      iconAnchor: [22, 50],
      popupAnchor: [0, -50],
    });

    const marker = L.marker([startLat, startLon], {
      icon: pinIcon,
      draggable: true,
      autoPan: true,
    }).addTo(map);
    markerRef.current = marker;

    // Marker Drag Event
    marker.on('dragend', async () => {
      const pos = marker.getLatLng();
      updateSelectedPosition(pos.lat, pos.lng);
    });

    // Map Click to Move Pin
    map.on('click', async (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      marker.setLatLng([lat, lng]);
      updateSelectedPosition(lat, lng);
    });

    // Auto-resolve initial address if needed
    if (!initialLocation && (!fallbackSaved || !fallbackSaved.address)) {
      handleSnapToHighPrecisionGPS();
    } else if (initialLocation) {
      updateSelectedPosition(initialLocation.latitude, initialLocation.longitude, initialLocation.accuracy);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Switch Map Layer (Satellite vs Street)
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;
    const streetUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    const satelliteUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

    tileLayerRef.current.setUrl(mapType === 'satellite' ? satelliteUrl : streetUrl);
  }, [mapType]);

  // Update position and reverse-geocode
  const updateSelectedPosition = async (lat: number, lon: number, customAcc?: number) => {
    const cleanLat = Number(lat.toFixed(6));
    const cleanLon = Number(lon.toFixed(6));
    setSelectedLat(cleanLat);
    setSelectedLon(cleanLon);
    setManualLat(cleanLat.toString());
    setManualLon(cleanLon.toString());

    if (customAcc !== undefined) {
      setAccuracyMeters(customAcc);
    } else {
      setAccuracyMeters(8); // Explicit pin placement has high confidence
    }

    setIsResolvingAddress(true);
    setGpsError(null);

    const info = await reverseGeocodeCoordinates(cleanLat, cleanLon);
    setResolvedAddress(info.address);
    setIsResolvingAddress(false);
  };

  // High Precision GPS Convergence Action
  const handleSnapToHighPrecisionGPS = async () => {
    setIsLocatingGPS(true);
    setLiveGpsAccuracy(null);
    setGpsError(null);

    const result = await captureCurrentLocation(
      15, // target <= 15m
      9000,
      (acc, lat, lon) => {
        setLiveGpsAccuracy(Math.round(acc));
        if (mapInstanceRef.current && markerRef.current) {
          markerRef.current.setLatLng([lat, lon]);
          mapInstanceRef.current.setView([lat, lon], 17, { animate: true });
        }
      }
    );

    setIsLocatingGPS(false);

    if (result.success && result.data) {
      const { latitude, longitude, accuracy, address } = result.data;
      setSelectedLat(latitude);
      setSelectedLon(longitude);
      setManualLat(latitude.toString());
      setManualLon(longitude.toString());
      setAccuracyMeters(accuracy);
      setResolvedAddress(address);

      if (mapInstanceRef.current && markerRef.current) {
        markerRef.current.setLatLng([latitude, longitude]);
        mapInstanceRef.current.setView([latitude, longitude], 17, { animate: true });
      }
    } else {
      setGpsError(result.error || 'Could not acquire satellite lock. You can tap the map or search to set your exact location.');
    }
  };

  // Search input change handler
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    if (query.trim().length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    searchDebounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/attendance/search-places?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.results || []);
          setShowDropdown(true);
        }
      } catch (err) {
        // Ignore
      } finally {
        setIsSearching(false);
      }
    }, 300);
  };

  // Select place from search
  const handleSelectPlace = (place: PlaceSearchResult) => {
    setShowDropdown(false);
    setSearchQuery(place.short_name);
    updateSelectedPosition(place.lat, place.lon, 10);

    if (mapInstanceRef.current && markerRef.current) {
      markerRef.current.setLatLng([place.lat, place.lon]);
      mapInstanceRef.current.setView([place.lat, place.lon], 17, { animate: true });
    }
  };

  // Apply manual lat/lon
  const handleApplyManualCoords = () => {
    const lat = parseFloat(manualLat);
    const lon = parseFloat(manualLon);

    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      setGpsError('Please enter valid coordinates (Latitude -90 to 90, Longitude -180 to 180)');
      return;
    }

    setShowCoordInput(false);
    updateSelectedPosition(lat, lon, 5);

    if (mapInstanceRef.current && markerRef.current) {
      markerRef.current.setLatLng([lat, lon]);
      mapInstanceRef.current.setView([lat, lon], 17, { animate: true });
    }
  };

  // Confirm and return location
  const handleConfirmLocation = () => {
    const data: LocationCaptureData = {
      latitude: Number(selectedLat.toFixed(6)),
      longitude: Number(selectedLon.toFixed(6)),
      accuracy: accuracyMeters,
      timestamp: new Date().toISOString(),
      address: resolvedAddress,
      is_mock_location: false,
    };
    saveExactLocation(data);
    onConfirm(data);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-700/90 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0">
              <Crosshair className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm sm:text-base flex items-center gap-2">
                Exact Check-In Location
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Precision Mode
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">Drag marker, search address, or lock GPS satellite signal</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Actions Bar */}
        <div className="p-3 bg-slate-900 border-b border-slate-800 space-y-2 relative z-20">
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
            {/* Search Input with Autocomplete */}
            <div className="relative flex-1 min-w-[200px]">
              <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onFocus={() => {
                    if (searchResults.length > 0) setShowDropdown(true);
                  }}
                  placeholder="Search street, depot, building, or landmark..."
                  className="bg-transparent text-slate-200 text-xs w-full focus:outline-none placeholder:text-slate-500"
                />
                {isSearching && <RefreshCw className="w-3.5 h-3.5 text-blue-400 animate-spin shrink-0" />}
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSearchResults([]);
                      setShowDropdown(false);
                    }}
                    className="text-slate-500 hover:text-slate-300 p-0.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Autocomplete Dropdown */}
              {showDropdown && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-h-60 overflow-y-auto z-30 divide-y divide-slate-800">
                  {searchResults.map((place, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectPlace(place)}
                      className="w-full text-left px-3.5 py-2.5 hover:bg-slate-800/90 transition-colors flex items-start gap-2.5 cursor-pointer text-xs"
                    >
                      <Building className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-slate-200 truncate">{place.short_name}</div>
                        <div className="text-[10px] text-slate-400 truncate">{place.subtitle || place.display_name}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Satellite / Street Map Toggle */}
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-0.5 shrink-0">
              <button
                onClick={() => setMapType('streets')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  mapType === 'streets'
                    ? 'bg-slate-800 text-slate-100 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Map
              </button>
              <button
                onClick={() => setMapType('satellite')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                  mapType === 'satellite'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-3 h-3" /> Satellite
              </button>
            </div>

            {/* GPS Satellite Lock Action */}
            <button
              onClick={handleSnapToHighPrecisionGPS}
              disabled={isLocatingGPS}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 shadow-sm"
              title="Acquire live GPS satellite lock"
            >
              <Navigation className={`w-3.5 h-3.5 ${isLocatingGPS ? 'animate-spin text-emerald-300' : ''}`} />
              {isLocatingGPS
                ? liveGpsAccuracy !== null
                  ? `Locking: ±${liveGpsAccuracy}m...`
                  : 'Acquiring Satellites...'
                : 'Lock My GPS'}
            </button>
          </div>

          {/* Quick Lat/Lon Input Toggle Bar */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
            <button
              onClick={() => setShowCoordInput(!showCoordInput)}
              className="text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium cursor-pointer"
            >
              <Compass className="w-3 h-3" />
              {showCoordInput ? 'Hide Coordinate Input' : 'Enter GPS Coordinates Manually'}
            </button>

            <span className="text-slate-400 font-mono">
              Pin: {selectedLat.toFixed(5)}°, {selectedLon.toFixed(5)}° (±{accuracyMeters}m)
            </span>
          </div>

          {/* Manual Coordinate Form */}
          {showCoordInput && (
            <div className="p-3 bg-slate-950/90 border border-slate-800 rounded-2xl flex flex-wrap items-center gap-2 animate-in fade-in duration-150">
              <div className="flex-1 min-w-[120px]">
                <label className="text-[10px] text-slate-400 block mb-0.5 font-medium">Latitude</label>
                <input
                  type="text"
                  value={manualLat}
                  onChange={(e) => setManualLat(e.target.value)}
                  placeholder="e.g. 23.0225"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                />
              </div>
              <div className="flex-1 min-w-[120px]">
                <label className="text-[10px] text-slate-400 block mb-0.5 font-medium">Longitude</label>
                <input
                  type="text"
                  value={manualLon}
                  onChange={(e) => setManualLon(e.target.value)}
                  placeholder="e.g. 72.5714"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                />
              </div>
              <button
                onClick={handleApplyManualCoords}
                className="mt-4 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                Go to Coordinates
              </button>
            </div>
          )}
        </div>

        {/* GPS Warning if any */}
        {gpsError && (
          <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 flex items-center gap-2 text-amber-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="flex-1">{gpsError}</span>
            <button onClick={() => setGpsError(null)} className="text-amber-400 hover:text-amber-200 p-0.5">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Map View Canvas */}
        <div className="relative flex-1 min-h-[300px] sm:min-h-[380px] bg-slate-950">
          <div ref={mapContainerRef} className="w-full h-full" />

          {/* Floating Live Instruction / Precision Badge */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-slate-950/90 backdrop-blur-md border border-slate-700/80 px-3.5 py-1.5 rounded-full text-[11px] font-semibold text-slate-200 pointer-events-none shadow-xl z-10 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Drag pin or tap map to place at exact building/bay</span>
          </div>

          {/* Satellite Layer Notice */}
          {mapType === 'satellite' && (
            <div className="absolute bottom-3 right-3 bg-slate-950/80 backdrop-blur-md border border-slate-700 px-2 py-1 rounded-md text-[10px] text-slate-300 z-10 pointer-events-none">
              High-Res Satellite Imagery
            </div>
          )}
        </div>

        {/* Footer: Resolved Address & Confirm Button */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-3">
          <div className="flex items-start gap-3 bg-slate-900/95 border border-slate-800 rounded-2xl p-3.5 shadow-inner">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-500/30">
              <MapPin className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-400" /> Exact Resolved Address
                </span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  {selectedLat.toFixed(5)}°, {selectedLon.toFixed(5)}°
                </span>
              </div>
              <p className="text-xs font-bold text-slate-100 mt-1 leading-snug break-words">
                {isResolvingAddress ? (
                  <span className="text-slate-400 animate-pulse">Resolving precise address...</span>
                ) : (
                  resolvedAddress
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmLocation}
              disabled={isResolvingAddress}
              className="flex-[2] py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              Confirm Exact Location
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

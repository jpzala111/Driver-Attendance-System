import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import type { Attendance, LocationCaptureData } from '../../types';
import {
  MapPin,
  Clock,
  Gauge,
  CheckCircle2,
  AlertCircle,
  Play,
  Square,
  RefreshCw,
  Sparkles,
  Map,
  ShieldCheck,
  Radio,
  WifiOff,
  Crosshair,
} from 'lucide-react';
import { captureCurrentLocation, getSavedExactLocation, saveExactLocation } from '../../utils/geo';
import { OdometerCaptureModal } from './OdometerCaptureModal';
import { LocationPickerModal } from '../common/LocationPickerModal';
import { saveOfflineRecord, syncOfflineQueue, getOfflineQueue } from '../../utils/offlineQueue';
import confetti from 'canvas-confetti';

interface DriverHomeScreenProps {
  onOpenMap: (attendance: Attendance) => void;
}

export const DriverHomeScreen: React.FC<DriverHomeScreenProps> = ({ onOpenMap }) => {
  const { user, employee, showToast, isOnline } = useAuth();
  const [isCheckedIn, setIsCheckedIn] = useState<boolean>(false);
  const [activeAttendance, setActiveAttendance] = useState<Attendance | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState<boolean>(true);
  const [isActionLoading, setIsActionLoading] = useState<boolean>(false);

  // Live Location & GPS state
  const [currentLocation, setCurrentLocation] = useState<LocationCaptureData | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [liveAccuracy, setLiveAccuracy] = useState<number | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [showLocationPicker, setShowLocationPicker] = useState<boolean>(false);

  // Odometer Modal state
  const [showOdometerModal, setShowOdometerModal] = useState<boolean>(false);
  const [odometerModalType, setOdometerModalType] = useState<'STARTING' | 'ENDING'>('STARTING');
  const [pendingStartingOdometer, setPendingStartingOdometer] = useState<{
    reading: number;
    image: string;
    inputMethod: 'OCR' | 'MANUAL';
    ocrValue: number | null;
    ocrConfidence: number | null;
  } | null>(null);

  // Live timer for active session
  const [elapsedString, setElapsedString] = useState<string>('00:00:00');

  const fetchStatus = async () => {
    if (!employee?.id) return;
    setIsLoadingStatus(true);
    try {
      const res = await fetch(`/api/attendance/status?employee_id=${employee.id}`);
      if (res.ok) {
        const data = await res.json();
        setIsCheckedIn(data.isCheckedIn);
        setActiveAttendance(data.activeAttendance);
      }
    } catch {
      // Offline fallback: check local active state
    } finally {
      setIsLoadingStatus(false);
    }
  };

  useEffect(() => {
    // Clear any stale cached location
    try {
      localStorage.removeItem('fleet_last_exact_location');
      sessionStorage.removeItem('fleet_last_exact_location');
    } catch {
      // Ignore
    }
    fetchStatus();
    acquireLocation();
  }, [employee?.id]);

  // Sync offline queue if online
  useEffect(() => {
    if (isOnline && employee?.id) {
      syncOfflineQueue(employee.id).then(({ syncedCount }) => {
        if (syncedCount > 0) {
          showToast('success', 'Offline Data Synchronized', `${syncedCount} queued attendance actions synced with server.`);
          fetchStatus();
        }
      });
    }
  }, [isOnline, employee?.id]);

  // Elapsed timer tick
  useEffect(() => {
    if (!isCheckedIn || !activeAttendance?.check_in) return;

    const interval = setInterval(() => {
      const startMs = new Date(activeAttendance.check_in).getTime();
      const nowMs = Date.now();
      const diffSec = Math.max(0, Math.floor((nowMs - startMs) / 1000));

      const hrs = Math.floor(diffSec / 3600);
      const mins = Math.floor((diffSec % 3600) / 60);
      const secs = diffSec % 60;

      setElapsedString(
        `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [isCheckedIn, activeAttendance?.check_in]);

  const acquireLocation = async () => {
    setIsLocating(true);
    setLocationError(null);
    setLiveAccuracy(null);
    const result = await captureCurrentLocation(
      25, // target <= 25m
      10000,
      (acc) => {
        setLiveAccuracy(Math.round(acc));
      }
    );
    if (result.success && result.data) {
      setCurrentLocation(result.data);
      saveExactLocation(result.data);
    } else {
      setLocationError(result.error || 'Failed to acquire live GPS position.');
      setCurrentLocation(null);
    }
    setIsLocating(false);
  };

  // Trigger Check-In Flow
  const handleCheckInClick = () => {
    if (!currentLocation) {
      showToast('error', 'Location Required', 'Please enable device GPS and allow location access to Check In.');
      acquireLocation();
      return;
    }

    if (!pendingStartingOdometer) {
      setOdometerModalType('STARTING');
      setShowOdometerModal(true);
      return;
    }

    performCheckIn(pendingStartingOdometer);
  };

  const performCheckIn = async (odoData: typeof pendingStartingOdometer) => {
    if (!employee || !currentLocation || !odoData) return;

    setIsActionLoading(true);

    if (!isOnline) {
      // Offline fallback: save to queue
      const offlineRecordId = `off-in-${Date.now()}`;
      saveOfflineRecord({
        id: offlineRecordId,
        type: 'CHECK_IN',
        timestamp: new Date().toISOString(),
        location: currentLocation,
        odometer: {
          reading: odoData.reading,
          image: odoData.image,
          input_method: odoData.inputMethod,
          ocr_value: odoData.ocrValue,
          ocr_confidence: odoData.ocrConfidence,
        },
      });

      setIsCheckedIn(true);
      setActiveAttendance({
        id: offlineRecordId,
        employee_id: employee.id,
        employee_name: employee.name,
        employee_code: employee.employee_code,
        check_in: new Date().toISOString(),
        check_in_latitude: currentLocation.latitude,
        check_in_longitude: currentLocation.longitude,
        check_in_accuracy: currentLocation.accuracy,
        check_in_location_timestamp: currentLocation.timestamp,
        check_in_location_address: currentLocation.address,
        check_in_is_mock_location: currentLocation.is_mock_location,
        starting_odometer: odoData.reading,
        starting_odometer_input_method: odoData.inputMethod,
        starting_odometer_ocr_value: odoData.ocrValue,
        starting_odometer_ocr_confidence: odoData.ocrConfidence,
        status: 'IN_PROGRESS',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      setPendingStartingOdometer(null);
      setShowOdometerModal(false);
      showToast('warning', 'Saved Offline', 'Check-In recorded in offline storage. Will sync when online.');
      setIsActionLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/attendance/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: employee.id,
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          accuracy: currentLocation.accuracy,
          address: currentLocation.address,
          is_mock_location: currentLocation.is_mock_location,
          starting_odometer: odoData.reading,
          starting_odometer_image: odoData.image,
          starting_odometer_input_method: odoData.inputMethod,
          starting_odometer_ocr_value: odoData.ocrValue,
          starting_odometer_ocr_confidence: odoData.ocrConfidence,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        confetti({ particleCount: 60, spread: 50, origin: { y: 0.7 } });
        showToast('success', 'Checked In Successfully', `Started at ${odoData.reading} KM`);
        setIsCheckedIn(true);
        setActiveAttendance(data.attendance);
        setPendingStartingOdometer(null);
        setShowOdometerModal(false);
      } else {
        showToast('error', 'Check-In Failed', data.error || 'Please verify GPS and odometer data.');
      }
    } catch (err) {
      showToast('error', 'Communication Error', 'Failed to reach server.');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Trigger Check-Out Flow
  const handleCheckOutClick = () => {
    if (!currentLocation) {
      showToast('error', 'Location Required', 'Fresh GPS location is mandatory for Check-Out.');
      acquireLocation();
      return;
    }

    setOdometerModalType('ENDING');
    setShowOdometerModal(true);
  };

  const performCheckOut = async (endingOdoData: {
    reading: number;
    image: string;
    inputMethod: 'OCR' | 'MANUAL';
    ocrValue: number | null;
    ocrConfidence: number | null;
  }) => {
    if (!employee || !currentLocation || !activeAttendance) return;

    setIsActionLoading(true);

    if (!isOnline) {
      saveOfflineRecord({
        id: `off-out-${Date.now()}`,
        type: 'CHECK_OUT',
        attendance_id: activeAttendance.id,
        timestamp: new Date().toISOString(),
        location: currentLocation,
        odometer: {
          reading: endingOdoData.reading,
          image: endingOdoData.image,
          input_method: endingOdoData.inputMethod,
          ocr_value: endingOdoData.ocrValue,
          ocr_confidence: endingOdoData.ocrConfidence,
        },
      });

      setIsCheckedIn(false);
      setActiveAttendance(null);
      setShowOdometerModal(false);
      showToast('warning', 'Check-Out Saved Offline', 'Check-out stored in local queue. Will sync automatically.');
      setIsActionLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/attendance/check-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: employee.id,
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          accuracy: currentLocation.accuracy,
          address: currentLocation.address,
          is_mock_location: currentLocation.is_mock_location,
          ending_odometer: endingOdoData.reading,
          ending_odometer_image: endingOdoData.image,
          ending_odometer_input_method: endingOdoData.inputMethod,
          ending_odometer_ocr_value: endingOdoData.ocrValue,
          ending_odometer_ocr_confidence: endingOdoData.ocrConfidence,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.7 } });
        showToast(
          'success',
          'Checked Out Successfully',
          `Distance: ${data.attendance?.calculated_distance || 0} KM • Duration: ${data.attendance?.worked_duration || '00:00'}`
        );
        setIsCheckedIn(false);
        setActiveAttendance(null);
        setShowOdometerModal(false);
      } else {
        showToast('error', 'Check-Out Failed', data.error || 'Validation error');
      }
    } catch {
      showToast('error', 'Communication Error', 'Failed to reach server.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const offlineQueue = getOfflineQueue();

  return (
    <div className="flex flex-col space-y-4 pb-6">
      {/* Driver Welcome & Status Overview */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-5 shadow-xl relative overflow-hidden">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Driver Dashboard</span>
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  isCheckedIn
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isCheckedIn ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                {isCheckedIn ? 'SHIFT ACTIVE' : 'OFF DUTY'}
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-100 tracking-tight">{employee?.name || 'Driver'}</h2>
            <div className="flex items-center gap-2 pt-0.5">
              <span className="text-xs font-mono font-bold text-blue-400 bg-blue-950/60 border border-blue-800/60 px-2 py-0.5 rounded-lg">
                {employee?.employee_code || 'DR001'}
              </span>
              <span className="text-xs text-slate-400">
                {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
            </div>
          </div>

          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-md shrink-0 ${
              isCheckedIn
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-emerald-950/50'
                : 'bg-slate-800/90 text-slate-400 border-slate-700'
            }`}
          >
            {isCheckedIn ? <Play className="w-6 h-6 fill-current" /> : <Gauge className="w-6 h-6" />}
          </div>
        </div>

        {/* Offline Queue Badge if any */}
        {offlineQueue.length > 0 && (
          <div className="mt-4 p-3 bg-amber-950/40 border border-amber-600/50 rounded-2xl flex items-center justify-between text-xs text-amber-200">
            <span className="flex items-center gap-2 font-medium">
              <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{offlineQueue.length} record(s) queued offline</span>
            </span>
            <button
              onClick={() => employee && syncOfflineQueue(employee.id).then(() => fetchStatus())}
              className="text-xs font-bold px-2.5 py-1 bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/40 rounded-xl text-amber-100 transition-colors cursor-pointer"
            >
              Sync Now
            </button>
          </div>
        )}
      </div>

      {/* Main Shift Action Card */}
      {isCheckedIn && activeAttendance ? (
        /* ACTIVE SESSION VIEW */
        <div className="bg-gradient-to-b from-emerald-950/40 via-slate-900 to-slate-950 border border-emerald-500/30 rounded-3xl p-5 shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                Shift In Progress
              </span>
            </div>
            <button
              onClick={() => onOpenMap(activeAttendance)}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs flex items-center gap-1.5 border border-slate-700 shadow-sm cursor-pointer transition-colors"
            >
              <Map className="w-3.5 h-3.5 text-blue-400" />
              <span>View Map</span>
            </button>
          </div>

          {/* Digital Timer */}
          <div className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-4 text-center">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Active Shift Duration
            </span>
            <div className="text-4xl sm:text-5xl font-mono font-black text-emerald-400 tracking-wider">
              {elapsedString}
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-2xl">
              <span className="text-slate-400 text-[11px] block font-medium">Check-In Time</span>
              <span className="font-bold text-slate-100 font-mono text-sm">
                {new Date(activeAttendance.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className="p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-2xl">
              <span className="text-slate-400 text-[11px] block font-medium">Start Odometer</span>
              <span className="font-bold text-slate-100 font-mono text-sm">
                {activeAttendance.starting_odometer.toLocaleString()} KM
              </span>
            </div>
          </div>

          {/* Location Summary */}
          <div className="p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-2xl text-xs flex items-start gap-3">
            <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <span className="text-slate-400 text-[11px] block font-medium">Start Location</span>
              <p className="text-slate-200 font-medium text-xs leading-relaxed truncate">
                {activeAttendance.check_in_location_address || 'GPS Coordinate Recorded'}
              </p>
            </div>
          </div>

          {/* CHECK OUT BUTTON */}
          <button
            onClick={handleCheckOutClick}
            disabled={isActionLoading}
            className="w-full bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold py-4 px-6 rounded-2xl shadow-lg shadow-rose-950/60 transition-all flex items-center justify-center gap-2.5 cursor-pointer text-base disabled:opacity-50 active:scale-[0.99]"
          >
            <Square className="w-5 h-5 fill-current" />
            <span>{isActionLoading ? 'RECORDING CHECK-OUT...' : 'END SHIFT / CHECK OUT'}</span>
          </button>
        </div>
      ) : (
        /* READY TO START SHIFT VIEW */
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Shift Checklist
              </span>
            </div>
            <span className="text-[11px] text-slate-400">Step 1 &amp; 2 required</span>
          </div>

          {/* Step 1: GPS Location Card (Automatic Live GPS) */}
          <div className="p-4 bg-slate-950/80 border border-slate-800/90 rounded-2xl flex items-center justify-between gap-3">
            <div
              onClick={() => {
                if (!currentLocation) acquireLocation();
                else setShowLocationPicker(true);
              }}
              className="flex items-start gap-3 min-w-0 flex-1 cursor-pointer group"
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 transition-transform group-hover:scale-105 ${
                  currentLocation
                    ? currentLocation.accuracy <= 35
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : locationError
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                }`}
              >
                <MapPin className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-200 text-xs">Live Device GPS</span>
                  {currentLocation && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                        currentLocation.accuracy <= 35
                          ? 'text-emerald-400 bg-emerald-950/60 border-emerald-500/30'
                          : 'text-amber-400 bg-amber-950/60 border-amber-500/30'
                      }`}
                    >
                      {currentLocation.accuracy <= 35 ? `Locked ±${currentLocation.accuracy}m` : `Accuracy ±${currentLocation.accuracy}m`}
                    </span>
                  )}
                  {isLocating && (
                    <span className="text-[10px] text-blue-400 bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-500/30 animate-pulse font-mono">
                      {liveAccuracy !== null ? `Locking ±${liveAccuracy}m...` : 'Reading GPS Sensor...'}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-300 font-medium truncate mt-0.5 group-hover:text-emerald-300 transition-colors">
                  {isLocating
                    ? 'Acquiring live location from device...'
                    : currentLocation
                    ? currentLocation.address
                    : locationError || 'Detecting your live location...'}
                </p>
                {currentLocation && (
                  <span className="text-[10px] font-mono text-slate-500 block mt-0.5">
                    {currentLocation.latitude.toFixed(5)}°, {currentLocation.longitude.toFixed(5)}° &bull;{' '}
                    <span className="text-slate-400 font-sans font-normal">Auto-detected</span>
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => setShowLocationPicker(true)}
                className="px-2.5 py-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-500/30 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                title="Adjust pin or search exact location if GPS is offset"
              >
                <Crosshair className="w-3.5 h-3.5" />
                <span>Adjust</span>
              </button>
              <button
                onClick={acquireLocation}
                disabled={isLocating}
                className="p-1.5 text-slate-400 hover:text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition-colors cursor-pointer"
                title="Refresh Live GPS"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin text-blue-400' : ''}`} />
              </button>
            </div>
          </div>


          {/* Step 2: Odometer Reading Card */}
          <div className="p-4 bg-slate-950/80 border border-slate-800/90 rounded-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  pendingStartingOdometer
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                <Gauge className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="font-bold text-slate-200 text-xs block">Start Odometer</span>
                <p className="text-[11px] text-slate-400 truncate mt-0.5">
                  {pendingStartingOdometer
                    ? `${pendingStartingOdometer.reading.toLocaleString()} KM (${pendingStartingOdometer.inputMethod} Photo Verified)`
                    : 'Cluster photo & reading required'}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setOdometerModalType('STARTING');
                setShowOdometerModal(true);
              }}
              className="px-3 py-1.5 text-xs font-bold text-blue-300 hover:text-white bg-blue-600/20 hover:bg-blue-600 border border-blue-500/40 rounded-xl transition-all cursor-pointer shrink-0"
            >
              {pendingStartingOdometer ? 'Change' : 'Capture'}
            </button>
          </div>

          {/* CHECK IN BUTTON */}
          <button
            onClick={handleCheckInClick}
            disabled={isActionLoading || isLocating}
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-4 px-6 rounded-2xl shadow-lg shadow-emerald-950/60 transition-all flex items-center justify-center gap-2.5 cursor-pointer text-base disabled:opacity-50 active:scale-[0.99]"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>{isActionLoading ? 'STARTING SHIFT...' : 'START SHIFT / CHECK IN'}</span>
          </button>
        </div>
      )}

      {/* Guidelines Card */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 text-xs space-y-1.5">
        <div className="flex items-center gap-2 text-slate-300 font-semibold">
          <ShieldCheck className="w-4 h-4 text-blue-400" />
          <span>Flexible Shift Attendance</span>
        </div>
        <p className="text-slate-400 leading-relaxed text-[11px]">
          Shifts are flexible. Location coordinates and odometer readings are recorded accurately at start and end of shifts.
        </p>
      </div>

      {/* Location Picker Modal */}
      {showLocationPicker && (
        <LocationPickerModal
          initialLocation={currentLocation}
          onConfirm={(loc) => {
            setCurrentLocation(loc);
            setLocationError(null);
            showToast('success', 'Exact Location Set', loc.address);
          }}
          onClose={() => setShowLocationPicker(false)}
        />
      )}

      {/* Odometer Modal */}
      {showOdometerModal && (
        <OdometerCaptureModal
          type={odometerModalType}
          startingReading={activeAttendance?.starting_odometer}
          onConfirm={(odoData) => {
            if (odometerModalType === 'STARTING') {
              setPendingStartingOdometer(odoData);
              setShowOdometerModal(false);
              if (currentLocation) {
                performCheckIn(odoData);
              }
            } else {
              performCheckOut(odoData);
            }
          }}
          onCancel={() => setShowOdometerModal(false)}
        />
      )}
    </div>
  );
};

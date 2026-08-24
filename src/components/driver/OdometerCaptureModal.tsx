import React, { useState, useRef } from 'react';
import { Camera, Image as ImageIcon, Sparkles, Check, Edit2, AlertTriangle, RefreshCw, X, HelpCircle, ShieldCheck } from 'lucide-react';
import { performOdometerOCR, generateSampleOdometerPhoto } from '../../utils/ocr';

interface OdometerCaptureModalProps {
  type: 'STARTING' | 'ENDING';
  startingReading?: number;
  onConfirm: (data: {
    reading: number;
    image: string;
    inputMethod: 'OCR' | 'MANUAL';
    ocrValue: number | null;
    ocrConfidence: number | null;
  }) => void;
  onCancel: () => void;
}

export const OdometerCaptureModal: React.FC<OdometerCaptureModalProps> = ({
  type,
  startingReading,
  onConfirm,
  onCancel,
}) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isProcessingOCR, setIsProcessingOCR] = useState<boolean>(false);
  const [ocrValue, setOcrValue] = useState<number | null>(null);
  const [ocrConfidence, setOcrConfidence] = useState<number | null>(null);
  const [detectedReading, setDetectedReading] = useState<string>('');
  const [isManualMode, setIsManualMode] = useState<boolean>(false);
  const [manualInput, setManualInput] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Process uploaded image with OCR
  const handleImageSelected = async (dataUrl: string) => {
    setImagePreview(dataUrl);
    setIsProcessingOCR(true);
    setValidationError(null);

    try {
      const result = await performOdometerOCR(dataUrl);
      setOcrValue(result.reading);
      setOcrConfidence(result.confidence);

      if (result.reading !== null) {
        setDetectedReading(String(result.reading));
        setManualInput(String(result.reading));
      } else {
        setDetectedReading('');
        // Suggest manual entry if OCR failed
        setIsManualMode(true);
      }
    } catch {
      setIsManualMode(true);
    } finally {
      setIsProcessingOCR(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        handleImageSelected(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  // Sample simulation buttons for quick testing
  const handleSimulatePhoto = (reading: number, isGlare: boolean) => {
    const sampleImage = generateSampleOdometerPhoto(reading, isGlare);
    handleImageSelected(sampleImage);
  };

  const handleSubmit = () => {
    setValidationError(null);
    const finalValue = isManualMode ? Number(manualInput) : Number(detectedReading);

    if (isNaN(finalValue) || finalValue <= 0) {
      setValidationError('Please provide a valid numeric odometer reading.');
      return;
    }

    if (type === 'ENDING' && startingReading !== undefined && finalValue < startingReading) {
      setValidationError(
        `Ending odometer (${finalValue} KM) cannot be lower than starting odometer (${startingReading} KM).`
      );
      return;
    }

    const inputMethod = isManualMode || ocrValue === null || Number(detectedReading) !== ocrValue ? 'MANUAL' : 'OCR';

    onConfirm({
      reading: finalValue,
      image: imagePreview || '',
      inputMethod,
      ocrValue,
      ocrConfidence,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/85 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 bg-slate-800/80 border-b border-slate-700/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm">
                {type === 'STARTING' ? 'Starting Odometer Photo' : 'Ending Odometer Photo'}
              </h3>
              <p className="text-[11px] text-slate-400">Capture cluster display before {type === 'STARTING' ? 'Check-In' : 'Check-Out'}</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          <input
            type="file"
            accept="image/*"
            capture="environment"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* Image Viewport */}
          {!imagePreview ? (
            <div className="border-2 border-dashed border-slate-700 rounded-2xl p-6 text-center bg-slate-950/50 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                <Camera className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-200">Take or upload odometer photo</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Keep digits clear, glare-free, and well lit</p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-all"
                >
                  <Camera className="w-4 h-4" /> Take Photo
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 border border-slate-700 cursor-pointer transition-all"
                >
                  <ImageIcon className="w-4 h-4" /> Gallery
                </button>
              </div>

              {/* Simulation Quick Buttons */}
              <div className="pt-3 border-t border-slate-800/80">
                <span className="text-[10px] text-slate-400 block mb-2">Simulate Live Camera Capture:</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleSimulatePhoto(type === 'STARTING' ? 125430 : (startingReading || 125430) + 57, false)}
                    className="bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 text-[11px] font-semibold py-1.5 px-2 rounded-lg border border-emerald-700/50 cursor-pointer"
                  >
                    ✨ Clear Odometer
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSimulatePhoto(type === 'STARTING' ? 125430 : (startingReading || 125430) + 57, true)}
                    className="bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 text-[11px] font-semibold py-1.5 px-2 rounded-lg border border-amber-700/50 cursor-pointer"
                  >
                    ⚡ Glare / Fallback
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Photo Display */}
              <div className="relative rounded-2xl overflow-hidden border border-slate-700 bg-slate-950 aspect-[4/3]">
                <img src={imagePreview} alt="Odometer cluster" className="w-full h-full object-contain" />
                <button
                  onClick={() => setImagePreview(null)}
                  className="absolute top-2 right-2 bg-slate-900/80 hover:bg-slate-900 text-slate-300 hover:text-white p-1.5 rounded-full backdrop-blur-sm border border-slate-700"
                  title="Retake Photo"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {/* OCR Processing State */}
              {isProcessingOCR ? (
                <div className="p-4 bg-slate-800/60 border border-slate-700 rounded-xl flex items-center gap-3 text-xs text-slate-300">
                  <Sparkles className="w-5 h-5 text-blue-400 animate-spin" />
                  <div>
                    <p className="font-semibold text-slate-100">Scanning odometer numbers...</p>
                    <p className="text-[10px] text-slate-400">Running OCR text recognition engine</p>
                  </div>
                </div>
              ) : (
                /* OCR Results / Manual Switch */
                <div className="space-y-3">
                  {!isManualMode && detectedReading ? (
                    <div className="p-4 bg-blue-950/30 border border-blue-700/40 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-blue-400 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" /> Detected Odometer Reading
                        </span>
                        {ocrConfidence && (
                          <span className="text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full">
                            {Math.round(ocrConfidence * 100)}% Confidence
                          </span>
                        )}
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-mono font-black text-slate-100 tracking-tight">
                          {detectedReading}
                        </span>
                        <span className="text-sm font-bold text-slate-400 font-mono">KM</span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Please verify this matches your odometer dial before confirming.
                      </p>
                    </div>
                  ) : (
                    /* Manual Entry Fallback */
                    <div className="p-4 bg-amber-950/20 border border-amber-800/40 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-amber-400 flex items-center gap-1.5">
                          <Edit2 className="w-3.5 h-3.5" /> Manual Odometer Entry
                        </span>
                        <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full">
                          MANUAL
                        </span>
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">Enter Current Kilometer (KM):</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={manualInput}
                            onChange={(e) => setManualInput(e.target.value)}
                            placeholder="e.g. 125430"
                            className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-lg font-mono font-bold text-slate-100 focus:outline-none focus:border-blue-500"
                          />
                          <span className="text-sm font-bold text-slate-400 font-mono">KM</span>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400">
                        This reading will be recorded with input method: <strong className="text-amber-300">MANUAL</strong>.
                      </p>
                    </div>
                  )}

                  {/* Mode Toggles */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <button
                      type="button"
                      onClick={() => setIsManualMode(!isManualMode)}
                      className="text-blue-400 hover:text-blue-300 underline text-xs font-medium cursor-pointer"
                    >
                      {isManualMode ? '← Use OCR Detection' : '✏️ Enter reading manually'}
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-slate-400 hover:text-slate-200 text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Retake Photo
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Validation Error Message */}
          {validationError && (
            <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-200 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{validationError}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-800/80 border-t border-slate-700/60 flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="w-1/3 py-2.5 text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!imagePreview && !isManualMode}
            className="flex-1 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-lg shadow-blue-900/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Check className="w-4 h-4" /> Confirm Odometer Reading
          </button>
        </div>
      </div>
    </div>
  );
};

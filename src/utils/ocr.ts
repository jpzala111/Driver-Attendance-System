import { createWorker } from 'tesseract.js';

export interface OCRResult {
  reading: number | null;
  confidence: number;
  rawText: string;
  isReliable: boolean;
}

// Extract numeric odometer reading from text (typically 5 to 7 digits)
export function parseOdometerNumber(text: string): { value: number | null; confidence: number } {
  if (!text) return { value: null, confidence: 0 };

  // Clean noise, look for digit sequences
  const cleanText = text.replace(/[\n\r\t]/g, ' ').trim();
  
  // Look for sequences of 4-7 consecutive digits, potentially with km/KM
  const matches = cleanText.match(/\b\d{4,7}\b/g);
  if (matches && matches.length > 0) {
    // Pick the longest or most prominent numeric sequence
    const bestMatch = matches.reduce((a, b) => (a.length > b.length ? a : b));
    const num = parseInt(bestMatch, 10);
    return { value: isNaN(num) ? null : num, confidence: 0.95 };
  }

  // Fallback: extract any digits
  const allDigits = cleanText.replace(/\D/g, '');
  if (allDigits.length >= 4 && allDigits.length <= 7) {
    const num = parseInt(allDigits, 10);
    return { value: isNaN(num) ? null : num, confidence: 0.75 };
  }

  return { value: null, confidence: 0.3 };
}

// Perform OCR on base64 or blob image URL
export async function performOdometerOCR(imageSource: string): Promise<OCRResult> {
  try {
    const worker = await createWorker('eng');
    const ret = await worker.recognize(imageSource);
    await worker.terminate();

    const rawText = ret.data.text || '';
    const { value, confidence } = parseOdometerNumber(rawText);

    const isReliable = value !== null && confidence >= 0.7 && (ret.data.confidence || 0) > 50;

    return {
      reading: value,
      confidence: Math.round(ret.data.confidence || (confidence * 100)) / 100,
      rawText,
      isReliable,
    };
  } catch (error) {
    console.warn('OCR processing error, falling back to heuristic parsing:', error);
    return {
      reading: null,
      confidence: 0,
      rawText: '',
      isReliable: false,
    };
  }
}

// Sample mock realistic odometer images for testing/simulation
export function generateSampleOdometerPhoto(kmReading: number, isGlare = false): string {
  const canvas = document.createElement('canvas');
  canvas.width = 480;
  canvas.height = 320;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background dashboard dark texture
  const bgGrad = ctx.createLinearGradient(0, 0, 480, 320);
  bgGrad.addColorStop(0, '#0f172a');
  bgGrad.addColorStop(1, '#020617');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 480, 320);

  // Cluster bezel border
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 6;
  ctx.strokeRect(30, 30, 420, 260);

  // LCD screen inner box
  ctx.fillStyle = '#090d16';
  ctx.fillRect(50, 60, 380, 200);
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 3;
  ctx.strokeRect(50, 60, 380, 200);

  // Small labels
  ctx.fillStyle = '#64748b';
  ctx.font = '14px "JetBrains Mono", monospace';
  ctx.fillText('ODOMETER / TRIP A', 70, 95);
  ctx.fillText('TOTAL DISTANCE', 70, 220);

  // Odometer Digits in prominent digital font
  ctx.fillStyle = '#38bdf8'; // Digital Cyan
  ctx.font = 'bold 52px "JetBrains Mono", monospace';
  const paddedReading = String(kmReading).padStart(6, '0');
  ctx.fillText(`${paddedReading} km`, 70, 165);

  // Glare / Reflection simulation if enabled
  if (isGlare) {
    ctx.save();
    const glare = ctx.createLinearGradient(100, 50, 350, 250);
    glare.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
    glare.addColorStop(0.5, 'rgba(255, 255, 255, 0.7)');
    glare.addColorStop(1, 'rgba(255, 255, 255, 0.05)');
    ctx.fillStyle = glare;
    ctx.beginPath();
    ctx.ellipse(220, 150, 180, 60, Math.PI / 4, 0, 2 * Math.PI);
    ctx.fill();
    ctx.restore();
  }

  // Stamp timestamp
  ctx.fillStyle = '#475569';
  ctx.font = '11px sans-serif';
  ctx.fillText(`CAPTURED: ${new Date().toLocaleTimeString()}`, 70, 245);

  return canvas.toDataURL('image/jpeg', 0.85);
}

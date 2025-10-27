import exifr from 'exifr';
import type { ExifData, ExifOptions, GPSData } from '../types/exif';

const EXTENDED_EXIF_FIELDS = [
  
  'Make', 'Model', 'LensModel', 'Software',
  
  
  'DateTimeOriginal', 'CreateDate', 'ModifyDate', 'DateTime',
  'DateCreated', 'TimeCreated', 'DateTimeDigitized',
  
  
  'ExposureTime', 'ShutterSpeedValue', 'FNumber', 'ApertureValue',
  'ISO', 'ISOSpeedRatings', 'PhotographicSensitivity',
  'FocalLength', 'FocalLengthIn35mmFormat',
  
  
  'ImageWidth', 'ImageHeight', 'ExifImageWidth', 'ExifImageHeight',
  'Orientation', 'ColorSpace', 'WhiteBalance', 'Flash',
  'XResolution', 'YResolution', 'ResolutionUnit',
  
  
  'GPSLatitude', 'GPSLongitude', 'GPSAltitude',
  'GPSLatitudeRef', 'GPSLongitudeRef', 'GPSAltitudeRef',
  
  
  'ExposureMode', 'ExposureProgram', 'MeteringMode',
  'SceneCaptureType', 'Contrast', 'Saturation', 'Sharpness',
  
  
  'Artist', 'Copyright', 'UserComment', 'ImageDescription'
] as const;

const ENHANCED_EXIFR_OPTIONS = {
  tiff: true,
  ifd0: true,   
  ifd1: true,     
  gps: true,    
  xmp: true,    
  icc: true,    
  iptc: true,   
  jfif: false,  
  ihdr: true,   
  
  translateKeys: true,
  translateValues: true,
  reviveValues: true,
  sanitize: true,
  mergeOutput: true,
  
  multiSegment: true,
  silentErrors: false,
  
  pick: EXTENDED_EXIF_FIELDS,
  
  makerNote: true,
  userComment: true
} as const;

export async function extractExif(
    file: File | Blob,
    options: any = {}  
): Promise<ExifData | null> {
    try {
        const mergedOptions = {
            ...ENHANCED_EXIFR_OPTIONS,
            ...options
        };

        const exifData = await exifr.parse(file, mergedOptions as any);

        if (!exifData || Object.keys(exifData).length === 0) {
            return null;
        }

        return normalizeExifData(exifData);

    } catch (error) {
        console.warn('EXIF extraction failed:', error);
        return null;
    }
}

function normalizeExifData(rawExif: any): ExifData {
  const dateTaken = extractDateTaken(rawExif);
  
  
  const make = rawExif.Make || rawExif.CameraMake || rawExif.DeviceManufacturer || null;
  const model = rawExif.Model || rawExif.CameraModel || rawExif.DeviceModel || null;
  const lensModel = rawExif.LensModel || rawExif.LensInfo || rawExif.LensMake || null;
  
  
  const iso = rawExif.ISO || rawExif.ISOSpeedRatings || rawExif.PhotographicSensitivity || null;
  
  
  const focalLength = rawExif.FocalLength || rawExif.FocalLengthIn35mmFormat || null;
  
  
  const fNumber = rawExif.FNumber || rawExif.ApertureValue || null;
  
  
  const exposureTime = rawExif.ExposureTime || rawExif.ShutterSpeedValue || null;
  
  
  const width = rawExif.ImageWidth || rawExif.ExifImageWidth || rawExif.PixelXDimension || null;
  const height = rawExif.ImageHeight || rawExif.ExifImageHeight || rawExif.PixelYDimension || null;

  return {
    make,
    model,
    lensModel,
    software: rawExif.Software || null,
    dateTaken,
    dateOriginal: rawExif.DateTimeOriginal || null,
    dateCreated: rawExif.CreateDate || rawExif.DateCreated || null,
    dateModified: rawExif.ModifyDate || null,
    exposureTime,
    fNumber,
    iso,
    focalLength,
    flash: rawExif.Flash || null,
    whiteBalance: rawExif.WhiteBalance || null,
    width,
    height,
    orientation: rawExif.Orientation || 1,
    colorSpace: rawExif.ColorSpace || null,
    gps: extractGPSData(rawExif) as GPSData | null,
    artist: rawExif.Artist || null,
    copyright: rawExif.Copyright || null,
    raw: rawExif
  } as ExifData;
}

function extractDateTaken(exifData: any): Date | null {
  const dateFields = [
    exifData.DateTimeOriginal,
    exifData.DateTime,
    exifData.CreateDate,
    exifData.DateCreated,
    exifData.DateTimeDigitized,
    exifData.ModifyDate
  ];

  for (const dateField of dateFields) {
    if (dateField instanceof Date) {
      return dateField;
    }

    if (typeof dateField === 'string') {
      const parsed = parseExifDate(dateField);
      if (parsed) return parsed;
    }
  }

  return null;
}

function parseExifDate(dateString: string): Date | null {
  try {
    
    const normalized = dateString.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
    const date = new Date(normalized);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

function extractGPSData(exifData: any): GPSData | null {
    const { GPSLatitude, GPSLongitude, GPSAltitude } = exifData;

    if (typeof GPSLatitude === 'number' && typeof GPSLongitude === 'number') {
        return {
            lat: GPSLatitude,
            lng: GPSLongitude,
            altitude: typeof GPSAltitude === 'number' ? GPSAltitude : null
        };
    }

    return null;
}

export async function batchExtractExif(
  files: File[],
  onProgress?: (current: number, total: number) => void
): Promise<Map<string, ExifData | null>> {
  const results = new Map();

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const exifData = await extractExif(file);
    results.set(file.name, exifData);

    if (onProgress) {
      onProgress(i + 1, files.length);
    }
  }

  return results;
}

export function canHaveExif(file: File): boolean {
  const supportedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/tiff',
    'image/heic',
    'image/heif'
  ];
  return supportedTypes.includes(file.type.toLowerCase());
}

export function getExifSummary(exifData: ExifData): string[] {
  const summary: string[] = [];

  if (exifData.make || exifData.model) {
    summary.push(`${exifData.make || ''} ${exifData.model || ''}`.trim());
  }

  if (exifData.dateTaken) {
    summary.push(exifData.dateTaken.toLocaleDateString());
  }

  if (exifData.focalLength) {
    summary.push(`${exifData.focalLength}mm`);
  }

  if (exifData.fNumber) {
    summary.push(`f/${exifData.fNumber}`);
  }

  if (exifData.exposureTime) {
    summary.push(`${exifData.exposureTime}s`);
  }

  if (exifData.iso) {
    summary.push(`ISO ${exifData.iso}`);
  }

  if (exifData.width && exifData.height) {
    summary.push(`${exifData.width}×${exifData.height}`);
  }

  return summary;
}

export function hasUsefulExif(exifData: ExifData | null): boolean {
  if (!exifData) return false;

  
  return !!(
    exifData.make ||
    exifData.model ||
    exifData.dateTaken ||
    exifData.focalLength ||
    exifData.iso ||
    exifData.fNumber ||
    exifData.width ||
    exifData.height ||
    exifData.gps
  );
}

export interface ExifData {
  make: string | null;
  model: string | null;
  lensModel: string | null;
  software: string | null;
  dateTaken: Date | null;
  dateOriginal: Date | null;
  dateCreated: Date | null;
  dateModified: Date | null;
  exposureTime: number | string | null;
  fNumber: number | null;
  iso: number | null;
  focalLength: number | null;
  flash: number | string | null;
  whiteBalance: number | string | null;
  width: number | null;
  height: number | null;
  orientation: number;
  colorSpace: number | string | null;
  gps: GPSData | null;
  artist: string | null;
  copyright: string | null;
  raw: any; 
}

export interface GPSData {
  lat: number;
  lng: number;
  altitude: number | null;
}

export interface ExifOptions {
  [key: string]: any;
}

export type ExifCategory =
  | 'camera'
  | 'settings'
  | 'image'
  | 'gps'
  | 'datetime'
  | 'metadata'
  | 'technical';

export interface ExifFieldInfo {
  name: string;
  tag: number;
  category: ExifCategory;
  description: string;
  type: 'string' | 'number' | 'date' | 'array' | 'object';
  format?: string;
  common: boolean; 
}

export interface CameraInfo {
  make: string;
  model: string;
  fullName: string;
  manufacturer: string;
}

export interface LensInfo {
  model: string;
  make?: string;
  serialNumber?: string;
  minFocalLength?: number;
  maxFocalLength?: number;
  minAperture?: number;
  maxAperture?: number;
}

export interface ExposureInfo {
  exposureTime: number | null;
  shutterSpeed: string | null; 
  aperture: number | null;
  fNumber: number | null;
  iso: number | null;
  exposureProgram: string | null;
  exposureMode: string | null;
  exposureBias: number | null;
  meteringMode: string | null;
}

export interface ImageTechnicalInfo {
  width: number;
  height: number;
  orientation: number;
  megapixels: number;
  aspectRatio: string;
  colorSpace: string | null;
  bitsPerSample: number | null;
  compression: string | null;
  xResolution: number | null;
  yResolution: number | null;
}

export interface ExifExtractionResult {
  success: boolean;
  data: ExifData | null;
  errors: string[];
  warnings: string[];
  extractionTime: number;
  fieldsFound: number;
  source: string; 
}

export interface ExifBatchProgress {
  current: number;
  total: number;
  fileName: string;
  status: 'pending' | 'processing' | 'complete' | 'error';
  percentage: number;
}

export interface ExifComparison {
  field: string;
  file1Value: any;
  file2Value: any;
  matches: boolean;
}

export interface ExifStatistics {
  totalFiles: number;
  filesWithExif: number;
  filesWithoutExif: number;
  
  
  uniqueCameraMakes: string[];
  uniqueCameraModels: string[];
  mostCommonCamera: string;
  
  
  dateRange: {
    earliest: Date | null;
    latest: Date | null;
    span: number; 
  };
  
  
  filesWithGPS: number;
  gpsPercentage: number;
  
  
  averageISO: number | null;
  averageAperture: number | null;
  commonFocalLengths: number[];
  
  
  averageResolution: {
    width: number;
    height: number;
  };
  totalMegapixels: number;
}

export enum ExifOrientation {
  Normal = 1,
  FlipHorizontal = 2,
  Rotate180 = 3,
  FlipVertical = 4,
  Transpose = 5,
  Rotate90 = 6,
  Transverse = 7,
  Rotate270 = 8
}

export interface ExifValidation {
  isValid: boolean;
  hasRequiredFields: boolean;
  missingFields: string[];
  inconsistencies: string[];
  warnings: string[];
}

export interface ExifSearchCriteria {
  cameraMake?: string | string[];
  cameraModel?: string | string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  isoRange?: {
    min: number;
    max: number;
  };
  apertureRange?: {
    min: number;
    max: number;
  };
  focalLengthRange?: {
    min: number;
    max: number;
  };
  hasGPS?: boolean;
  orientation?: ExifOrientation;
}

export interface ExifExport {
  fileName: string;
  exifData: ExifData;
  exportDate: Date;
  format: 'json' | 'csv' | 'xml';
}

export type ExifFieldPath = string; 
export type ExifFieldValue = string | number | Date | null | undefined;

export interface ExifCacheOptions {
  enabled: boolean;
  maxSize: number; 
  ttl: number; 
  strategy: 'lru' | 'fifo' | 'lfu';
}

export interface ExifModification {
  field: string;
  oldValue: any;
  newValue: any;
  timestamp: Date;
  reason?: string;
}

export type NullableExif<T> = {
  [K in keyof T]: T[K] | null;
};

export type PartialExif = Partial<ExifData>;

export type ExifFieldType<T extends keyof ExifData> = ExifData[T];
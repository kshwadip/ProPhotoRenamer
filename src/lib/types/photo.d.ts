import type { ExifData } from './exif';
import type { RenameResult } from './template';
import type { ValidationResult } from '../utils/validators';

export type PhotoStatus = 
  | 'pending'      
  | 'validating'   
  | 'extracting'   
  | 'ready'       
  | 'renaming'   
  | 'complete'     
  | 'error'      
  | 'warning';  

export interface PhotoMetadata {
  // File information
  fileName: string;
  originalFileName: string;
  fileSize: number;
  fileType: string;
  lastModified: Date;
  
  // Image properties
  width?: number;
  height?: number;
  megapixels?: number;
  aspectRatio?: string;
  
  // EXIF data
  exif: ExifData | null;
  hasExif: boolean;
  
  // Timestamps
  dateTaken?: Date;
  dateCreated?: Date;
  dateModified?: Date;
  uploadedAt: Date;
  
  // Camera information (denormalized from EXIF for quick access)
  cameraMake?: string;
  cameraModel?: string;
  lensModel?: string;
  
  // Camera settings (denormalized from EXIF)
  iso?: number;
  aperture?: number;
  shutterSpeed?: string | number;
  focalLength?: number;
  
  // GPS information (denormalized from EXIF)
  hasGPS: boolean;
  latitude?: number;
  longitude?: number;
  altitude?: number;
}

export interface Photo {
  // Unique identifier
  id: string;
  
  // Original file
  file: File;
  
  // Metadata
  metadata: PhotoMetadata;
  
  // Processing state
  status: PhotoStatus;
  
  // Validation
  validation: ValidationResult | null;
  isValid: boolean;
  
  // Rename information
  renameResult: RenameResult | null;
  newFileName?: string;
  
  // Preview
  thumbnailUrl?: string;
  previewUrl?: string;
  
  // Processing timestamps
  processedAt?: Date;
  
  // Error information
  error?: string;
  warnings: string[];
  
  // Selection state (for UI)
  selected: boolean;
  
  // Index in batch
  index: number;
}

export interface PhotoBatch {
  id: string;
  photos: Photo[];
  totalCount: number;
  processedCount: number;
  validCount: number;
  invalidCount: number;
  status: 'idle' | 'processing' | 'complete' | 'error';
  startedAt?: Date;
  completedAt?: Date;
  template?: string;
}

export interface PhotoProcessingOptions {
  // Validation options
  validateFiles?: boolean;
  strictValidation?: boolean;
  maxFileSize?: number;
  
  // EXIF extraction options
  extractExif?: boolean;
  exifFields?: string[];
  
  // Preview generation
  generatePreviews?: boolean;
  previewSize?: number;
  
  // Progress callback
  onProgress?: (current: number, total: number, photo: Photo) => void;
}

export interface PhotoUploadConfig {
  acceptedTypes: string[];
  maxFileSize: number;
  maxFiles?: number;
  allowDuplicates?: boolean;
}

export interface PhotoFilter {
  status?: PhotoStatus[];
  hasExif?: boolean;
  cameraMake?: string[];
  cameraModel?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  sizeRange?: {
    min: number;
    max: number;
  };
  hasGPS?: boolean;
}

export interface PhotoSort {
  field: keyof PhotoMetadata | 'fileName' | 'fileSize' | 'dateTaken';
  direction: 'asc' | 'desc';
}

export interface PhotoStats {
  totalFiles: number;
  totalSize: number;
  averageSize: number;
  
  withExif: number;
  withoutExif: number;
  
  withGPS: number;
  withoutGPS: number;
  
  validFiles: number;
  invalidFiles: number;
  
  cameraMakes: Map<string, number>;
  cameraModels: Map<string, number>;
  
  dateRange?: {
    earliest: Date;
    latest: Date;
  };
  
  fileTypes: Map<string, number>;
}

export interface PhotoPreviewConfig {
  maxWidth: number;
  maxHeight: number;
  quality: number;
  format: 'jpeg' | 'png' | 'webp';
}

export interface PhotoGridOptions {
  columns: number;
  thumbnailSize: 'small' | 'medium' | 'large';
  showMetadata: boolean;
  showFileName: boolean;
  showStatus: boolean;
}

export interface PhotoSelection {
  selectedIds: Set<string>;
  selectedPhotos: Photo[];
  totalSelected: number;
  allSelected: boolean;
}

export interface PhotoProcessingResult {
  photo: Photo;
  success: boolean;
  duration: number;
  errors: string[];
  warnings: string[];
}

export interface BatchProcessingResult {
  batchId: string;
  totalPhotos: number;
  successfulPhotos: number;
  failedPhotos: number;
  results: PhotoProcessingResult[];
  duration: number;
  errors: string[];
  warnings: string[];
}

export interface PhotoComparison {
  photo1: Photo;
  photo2: Photo;
  similarity: number;
  isDuplicate: boolean;
  matchCriteria: ('fileName' | 'fileSize' | 'dateTaken' | 'exif')[];
}

export interface PhotoExportOptions {
  format: 'zip' | 'individual';
  includeMetadata: boolean;
  folderStructure?: 'flat' | 'byDate' | 'byCamera';
  compressionLevel?: number;
}

export type PhotoUpdate = Partial<Omit<Photo, 'id' | 'file'>>;

export type CreatePhotoInput = {
  file: File;
  index?: number;
};

export type PhotoErrorType =
  | 'validation_failed'
  | 'exif_extraction_failed'
  | 'rename_failed'
  | 'file_read_error'
  | 'unsupported_format'
  | 'file_too_large'
  | 'corrupted_file';

export interface PhotoError {
  type: PhotoErrorType;
  message: string;
  photoId: string;
  fileName: string;
  timestamp: Date;
  details?: any;
}

export interface PhotoHistoryEntry {
  timestamp: Date;
  action: 'upload' | 'rename' | 'delete' | 'validate' | 'extract_exif';
  photoId: string;
  previousState?: Partial<Photo>;
  newState?: Partial<Photo>;
}

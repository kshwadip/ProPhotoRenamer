export const SUPPORTED_IMAGE_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/gif': ['.gif'],
  'image/heic': ['.heic'],
  'image/heif': ['.heif'],
  'image/tiff': ['.tif', '.tiff'],
  'image/bmp': ['.bmp'],
  'image/avif': ['.avif']
} as const;

const FILE_SIGNATURES = {
  jpeg: [
    [0xFF, 0xD8, 0xFF, 0xE0], 
    [0xFF, 0xD8, 0xFF, 0xE1], 
    [0xFF, 0xD8, 0xFF, 0xE2], 
    [0xFF, 0xD8, 0xFF, 0xE3], 
    [0xFF, 0xD8, 0xFF, 0xE8]  
  ],
  png: [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
  gif: [
    [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], 
    [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]  
  ],
  webp: [[0x52, 0x49, 0x46, 0x46, null, null, null, null, 0x57, 0x45, 0x42, 0x50]],
  bmp: [[0x42, 0x4D]],
  tiff: [
    [0x49, 0x49, 0x2A, 0x00], 
    [0x4D, 0x4D, 0x00, 0x2A]  
  ]
} as const;

export const FILE_SIZE_LIMITS = {
  MIN: 1024, 
  MAX: 50 * 1024 * 1024, 
  RECOMMENDED_MAX: 25 * 1024 * 1024 
} as const;

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface FileValidationInfo {
  name: string;
  size: number;
  type: string;
  lastModified?: number;
}

export interface ValidationOptions {
  maxSize?: number;
  minSize?: number;
  allowedTypes?: string[];
  strictTypeCheck?: boolean;
  checkDimensions?: boolean;
  maxWidth?: number;
  maxHeight?: number;
  minWidth?: number;
  minHeight?: number;
}

/**
 * Validate a single file
 * Performs comprehensive validation including type, size, and optional magic byte checking
 * 
 * @param file - File object to validate
 * @param options - Validation options
 * @returns Promise resolving to ValidationResult
 */
export async function validateFile(
  file: File,
  options: ValidationOptions = {}
): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const {
    maxSize = FILE_SIZE_LIMITS.MAX,
    minSize = FILE_SIZE_LIMITS.MIN,
    allowedTypes = Object.keys(SUPPORTED_IMAGE_TYPES),
    strictTypeCheck = true,
    checkDimensions = false,
    maxWidth,
    maxHeight,
    minWidth,
    minHeight
  } = options;

  if (!file) {
    errors.push('No file provided');
    return { valid: false, errors, warnings };
  }

  const nameValidation = validateFileName(file.name);
  if (!nameValidation.valid) {
    errors.push(...nameValidation.errors);
  }
  warnings.push(...nameValidation.warnings);

  const sizeValidation = validateFileSize(file.size, minSize, maxSize);
  if (!sizeValidation.valid) {
    errors.push(...sizeValidation.errors);
  }
  warnings.push(...sizeValidation.warnings);

  const typeValidation = validateMimeType(file.type, allowedTypes);
  if (!typeValidation.valid) {
    errors.push(...typeValidation.errors);
  }
  warnings.push(...typeValidation.warnings);

  const extensionValidation = validateExtension(file.name, file.type);
  if (!extensionValidation.valid) {
    warnings.push(...extensionValidation.errors); 
  }

  if (strictTypeCheck && errors.length === 0) {
    const signatureValidation = await validateFileSignature(file);
    if (!signatureValidation.valid) {
      errors.push(...signatureValidation.errors);
    }
    warnings.push(...signatureValidation.warnings);
  }

  if (checkDimensions && errors.length === 0) {
    const dimensionValidation = await validateImageDimensions(file, {
      maxWidth,
      maxHeight,
      minWidth,
      minHeight
    });
    if (!dimensionValidation.valid) {
      errors.push(...dimensionValidation.errors);
    }
    warnings.push(...dimensionValidation.warnings);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: warnings.filter(w => w.length > 0)
  };
}

/**
 * Validate multiple files in batch
 * 
 * @param files - Array of File objects
 * @param options - Validation options
 * @returns Promise resolving to Map of filename to ValidationResult
 */
export async function validateFiles(
  files: File[],
  options: ValidationOptions = {}
): Promise<Map<string, ValidationResult>> {
  const results = new Map<string, ValidationResult>();

  const duplicates = findDuplicateFilenames(files);
  
  for (const file of files) {
    const result = await validateFile(file, options);
    
    if (duplicates.has(file.name)) {
      result.warnings.push(`Duplicate filename detected: ${file.name}`);
    }
    
    results.set(file.name, result);
  }

  return results;
}

export function validateFileName(filename: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!filename || filename.trim().length === 0) {
    errors.push('Filename cannot be empty');
    return { valid: false, errors, warnings };
  }

  if (filename.length > 255) {
    errors.push('Filename is too long (max 255 characters)');
  }

  if (filename.includes('\0')) {
    errors.push('Filename contains null bytes');
  }

  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    errors.push('Filename contains path traversal characters');
  }

  const invalidChars = /[<>:"|?*\x00-\x1f]/;
  if (invalidChars.test(filename)) {
    errors.push('Filename contains invalid characters');
  }

  const reservedNames = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i;
  if (reservedNames.test(filename)) {
    warnings.push('Filename uses a reserved system name');
  }

  const specialChars = /[!@#$%^&*()+=\[\]{}';,~`]/;
  if (specialChars.test(filename)) {
    warnings.push('Filename contains special characters that may cause issues');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

export function validateFileSize(
  size: number,
  minSize: number = FILE_SIZE_LIMITS.MIN,
  maxSize: number = FILE_SIZE_LIMITS.MAX
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (size === 0) {
    errors.push('File is empty (0 bytes)');
  } else if (size < minSize) {
    errors.push(`File is too small (minimum ${formatBytes(minSize)})`);
  } else if (size > maxSize) {
    errors.push(`File is too large (maximum ${formatBytes(maxSize)})`);
  }

  if (size > FILE_SIZE_LIMITS.RECOMMENDED_MAX && size <= maxSize) {
    warnings.push(`File is large (${formatBytes(size)}). Processing may be slow.`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

export function validateMimeType(
  mimeType: string,
  allowedTypes: string[] = Object.keys(SUPPORTED_IMAGE_TYPES)
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!mimeType || mimeType.trim().length === 0) {
    warnings.push('MIME type is not specified');
    return { valid: false, errors: ['Unknown file type'], warnings };
  }

  const normalizedType = mimeType.toLowerCase().trim();

  if (!allowedTypes.includes(normalizedType)) {
    errors.push(`Unsupported file type: ${mimeType}`);
    errors.push(`Supported types: ${allowedTypes.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

export function validateExtension(filename: string, mimeType: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const extension = getFileExtension(filename);
  if (!extension) {
    warnings.push('File has no extension');
    return { valid: false, errors, warnings };
  }

  const expectedExtensions = SUPPORTED_IMAGE_TYPES[mimeType as keyof typeof SUPPORTED_IMAGE_TYPES];
  
  if (
    expectedExtensions &&
    !(expectedExtensions as readonly string[]).includes(`.${extension}`)
  ) {
    errors.push(`Extension .${extension} does not match MIME type ${mimeType}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

export async function validateFileSignature(file: File): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const headerBytes = await readFileHeader(file, 12);
    
    const mimeType = file.type.toLowerCase();
    let signatureMatch = false;

    if (mimeType.includes('jpeg')) {
      signatureMatch = matchesSignature(headerBytes, FILE_SIGNATURES.jpeg);
    } else if (mimeType.includes('png')) {
      signatureMatch = matchesSignature(headerBytes, FILE_SIGNATURES.png);
    } else if (mimeType.includes('gif')) {
      signatureMatch = matchesSignature(headerBytes, FILE_SIGNATURES.gif);
    } else if (mimeType.includes('webp')) {
      signatureMatch = matchesSignature(headerBytes, FILE_SIGNATURES.webp);
    } else if (mimeType.includes('bmp')) {
      signatureMatch = matchesSignature(headerBytes, FILE_SIGNATURES.bmp);
    } else if (mimeType.includes('tiff')) {
      signatureMatch = matchesSignature(headerBytes, FILE_SIGNATURES.tiff);
    } else {
      warnings.push('Cannot verify file signature for this type');
      return { valid: true, errors, warnings };
    }

    if (!signatureMatch) {
      errors.push('File signature does not match declared type. File may be corrupted or mislabeled.');
    }

  } catch (error) {
    warnings.push('Could not read file header for signature validation');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

export async function validateImageDimensions(
  file: File,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    minWidth?: number;
    minHeight?: number;
  }
): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const dimensions = await getImageDimensions(file);
    const { width, height } = dimensions;

    if (options.maxWidth && width > options.maxWidth) {
      errors.push(`Image width ${width}px exceeds maximum ${options.maxWidth}px`);
    }

    if (options.maxHeight && height > options.maxHeight) {
      errors.push(`Image height ${height}px exceeds maximum ${options.maxHeight}px`);
    }

    if (options.minWidth && width < options.minWidth) {
      errors.push(`Image width ${width}px is below minimum ${options.minWidth}px`);
    }

    if (options.minHeight && height < options.minHeight) {
      errors.push(`Image height ${height}px is below minimum ${options.minHeight}px`);
    }

    if (width > 8000 || height > 8000) {
      warnings.push(`Very large image dimensions (${width}×${height}). Processing may be slow.`);
    }

  } catch (error) {
    warnings.push('Could not determine image dimensions');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.width, height: img.height });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

async function readFileHeader(file: File, numBytes: number): Promise<Uint8Array> {
  const blob = file.slice(0, numBytes);
  const arrayBuffer = await blob.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

function matchesSignature(
  headerBytes: Uint8Array,
  signatures: readonly (readonly (number | null)[])[]
): boolean {
  return signatures.some(signature => {
    return signature.every((byte, index) => {
      if (byte === null) return true; 
      return headerBytes[index] === byte;
    });
  });
}

function findDuplicateFilenames(files: File[]): Set<string> {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  files.forEach(file => {
    if (seen.has(file.name)) {
      duplicates.add(file.name);
    } else {
      seen.add(file.name);
    }
  });

  return duplicates;
}

function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1) return '';
  return filename.slice(lastDot + 1).toLowerCase();
}

export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

export function isSupportedType(mimeType: string): boolean {
  return Object.keys(SUPPORTED_IMAGE_TYPES).includes(mimeType.toLowerCase());
}

export function getAllowedExtensionsString(): string {
  const extensions = Object.values(SUPPORTED_IMAGE_TYPES).flat();
  return extensions.join(',');
}

export function getValidationSummary(
  results: Map<string, ValidationResult>
): {
  totalFiles: number;
  validFiles: number;
  invalidFiles: number;
  totalErrors: number;
  totalWarnings: number;
} {
  let validFiles = 0;
  let invalidFiles = 0;
  let totalErrors = 0;
  let totalWarnings = 0;

  results.forEach(result => {
    if (result.valid) {
      validFiles++;
    } else {
      invalidFiles++;
    }
    totalErrors += result.errors.length;
    totalWarnings += result.warnings.length;
  });

  return {
    totalFiles: results.size,
    validFiles,
    invalidFiles,
    totalErrors,
    totalWarnings
  };
}

export function filterValidFiles(
  files: File[],
  validationResults: Map<string, ValidationResult>
): File[] {
  return files.filter(file => {
    const result = validationResults.get(file.name);
    return result && result.valid;
  });
}

export function quickValidate(file: File): boolean {
  return (
    file &&
    file.size > FILE_SIZE_LIMITS.MIN &&
    file.size <= FILE_SIZE_LIMITS.MAX &&
    isSupportedType(file.type)
  );
}
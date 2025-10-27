import type { ExifData } from '../types/exif';
import type { TemplateToken, RenameResult, RenameOptions } from '../types/template';

export const TEMPLATE_TOKENS = {
  // Date tokens
  '{YYYY}': 'Year (4 digits)',
  '{YY}': 'Year (2 digits)',
  '{MM}': 'Month (01-12)',
  '{DD}': 'Day (01-31)',
  '{HH}': 'Hour (00-23)',
  '{mm}': 'Minute (00-59)',
  '{ss}': 'Second (00-59)',
  
  // Date formats
  '{date}': 'Full date (YYYYMMDD)',
  '{datetime}': 'Date and time (YYYYMMDD_HHMMSS)',
  '{timestamp}': 'Unix timestamp',
  
  // Camera info
  '{make}': 'Camera manufacturer',
  '{model}': 'Camera model',
  '{lens}': 'Lens model',
  
  // Camera settings
  '{iso}': 'ISO value',
  '{aperture}': 'Aperture (f-number)',
  '{shutter}': 'Shutter speed',
  '{focal}': 'Focal length',
  
  // Image properties
  '{width}': 'Image width',
  '{height}': 'Image height',
  '{dimensions}': 'Width x Height',
  '{orientation}': 'Orientation',
  
  // GPS
  '{lat}': 'GPS Latitude',
  '{lng}': 'GPS Longitude',
  '{gps}': 'GPS coordinates',
  
  // Counters
  '{counter}': 'Sequential counter (001, 002...)',
  '{counter:5}': 'Counter with custom padding',
  
  // Original filename
  '{original}': 'Original filename (without extension)',
  '{ext}': 'File extension',
  
  // Custom
  '{custom}': 'Custom text input'
} as const;

const TOKEN_REGEX = /\{([^}]+)\}/g;

export function parseTemplate(template: string): TemplateToken[] {
  const tokens: TemplateToken[] = [];
  let match: RegExpExecArray | null;
  
  // Reset regex state
  TOKEN_REGEX.lastIndex = 0;
  
  while ((match = TOKEN_REGEX.exec(template)) !== null) {
    const token = match[1];
    const fullToken = match[0];
    
    tokens.push({
      token,
      fullToken,
      position: match.index,
      isValid: isValidToken(token)
    });
  }
  
  return tokens;
}

function isValidToken(token: string): boolean {
  // Check standard tokens
  if (TEMPLATE_TOKENS.hasOwnProperty(`{${token}}`)) {
    return true;
  }
  
  // Check counter with custom padding (e.g., counter:5)
  if (/^counter:\d+$/.test(token)) {
    return true;
  }
  
  return false;
}

export function generateFilename(
  template: string,
  exifData: ExifData | null,
  originalFilename: string,
  options: RenameOptions = {}
): RenameResult {
  const {
    counter = 1,
    counterPadding = 3,
    customText = '',
    fallbackDate = new Date(),
    preserveExtension = true
  } = options;

  let filename = template;
  const warnings: string[] = [];

  const { name: originalName, ext: originalExt } = parseFilename(originalFilename);

  const date = exifData?.dateTaken || fallbackDate;
  filename = replaceDateTokens(filename, date);

  filename = replaceCameraTokens(filename, exifData, warnings);

  filename = replaceImageTokens(filename, exifData, warnings);

  filename = replaceGPSTokens(filename, exifData, warnings);

  filename = replaceCounterTokens(filename, counter, counterPadding);

  filename = filename.replace(/\{original\}/g, originalName);
  filename = filename.replace(/\{ext\}/g, originalExt);

  filename = filename.replace(/\{custom\}/g, customText);
  
  const unresolvedTokens = filename.match(TOKEN_REGEX);
  if (unresolvedTokens && unresolvedTokens.length > 0) {
    warnings.push(`Unresolved tokens: ${unresolvedTokens.join(', ')}`);
    filename = filename.replace(TOKEN_REGEX, '');
  }
  
  filename = sanitizeForFilename(filename);
  
  if (preserveExtension && originalExt) {
    filename = `${filename}.${originalExt}`;
  }
  
  return {
    filename,
    success: true,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

function replaceDateTokens(template: string, date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return template
    .replace(/\{YYYY\}/g, String(year))
    .replace(/\{YY\}/g, String(year).slice(-2))
    .replace(/\{MM\}/g, month)
    .replace(/\{DD\}/g, day)
    .replace(/\{HH\}/g, hours)
    .replace(/\{mm\}/g, minutes)
    .replace(/\{ss\}/g, seconds)
    .replace(/\{date\}/g, `${year}${month}${day}`)
    .replace(/\{datetime\}/g, `${year}${month}${day}_${hours}${minutes}${seconds}`)
    .replace(/\{timestamp\}/g, String(Math.floor(date.getTime() / 1000)));
}

function replaceCameraTokens(
  template: string,
  exifData: ExifData | null,
  warnings: string[]
): string {
  let result = template;
  
  // Make
  if (result.includes('{make}')) {
    if (exifData?.make) {
      result = result.replace(/\{make\}/g, sanitizeToken(exifData.make));
    } else {
      warnings.push('Camera make not available in EXIF data');
      result = result.replace(/\{make\}/g, '');
    }
  }
  
  // Model
  if (result.includes('{model}')) {
    if (exifData?.model) {
      result = result.replace(/\{model\}/g, sanitizeToken(exifData.model));
    } else {
      warnings.push('Camera model not available in EXIF data');
      result = result.replace(/\{model\}/g, '');
    }
  }
  
  // Lens
  if (result.includes('{lens}')) {
    if (exifData?.lensModel) {
      result = result.replace(/\{lens\}/g, sanitizeToken(exifData.lensModel));
    } else {
      warnings.push('Lens model not available in EXIF data');
      result = result.replace(/\{lens\}/g, '');
    }
  }
  
  // ISO
  if (result.includes('{iso}')) {
    if (exifData?.iso) {
      result = result.replace(/\{iso\}/g, `ISO${exifData.iso}`);
    } else {
      warnings.push('ISO not available in EXIF data');
      result = result.replace(/\{iso\}/g, '');
    }
  }
  
  // Aperture
  if (result.includes('{aperture}')) {
    if (exifData?.fNumber) {
      result = result.replace(/\{aperture\}/g, `f${exifData.fNumber}`);
    } else {
      warnings.push('Aperture not available in EXIF data');
      result = result.replace(/\{aperture\}/g, '');
    }
  }
  
  // Shutter speed
  if (result.includes('{shutter}')) {
    if (exifData?.exposureTime) {
      const shutterDisplay = formatShutterSpeed(
        typeof exifData.exposureTime === 'number' ? exifData.exposureTime :
          typeof exifData.exposureTime === 'string' ? parseFloat(exifData.exposureTime) || 0 :
            0
      );
      result = result.replace(/\{shutter\}/g, shutterDisplay);
    } else {
      warnings.push('Shutter speed not available in EXIF data');
      result = result.replace(/\{shutter\}/g, '');
    }
  }
  
  // Focal length
  if (result.includes('{focal}')) {
    if (exifData?.focalLength) {
      result = result.replace(/\{focal\}/g, `${exifData.focalLength}mm`);
    } else {
      warnings.push('Focal length not available in EXIF data');
      result = result.replace(/\{focal\}/g, '');
    }
  }
  
  return result;
}

function replaceImageTokens(
  template: string,
  exifData: ExifData | null,
  warnings: string[]
): string {
  let result = template;
  
  if (result.includes('{width}')) {
    if (exifData?.width) {
      result = result.replace(/\{width\}/g, String(exifData.width));
    } else {
      warnings.push('Image width not available');
      result = result.replace(/\{width\}/g, '');
    }
  }
  
  if (result.includes('{height}')) {
    if (exifData?.height) {
      result = result.replace(/\{height\}/g, String(exifData.height));
    } else {
      warnings.push('Image height not available');
      result = result.replace(/\{height\}/g, '');
    }
  }
  
  if (result.includes('{dimensions}')) {
    if (exifData?.width && exifData?.height) {
      result = result.replace(/\{dimensions\}/g, `${exifData.width}x${exifData.height}`);
    } else {
      warnings.push('Image dimensions not available');
      result = result.replace(/\{dimensions\}/g, '');
    }
  }
  
  if (result.includes('{orientation}')) {
    if (exifData?.orientation) {
      result = result.replace(/\{orientation\}/g, String(exifData.orientation));
    } else {
      result = result.replace(/\{orientation\}/g, '1');
    }
  }
  
  return result;
}

function replaceGPSTokens(
  template: string,
  exifData: ExifData | null,
  warnings: string[]
): string {
  let result = template;
  
  if (result.includes('{lat}')) {
    if (exifData?.gps?.lat) {
      result = result.replace(/\{lat\}/g, exifData.gps.lat.toFixed(6));
    } else {
      warnings.push('GPS latitude not available');
      result = result.replace(/\{lat\}/g, '');
    }
  }
  
  if (result.includes('{lng}')) {
    if (exifData?.gps?.lng) {
      result = result.replace(/\{lng\}/g, exifData.gps.lng.toFixed(6));
    } else {
      warnings.push('GPS longitude not available');
      result = result.replace(/\{lng\}/g, '');
    }
  }
  
  if (result.includes('{gps}')) {
    if (exifData?.gps?.lat && exifData?.gps?.lng) {
      result = result.replace(
        /\{gps\}/g,
        `${exifData.gps.lat.toFixed(6)}_${exifData.gps.lng.toFixed(6)}`
      );
    } else {
      warnings.push('GPS coordinates not available');
      result = result.replace(/\{gps\}/g, '');
    }
  }
  
  return result;
}

function replaceCounterTokens(
  template: string,
  counter: number,
  defaultPadding: number
): string {
  let result = template;
  
  // Handle custom padding (e.g., {counter:5})
  result = result.replace(/\{counter:(\d+)\}/g, (_, padding) => {
    return String(counter).padStart(parseInt(padding, 10), '0');
  });
  
  // Handle default counter
  result = result.replace(/\{counter\}/g, String(counter).padStart(defaultPadding, '0'));
  
  return result;
}

function formatShutterSpeed(speed: string | number | null | undefined): string {
  if (!speed) return '';

  const numSpeed = typeof speed === 'number' ? speed : parseFloat(String(speed));

  if (isNaN(numSpeed) || numSpeed <= 0) return '';

  if (numSpeed >= 1) {
    return `${numSpeed}s`;
  } else {
    const denominator = Math.round(1 / numSpeed);
    return `1/${denominator}s`;
  }
}

function sanitizeToken(value: string): string {
  return value
    .replace(/[^\w\s-]/g, '') // Remove special chars except word chars, spaces, hyphens
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .trim();
}

function sanitizeForFilename(value: string | number | null): string {
  if (value === null || value === undefined) return '';
  
  return String(value)
    .replace(/[<>:"/\\|?*]/g, '') 
    .replace(/\s+/g, '_')         
    .replace(/_{2,}/g, '_');      
}

export function applyTemplate(
  template: string,
  exifData: ExifData | null,
  counter: number,
  originalFileName: string
): string {
  if (!exifData) {
    return originalFileName.split('.')[0];
  }

  let result = template;

  const dateStr = exifData.dateTaken 
    ? exifData.dateTaken.toISOString().split('T')[0].replace(/-/g, '') 
    : 'NoDate';
  
  result = result.replace(/{date}/g, dateStr);
  
  if (exifData.dateTaken) {
    const date = exifData.dateTaken;
    result = result.replace(/{YYYY}/g, date.getFullYear().toString());
    result = result.replace(/{YY}/g, date.getFullYear().toString().slice(-2));
    result = result.replace(/{MM}/g, String(date.getMonth() + 1).padStart(2, '0'));
    result = result.replace(/{DD}/g, String(date.getDate()).padStart(2, '0'));
    result = result.replace(/{HH}/g, String(date.getHours()).padStart(2, '0'));
    result = result.replace(/{mm}/g, String(date.getMinutes()).padStart(2, '0'));
    result = result.replace(/{ss}/g, String(date.getSeconds()).padStart(2, '0'));
  }

  result = result.replace(/{make}/g, sanitizeForFilename(exifData.make) || 'Unknown');
  result = result.replace(/{model}/g, sanitizeForFilename(exifData.model) || 'Unknown');
  result = result.replace(/{iso}/g, sanitizeForFilename(exifData.iso) || '0');
  result = result.replace(/{focal}/g, sanitizeForFilename(exifData.focalLength) || '0');
  result = result.replace(/{aperture}/g, sanitizeForFilename(exifData.fNumber) || '0');
  
  const shutterSpeed = typeof exifData.exposureTime === 'number' ? exifData.exposureTime :
                      typeof exifData.exposureTime === 'string' ? parseFloat(exifData.exposureTime) || 0 : 0;
  result = result.replace(/{shutter}/g, shutterSpeed > 0 ? String(shutterSpeed) : '0');
  
  result = result.replace(/{counter}/g, String(counter).padStart(3, '0'));
  
  result = result.replace(/{counter:(\d+)}/g, (match, digits) => {
    const padding = parseInt(digits, 10) || 3;
    return String(counter).padStart(padding, '0');
  });

  result = result.replace(/_{2,}/g, '_');
  result = result.replace(/-{2,}/g, '-');

  return result;
}

function parseFilename(filename: string): { name: string; ext: string } {
  const lastDotIndex = filename.lastIndexOf('.');
  
  if (lastDotIndex === -1 || lastDotIndex === 0) {
    return { name: filename, ext: '' };
  }
  
  return {
    name: filename.substring(0, lastDotIndex),
    ext: filename.substring(lastDotIndex + 1)
  };
}

export function batchRename(
  files: File[],
  template: string,
  exifDataMap: Map<string, ExifData | null>,
  options: RenameOptions = {}
): Map<File, RenameResult> {
  const results = new Map<File, RenameResult>();
  const usedFilenames = new Set<string>();
  
  files.forEach((file, index) => {
    const exifData = exifDataMap.get(file.name) || null;
    const renameOptions: RenameOptions = {
      ...options,
      counter: (options.startCounter || 1) + index
    };
    
    let result = generateFilename(template, exifData, file.name, renameOptions);
    
    if (usedFilenames.has(result.filename)) {
      result = resolveFilenameConflict(result, usedFilenames);
    }
    
    usedFilenames.add(result.filename);
    results.set(file, result);
  });
  
  return results;
}

function resolveFilenameConflict(
  result: RenameResult,
  usedFilenames: Set<string>
): RenameResult {
  const { name, ext } = parseFilename(result.filename);
  let counter = 1;
  let newFilename: string;
  
  do {
    const suffix = `_${counter}`;
    newFilename = ext ? `${name}${suffix}.${ext}` : `${name}${suffix}`;
    counter++;
  } while (usedFilenames.has(newFilename));
  
  return {
    ...result,
    filename: newFilename,
    warnings: [
      ...(result.warnings || []),
      'Filename conflict resolved with numeric suffix'
    ]
  };
}

export function validateTemplate(template: string): { isValid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!template || template.trim().length === 0) {
    errors.push('Template cannot be empty');
    return { isValid: false, errors, warnings };
  }

  const tokens = parseTemplate(template);
  const invalidTokens = tokens.filter(t => !t.isValid);

  if (invalidTokens.length > 0) {
    invalidTokens.forEach(token => {
      errors.push(`Invalid token: ${token.fullToken}`);
    });
  }

  if (tokens.length === 0) {
    warnings.push('Template has no dynamic tokens');
  }

  const templateWithoutTokens = template.replace(/\{[^}]+\}/g, '');
  const invalidChars = /[<>:"/\\|?*]/g;
  if (invalidChars.test(templateWithoutTokens)) {
    warnings.push('Template contains characters that may be invalid in filenames');
  }

  return { isValid: errors.length === 0, errors, warnings };
}

export function previewRename(
  files: File[],
  template: string,
  exifDataMap: Map<string, ExifData | null>,
  options: RenameOptions = {}
): Array<{ original: string; renamed: string; warnings?: string[] }> {
  const renameResults = batchRename(files, template, exifDataMap, options);
  
  return Array.from(renameResults.entries()).map(([file, result]) => ({
    original: file.name,
    renamed: result.filename,
    warnings: result.warnings
  }));
}

export const TEMPLATE_PRESETS = {
  'Date + Counter': '{YYYY}{MM}{DD}_{counter}',
  'DateTime + Original': '{datetime}_{original}',
  'Camera + Date': '{model}_{date}',
  'Date + Camera + Counter': '{YYYY}{MM}{DD}_{model}_{counter}',
  'Custom + Counter': '{custom}_{counter:4}',
  'Date + Time + Settings': '{date}_{HH}{mm}{ss}_{iso}_{aperture}_{shutter}',
  'Location + DateTime': '{gps}_{datetime}',
  'Year-Month-Day Counter': '{YYYY}-{MM}-{DD}_{counter}'
} as const;

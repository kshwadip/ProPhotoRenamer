import { zip, zipSync, strToU8, type ZipInputFile, type Zippable, type AsyncZippable, Zip as FflateZip, ZipDeflate, ZipPassThrough } from 'fflate';
import type { RenameResult } from '../types/template';

export interface ZipOptions {
  compressionLevel?: number;
  includeMetadata?: boolean;
  folderName?: string;
  onProgress?: (current: number, total: number, filename: string) => void;
}

export interface ZipResult {
  blob: Blob;
  size: number;
  filename: string;
  fileCount: number;
}

const INCOMPRESSIBLE_TYPES = new Set([
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif', 'avif',
  'mp4', 'mov', 'avi', 'mkv', 'webm',
  'mp3', 'aac', 'flac', 'm4a', 'ogg',
  'zip', 'rar', '7z', 'gz', 'bz2',
  'pdf', 'docx', 'xlsx', 'pptx'
]);

/**
 * Create a ZIP file from renamed photos
 * Asynchronous version using Web Workers for better performance
 *
 * @param files - Array of original File objects
 * @param renameMap - Map of File to RenameResult
 * @param options - ZIP creation options
 * @returns Promise resolving to ZipResult with blob and metadata
 */
export async function createZipAsync(
  files: File[],
  renameMap: Map<File, RenameResult>,
  options: ZipOptions = {}
): Promise<ZipResult> {
  const {
    compressionLevel = 6,
    includeMetadata = false,
    folderName = '',
    onProgress
  } = options;

  const zipInput: Record<string, [Uint8Array, { level: number, mtime: Date }]> = {};
  let processedCount = 0;

  for (const file of files) {
    const renameResult = renameMap.get(file);
    if (!renameResult) continue;

    const filename = folderName
      ? `${folderName}/${renameResult.filename}`
      : renameResult.filename;

    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    const ext = getFileExtension(file.name);
    const level = INCOMPRESSIBLE_TYPES.has(ext) ? 0 : compressionLevel;

    zipInput[filename] = [uint8Array, {
      level: level as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9,
      mtime: file.lastModified ? new Date(file.lastModified) : new Date()
    }] as any;

    processedCount++;
    if (onProgress) {
      onProgress(processedCount, files.length, renameResult.filename);
    }
  }

  if (includeMetadata) {
    const metadata = generateMetadataFile(files, renameMap);
    const metadataFilename = folderName
      ? `${folderName}/metadata.txt`
      : 'metadata.txt';
    zipInput[metadataFilename] = [strToU8(metadata)] as any;
  }

  return new Promise((resolve, reject) => {
    zip(zipInput as any as AsyncZippable, { level: compressionLevel as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 }, (err, data) => {
      if (err) {
        reject(new Error(`ZIP creation failed: ${err.message}`));
        return;
      }

      const blob = new Blob([data.buffer as BlobPart], { type: 'application/zip' });
      const zipFilename = generateZipFilename(folderName);

      resolve({
        blob,
        size: data.length,
        filename: zipFilename,
        fileCount: files.length
      });
    });
  });
}

/**
 * Create a ZIP file synchronously
 * Faster for small batches (<10 files) but blocks main thread
 *
 * @param files - Array of original File objects
 * @param renameMap - Map of File to RenameResult
 * @param options - ZIP creation options
 * @returns Promise resolving to ZipResult with blob and metadata
 */
export async function createZipSync(
  files: File[],
  renameMap: Map<File, RenameResult>,
  options: ZipOptions = {}
): Promise<ZipResult> {
  const {
    compressionLevel = 6,
    includeMetadata = false,
    folderName = '',
    onProgress
  } = options;

  const zipInput: Record<string, [Uint8Array, { level: number, mtime: Date }]> = {};
  let processedCount = 0;

  for (const file of files) {
    const renameResult = renameMap.get(file);
    if (!renameResult) continue;

    const filename = folderName
      ? `${folderName}/${renameResult.filename}`
      : renameResult.filename;

    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    const ext = getFileExtension(file.name);
    const level = INCOMPRESSIBLE_TYPES.has(ext) ? 0 : compressionLevel;

    zipInput[filename] = [uint8Array, {
      level: level as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9,
      mtime: file.lastModified ? new Date(file.lastModified) : new Date()
    }] as any;

    processedCount++;
    if (onProgress) {
      onProgress(processedCount, files.length, renameResult.filename);
    }
  }

  if (includeMetadata) {
    const metadata = generateMetadataFile(files, renameMap);
    const metadataFilename = folderName
      ? `${folderName}/metadata.txt`
      : 'metadata.txt';
    zipInput[metadataFilename] = [strToU8(metadata)] as any;
  }

  const data = zipSync(zipInput as any as Zippable, { level: compressionLevel as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 });
  const blob = new Blob([data.buffer as BlobPart], { type: 'application/zip' });
  const zipFilename = generateZipFilename(folderName);

  return {
    blob,
    size: data.length,
    filename: zipFilename,
    fileCount: files.length
  };
}

/**
 * Smart ZIP creation that chooses between sync and async based on file count
 * Async is preferred for >10 files or total size >10MB
 *
 * @param files - Array of original File objects
 * @param renameMap - Map of File to RenameResult
 * @param options - ZIP creation options
 * @returns Promise resolving to ZipResult
 */
export async function createZip(
  files: File[],
  renameMap: Map<File, RenameResult>,
  options: ZipOptions = {}
): Promise<ZipResult> {
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  const ASYNC_THRESHOLD_FILES = 10;
  const ASYNC_THRESHOLD_SIZE = 10 * 1024 * 1024;

  if (files.length > ASYNC_THRESHOLD_FILES || totalSize > ASYNC_THRESHOLD_SIZE) {
    return createZipAsync(files, renameMap, options);
  }

  return createZipSync(files, renameMap, options);
}

export async function createZipStream(
  files: File[],
  renameMap: Map<File, RenameResult>,
  options: ZipOptions = {}
): Promise<ZipResult> {
  const {
    compressionLevel = 6,
    folderName = '',
    onProgress
  } = options;

  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    let totalSize = 0;

    const zipStream = new FflateZip((err: Error | null, data: Uint8Array, final: boolean) => {
      if (err) {
        reject(new Error(`ZIP streaming failed: ${err.message}`));
        return;
      }

      chunks.push(data);
      totalSize += data.length;

      if (final) {
        const blob = new Blob(chunks as BlobPart[], { type: 'application/zip' });
        const zipFilename = generateZipFilename(folderName);

        resolve({
          blob,
          size: totalSize,
          filename: zipFilename,
          fileCount: files.length
        });
      }
    });

    processFilesStreaming(files, renameMap, zipStream, {
      compressionLevel,
      folderName,
      onProgress
    }).catch(reject);
  });
}

async function processFilesStreaming(
  files: File[],
  renameMap: Map<File, RenameResult>,
  zipStream: FflateZip,
  options: {
    compressionLevel: number;
    folderName: string;
    onProgress?: (current: number, total: number, filename: string) => void;
  }
): Promise<void> {
  let processedCount = 0;

  for (const file of files) {
    const renameResult = renameMap.get(file);
    if (!renameResult) continue;

    const filename = options.folderName
      ? `${options.folderName}/${renameResult.filename}`
      : renameResult.filename;

    const ext = getFileExtension(file.name);
    const shouldCompress = !INCOMPRESSIBLE_TYPES.has(ext);

    const fileStream = shouldCompress
      ? new ZipDeflate(filename, { level: options.compressionLevel as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 })
      : new ZipPassThrough(filename);

    fileStream.mtime = file.lastModified ? new Date(file.lastModified) : new Date();

    zipStream.add(fileStream);

    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    fileStream.push(uint8Array, true);

    processedCount++;
    if (options.onProgress) {
      options.onProgress(processedCount, files.length, renameResult.filename);
    }
  }

  zipStream.end();
}

/**
 * Download ZIP file to user's computer
 * Triggers browser download dialog
 *
 * @param zipResult - Result from createZip functions
 */
export function downloadZip(zipResult: ZipResult): void {
  const url = URL.createObjectURL(zipResult.blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = zipResult.filename;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => URL.revokeObjectURL(url), 100);
}

function generateMetadataFile(
  files: File[],
  renameMap: Map<File, RenameResult>
): string {
  const lines: string[] = [
    'Photo Renaming Metadata',
    '======================',
    '',
    `Generated: ${new Date().toLocaleString()}`,
    `Total Files: ${files.length}`,
    '',
    'File Renaming Log:',
    '-------------------',
    ''
  ];

  files.forEach((file, index) => {
    const renameResult = renameMap.get(file);
    if (!renameResult) return;

    lines.push(`${index + 1}. ${file.name} → ${renameResult.filename}`);

    if (renameResult.warnings && renameResult.warnings.length > 0) {
      renameResult.warnings.forEach(warning => {
        lines.push(`  Warning: ${warning}`);
      });
    }
    lines.push('');
  });

  return lines.join('\n');
}

function generateZipFilename(folderName?: string): string {
  const date = new Date();
  const dateStr = date.toISOString().split('T')[0];
  const timeStr = date.toTimeString().split(' ')[0].replace(/:/g, '-');

  const baseName = folderName || 'renamed-photos';
  return `${baseName}_${dateStr}_${timeStr}.zip`;
}

function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1) return '';
  return filename.slice(lastDot + 1).toLowerCase();
}

export function estimateZipSize(files: File[]): number {
  let estimatedSize = 0;

  files.forEach(file => {
    const ext = getFileExtension(file.name);

    if (INCOMPRESSIBLE_TYPES.has(ext)) {
      estimatedSize += file.size * 1.02;
    } else {
      estimatedSize += file.size * 0.5 * 1.02;
    }
  });

  estimatedSize += files.length * 200;

  return Math.ceil(estimatedSize);
}

export function formatByteSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

export function validateZipCreation(
  files: File[],
  renameMap: Map<File, RenameResult>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (files.length === 0) {
    errors.push('No files to zip');
  }

  if (renameMap.size === 0) {
    errors.push('No rename mapping provided');
  }

  if (files.length !== renameMap.size) {
    errors.push('File count mismatch with rename mapping');
  }

  const filenames = new Set<string>();
  let duplicateCount = 0;

  renameMap.forEach(result => {
    if (filenames.has(result.filename)) {
      duplicateCount++;
    }
    filenames.add(result.filename);
  });

  if (duplicateCount > 0) {
    errors.push(`${duplicateCount} duplicate filename(s) detected`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export interface BatchZipOptions extends ZipOptions {
  batchSize?: number;
  pauseBetweenBatches?: number;
}

export async function createZipBatched(
  files: File[],
  renameMap: Map<File, RenameResult>,
  options: BatchZipOptions = {}
): Promise<ZipResult> {
  const {
    batchSize = 50,
    pauseBetweenBatches = 100,
    ...zipOptions
  } = options;

  return createZip(files, renameMap, zipOptions);
}
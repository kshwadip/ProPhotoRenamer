export interface DateFormatOptions {
  locale?: string;
  includeTime?: boolean;
  includeSeconds?: boolean;
  use24Hour?: boolean;
  dateStyle?: 'full' | 'long' | 'medium' | 'short';
  timeStyle?: 'full' | 'long' | 'medium' | 'short';
  timeZone?: string;
}

export interface CounterOptions {
  padding?: number;
  prefix?: string;
  suffix?: string;
  startFrom?: number;
}

export interface DurationOptions {
  showMilliseconds?: boolean;
  longFormat?: boolean;
}

export function formatDateCompact(date: Date): string {
  const year = date.getFullYear();
  const month = padNumber(date.getMonth() + 1, 2);
  const day = padNumber(date.getDate(), 2);
  
  return `${year}${month}${day}`;
}

export function formatDateISO(date: Date): string {
  const year = date.getFullYear();
  const month = padNumber(date.getMonth() + 1, 2);
  const day = padNumber(date.getDate(), 2);
  
  return `${year}-${month}-${day}`;
}

export function formatDateTimeCompact(date: Date): string {
  const datePart = formatDateCompact(date);
  const timePart = formatTimeCompact(date);
  
  return `${datePart}_${timePart}`;
}

export function formatTimeCompact(date: Date): string {
  const hours = padNumber(date.getHours(), 2);
  const minutes = padNumber(date.getMinutes(), 2);
  const seconds = padNumber(date.getSeconds(), 2);
  
  return `${hours}${minutes}${seconds}`;
}

export function formatTime(date: Date, includeSeconds: boolean = true): string {
  const hours = padNumber(date.getHours(), 2);
  const minutes = padNumber(date.getMinutes(), 2);
  
  if (!includeSeconds) {
    return `${hours}:${minutes}`;
  }
  
  const seconds = padNumber(date.getSeconds(), 2);
  return `${hours}:${minutes}:${seconds}`;
}

export function formatDatePattern(date: Date, pattern: string): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  
  return pattern
    .replace(/YYYY/g, String(year))
    .replace(/YY/g, String(year).slice(-2))
    .replace(/MM/g, padNumber(month, 2))
    .replace(/M/g, String(month))
    .replace(/DD/g, padNumber(day, 2))
    .replace(/D/g, String(day))
    .replace(/HH/g, padNumber(hours, 2))
    .replace(/H/g, String(hours))
    .replace(/mm/g, padNumber(minutes, 2))
    .replace(/m/g, String(minutes))
    .replace(/ss/g, padNumber(seconds, 2))
    .replace(/s/g, String(seconds));
}

export function formatDateLocale(date: Date, options: DateFormatOptions = {}): string {
  const {
    locale = 'en-US',
    dateStyle = 'medium',
    timeStyle,
    includeTime = false,
    timeZone
  } = options;

  const formatOptions: any = {
    dateStyle,
    timeZone
  };

  if (includeTime) {
    formatOptions.timeStyle = timeStyle;
  }

  const formatter = new Intl.DateTimeFormat(locale, formatOptions);
  return formatter.format(date);
}

export function formatRelativeTime(date: Date, baseDate: Date = new Date()): string {
  const diffMs = date.getTime() - baseDate.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (Math.abs(diffSec) < 60) {
    return diffSec >= 0 ? 'just now' : 'just now';
  } else if (Math.abs(diffMin) < 60) {
    const unit = Math.abs(diffMin) === 1 ? 'minute' : 'minutes';
    return diffMin >= 0 ? `in ${diffMin} ${unit}` : `${Math.abs(diffMin)} ${unit} ago`;
  } else if (Math.abs(diffHour) < 24) {
    const unit = Math.abs(diffHour) === 1 ? 'hour' : 'hours';
    return diffHour >= 0 ? `in ${diffHour} ${unit}` : `${Math.abs(diffHour)} ${unit} ago`;
  } else if (Math.abs(diffDay) < 30) {
    const unit = Math.abs(diffDay) === 1 ? 'day' : 'days';
    return diffDay >= 0 ? `in ${diffDay} ${unit}` : `${Math.abs(diffDay)} ${unit} ago`;
  } else {
    return formatDateISO(date);
  }
}

export function getUnixTimestamp(date: Date = new Date()): number {
  return Math.floor(date.getTime() / 1000);
}

export function getUnixTimestampMs(date: Date = new Date()): number {
  return date.getTime();
}

export function formatUnixTimestamp(timestamp: number, pattern: string = 'YYYY-MM-DD HH:mm:ss'): string {
  const date = new Date(timestamp * 1000);
  return formatDatePattern(date, pattern);
}

export function padNumber(num: number, length: number): string {
  return String(num).padStart(length, '0');
}

export function formatCounter(
  count: number,
  options: CounterOptions = {}
): string {
  const {
    padding = 3,
    prefix = '',
    suffix = '',
    startFrom = 1
  } = options;

  const adjustedCount = count + startFrom - 1;
  const paddedNumber = padNumber(adjustedCount, padding);
  
  return `${prefix}${paddedNumber}${suffix}`;
}

export function formatFileSize(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  const size = bytes / Math.pow(k, i);
  return `${size.toFixed(decimals)} ${sizes[i]}`;
}

export function formatNumberWithSeparator(
  num: number,
  separator: string = ',',
  locale: string = 'en-US'
): string {
  return new Intl.NumberFormat(locale).format(num);
}

export function formatPercentage(value: number, decimals: number = 0): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

export function formatDecimal(value: number, decimals: number = 2): string {
  return value.toFixed(decimals);
}

export function formatShutterSpeed(exposureTime: number): string {
  if (exposureTime >= 1) {
    return `${exposureTime}s`;
  }
  
  if (exposureTime === 0) {
    return '0s';
  }
  
  // Convert to fraction
  const denominator = Math.round(1 / exposureTime);
  return `1/${denominator}`;
}

export function formatAperture(fNumber: number): string {
  return `f/${fNumber}`;
}

export function formatISO(iso: number): string {
  return `ISO ${iso}`;
}

export function formatFocalLength(focalLength: number): string {
  return `${focalLength}mm`;
}

export function formatDimensions(width: number, height: number, separator: string = '×'): string {
  return `${width}${separator}${height}`;
}

export function formatMegapixels(width: number, height: number): string {
  const megapixels = (width * height) / 1_000_000;
  return `${megapixels.toFixed(1)} MP`;
}

export function formatGPSDecimal(coordinate: number, decimals: number = 6): string {
  return `${coordinate.toFixed(decimals)}°`;
}

export function formatGPSPair(latitude: number, longitude: number, decimals: number = 6): string {
  return `${formatGPSDecimal(latitude, decimals)}, ${formatGPSDecimal(longitude, decimals)}`;
}

export function formatGPSDMS(coordinate: number, direction: 'N' | 'S' | 'E' | 'W'): string {
  const absolute = Math.abs(coordinate);
  const degrees = Math.floor(absolute);
  const minutesDecimal = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesDecimal);
  const seconds = Math.round((minutesDecimal - minutes) * 60);
  
  return `${degrees}°${minutes}'${seconds}" ${direction}`;
}

export function formatGPSCoordinatesDMS(latitude: number, longitude: number): string {
  const latDirection = latitude >= 0 ? 'N' : 'S';
  const lngDirection = longitude >= 0 ? 'E' : 'W';
  
  const latDMS = formatGPSDMS(latitude, latDirection);
  const lngDMS = formatGPSDMS(longitude, lngDirection);
  
  return `${latDMS}, ${lngDMS}`;
}

export function formatDuration(ms: number, options: DurationOptions = {}): string {
  const { showMilliseconds = false, longFormat = false } = options;
  
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  const parts: string[] = [];
  
  if (days > 0) {
    parts.push(longFormat ? `${days} day${days > 1 ? 's' : ''}` : `${days}d`);
  }
  
  const remainingHours = hours % 24;
  if (remainingHours > 0) {
    parts.push(longFormat ? `${remainingHours} hour${remainingHours > 1 ? 's' : ''}` : `${remainingHours}h`);
  }
  
  const remainingMinutes = minutes % 60;
  if (remainingMinutes > 0) {
    parts.push(longFormat ? `${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}` : `${remainingMinutes}m`);
  }
  
  const remainingSeconds = seconds % 60;
  if (remainingSeconds > 0 || parts.length === 0) {
    parts.push(longFormat ? `${remainingSeconds} second${remainingSeconds > 1 ? 's' : ''}` : `${remainingSeconds}s`);
  }
  
  if (showMilliseconds) {
    const remainingMs = ms % 1000;
    if (remainingMs > 0) {
      parts.push(longFormat ? `${remainingMs}ms` : `${remainingMs}ms`);
    }
  }
  
  return parts.join(' ');
}

export function formatDurationClock(ms: number, includeHours: boolean = false): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  if (includeHours || hours > 0) {
    return `${padNumber(hours, 2)}:${padNumber(minutes, 2)}:${padNumber(seconds, 2)}`;
  }
  
  return `${padNumber(minutes, 2)}:${padNumber(seconds, 2)}`;
}

export function truncateText(text: string, maxLength: number, ellipsis: string = '...'): string {
  if (text.length <= maxLength) {
    return text;
  }
  
  return text.slice(0, maxLength - ellipsis.length) + ellipsis;
}

export function truncateFilename(filename: string, maxLength: number): string {
  if (filename.length <= maxLength) {
    return filename;
  }
  
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1) {
    return truncateText(filename, maxLength);
  }
  
  const extension = filename.slice(lastDot);
  const nameWithoutExt = filename.slice(0, lastDot);
  const availableLength = maxLength - extension.length - 4; // 4 for "..."
  
  if (availableLength <= 0) {
    return truncateText(filename, maxLength);
  }
  
  return `${nameWithoutExt.slice(0, availableLength)}...${extension}`;
}

export function capitalizeWords(text: string): string {
  return text.replace(/\b\w/g, (char) => char.toUpperCase());
}

export function capitalize(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

export function toKebabCase(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]/g, '');
}

export function toSnakeCase(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^\w_]/g, '');
}

export function toCamelCase(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, char) => char.toUpperCase());
}

export function isValidDate(date: any): date is Date {
  return date instanceof Date && !isNaN(date.getTime());
}

export function safeFormatDate(
  date: Date | string | number | null | undefined,
  pattern: string = 'YYYY-MM-DD',
  fallback: string = 'N/A'
): string {
  if (!date) return fallback;
  
  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    if (!isValidDate(dateObj)) return fallback;
    return formatDatePattern(dateObj, pattern);
  } catch {
    return fallback;
  }
}

export function parseDate(input: string | number | Date): Date | null {
  if (input instanceof Date) {
    return isValidDate(input) ? input : null;
  }
  
  if (typeof input === 'number') {
    const date = new Date(input);
    return isValidDate(date) ? date : null;
  }
  
  // Try parsing string
  const date = new Date(input);
  return isValidDate(date) ? date : null;
}

export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

export function formatDateRange(startDate: Date, endDate: Date, locale: string = 'en-US'): string {
  if (isSameDay(startDate, endDate)) {
    return formatDateLocale(startDate, { locale, dateStyle: 'medium' });
  }
  
  const start = formatDateLocale(startDate, { locale, dateStyle: 'medium' });
  const end = formatDateLocale(endDate, { locale, dateStyle: 'medium' });
  
  return `${start} - ${end}`;
}
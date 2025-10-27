export type TemplateTokenType =
  // Date tokens
  | 'YYYY' | 'YY' | 'MM' | 'DD' | 'HH' | 'mm' | 'ss'
  | 'date' | 'datetime' | 'timestamp'
  
  // Camera tokens
  | 'make' | 'model' | 'lens'
  
  // Settings tokens
  | 'iso' | 'aperture' | 'shutter' | 'focal'
  
  // Image tokens
  | 'width' | 'height' | 'dimensions' | 'orientation'
  
  // GPS tokens
  | 'lat' | 'lng' | 'gps'
  
  // Utility tokens
  | 'counter' | 'original' | 'ext' | 'custom';

export interface TemplateToken {
  token: string;
  fullToken: string; // Including braces, e.g., "{YYYY}"
  position: number;
  isValid: boolean;
  type?: TemplateTokenType;
  parameters?: string[]; // For tokens with params like {counter:5}
}

export interface ParsedTemplate {
  template: string;
  tokens: TemplateToken[];
  literalParts: string[]; // Static text between tokens
  hasValidTokens: boolean;
  tokenCount: number;
  errors: TemplateError[];
}

export interface TemplateValidation {
  isValid: boolean;
  errors: TemplateError[];
  warnings: TemplateWarning[];
  suggestions?: string[];
}

export interface TemplateError {
  type: TemplateErrorType;
  message: string;
  position?: number;
  token?: string;
  severity: 'error' | 'warning';
}

export type TemplateErrorType =
  | 'invalid_token'
  | 'unclosed_token'
  | 'empty_template'
  | 'no_tokens'
  | 'invalid_syntax'
  | 'unsupported_token'
  | 'missing_parameter'
  | 'invalid_parameter';

export interface TemplateWarning {
  type: TemplateWarningType;
  message: string;
  token?: string;
}

export type TemplateWarningType =
  | 'no_dynamic_content'
  | 'potential_collision'
  | 'missing_exif_data'
  | 'long_filename'
  | 'special_characters'
  | 'deprecated_token';

export interface RenameResult {
  filename: string;
  success: boolean;
  originalFilename?: string;
  errors?: string[];
  warnings?: string[];
  metadata?: RenameMetadata;
}

export interface RenameMetadata {
  tokensUsed: string[];
  exifDataUsed: boolean;
  fallbacksApplied: string[];
  processingTime?: number;
}

export interface RenameOptions {
  // Counter settings
  counter?: number;
  counterPadding?: number;
  startCounter?: number;
  
  // Custom values
  customText?: string;
  
  // Fallback behavior
  fallbackDate?: Date;
  useFallbackDate?: boolean;
  
  // Filename handling
  preserveExtension?: boolean;
  sanitizeFilename?: boolean;
  maxFilenameLength?: number;
  
  // Conflict resolution
  handleConflicts?: boolean;
  conflictResolution?: 'suffix' | 'skip' | 'overwrite';
  
  // Case transformation
  caseTransform?: 'none' | 'lowercase' | 'uppercase' | 'titlecase';
  
  // Whitespace handling
  replaceSpaces?: boolean;
  spaceReplacement?: string;
}

export interface TemplatePreset {
  id: string;
  name: string;
  template: string;
  description?: string;
  category?: TemplateCategory;
  tags?: string[];
  
  // Metadata
  createdAt?: Date;
  updatedAt?: Date;
  usageCount?: number;
  isBuiltIn?: boolean;
  isFavorite?: boolean;
  
  // Preview
  example?: string;
  tokensUsed?: TemplateTokenType[];
  
  // Options
  defaultOptions?: Partial<RenameOptions>;
}

export type TemplateCategory =
  | 'date-time'
  | 'camera'
  | 'sequential'
  | 'location'
  | 'custom'
  | 'mixed';

export interface TemplateLibrary {
  presets: TemplatePreset[];
  categories: Map<TemplateCategory, TemplatePreset[]>;
  favorites: TemplatePreset[];
  recent: TemplatePreset[];
}

export interface TemplateStats {
  templateId: string;
  usageCount: number;
  lastUsed: Date;
  successRate: number;
  averageFilesPerUse: number;
  commonOptions?: Partial<RenameOptions>;
}

export interface TemplateSuggestion {
  template: string;
  name: string;
  relevanceScore: number;
  reason: string;
  preview?: string;
}

export interface TemplateContext {
  hasExifData: boolean;
  hasGPS: boolean;
  cameraMakes?: string[];
  cameraModels?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  fileCount: number;
}

export interface TokenDocumentation {
  token: string;
  type: TemplateTokenType;
  description: string;
  example: string;
  exampleOutput: string;
  requiresExif: boolean;
  category: 'date' | 'camera' | 'settings' | 'image' | 'gps' | 'utility';
  parameters?: TokenParameter[];
}

export interface TokenParameter {
  name: string;
  type: 'number' | 'string' | 'boolean';
  required: boolean;
  default?: any;
  description: string;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

export interface TemplateBuilder {
  currentTemplate: string;
  cursorPosition: number;
  tokens: TemplateToken[];
  validation: TemplateValidation;
  preview: string[];
  history: string[];
  historyIndex: number;
}

export interface TemplateEditorConfig {
  syntaxHighlighting: boolean;
  autoComplete: boolean;
  showSuggestions: boolean;
  livePreview: boolean;
  maxPreviewFiles: number;
  validateOnChange: boolean;
  debounceMs: number;
}

export interface AutocompleteSuggestion {
  token: string;
  display: string;
  description: string;
  insertText: string;
  score: number;
  category: string;
}

export interface BatchRenameConfig {
  template: string;
  options: RenameOptions;
  validateBefore: boolean;
  stopOnError: boolean;
  dryRun: boolean;
  logResults: boolean;
}

export interface BatchRenameResult {
  totalFiles: number;
  successCount: number;
  failureCount: number;
  results: Map<string, RenameResult>;
  conflicts: RenameConflict[];
  duration: number;
  errors: string[];
  warnings: string[];
}

export interface RenameConflict {
  originalFiles: string[];
  newFilename: string;
  conflictType: 'duplicate' | 'existing';
  resolution?: 'suffix' | 'skip' | 'overwrite';
  resolvedFilename?: string;
}

export interface TemplateExport {
  version: string;
  exportDate: Date;
  templates: TemplatePreset[];
  metadata?: {
    appVersion?: string;
    totalPresets: number;
    categories: string[];
  };
}

export interface TemplateImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  duplicates: number;
  errors: string[];
  importedPresets: TemplatePreset[];
}

export interface TemplateResolver {
  resolve: (token: string, context: ResolverContext) => string | null;
  canResolve: (token: string) => boolean;
  priority: number;
}

export interface ResolverContext {
  exifData?: any;
  file?: File;
  counter?: number;
  customValues?: Record<string, string>;
  options?: RenameOptions;
}

export type TemplateTransform = (
  template: string,
  context: ResolverContext
) => string;

export type TemplateFilter = (
  preset: TemplatePreset,
  query: string
) => boolean;

export interface TemplateSortCriteria {
  field: keyof TemplatePreset;
  direction: 'asc' | 'desc';
}

export interface TemplatePreviewConfig {
  maxFiles: number;
  showOriginal: boolean;
  showMetadata: boolean;
  highlightChanges: boolean;
  groupByStatus: boolean;
}

export interface TemplatePreviewResult {
  original: string;
  renamed: string;
  status: 'success' | 'warning' | 'error';
  warnings?: string[];
  errors?: string[];
  metadata?: {
    tokensUsed: string[];
    length: number;
    hasConflict: boolean;
  };
}

export interface TemplateVersion {
  major: number;
  minor: number;
  patch: number;
  format: string;
}

export type ValidTemplateString = string;

export type ValidTokenString = `{${TemplateTokenType}}` | `{counter:${number}}`;

export type TemplateVariableMap = Record<string, string | number | Date | null>;

export interface TokenSpecificOptions {
  date?: {
    format?: string;
    locale?: string;
    timezone?: string;
  };
  counter?: {
    start?: number;
    padding?: number;
    prefix?: string;
    suffix?: string;
  };
  gps?: {
    format?: 'decimal' | 'dms';
    precision?: number;
  };
}

export interface TemplateConfig {
  template: string;
  renameOptions: RenameOptions;
  tokenOptions: TokenSpecificOptions;
  validation: TemplateValidation;
}

export interface TemplateExecutionContext {
  template: string;
  files: File[];
  exifDataMap: Map<string, any>;
  options: RenameOptions;
  startTime: Date;
}

export interface TemplateExecutionResult {
  context: TemplateExecutionContext;
  results: Map<File, RenameResult>;
  summary: {
    totalFiles: number;
    successful: number;
    failed: number;
    warnings: number;
    duration: number;
  };
  endTime: Date;
}
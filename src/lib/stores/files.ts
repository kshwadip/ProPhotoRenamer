import { writable, derived, get, type Writable } from 'svelte/store';
import type { Photo, PhotoBatch, PhotoFilter, PhotoSort, PhotoStats } from '../types/photo';
import type { ValidationResult } from '../utils/validators';
import type { ExifData } from '../types/exif';
import type { RenameResult } from '../types/template';

interface FilesState {
  photos: Photo[];
  selectedIds: Set<string>;
  currentBatch: PhotoBatch | null;
  isProcessing: boolean;
  filter: PhotoFilter | null;
  sortBy: PhotoSort | null;
}

const initialState: FilesState = {
  photos: [],
  selectedIds: new Set(),
  currentBatch: null,
  isProcessing: false,
  filter: null,
  sortBy: null
};

function createFilesStore() {
  const { subscribe, set, update }: Writable<FilesState> = writable(initialState);

  return {
    subscribe,

    
    addFiles: (files: File[]) => {
      update(state => {
        const newPhotos: Photo[] = files.map((file, index) => ({
          id: generateId(),
          file,
          metadata: {
            fileName: file.name,
            originalFileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            lastModified: new Date(file.lastModified),
            exif: null,
            hasExif: false,
            hasGPS: false,
            uploadedAt: new Date()
          },
          status: 'pending',
          validation: null,
          isValid: false,
          renameResult: null,
          warnings: [],
          selected: false,
          index: state.photos.length + index
        }));

        return {
          ...state,
          photos: [...state.photos, ...newPhotos]
        };
      });
    },

    
    removePhoto: (id: string) => {
      update(state => {
        const photos = state.photos.filter(p => p.id !== id);
        const selectedIds = new Set(state.selectedIds);
        selectedIds.delete(id);

        return {
          ...state,
          photos,
          selectedIds
        };
      });
    },

    
    removePhotos: (ids: string[]) => {
      update(state => {
        const idSet = new Set(ids);
        const photos = state.photos.filter(p => !idSet.has(p.id));
        const selectedIds = new Set(
          Array.from(state.selectedIds).filter(id => !idSet.has(id))
        );

        return {
          ...state,
          photos,
          selectedIds
        };
      });
    },
    
    clear: () => {
      set(initialState);
    },

    
    updatePhoto: (id: string, updates: Partial<Photo>) => {
      update(state => ({
        ...state,
        photos: state.photos.map(photo =>
          photo.id === id ? { ...photo, ...updates } : photo
        )
      }));
    },

    
    updatePhotos: (updates: Map<string, Partial<Photo>>) => {
      update(state => ({
        ...state,
        photos: state.photos.map(photo => {
          const photoUpdates = updates.get(photo.id);
          return photoUpdates ? { ...photo, ...photoUpdates } : photo;
        })
      }));
    },

    
    setValidation: (id: string, validation: ValidationResult) => {
      update(state => ({
        ...state,
        photos: state.photos.map(photo =>
          photo.id === id
            ? {
                ...photo,
                validation,
                isValid: validation.valid,
                status: validation.valid ? 'ready' : 'error',
                warnings: validation.warnings || []
              }
            : photo
        )
      }));
    },
    
    setExifData: (id: string, exifData: ExifData | null) => {
      update(state => ({
        ...state,
        photos: state.photos.map(photo => {
          if (photo.id === id) {
            const hasExif = exifData !== null;
            const hasGPS = exifData?.gps !== null && exifData?.gps !== undefined;

            return {
              ...photo,
              metadata: {
                ...photo.metadata,
                exif: exifData,
                hasExif,
                hasGPS,
                dateTaken: exifData?.dateTaken || undefined,
                cameraMake: exifData?.make || undefined,
                cameraModel: exifData?.model || undefined,
                lensModel: exifData?.lensModel || undefined,
                iso: exifData?.iso || undefined,
                aperture: exifData?.fNumber || undefined,
                shutterSpeed: exifData?.exposureTime || undefined,
                focalLength: exifData?.focalLength || undefined,
                latitude: exifData?.gps?.lat || undefined,
                longitude: exifData?.gps?.lng || undefined,
                altitude: exifData?.gps?.altitude || undefined,
                width: exifData?.width || undefined,
                height: exifData?.height || undefined
              }
            };
          }
          return photo;
        })
      }));
    },

    setBatchRenameResults: (results: Map<string, RenameResult>) => {
      update(state => ({
        ...state,
        photos: state.photos.map(photo => {
          const result = results.get(photo.id);
          if (result) {
            return {
              ...photo,
              renameResult: result,
              newFileName: result.filename,
              status: 'complete',
              warnings: [...photo.warnings, ...(result.warnings || [])]
            };
          }
          return photo;
        })
      }));
    },

    
    toggleSelection: (id: string) => {
      update(state => {
        const selectedIds = new Set(state.selectedIds);
        const photos = state.photos.map(photo => {
          if (photo.id === id) {
            const selected = !photo.selected;
            if (selected) {
              selectedIds.add(id);
            } else {
              selectedIds.delete(id);
            }
            return { ...photo, selected };
          }
          return photo;
        });

        return { ...state, photos, selectedIds };
      });
    },

    
    selectAll: () => {
      update(state => {
        const selectedIds = new Set(state.photos.map(p => p.id));
        const photos = state.photos.map(photo => ({ ...photo, selected: true }));

        return { ...state, photos, selectedIds };
      });
    },

    
    deselectAll: () => {
      update(state => ({
        ...state,
        photos: state.photos.map(photo => ({ ...photo, selected: false })),
        selectedIds: new Set()
      }));
    },

    
    selectByFilter: (filter: PhotoFilter) => {
      update(state => {
        const selectedIds = new Set<string>();
        const photos = state.photos.map(photo => {
          const matches = matchesFilter(photo, filter);
          if (matches) {
            selectedIds.add(photo.id);
          }
          return { ...photo, selected: matches };
        });

        return { ...state, photos, selectedIds };
      });
    },

    
    setFilter: (filter: PhotoFilter | null) => {
      update(state => ({ ...state, filter }));
    },

    
    setSortBy: (sortBy: PhotoSort | null) => {
      update(state => {
        if (!sortBy) {
          return { ...state, sortBy: null };
        }

        const photos = [...state.photos].sort((a, b) => {
          const aVal = getPhotoValue(a, sortBy.field);
          const bVal = getPhotoValue(b, sortBy.field);

          if (aVal === null || aVal === undefined) return 1;
          if (bVal === null || bVal === undefined) return -1;

          const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
          return sortBy.direction === 'asc' ? comparison : -comparison;
        });

        return { ...state, photos, sortBy };
      });
    },

    
    setProcessing: (isProcessing: boolean) => {
      update(state => ({ ...state, isProcessing }));
    },

    
    createBatch: (template?: string) => {
      update(state => {
        const batch: PhotoBatch = {
          id: generateId(),
          photos: state.photos,
          totalCount: state.photos.length,
          processedCount: 0,
          validCount: 0,
          invalidCount: 0,
          status: 'idle',
          startedAt: new Date(),
          template
        };

        return { ...state, currentBatch: batch };
      });
    },

    
    updateBatchProgress: (processedCount: number, validCount: number, invalidCount: number) => {
      update(state => {
        if (!state.currentBatch) return state;

        return {
          ...state,
          currentBatch: {
            ...state.currentBatch,
            processedCount,
            validCount,
            invalidCount,
            status: 'processing'
          }
        };
      });
    },

    
    completeBatch: () => {
      update(state => {
        if (!state.currentBatch) return state;

        return {
          ...state,
          currentBatch: {
            ...state.currentBatch,
            status: 'complete',
            completedAt: new Date()
          },
          isProcessing: false
        };
      });
    },

    
    getPhoto: (id: string): Photo | undefined => {
      return get({ subscribe }).photos.find(p => p.id === id);
    },

    
    getSelected: (): Photo[] => {
      const state = get({ subscribe });
      return state.photos.filter(p => state.selectedIds.has(p.id));
    },

    setRenameResult: (id: string, result: { success: boolean; originalName: string; newName: string; warnings: string[] }) => {
      update(state => ({
        ...state,
        photos: state.photos.map(photo => {
          if (photo.id === id) {
            return {
              ...photo,
              newFileName: result.newName,
              warnings: result.warnings
            };
          }
          return photo;
        })
      }));
    },

    clearWarnings: (id: string) => {
      update(state => ({
        ...state,
        photos: state.photos.map(photo => {
          if (photo.id === id) {
            return {
              ...photo,
              warnings: []
            };
          }
          return photo;
        })
      }));
    },
    
    getFiltered: (): Photo[] => {
      const state = get({ subscribe });
      if (!state.filter) return state.photos;
      return state.photos.filter(photo => matchesFilter(photo, state.filter!));
    }
  };
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function matchesFilter(photo: Photo, filter: PhotoFilter): boolean {
  if (filter.status && !filter.status.includes(photo.status)) {
    return false;
  }

  if (filter.hasExif !== undefined && photo.metadata.hasExif !== filter.hasExif) {
    return false;
  }

  if (filter.hasGPS !== undefined && photo.metadata.hasGPS !== filter.hasGPS) {
    return false;
  }

  if (filter.cameraMake && photo.metadata.cameraMake) {
    if (!filter.cameraMake.includes(photo.metadata.cameraMake)) {
      return false;
    }
  }

  if (filter.cameraModel && photo.metadata.cameraModel) {
    if (!filter.cameraModel.includes(photo.metadata.cameraModel)) {
      return false;
    }
  }

  if (filter.dateRange && photo.metadata.dateTaken) {
    const date = photo.metadata.dateTaken;
    if (date < filter.dateRange.start || date > filter.dateRange.end) {
      return false;
    }
  }

  if (filter.sizeRange) {
    const size = photo.metadata.fileSize;
    if (size < filter.sizeRange.min || size > filter.sizeRange.max) {
      return false;
    }
  }

  return true;
}

function getPhotoValue(photo: Photo, field: string): any {
  if (field === 'fileName') return photo.metadata.fileName;
  if (field === 'fileSize') return photo.metadata.fileSize;
  if (field === 'dateTaken') return photo.metadata.dateTaken?.getTime() || 0;
  
  return (photo.metadata as any)[field];
}

export const filesStore = createFilesStore();

export const totalFiles = derived(
  filesStore,
  $files => $files.photos.length
);

export const selectedCount = derived(
  filesStore,
  $files => $files.selectedIds.size
);

export const validFiles = derived(
  filesStore,
  $files => $files.photos.filter(p => p.isValid)
);

export const invalidFiles = derived(
  filesStore,
  $files => $files.photos.filter(p => !p.isValid && p.validation !== null)
);

export const filesWithExif = derived(
  filesStore,
  $files => $files.photos.filter(p => p.metadata.hasExif)
);

export const filesWithGPS = derived(
  filesStore,
  $files => $files.photos.filter(p => p.metadata.hasGPS)
);

export const processingProgress = derived(
  filesStore,
  $files => {
    if (!$files.currentBatch) return 0;
    return ($files.currentBatch.processedCount / $files.currentBatch.totalCount) * 100;
  }
);

export const fileStats = derived(
  filesStore,
  $files => {
    const photos = $files.photos;
    
    const stats: PhotoStats = {
      totalFiles: photos.length,
      totalSize: photos.reduce((sum, p) => sum + p.metadata.fileSize, 0),
      averageSize: photos.length > 0 
        ? photos.reduce((sum, p) => sum + p.metadata.fileSize, 0) / photos.length 
        : 0,
      
      withExif: photos.filter(p => p.metadata.hasExif).length,
      withoutExif: photos.filter(p => !p.metadata.hasExif).length,
      
      withGPS: photos.filter(p => p.metadata.hasGPS).length,
      withoutGPS: photos.filter(p => !p.metadata.hasGPS).length,
      
      validFiles: photos.filter(p => p.isValid).length,
      invalidFiles: photos.filter(p => !p.isValid && p.validation !== null).length,
      
      cameraMakes: new Map(),
      cameraModels: new Map(),
      fileTypes: new Map()
    };

    
    photos.forEach(p => {
      if (p.metadata.cameraMake) {
        const count = stats.cameraMakes.get(p.metadata.cameraMake) || 0;
        stats.cameraMakes.set(p.metadata.cameraMake, count + 1);
      }
      
      if (p.metadata.cameraModel) {
        const count = stats.cameraModels.get(p.metadata.cameraModel) || 0;
        stats.cameraModels.set(p.metadata.cameraModel, count + 1);
      }

      const count = stats.fileTypes.get(p.metadata.fileType) || 0;
      stats.fileTypes.set(p.metadata.fileType, count + 1);
    });

    
    const datesWithExif = photos
      .map(p => p.metadata.dateTaken)
      .filter((d): d is Date => d !== undefined)
      .sort((a, b) => a.getTime() - b.getTime());

    if (datesWithExif.length > 0) {
      stats.dateRange = {
        earliest: datesWithExif[0],
        latest: datesWithExif[datesWithExif.length - 1]
      };
    }

    return stats;
  }
);

export const selectAll = () => filesStore.selectAll();
export const deselectAll = () => filesStore.deselectAll();
export const filteredPhotos = derived(filesStore, $files => filesStore.getFiltered());
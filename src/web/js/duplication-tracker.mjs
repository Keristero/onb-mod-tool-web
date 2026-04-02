/**
 * DuplicationTracker
 * Tracks file duplication across multiple mod packages
 */

export class DuplicationTracker {
  constructor() {
    // Map: fileHash (string) → FileInfo object
    this.fileRegistry = new Map();
    
    // Cached metrics to avoid recalculation
    this.metricsCache = {
      totalDuplicatedBytes: 0,
      potentialSavings: 0,
      lastUpdated: null
    };
  }

  /**
   * Register a file from a mod
   * @param {string} modId - Unique mod identifier
   * @param {string} modName - Mod filename
   * @param {string} filePath - Path within the mod zip
   * @param {string} hash - SHA-256 hash of file content
   * @param {number} size - File size in bytes
   * @param {Date|null} modDate - Mod creation date (from entry.lua)
   * @param {Date|null} fileDate - Individual file date (from zip entry)
   */
  registerFile(modId, modName, filePath, hash, size, modDate = null, fileDate = null) {
    if (!hash || typeof hash !== 'string') {
      throw new Error('Invalid hash provided');
    }

    // Validate dates (must be after 2018 and not in the future)
    const minValidDate = new Date('2018-01-01');
    const maxValidDate = new Date();
    const isValidModDate = modDate instanceof Date && 
                           modDate > minValidDate && 
                           modDate <= maxValidDate;
    const isValidFileDate = fileDate instanceof Date && 
                            fileDate > minValidDate && 
                            fileDate <= maxValidDate;

    const location = { 
      modId, 
      modName, 
      filePath,
      modDate: isValidModDate ? modDate : null,
      fileDate: isValidFileDate ? fileDate : null
    };

    if (this.fileRegistry.has(hash)) {
      // File already seen - add location if not duplicate
      const fileInfo = this.fileRegistry.get(hash);
      
      // Check if this exact location already exists
      const isDuplicate = fileInfo.locations.some(
        loc => loc.modId === modId && loc.filePath === filePath
      );
      
      if (!isDuplicate) {
        fileInfo.locations.push(location);
      }
    } else {
      // First occurrence of this file
      this.fileRegistry.set(hash, {
        hash,
        size,
        locations: [location],
        content: null  // Will be populated on-demand for preview
      });
    }

    // Invalidate cache
    this.metricsCache.lastUpdated = null;
  }

  /**
   * Remove all files from a specific mod
   * @param {string} modId - Mod identifier to remove
   */
  unregisterMod(modId) {
    const hashesToDelete = [];

    for (const [hash, fileInfo] of this.fileRegistry.entries()) {
      // Remove locations matching this modId
      fileInfo.locations = fileInfo.locations.filter(
        loc => loc.modId !== modId
      );

      // If no locations remain, mark for deletion
      if (fileInfo.locations.length === 0) {
        hashesToDelete.push(hash);
      }
    }

    // Delete entries with no locations
    for (const hash of hashesToDelete) {
      this.fileRegistry.delete(hash);
    }

    // Invalidate cache
    this.metricsCache.lastUpdated = null;
  }

  /**
   * Get storage and duplication metrics
   * @returns {Object} Metrics object
   */
  getMetrics() {
    // Return cached metrics if available
    if (this.metricsCache.lastUpdated) {
      return { ...this.metricsCache };
    }

    let totalDuplicatedBytes = 0;
    let potentialSavings = 0;
    let uniqueFiles = 0;
    let duplicatedFiles = 0;

    for (const fileInfo of this.fileRegistry.values()) {
      const count = fileInfo.locations.length;
      uniqueFiles++;

      // Only count as duplicated if it appears in 2 or more locations
      if (count >= 2) {
        duplicatedFiles++;
        // Total duplicated bytes includes all occurrences
        totalDuplicatedBytes += fileInfo.size * count;
        // Potential savings: keep one, remove the rest
        potentialSavings += fileInfo.size * (count - 1);
      }
    }

    const duplicationRate = uniqueFiles > 0 
      ? (duplicatedFiles / uniqueFiles) * 100 
      : 0;

    // Update cache
    this.metricsCache = {
      totalDuplicatedBytes,
      potentialSavings,
      uniqueFiles,
      duplicatedFiles,
      duplicationRate,
      lastUpdated: Date.now()
    };

    return { ...this.metricsCache };
  }

  /**
   * Get all duplicated files (files appearing in multiple locations)
   * @param {string} sortBy - Sort criteria: 'count', 'size', or 'impact'
   * @returns {Array} Array of FileInfo objects sorted by criteria
   */
  getDuplicatedFiles(sortBy = 'impact', direction = 'desc') {
    // Filter to only duplicated files (2 or more occurrences)
    const duplicates = Array.from(this.fileRegistry.values())
      .filter(fileInfo => fileInfo.locations.length >= 2);

    // Sort by specified criteria
    duplicates.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'count':
          comparison = b.locations.length - a.locations.length;
          break;
        case 'size':
          comparison = b.size - a.size;
          break;
        case 'impact':
        default:
          // Impact = count × size (total bytes consumed)
          const impactA = a.locations.length * a.size;
          const impactB = b.locations.length * b.size;
          comparison = impactB - impactA;
          break;
      }
      
      // Reverse comparison for ascending order
      return direction === 'asc' ? -comparison : comparison;
    });

    return duplicates;
  }

  /**
   * Get details for a specific file by hash
   * @param {string} hash - File hash to look up
   * @returns {Object|null} FileInfo object or null if not found
   */
  getFileDetails(hash) {
    return this.fileRegistry.get(hash) || null;
  }

  /**
   * Clear all tracked data
   */
  reset() {
    this.fileRegistry.clear();
    this.metricsCache = {
      totalDuplicatedBytes: 0,
      potentialSavings: 0,
      lastUpdated: null
    };
  }

  /**
   * Get total number of tracked files
   * @returns {number}
   */
  getTotalFiles() {
    return this.fileRegistry.size;
  }

  /**
   * Get all files with metadata for analysis (including size, extension, mod info)
   * Returns a flat array where each file location is represented as a separate entry
   * @returns {Array<{hash: string, size: number, path: string, modId: string, modName: string, extension: string}>}
   */
  getFilesWithMetadata() {
    const files = [];
    
    for (const fileInfo of this.fileRegistry.values()) {
      fileInfo.locations.forEach(location => {
        // Extract extension from file path
        const pathParts = location.filePath.split('.');
        const extension = pathParts.length > 1 ? pathParts.pop().toLowerCase() : '';
        
        files.push({
          hash: fileInfo.hash,
          size: fileInfo.size,
          path: location.filePath,
          modId: location.modId,
          modName: location.modName,
          extension: extension
        });
      });
    }
    
    return files;
  }
}

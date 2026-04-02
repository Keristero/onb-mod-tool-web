/**
 * Hash Utilities
 * Provides file hashing functionality using Web Crypto API
 */

/**
 * Compute SHA-256 hash of file data
 * @param {Uint8Array} data - Binary file data
 * @returns {Promise<string>} Lowercase hexadecimal hash (64 characters)
 * @throws {Error} If data is invalid or Web Crypto API not available
 */
export async function computeHash(data) {
  if (!data || !(data instanceof Uint8Array)) {
    throw new Error('Invalid input: data must be a Uint8Array');
  }

  if (!crypto?.subtle?.digest) {
    throw new Error('Web Crypto API not available');
  }

  try {
    // Compute SHA-256 hash
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    
    // Convert buffer to hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');
    
    return hashHex;
  } catch (error) {
    throw new Error(`Hash computation failed: ${error.message}`);
  }
}

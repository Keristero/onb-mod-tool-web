# Capability: File Hash Computation

## Overview

This capability enables computing cryptographic hashes (SHA-256) for file contents extracted from mod zip archives. Hashing is essential for identifying duplicate files across different mods with high confidence (no collisions).

## ADDED Requirements

### Requirement: Compute SHA-256 hash for file content

The system shall compute a SHA-256 cryptographic hash for any file content provided as a Uint8Array or ArrayBuffer.

**Priority**: P0 (blocking)  
**Dependencies**: Web Crypto API (browser standard)

#### Scenario: Hash a text file

**Given** a Uint8Array containing UTF-8 encoded text "Hello, World!"  
**When** computeHash() is called with the array buffer  
**Then** it returns the SHA-256 hash as a 64-character lowercase hexadecimal string  
**And** the hash matches the expected value "dffd6021bb2bd5b0af676290809ec3a53191dd81c7f70a4b28688a362182986f"

#### Scenario: Hash a binary file

**Given** a Uint8Array containing arbitrary binary data (e.g., PNG image bytes)  
**When** computeHash() is called with the array buffer  
**Then** it returns a 64-character lowercase hexadecimal string  
**And** hashing the same data again produces the identical hash (deterministic)

#### Scenario: Hash an empty file

**Given** a Uint8Array with length 0  
**When** computeHash() is called  
**Then** it returns the SHA-256 hash of empty input "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"

### Requirement: Hash computation uses Web Crypto API

The system shall use the browser's Web Crypto API (`crypto.subtle.digest`) for hash computation to leverage hardware acceleration and ensure security.

**Priority**: P0 (blocking)  
**Dependencies**: Modern browser with Web Crypto API support

#### Scenario: Use hardware-accelerated hashing

**Given** a Uint8Array of file data  
**When** computeHash() is invoked  
**Then** it calls `crypto.subtle.digest('SHA-256', buffer)` internally  
**And** the computation completes without fallback to software implementation

#### Scenario: Hash computation is asynchronous

**Given** any file content as Uint8Array  
**When** computeHash() is called  
**Then** it returns a Promise that resolves to the hash string  
**And** the Promise can be awaited without blocking the UI thread

### Requirement: Handle hash computation errors gracefully

The system shall catch and handle errors during hash computation without crashing the mod processing pipeline.

**Priority**: P1 (important)  
**Dependencies**: None

#### Scenario: Invalid input type

**Given** an invalid input (e.g., null or string instead of ArrayBuffer)  
**When** computeHash() is called  
**Then** it rejects the Promise with a descriptive error  
**And** the error message indicates the expected input type

#### Scenario: Browser lacks Web Crypto API

**Given** a browser environment without crypto.subtle (extremely rare)  
**When** computeHash() is invoked  
**Then** it throws a clear error indicating the missing API  
**And** the error is logged to console for debugging

## Implementation Notes

**Module Location**: `src/web/js/utils/hash-utils.mjs`

**API Surface**:
```javascript
/**
 * Compute SHA-256 hash of file content
 * @param {ArrayBuffer|Uint8Array} data - File content
 * @returns {Promise<string>} - Hex-encoded hash (64 chars)
 */
export async function computeHash(data);
```

**Performance Target**: < 5ms per KB on typical hardware (leveraging native crypto)

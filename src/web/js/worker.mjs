// Web Worker for WASM processing
// Isolates WASM execution from main thread to prevent UI blocking

let wasmInstance = null;
let wasmReady = false;
let currentVersion = null;

// Load WASM module
async function loadWasm(version = 'latest') {
    try {
        const basePath = `../versions/${version}`;
        
        // Import the compiled WASM module
        const wasmImport = await import(`${basePath}/onb_mod_file.mjs`);
        
        // Load the WASM file
        const wasmPath = `${basePath}/onb_mod_file.wasm`;
        const wasmModule = await WebAssembly.compileStreaming(fetch(wasmPath));
        
        // Instantiate using Dart's instantiate function
        wasmInstance = await wasmImport.instantiate(wasmModule, {});
        
        // Call the main function to initialize and export analyzeModFile to globalThis
        wasmImport.invoke(wasmInstance);
        
        wasmReady = true;
        currentVersion = version;
        
        return { success: true, version };
    } catch (error) {
        console.error('Failed to load WASM module:', error);
        return { 
            success: false, 
            error: error.message,
            stack: error.stack 
        };
    }
}

// Process mod file with WASM
async function processModFile(fileData, options = {}) {
    if (!wasmReady) {
        throw new Error('WASM module not loaded');
    }
    
    try {
        const startTime = performance.now();
        
        // Convert ArrayBuffer to Uint8Array
        const bytes = new Uint8Array(fileData);
        
        // Call the WASM function (exported to globalThis by Dart main)
        const resultJson = globalThis.analyzeModFile(bytes, options || null);
        
        // Parse the result
        const result = JSON.parse(resultJson);
        
        const processingTime = performance.now() - startTime;
        
        return {
            success: result.success,
            data: result.json || null,
            stdout: result.stdout || '',
            stderr: result.stderr || '',
            error: result.error || null,
            processingTime,
            version: currentVersion
        };
    } catch (error) {
        return {
            success: false,
            error: error.message,
            stack: error.stack,
            processingTime: 0
        };
    }
}

// Message handler
self.addEventListener('message', async (event) => {
    const { type, payload, id } = event.data;
    
    try {
        switch (type) {
            case 'init':
                const initResult = await loadWasm(payload.version);
                self.postMessage({ 
                    type: 'init-complete', 
                    payload: initResult, 
                    id 
                });
                break;
                
            case 'process':
                if (!wasmReady) {
                    self.postMessage({
                        type: 'error',
                        payload: { error: 'WASM module not initialized' },
                        id
                    });
                    return;
                }
                
                const result = await processModFile(
                    payload.fileData, 
                    payload.options
                );
                
                self.postMessage({
                    type: 'result',
                    payload: {
                        ...result,
                        fileName: payload.fileName,
                        fileSize: payload.fileSize
                    },
                    id
                });
                break;
                
            case 'switch-version':
                wasmReady = false;
                wasmModule = null;
                const switchResult = await loadWasm(payload.version);
                self.postMessage({
                    type: 'version-switched',
                    payload: switchResult,
                    id
                });
                break;
                
            default:
                self.postMessage({
                    type: 'error',
                    payload: { error: `Unknown message type: ${type}` },
                    id
                });
        }
    } catch (error) {
        self.postMessage({
            type: 'error',
            payload: { 
                error: error.message,
                stack: error.stack
            },
            id
        });
    }
});

// Signal ready
self.postMessage({ type: 'worker-ready' });

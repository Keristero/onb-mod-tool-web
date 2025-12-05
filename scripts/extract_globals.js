#!/usr/bin/env node

/**
 * extract_globals.js
 * 
 * Extracts Lua global definitions from DartLangModTool source files.
 * Parses Dart files to discover ONB-specific Lua APIs by analyzing:
 * - defGlobal calls (global functions, tables, variables)
 * - Enum definitions and const lists
 * - Object methods from useXxxPackage/useXxxEntity functions
 * 
 * Usage:
 *   node extract_globals.js --source=<lua_dir> --output=<metadata.json>
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// Configuration & State
// ============================================================================

const parseArgs = (argv) => 
  argv.slice(2).reduce((acc, arg) => {
    const [key, value] = arg.split('=');
    acc[key.replace('--', '')] = value;
    return acc;
  }, {});

const config = (() => {
  const args = parseArgs(process.argv);
  return {
    sourceDir: args.source || 'src/DartLangModTool-master/lib/src/lua',
    outputPath: args.output || 'src/web/versions/latest/metadata.json'
  };
})();

const createGlobalsCollector = () => ({
  functions: new Set(),
  tables: new Map(),
  variables: new Set(),
  enumCache: new Map(),
  objectMethods: new Map() // Maps object type (e.g., 'Card', 'Player') to Set of method names
});

// ============================================================================
// Pattern Matching Utilities
// ============================================================================

const patterns = {
  enum: /enum\s+([A-Z][a-zA-Z0-9_]*)\s*\{([^}]+)\}/gs,
  enumValue: /\w+\s*\(\s*'([^']+)'\s*\)/g,
  constList: /const\s+([a-zA-Z][a-zA-Z0-9_]*)\s*=\s*\[([^\]]+)\]/gs,
  stringLiteral: /'([^']+)'/g,
  defGlobal: /defGlobal\s*\(\s*([^)]+)\s*\)/g,
  luaObjectName: /LuaObject\.(func|table|variable|noSemantics)\s*\(\s*'([^']+)'/,
  luaFuncBuilder: /LuaFuncBuilder\s*\.create\s*\(\s*'([^']+)'/,
  enumIteration: /for\s*\(\s*final\s+\w+\s+in\s+([A-Z][a-zA-Z0-9_]*)\s*\.\s*values\s*\)/g,
  varReference: /^[a-zA-Z_][a-zA-Z0-9_]*$/,
  // Matches: for(int i = 0; i < listName.length; i++)
  listIteration: /for\s*\(\s*\w+\s+\w+\s*=\s*\d+\s*;\s*\w+\s*<\s*([a-zA-Z][a-zA-Z0-9_]*)\s*\.\s*length/g,
  // Matches: Map useSomethingPackage() => { or Map useSomethingEntity() => {
  objectMethods: /Map\s+(use\w+(?:Package|Entity))\s*\(\s*\)\s*=>\s*\{/g
};

const extractMatches = (pattern, text, transform = (match) => match[1]) => {
  const matches = [];
  let match;
  while ((match = pattern.exec(text)) !== null) {
    matches.push(transform(match));
  }
  return matches;
};

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ============================================================================
// Enum & Constant Extraction
// ============================================================================

const extractEnumValues = (enumBody) =>
  extractMatches(patterns.enumValue, enumBody);

const extractStringLiterals = (listBody) =>
  extractMatches(patterns.stringLiteral, listBody);

const extractEnums = (content, collector) => {
  const enums = extractMatches(
    patterns.enum,
    content,
    (match) => ({
      name: match[1],
      values: extractEnumValues(match[2])
    })
  );

  enums
    .filter(({ values }) => values.length > 0)
    .forEach(({ name, values }) => {
      collector.enumCache.set(name, values);
      console.log(`  Found enum: ${name} with ${values.length} values`);
    });
};

const extractConstLists = (content, collector) => {
  const lists = extractMatches(
    patterns.constList,
    content,
    (match) => ({
      name: match[1],
      values: extractStringLiterals(match[2])
    })
  );

  lists
    .filter(({ values }) => values.length > 0)
    .forEach(({ name, values }) => {
      collector.enumCache.set(name, values);
      console.log(`  Found const list: ${name} with ${values.length} values`);
    });
};

// ============================================================================
// Table Field Extraction
// ============================================================================

const findMatchingBrace = (content, startPos) => {
  let depth = 0;
  let foundStart = false;
  
  for (let i = startPos; i < content.length; i++) {
    if (content[i] === '{') {
      depth++;
      foundStart = true;
    } else if (content[i] === '}') {
      depth--;
      if (foundStart && depth === 0) {
        return i;
      }
    }
  }
  return -1;
};

const extractMapContent = (content, startPos) => {
  const openBrace = content.indexOf('{', startPos);
  if (openBrace === -1) return '';
  
  const closeBrace = findMatchingBrace(content, openBrace);
  if (closeBrace === -1) return '';
  
  return content.slice(openBrace + 1, closeBrace);
};

const isEnumTableDefinition = (mapContent) => {
  // Enum tables use for-loops to iterate over lists/enums
  if (mapContent.includes('for(')) {
    return true;
  }
  
  // Enum tables can also use literal syntax with number indices
  // e.g., {'Standard': 0, 'Mega': 1, 'Giga': 2}
  // Object tables use LuaObject or complex values
  // e.g., {'new': LuaFuncBuilder.create(...), 'r': property}
  const hasLuaObjectValues = mapContent.includes('LuaObject') || 
                              mapContent.includes('LuaFuncBuilder');
  
  return !hasLuaObjectValues;
};

const extractEnumNameFromTableDef = (mapContent, collector) => {
  // Try to find enum iteration: for(final x in EnumName.values)
  const enumMatches = extractMatches(patterns.enumIteration, mapContent);
  for (const name of enumMatches) {
    const values = collector.enumCache.get(name);
    if (values) return values;
  }
  
  // Try to find list iteration: for(int i = 0; i < listName.length; i++)
  const listMatches = extractMatches(patterns.listIteration, mapContent);
  for (const name of listMatches) {
    const values = collector.enumCache.get(name);
    if (values) return values;
  }
  
  return null;
};

const extractLiteralMapKeys = (mapContent) => {
  // For literal map syntax like {'Key1': 0, 'Key2': 1}
  // Extract just the keys (before the colon)
  const keyPattern = /'([^']+)'\s*:/g;
  return extractMatches(keyPattern, mapContent);
};

const extractTableFields = (content, startPos, collector) => {
  const mapContent = extractMapContent(content, startPos);
  if (!mapContent) return { fields: [], isObjectTable: false };
  
  // Only extract fields if this is an enum table
  // Object tables (with methods/properties) should not have fields extracted
  const isEnum = isEnumTableDefinition(mapContent);
  
  if (!isEnum) {
    return { fields: [], isObjectTable: true };
  }
  
  // Try to resolve the enum/list being iterated
  const enumValues = extractEnumNameFromTableDef(mapContent, collector);
  if (enumValues) {
    return { fields: enumValues, isObjectTable: false };
  }
  
  // Extract keys from literal map syntax (for enums defined without loops)
  const literalKeys = extractLiteralMapKeys(mapContent);
  if (literalKeys.length > 0) {
    return { fields: literalKeys, isObjectTable: false };
  }
  
  // Fallback: extract string literals (for edge cases)
  return { fields: extractMatches(patterns.stringLiteral, mapContent), isObjectTable: false };
};

const resolveEnumValues = (content, collector) => {
  const enumNames = extractMatches(patterns.enumIteration, content);
  
  for (const name of enumNames) {
    const values = collector.enumCache.get(name);
    if (values) return values;
  }
  
  return null;
};

const extractObjectMethods = (content, functionName) => {
  // Find the function definition - need to match balanced braces
  const functionStart = content.indexOf(`Map ${functionName}() => {`);
  if (functionStart === -1) return [];
  
  // Find matching closing brace by counting brace depth
  let braceCount = 0;
  let pos = functionStart;
  let inString = false;
  let stringChar = '';
  
  while (pos < content.length) {
    const char = content[pos];
    
    // Handle string literals to avoid counting braces inside strings
    if ((char === '"' || char === "'") && (pos === 0 || content[pos - 1] !== '\\')) {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
      }
    }
    
    if (!inString) {
      if (char === '{') braceCount++;
      if (char === '}') {
        braceCount--;
        if (braceCount === 0) {
          break;
        }
      }
    }
    
    pos++;
  }
  
  if (braceCount !== 0) return []; // Unbalanced braces
  
  const mapContent = content.substring(functionStart, pos + 1);
  
  // Extract method names from map entries like: 'method_name': or "method_name":
  const methodPattern = /['"]([^'"]+)['"]\s*:/g;
  return extractMatches(methodPattern, mapContent);
};

// ============================================================================
// Lua Object Handlers
// ============================================================================

const createLuaObjectHandlers = (collector) => ({
  func: (name) => {
    if (!collector.functions.has(name)) {
      collector.functions.add(name);
      console.log(`  Found function: ${name}`);
    }
  },
  
  table: (name, fields = []) => {
    if (!collector.tables.has(name)) {
      collector.tables.set(name, fields);
      console.log(`  Found table: ${name} with ${fields.length} fields`);
    } else {
      console.log(`  Warning: Duplicate table definition for ${name}, keeping first one`);
    }
  },
  
  variable: (name) => {
    if (!collector.variables.has(name)) {
      collector.variables.add(name);
      console.log(`  Found variable: ${name}`);
    }
  },
  
  noSemantics: (name) => {
    if (!collector.tables.has(name)) {
      collector.tables.set(name, []);
      console.log(`  Found no-semantics table: ${name}`);
    }
  }
});

// ============================================================================
// DefGlobal Processing
// ============================================================================

const processInlineDefGlobal = (arg, content, pos, collector, handlers) => {
  const match = arg.match(patterns.luaObjectName);
  if (!match) return false;
  
  const [, type, name] = match;
  
  if (type === 'func') {
    handlers.func(name);
  } else if (type === 'variable') {
    handlers.variable(name);
  } else if (type === 'noSemantics') {
    handlers.noSemantics(name);
  } else if (type === 'table') {
    const tableDefStart = content.indexOf('LuaObject.table', pos);
    const result = extractTableFields(content, tableDefStart, collector);
    let fields = result.fields;
    
    // Only fall back to enum resolution if it's not an object table
    if (fields.length === 0 && !result.isObjectTable) {
      const contextWindow = content.slice(Math.max(0, pos - 300), pos + 300);
      fields = resolveEnumValues(contextWindow, collector) || [];
    }
    
    handlers.table(name, fields);
  }
  
  return true;
};

const processFuncBuilder = (content, pos, handlers) => {
  const contextWindow = content.slice(Math.max(0, pos - 200), pos + 200);
  const match = contextWindow.match(patterns.luaFuncBuilder);
  
  if (match) {
    handlers.func(match[1]);
    return true;
  }
  
  return false;
};

const processVariableReference = (varRef, content, pos, collector, handlers) => {
  if (!patterns.varReference.test(varRef)) return false;
  
  // Increased from 1000 to 5000 to handle large table definitions like Engine
  const precedingContent = content.slice(Math.max(0, pos - 5000), pos);
  const varDefPattern = new RegExp(
    `final\\s+${varRef}\\s*=\\s*LuaObject\\.(table|func|variable|noSemantics)\\s*\\(\\s*'([^']+)'`,
    'g'
  );
  
  // Find ALL matches and use the last one (closest to defGlobal call)
  let match;
  let lastMatch = null;
  while ((match = varDefPattern.exec(precedingContent)) !== null) {
    lastMatch = match;
  }
  
  if (!lastMatch) return false;
  
  const [, type, name] = lastMatch;
  
  if (type === 'func') {
    handlers.func(name);
  } else if (type === 'variable') {
    handlers.variable(name);
  } else if (type === 'noSemantics') {
    // noSemantics tables should never have fields
    handlers.noSemantics(name);
  } else if (type === 'table') {
    let fields = [];
    
    // Find LuaObject.table('Name') position after the variable declaration
    // We need to match the specific table name to avoid matching nested tables
    const searchStart = lastMatch.index;
    const tablePattern = new RegExp(`LuaObject\\.table\\s*\\(\\s*'${escapeRegex(name)}'`, 'g');
    tablePattern.lastIndex = searchStart;
    const tableMatch = tablePattern.exec(precedingContent);
    
    if (!tableMatch) {
      // Fallback: couldn't find the specific LuaObject.table call
      handlers.table(name, []);
      return true;
    }
    
    const result = extractTableFields(precedingContent, tableMatch.index, collector);
    fields = result.fields;
    
    // Only fall back to enum resolution if it's not an object table
    if (fields.length === 0 && !result.isObjectTable) {
      fields = resolveEnumValues(precedingContent, collector) || [];
    }
    
    handlers.table(name, fields);
  }
  
  return true;
};

const processDefGlobal = (match, content, collector, handlers) => {
  const arg = match[1].trim();
  const pos = match.index;
  
  // Try inline LuaObject patterns
  if (processInlineDefGlobal(arg, content, pos, collector, handlers)) return;
  
  // Try LuaFuncBuilder pattern
  if (processFuncBuilder(content, pos, handlers)) return;
  
  // Try variable reference pattern
  processVariableReference(arg, content, pos, collector, handlers);
};

// ============================================================================
// Special Cases
// ============================================================================

const handleSpecialCases = (content, collector, handlers) => {
  // No special cases needed - all extraction is done automatically
};

// ============================================================================
// File Processing
// ============================================================================

const processFile = (filePath, collector) => {
  console.log(`Processing: ${filePath}`);
  const content = fs.readFileSync(filePath, 'utf-8');
  
  const handlers = createLuaObjectHandlers(collector);
  
  // Extract enums and constants
  extractEnums(content, collector);
  extractConstLists(content, collector);
  
  // Handle special cases
  handleSpecialCases(content, collector, handlers);
  
  // Process defGlobal calls
  extractMatches(patterns.defGlobal, content, (match) => match)
    .forEach((match) => processDefGlobal(match, content, collector, handlers));
  
  // Extract object methods from useXxxPackage/useXxxEntity functions
  const methodFunctions = extractMatches(patterns.objectMethods, content);
  methodFunctions.forEach((functionName) => {
    const methods = extractObjectMethods(content, functionName);
    if (methods.length > 0) {
      // Extract object type name from function name (e.g., useCardPackage -> Card)
      const objectType = functionName
        .replace(/^use/, '')
        .replace(/Package$/, '')
        .replace(/Entity$/, '');
      
      if (!collector.objectMethods.has(objectType)) {
        collector.objectMethods.set(objectType, new Set());
      }
      
      methods.forEach((method) => collector.objectMethods.get(objectType).add(method));
      console.log(`  Found ${methods.length} methods for ${objectType} object`);
    }
  });
}


// ============================================================================
// File System Utilities
// ============================================================================

const findDartFiles = (dir) => {
  const entries = fs.readdirSync(dir);
  
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      return findDartFiles(fullPath);
    }
    
    return entry.endsWith('.dart') ? [fullPath] : [];
  });
};

const ensureDirectory = (filePath) => {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const readJsonFile = (filePath) => {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    
    // Fix common JSON issues from Dart build (unescaped quotes in dartVersion field)
    // Replace: "dartVersion": "...text..." with quotes inside
    content = content.replace(
      /"dartVersion":\s*"([^"]|\\")+"[^,}\n]*/g,
      (match) => {
        // Extract the field name and value
        const fieldMatch = match.match(/"dartVersion":\s*"(.*)"/);
        if (fieldMatch) {
          // Escape any unescaped quotes in the value
          const value = fieldMatch[1].replace(/\\"/g, '___ESCAPED_QUOTE___')
                                       .replace(/"/g, '\\"')
                                       .replace(/___ESCAPED_QUOTE___/g, '\\"');
          return `"dartVersion": "${value}"`;
        }
        return match;
      }
    );
    
    return JSON.parse(content);
  } catch (error) {
    console.warn(`Failed to read JSON from ${filePath}:`, error.message);
    return null;
  }
};

const writeJsonFile = (filePath, data) => {
  ensureDirectory(filePath);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

// ============================================================================
// Result Serialization
// ============================================================================

const serializeCollector = (collector) => ({
  functions: Array.from(collector.functions).sort(),
  tables: Object.fromEntries(
    Array.from(collector.tables.entries())
      .sort(([a], [b]) => a.localeCompare(b))
  ),
  variables: Array.from(collector.variables).sort(),
  objectMethods: Object.fromEntries(
    Array.from(collector.objectMethods.entries())
      .map(([type, methods]) => [type, Array.from(methods).sort()])
      .sort(([a], [b]) => a.localeCompare(b))
  )
});

const printSummary = (luaGlobals) => {
  console.log('\n=== Extraction Summary ===');
  console.log(`Functions: ${luaGlobals.functions.length}`);
  console.log(`Tables: ${Object.keys(luaGlobals.tables).length}`);
  console.log(`Variables: ${luaGlobals.variables.length}`);
  console.log(`Object Types: ${Object.keys(luaGlobals.objectMethods).length}`);
  
  Object.entries(luaGlobals.objectMethods).forEach(([type, methods]) => {
    console.log(`  ${type}: ${methods.length} methods`);
  });
};

// ============================================================================
// Main Pipeline
// ============================================================================

const validateSourceDirectory = (sourceDir) => {
  if (!fs.existsSync(sourceDir)) {
    throw new Error(`Source directory not found: ${sourceDir}`);
  }
};

const findSourceFiles = (sourceDir) => {
  const files = findDartFiles(sourceDir);
  
  if (files.length === 0) {
    throw new Error(`No .dart files found in ${sourceDir}`);
  }
  
  console.log(`Found ${files.length} Dart files to process\n`);
  return files;
};

const processFiles = (files, collector) => {
  files.forEach((file) => {
    try {
      processFile(file, collector);
    } catch (error) {
      console.warn(`Warning: Failed to process ${file}: ${error.message}`);
    }
  });
};

const loadOrCreateMetadata = (outputPath) => {
  if (fs.existsSync(outputPath)) {
    const metadata = readJsonFile(outputPath);
    if (metadata) {
      console.log(`\nLoaded existing metadata from ${outputPath}`);
      return metadata;
    }
    console.warn('Warning: Failed to parse existing metadata');
  }
  
  console.log(`\nCreating new metadata file at ${outputPath}`);
  return {};
};

const saveMetadata = (outputPath, metadata) => {
  try {
    writeJsonFile(outputPath, metadata);
    console.log(`\n✓ Successfully wrote metadata to ${outputPath}`);
  } catch (error) {
    throw new Error(`Failed to write output file: ${error.message}`);
  }
};

const main = () => {
  console.log('=== ONB Lua Globals Extractor ===\n');
  console.log(`Source directory: ${config.sourceDir}`);
  console.log(`Output file: ${config.outputPath}\n`);
  
  // Validate and prepare
  validateSourceDirectory(config.sourceDir);
  const files = findSourceFiles(config.sourceDir);
  
  // Process files
  const collector = createGlobalsCollector();
  processFiles(files, collector);
  
  // Serialize and summarize
  const luaGlobals = serializeCollector(collector);
  printSummary(luaGlobals);
  
  // Save results - preserve existing metadata structure
  const metadata = loadOrCreateMetadata(config.outputPath);
  
  // Add lua key with our extracted globals
  metadata.lua = luaGlobals;
  
  saveMetadata(config.outputPath, metadata);
};

// ============================================================================
// Entry Point
// ============================================================================

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`\nFatal error: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

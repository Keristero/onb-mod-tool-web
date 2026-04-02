  let buildArgsList;

// `modulePromise` is a promise to the `WebAssembly.module` object to be
//   instantiated.
// `importObjectPromise` is a promise to an object that contains any additional
//   imports needed by the module that aren't provided by the standard runtime.
//   The fields on this object will be merged into the importObject with which
//   the module will be instantiated.
// This function returns a promise to the instantiated module.
export const instantiate = async (modulePromise, importObjectPromise) => {
    let dartInstance;

      function stringFromDartString(string) {
        const totalLength = dartInstance.exports.$stringLength(string);
        let result = '';
        let index = 0;
        while (index < totalLength) {
          let chunkLength = Math.min(totalLength - index, 0xFFFF);
          const array = new Array(chunkLength);
          for (let i = 0; i < chunkLength; i++) {
              array[i] = dartInstance.exports.$stringRead(string, index++);
          }
          result += String.fromCharCode(...array);
        }
        return result;
    }

    function stringToDartString(string) {
        const length = string.length;
        let range = 0;
        for (let i = 0; i < length; i++) {
            range |= string.codePointAt(i);
        }
        if (range < 256) {
            const dartString = dartInstance.exports.$stringAllocate1(length);
            for (let i = 0; i < length; i++) {
                dartInstance.exports.$stringWrite1(dartString, i, string.codePointAt(i));
            }
            return dartString;
        } else {
            const dartString = dartInstance.exports.$stringAllocate2(length);
            for (let i = 0; i < length; i++) {
                dartInstance.exports.$stringWrite2(dartString, i, string.charCodeAt(i));
            }
            return dartString;
        }
    }

      // Converts a Dart List to a JS array. Any Dart objects will be converted, but
    // this will be cheap for JSValues.
    function arrayFromDartList(constructor, list) {
        const length = dartInstance.exports.$listLength(list);
        const array = new constructor(length);
        for (let i = 0; i < length; i++) {
            array[i] = dartInstance.exports.$listRead(list, i);
        }
        return array;
    }

    buildArgsList = function(list) {
        const dartList = dartInstance.exports.$makeStringList();
        for (let i = 0; i < list.length; i++) {
            dartInstance.exports.$listAdd(dartList, stringToDartString(list[i]));
        }
        return dartList;
    }

    // A special symbol attached to functions that wrap Dart functions.
    const jsWrappedDartFunctionSymbol = Symbol("JSWrappedDartFunction");

    function finalizeWrapper(dartFunction, wrapped) {
        wrapped.dartFunction = dartFunction;
        wrapped[jsWrappedDartFunctionSymbol] = true;
        return wrapped;
    }

    if (WebAssembly.String === undefined) {
        console.log("WebAssembly.String is undefined, adding polyfill");
        WebAssembly.String = {
            "charCodeAt": (s, i) => s.charCodeAt(i),
            "compare": (s1, s2) => {
                if (s1 < s2) return -1;
                if (s1 > s2) return 1;
                return 0;
            },
            "concat": (s1, s2) => s1 + s2,
            "equals": (s1, s2) => s1 === s2,
            "fromCharCode": (i) => String.fromCharCode(i),
            "length": (s) => s.length,
            "substring": (s, a, b) => s.substring(a, b),
        };
    }

    // Imports
    const dart2wasm = {

  _45: x0 => globalThis.analyzeModFile = x0,
_46: f => finalizeWrapper(f,(x0,x1) => dartInstance.exports._46(f,x0,x1)),
_71: s => stringToDartString(JSON.stringify(stringFromDartString(s))),
_72: s => console.log(stringFromDartString(s)),
_175: o => o === undefined,
_176: o => typeof o === 'boolean',
_177: o => typeof o === 'number',
_179: o => typeof o === 'string',
_182: o => o instanceof Int8Array,
_183: o => o instanceof Uint8Array,
_184: o => o instanceof Uint8ClampedArray,
_185: o => o instanceof Int16Array,
_186: o => o instanceof Uint16Array,
_187: o => o instanceof Int32Array,
_188: o => o instanceof Uint32Array,
_189: o => o instanceof Float32Array,
_190: o => o instanceof Float64Array,
_191: o => o instanceof ArrayBuffer,
_192: o => o instanceof DataView,
_193: o => o instanceof Array,
_194: o => typeof o === 'function' && o[jsWrappedDartFunctionSymbol] === true,
_197: o => o instanceof RegExp,
_198: (l, r) => l === r,
_199: o => o,
_200: o => o,
_201: o => o,
_202: b => !!b,
_203: o => o.length,
_206: (o, i) => o[i],
_207: f => f.dartFunction,
_208: l => arrayFromDartList(Int8Array, l),
_209: l => arrayFromDartList(Uint8Array, l),
_210: l => arrayFromDartList(Uint8ClampedArray, l),
_211: l => arrayFromDartList(Int16Array, l),
_212: l => arrayFromDartList(Uint16Array, l),
_213: l => arrayFromDartList(Int32Array, l),
_214: l => arrayFromDartList(Uint32Array, l),
_215: l => arrayFromDartList(Float32Array, l),
_216: l => arrayFromDartList(Float64Array, l),
_217: (data, length) => {
          const view = new DataView(new ArrayBuffer(length));
          for (let i = 0; i < length; i++) {
              view.setUint8(i, dartInstance.exports.$byteDataGetUint8(data, i));
          }
          return view;
        },
_218: l => arrayFromDartList(Array, l),
_219: stringFromDartString,
_220: stringToDartString,
_227: (o, p) => o[p],
_164: (s, m) => {
          try {
            return new RegExp(s, m);
          } catch (e) {
            return String(e);
          }
        },
_166: (x0,x1) => x0.test(x1),
_223: l => new Array(l),
_231: o => String(o),
_244: x0 => x0.flags,
_126: WebAssembly.String.concat,
_134: (o) => new DataView(o.buffer, o.byteOffset, o.byteLength),
_136: o => o.buffer,
_84: (a, i) => a.push(i),
_95: a => a.length,
_97: (a, i) => a[i],
_98: (a, i, v) => a[i] = v,
_100: a => a.join(''),
_106: s => s.trim(),
_110: (s, p, i) => s.indexOf(p, i),
_113: (o, start, length) => new Uint8Array(o.buffer, o.byteOffset + start, length),
_114: (o, start, length) => new Int8Array(o.buffer, o.byteOffset + start, length),
_115: (o, start, length) => new Uint8ClampedArray(o.buffer, o.byteOffset + start, length),
_116: (o, start, length) => new Uint16Array(o.buffer, o.byteOffset + start, length),
_117: (o, start, length) => new Int16Array(o.buffer, o.byteOffset + start, length),
_118: (o, start, length) => new Uint32Array(o.buffer, o.byteOffset + start, length),
_119: (o, start, length) => new Int32Array(o.buffer, o.byteOffset + start, length),
_122: (o, start, length) => new Float32Array(o.buffer, o.byteOffset + start, length),
_123: (o, start, length) => new Float64Array(o.buffer, o.byteOffset + start, length),
_125: WebAssembly.String.charCodeAt,
_127: WebAssembly.String.substring,
_128: WebAssembly.String.length,
_129: WebAssembly.String.equals,
_130: WebAssembly.String.compare,
_131: WebAssembly.String.fromCharCode,
_137: o => o.byteOffset,
_138: Function.prototype.call.bind(Object.getOwnPropertyDescriptor(DataView.prototype, 'byteLength').get),
_139: (b, o) => new DataView(b, o),
_140: (b, o, l) => new DataView(b, o, l),
_141: Function.prototype.call.bind(DataView.prototype.getUint8),
_142: Function.prototype.call.bind(DataView.prototype.setUint8),
_143: Function.prototype.call.bind(DataView.prototype.getInt8),
_145: Function.prototype.call.bind(DataView.prototype.getUint16),
_147: Function.prototype.call.bind(DataView.prototype.getInt16),
_149: Function.prototype.call.bind(DataView.prototype.getUint32),
_151: Function.prototype.call.bind(DataView.prototype.getInt32),
_152: Function.prototype.call.bind(DataView.prototype.setInt32),
_157: Function.prototype.call.bind(DataView.prototype.getFloat32),
_159: Function.prototype.call.bind(DataView.prototype.getFloat64),
_82: (c) =>
              queueMicrotask(() => dartInstance.exports.$invokeCallback(c)),
_161: s => stringToDartString(stringFromDartString(s).toUpperCase()),
_47: v => stringToDartString(v.toString()),
_58: Date.now,
_60: s => new Date(s * 1000).getTimezoneOffset() * 60 ,
_61: s => {
      const jsSource = stringFromDartString(s);
      if (!/^\s*[+-]?(?:Infinity|NaN|(?:\.\d+|\d+(?:\.\d*)?)(?:[eE][+-]?\d+)?)\s*$/.test(jsSource)) {
        return NaN;
      }
      return parseFloat(jsSource);
    },
_62: () => {
          let stackString = new Error().stack.toString();
          let frames = stackString.split('\n');
          let drop = 2;
          if (frames[0] === 'Error') {
              drop += 1;
          }
          return frames.slice(drop).join('\n');
        },
_42: (decoder, codeUnits) => decoder.decode(codeUnits),
_43: () => new TextDecoder("utf-8", {fatal: true}),
_44: () => new TextDecoder("utf-8", {fatal: false})
      };

    const baseImports = {
        dart2wasm: dart2wasm,

  
          Math: Math,
        Date: Date,
        Object: Object,
        Array: Array,
        Reflect: Reflect,
    };
    dartInstance = await WebAssembly.instantiate(await modulePromise, {
        ...baseImports,
        ...(await importObjectPromise),
    });

    return dartInstance;
}

// Call the main function for the instantiated module
// `moduleInstance` is the instantiated dart2wasm module
// `args` are any arguments that should be passed into the main function.
export const invoke = (moduleInstance, ...args) => {
    const dartMain = moduleInstance.exports.$getMain();
    const dartArgs = buildArgsList(args);
    moduleInstance.exports.$invokeMain(dartMain, dartArgs);
}


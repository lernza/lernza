//#region src/util.ts
function detectFinalizer() {
    return (typeof FinalizationRegistry !== 'undefined') && (typeof WeakRef !== 'undefined');
}
const supportFinalizer = detectFinalizer();
function detectFeatures(features) {
    const supportNewFunction = (function () {
        let f;
        try {
            f = new Function();
        }
        catch (_) {
            return false;
        }
        return typeof f === 'function';
    })();
    const canSetFunctionName = (function () {
        try {
            return Boolean(Object.getOwnPropertyDescriptor(Function.prototype, 'name')?.configurable);
        }
        catch (_) {
            return false;
        }
    })();
    const weakSymbol = (function () {
        try {
            const sym = Symbol();
            new WeakRef(sym);
            new WeakMap().set(sym, undefined);
        }
        catch (_) {
            return false;
        }
        return true;
    })();
    const _require = (function () {
        let nativeRequire;
        if (typeof __webpack_public_path__ !== 'undefined') {
            nativeRequire = (function () {
                return typeof __non_webpack_require__ !== 'undefined' ? __non_webpack_require__ : undefined;
            })();
        }
        else {
            nativeRequire = (function () {
                return typeof __webpack_public_path__ !== 'undefined' ? (typeof __non_webpack_require__ !== 'undefined' ? __non_webpack_require__ : undefined) : (typeof require !== 'undefined' ? require : undefined);
            })();
        }
        return nativeRequire;
    })();
    function defaultGetGlobalThis() {
        if (typeof globalThis !== 'undefined')
            return globalThis;
        let g = (function () { return this; })();
        if (!g && supportNewFunction) {
            try {
                g = new Function('return this')();
            }
            catch (_) { }
        }
        if (!g) {
            if (typeof __webpack_public_path__ === 'undefined') {
                if (typeof global !== 'undefined')
                    return global;
            }
            if (typeof window !== 'undefined')
                return window;
            if (typeof self !== 'undefined')
                return self;
        }
        throw new Error('Unable to get globalThis');
    }
    function defaultWithResolvers() {
        let ok;
        let err;
        const promise = new this((resolve, reject) => {
            ok = resolve;
            err = reject;
        });
        return { promise, resolve: ok, reject: err };
    }
    const getGlobalThis = features && 'getGlobalThis' in features
        ? (features.getGlobalThis ?? defaultGetGlobalThis)
        : defaultGetGlobalThis;
    const withResolvers = (features && 'withResolvers' in features)
        ? (features.withResolvers ?? defaultWithResolvers)
        : typeof Promise.withResolvers === 'function'
            ? Promise.withResolvers
            : defaultWithResolvers;
    const getBuiltinModule = getGlobalThis?.().process?.getBuiltinModule ?? _require;
    const ret = {
        makeDynamicFunction: (supportNewFunction
            ? (...args) => (new Function(...args))
            : undefined),
        setFunctionName: (canSetFunctionName
            ? (f, name) => { Object.defineProperty(f, 'name', { value: name }); }
            : undefined),
        Reflect: typeof Reflect === 'object' ? Reflect : undefined,
        finalizer: detectFinalizer(),
        weakSymbol,
        BigInt: typeof BigInt !== 'undefined' ? BigInt : undefined,
        MessageChannel: typeof MessageChannel === 'function'
            ? MessageChannel
            : (function () {
                try {
                    return getBuiltinModule('worker_threads').MessageChannel;
                }
                catch (_) { }
                return undefined;
            })(),
        setImmediate: typeof setImmediate === 'function'
            ? setImmediate.bind(getGlobalThis())
            : function (callback) {
                if (typeof callback !== 'function') {
                    throw new TypeError('The "callback" argument must be of type function');
                }
                if (ret.MessageChannel) {
                    let channel = new ret.MessageChannel();
                    channel.port1.onmessage = function () {
                        channel.port1.onmessage = null;
                        channel = undefined;
                        callback();
                    };
                    channel.port2.postMessage(null);
                }
                else {
                    setTimeout(callback, 0);
                }
            },
        Buffer: typeof Buffer === 'function'
            ? Buffer
            : (function () {
                try {
                    return getBuiltinModule('buffer').Buffer;
                }
                catch (_) { }
                return undefined;
            })(),
        ...features,
        getGlobalThis,
        withResolvers
    };
    return ret;
}
function isReferenceType(v) {
    return (typeof v === 'object' && v !== null) || typeof v === 'function';
}
function getDylinkMetadata(binary) {
    let offset = 0;
    let end = 0;
    const decoder = new TextDecoder();
    function getU8() {
        return binary[offset++];
    }
    function getLEB() {
        let ret = 0;
        let mul = 1;
        while (1) {
            let byte = binary[offset++];
            ret += ((byte & 0x7f) * mul);
            mul *= 0x80;
            if (!(byte & 0x80))
                break;
        }
        return ret;
    }
    function getString() {
        let len = getLEB();
        offset += len;
        return decoder.decode(binary.subarray(offset - len, offset));
    }
    function getStringList() {
        let count = getLEB();
        let rtn = [];
        while (count--)
            rtn.push(getString());
        return rtn;
    }
    function failIf(condition, message) {
        if (condition)
            throw new Error(message);
    }
    if (binary instanceof WebAssembly.Module) {
        const dylinkSection = WebAssembly.Module.customSections(binary, 'dylink.0');
        failIf(dylinkSection.length === 0, 'need dylink section');
        binary = new Uint8Array(dylinkSection[0]);
        end = binary.length;
    }
    else {
        var int32View = new Uint32Array(new Uint8Array(binary.subarray(0, 24)).buffer);
        var magicNumberFound = int32View[0] === 0x6d736100 || int32View[0] === 0x0061736d;
        failIf(!magicNumberFound, 'need to see wasm magic number');
        failIf(binary[8] !== 0, 'need the dylink section to be first');
        offset = 9;
        var section_size = getLEB();
        end = offset + section_size;
        var name = getString();
        failIf(name !== 'dylink.0');
    }
    var customSection = {
        neededDynlibs: [],
        tlsExports: new Set(),
        weakImports: new Set(),
        runtimePaths: [],
        memorySize: 0,
        memoryAlign: 0,
        tableSize: 0,
        tableAlign: 0
    };
    var WASM_DYLINK_MEM_INFO = 0x1;
    var WASM_DYLINK_NEEDED = 0x2;
    var WASM_DYLINK_EXPORT_INFO = 0x3;
    var WASM_DYLINK_IMPORT_INFO = 0x4;
    var WASM_DYLINK_RUNTIME_PATH = 0x5;
    var WASM_SYMBOL_TLS = 0x100;
    var WASM_SYMBOL_BINDING_MASK = 0x3;
    var WASM_SYMBOL_BINDING_WEAK = 0x1;
    while (offset < end) {
        var subsectionType = getU8();
        var subsectionSize = getLEB();
        if (subsectionType === WASM_DYLINK_MEM_INFO) {
            customSection.memorySize = getLEB();
            customSection.memoryAlign = getLEB();
            customSection.tableSize = getLEB();
            customSection.tableAlign = getLEB();
        }
        else if (subsectionType === WASM_DYLINK_NEEDED) {
            customSection.neededDynlibs = getStringList();
        }
        else if (subsectionType === WASM_DYLINK_EXPORT_INFO) {
            let count = getLEB();
            while (count--) {
                let symname = getString();
                let flags = getLEB();
                if (flags & WASM_SYMBOL_TLS) {
                    customSection.tlsExports.add(symname);
                }
            }
        }
        else if (subsectionType === WASM_DYLINK_IMPORT_INFO) {
            let count = getLEB();
            while (count--) {
                getString();
                let symname = getString();
                let flags = getLEB();
                if ((flags & WASM_SYMBOL_BINDING_MASK) === WASM_SYMBOL_BINDING_WEAK) {
                    customSection.weakImports.add(symname);
                }
            }
        }
        else if (subsectionType === WASM_DYLINK_RUNTIME_PATH) {
            customSection.runtimePaths = getStringList();
        }
        else {
            console.error('unknown dylink.0 subsection:', subsectionType);
            offset += subsectionSize;
        }
    }
    var tableAlign = Math.pow(2, customSection.tableAlign);
    failIf(tableAlign !== 1, `invalid tableAlign ${tableAlign}`);
    failIf(offset !== end);
    return customSection;
}
const version = "2.0.0-alpha.3";
const NODE_API_SUPPORTED_VERSION_MIN = 1;
const NODE_API_SUPPORTED_VERSION_MAX = 10;
const NAPI_VERSION_EXPERIMENTAL = 2147483647;
const NODE_API_DEFAULT_MODULE_API_VERSION = 8;
const NODE_MODULE_VERSION = 127;

//#endregion src/util.ts

//#region src/Disaposable.ts
class Disposable {
}
if (typeof Symbol.dispose === 'symbol') {
    Object.defineProperty(Disposable.prototype, Symbol.dispose, {
        value() {
            this.dispose();
        },
        writable: true,
        enumerable: false,
        configurable: true
    });
}

//#endregion src/Disaposable.ts

//#region src/RefTracker.ts
class RefTracker extends Disposable {
    constructor() {
        super(...arguments);
        this._next = null;
        this._prev = null;
    }
    dispose() { }
    finalize() { }
    link(list) {
        this._prev = list;
        this._next = list._next;
        if (this._next !== null) {
            this._next._prev = this;
        }
        list._next = this;
    }
    unlink() {
        if (this._prev !== null) {
            this._prev._next = this._next;
        }
        if (this._next !== null) {
            this._next._prev = this._prev;
        }
        this._prev = null;
        this._next = null;
    }
    static finalizeAll(list) {
        while (list._next !== null) {
            list._next.finalize();
        }
    }
}

//#endregion src/RefTracker.ts

//#region src/Finalizer.ts
class Finalizer {
    constructor(envObject, _finalizeCallback = 0, _finalizeData = 0, _finalizeHint = 0) {
        this.envObject = envObject;
        this._finalizeCallback = _finalizeCallback;
        this._finalizeData = _finalizeData;
        this._finalizeHint = _finalizeHint;
        this._makeDynCall_vppp = envObject.bridge.makeDynCall_vppp;
    }
    copy() {
        const newFina = Object.create(Finalizer.prototype);
        newFina.envObject = this.envObject;
        newFina._makeDynCall_vppp = this._makeDynCall_vppp;
        newFina._finalizeCallback = this._finalizeCallback;
        newFina._finalizeData = this._finalizeData;
        newFina._finalizeHint = this._finalizeHint;
        return newFina;
    }
    move(target) {
        target._finalizeCallback = this._finalizeCallback;
        target._finalizeData = this._finalizeData;
        target._finalizeHint = this._finalizeHint;
        target.envObject = this.envObject;
        target._makeDynCall_vppp = this._makeDynCall_vppp;
        this._finalizeCallback = 0;
        this._finalizeData = 0;
        this._finalizeHint = 0;
        this.dispose();
    }
    callback() { return this._finalizeCallback; }
    data() { return this._finalizeData; }
    hint() { return this._finalizeHint; }
    resetEnv() {
        this.envObject = undefined;
    }
    resetFinalizer() {
        this._finalizeCallback = 0;
        this._finalizeData = 0;
        this._finalizeHint = 0;
    }
    callFinalizer() {
        const finalize_callback = this._finalizeCallback;
        const finalize_data = this._finalizeData;
        const finalize_hint = this._finalizeHint;
        this.resetFinalizer();
        if (!finalize_callback)
            return;
        const fini = Number(finalize_callback);
        if (!this.envObject) {
            this._makeDynCall_vppp(fini)(0, finalize_data, finalize_hint);
        }
        else {
            this.envObject.callFinalizer(fini, finalize_data, finalize_hint);
        }
    }
    dispose() {
        this.envObject = undefined;
        this._makeDynCall_vppp = undefined;
    }
}

//#endregion src/Finalizer.ts

//#region src/TrackedFinalizer.ts
class TrackedFinalizer extends RefTracker {
    static create(envObject, finalize_callback, finalize_data, finalize_hint) {
        const finalizer = new TrackedFinalizer(envObject, finalize_callback, finalize_data, finalize_hint);
        finalizer.link(envObject.finalizing_reflist);
        return finalizer;
    }
    constructor(envObject, finalize_callback, finalize_data, finalize_hint) {
        super();
        this._finalizer = new Finalizer(envObject, finalize_callback, finalize_data, finalize_hint);
    }
    data() {
        return this._finalizer.data();
    }
    dispose() {
        if (!this._finalizer)
            return;
        this.unlink();
        this._finalizer.envObject.dequeueFinalizer(this);
        this._finalizer.dispose();
        this._finalizer = undefined;
        super.dispose();
    }
    finalize() {
        this.unlink();
        let error;
        let caught = false;
        try {
            this._finalizer.callFinalizer();
        }
        catch (err) {
            caught = true;
            error = err;
        }
        this.dispose();
        if (caught) {
            throw error;
        }
    }
}

//#endregion src/TrackedFinalizer.ts

//#region src/Store.ts
class CountIdAllocator extends Disposable {
    constructor(initialNext = 1) {
        super();
        this.next = initialNext;
    }
    aquire() {
        return this.next++;
    }
    release(_) { }
    dispose() { }
}
class CountIdReuseAllocator extends CountIdAllocator {
    constructor() {
        super(...arguments);
        this._freeList = [];
    }
    aquire() {
        if (this._freeList.length) {
            return this._freeList.shift();
        }
        return super.aquire();
    }
    release(id) {
        this._freeList.push(id);
    }
    dispose() {
        this._freeList.length = 0;
        super.dispose();
    }
}
class BaseArrayStore extends Disposable {
    constructor(initialCapacity = 1) {
        super();
        this._values = Array(initialCapacity);
    }
    assign(id, value) {
        this._values[id] = value;
        return value;
    }
    deref(id) {
        return this._values[id];
    }
    alloc(factory, ...args) {
        return factory(...args);
    }
    dealloc(id) {
        this._values[id] = undefined;
    }
    dispose() {
        this._values.forEach((_, i) => this.dealloc(i));
    }
}
class ArrayStore extends BaseArrayStore {
    constructor(initialCapacity = 4) {
        super(initialCapacity);
        this._allocator = new CountIdReuseAllocator(1);
    }
    insert(value) {
        const id = this._allocator.aquire();
        while (id >= this._values.length) {
            const cap = this._values.length;
            this._values.length = cap + (cap >> 1) + 16;
        }
        value.id = id;
        this._values[id] = value;
    }
    alloc(factory, ...args) {
        const value = factory(...args);
        this.insert(value);
        return value;
    }
    dealloc(id) {
        this._allocator.release(id);
        super.dealloc(id);
    }
}

//#endregion src/Store.ts

//#region src/Persistent.ts
class PersistentStore extends ArrayStore {
    constructor(initialCapacity = 4) {
        super(initialCapacity);
        this._recyleList = [];
    }
    markUnused(id) {
        this._recyleList.push(id);
    }
    recycle() {
        while (this._recyleList.length > 0) {
            const id = this._recyleList.shift();
            const persistent = this.deref(id);
            persistent.dispose();
        }
    }
}
class StrongRef extends Disposable {
    constructor(value) {
        super();
        this._value = value;
    }
    deref() {
        return this._value;
    }
    dispose() {
        this._value = undefined;
    }
}
class Persistent extends Disposable {
    constructor(isolate, ...args) {
        super();
        this.id = 0;
        this._isolate = isolate;
        isolate.insertRef(this);
        this.setSlot(args.length === 0 ? undefined : new StrongRef(args[0]));
    }
    dispose() {
        this.reset();
        this.deleteSlot();
        this._isolate.globalHandleStore.dealloc(this.id);
        this._isolate = undefined;
        this.id = 0;
    }
    copy() {
        const target = new Persistent(this._isolate);
        target._param = this._param;
        target._callback = this._callback;
        const ref = this.getSlot();
        if (ref instanceof StrongRef) {
            target.setSlot(new StrongRef(ref.deref()));
        }
        else if (ref instanceof WeakRef) {
            const value = ref.deref();
            if (value === undefined) {
                target.setSlot(undefined);
            }
            else {
                target.setSlot(new StrongRef(value));
                target.setWeak(this._param, this._callback);
            }
        }
        else {
            target.setSlot(undefined);
        }
        return target;
    }
    move(to) {
        if (this === to)
            return;
        to.reset();
        to._param = this._param;
        to._callback = this._callback;
        to._isolate = this._isolate;
        to.setSlot(this.getSlot());
        this.reset();
        this.setSlot(undefined);
    }
    slot() {
        return 0x80000000 + this.id;
    }
    getSlot() {
        return this._isolate.getRefSlotValue(this.slot());
    }
    setSlot(ref) {
        this._isolate.setRefSlotValue(this.slot(), ref);
    }
    deleteSlot() {
        this._isolate.deleteRefSlotValue(this.slot());
    }
    setWeak(param, callback) {
        const ref = this.getSlot();
        if (!supportFinalizer || ref === undefined || ref instanceof WeakRef)
            return;
        const value = ref.deref();
        try {
            Persistent._registry.register(value, this, this);
            const weakRef = new WeakRef(value);
            ref.dispose();
            this.setSlot(weakRef);
            this._param = param;
            this._callback = callback;
        }
        catch (err) {
            if (typeof value === 'symbol') ;
            else {
                throw err;
            }
        }
    }
    clearWeak() {
        const ref = this.getSlot();
        if (!supportFinalizer || ref === undefined)
            return;
        if (ref instanceof WeakRef) {
            try {
                Persistent._registry.unregister(this);
            }
            catch (_) { }
            this._param = undefined;
            this._callback = undefined;
            const value = ref.deref();
            if (value === undefined) {
                this.setSlot(value);
            }
            else {
                this.setSlot(new StrongRef(value));
            }
        }
    }
    reset() {
        if (supportFinalizer) {
            try {
                Persistent._registry.unregister(this);
            }
            catch (_) { }
        }
        this._param = undefined;
        this._callback = undefined;
        const ref = this.getSlot();
        if (ref instanceof StrongRef) {
            ref.dispose();
        }
        this.setSlot(undefined);
    }
    resetTo(value) {
        this.reset();
        this.setSlot(new StrongRef(value));
    }
    isEmpty() {
        return this.getSlot() === undefined;
    }
    deref() {
        const ref = this.getSlot();
        if (ref === undefined)
            return undefined;
        return ref.deref();
    }
}
Persistent._registry = supportFinalizer
    ? new FinalizationRegistry((value) => {
        value.setSlot(undefined);
        const callback = value._callback;
        const param = value._param;
        value._callback = undefined;
        value._param = undefined;
        if (typeof callback === 'function') {
            callback(param);
        }
    })
    : undefined;

//#endregion src/Persistent.ts

//#region src/env.ts
function handleThrow(envObject, value) {
    if (envObject.terminatedOrTerminating()) {
        return;
    }
    throw value;
}
class Env extends Disposable {
    constructor(ctx, store, bridge) {
        super();
        this.openHandleScopes = 0;
        this.instanceData = null;
        this.refs = 1;
        this.reflist = new RefTracker();
        this.finalizing_reflist = new RefTracker();
        this.pendingFinalizers = [];
        this.inGcFinalizer = false;
        this._bindingMap = new WeakMap();
        this.ctx = ctx;
        this.store = store;
        this.id = 0;
        this.store.insert(this);
        this.lastException = new Persistent(ctx.isolate);
        this.bridge = bridge;
    }
    canCallIntoJs() {
        return true;
    }
    terminatedOrTerminating() {
        return !this.canCallIntoJs();
    }
    ref() {
        this.refs++;
    }
    unref() {
        this.refs--;
        if (this.refs === 0) {
            this.dispose();
        }
    }
    clearLastError() {
        this.bridge.setLastError(this.bridge.address, 0, 0, 0);
        return 0;
    }
    setLastError(error_code, engine_error_code = 0, engine_reserved = 0) {
        this.bridge.setLastError(this.bridge.address, error_code, engine_error_code, engine_reserved);
        return error_code;
    }
    callIntoModule(fn, handleException = handleThrow) {
        const openHandleScopesBefore = this.openHandleScopes;
        this.clearLastError();
        const r = fn(this);
        if (openHandleScopesBefore !== this.openHandleScopes) {
            this.bridge.abort('open_handle_scopes != open_handle_scopes_before');
        }
        if (!this.lastException.isEmpty()) {
            const err = this.lastException.deref();
            this.lastException.reset();
            handleException(this, err);
        }
        return r;
    }
    invokeFinalizerFromGC(finalizer) {
        if (this.moduleApiVersion !== NAPI_VERSION_EXPERIMENTAL) {
            this.enqueueFinalizer(finalizer);
        }
        else {
            const saved = this.inGcFinalizer;
            this.inGcFinalizer = true;
            try {
                finalizer.finalize();
            }
            finally {
                this.inGcFinalizer = saved;
            }
        }
    }
    checkGCAccess() {
        if (this.moduleApiVersion === NAPI_VERSION_EXPERIMENTAL && this.inGcFinalizer) {
            this.bridge.abort('Finalizer is calling a function that may affect GC state.\n' +
                'The finalizers are run directly from GC and must not affect GC ' +
                'state.\n' +
                'Use `node_api_post_finalizer` from inside of the finalizer to work ' +
                'around this issue.\n' +
                'It schedules the call as a new task in the event loop.');
        }
    }
    enqueueFinalizer(finalizer) {
        if (this.pendingFinalizers.indexOf(finalizer) === -1) {
            this.pendingFinalizers.push(finalizer);
        }
    }
    dequeueFinalizer(finalizer) {
        const index = this.pendingFinalizers.indexOf(finalizer);
        if (index !== -1) {
            this.pendingFinalizers.splice(index, 1);
        }
    }
    deleteMe() {
        RefTracker.finalizeAll(this.finalizing_reflist);
        RefTracker.finalizeAll(this.reflist);
        this.lastException.reset();
        this.store.dealloc(this.id);
        this.bridge.deleteEnv(this.bridge.address);
    }
    dispose() {
        if (this.id === 0)
            return;
        this.deleteMe();
        this.finalizing_reflist.dispose();
        this.reflist.dispose();
        this.id = 0;
    }
    initObjectBinding(value) {
        const binding = {
            wrapped: 0,
            tag: null
        };
        this._bindingMap.set(value, binding);
        return binding;
    }
    getObjectBinding(value) {
        if (this._bindingMap.has(value)) {
            return this._bindingMap.get(value);
        }
        return this.initObjectBinding(value);
    }
    setInstanceData(data, finalize_cb, finalize_hint) {
        if (this.instanceData) {
            this.instanceData.dispose();
        }
        this.instanceData = TrackedFinalizer.create(this, finalize_cb, data, finalize_hint);
    }
    getInstanceData() {
        return this.instanceData ? this.instanceData.data() : 0;
    }
}
class NodeEnv extends Env {
    constructor(ctx, store, bridge) {
        super(ctx, store, bridge);
        this.destructing = false;
        this.finalizationScheduled = false;
        this.bridge = bridge;
    }
    deleteMe() {
        this.destructing = true;
        this.drainFinalizerQueue();
        super.deleteMe();
    }
    canCallIntoJs() {
        return super.canCallIntoJs() && this.ctx.canCallIntoJs();
    }
    triggerFatalException(err) {
        if (this.nodeBinding) {
            this.nodeBinding.napi.fatalException(err);
        }
        else {
            if (typeof process === 'object' && process !== null && typeof process._fatalException === 'function') {
                const handled = process._fatalException(err);
                if (!handled) {
                    console.error(err);
                    process.exit(1);
                }
            }
            else {
                throw err;
            }
        }
    }
    callbackIntoModule(enforceUncaughtExceptionPolicy, fn) {
        return this.callIntoModule(fn, (envObject, err) => {
            if (envObject.terminatedOrTerminating()) {
                return;
            }
            const hasProcess = typeof process === 'object' && process !== null;
            const hasForceFlag = hasProcess ? Boolean(process.execArgv && (process.execArgv.indexOf('--force-node-api-uncaught-exceptions-policy') !== -1)) : false;
            if (envObject.moduleApiVersion < 10 && !hasForceFlag && !enforceUncaughtExceptionPolicy) {
                const warn = hasProcess && typeof process.emitWarning === 'function'
                    ? process.emitWarning
                    : function (warning, type, code) {
                        if (warning instanceof Error) {
                            console.warn(warning.toString());
                        }
                        else {
                            const prefix = code ? `[${code}] ` : '';
                            console.warn(`${prefix}${type || 'Warning'}: ${warning}`);
                        }
                    };
                warn('Uncaught Node-API callback exception detected, please run node with option --force-node-api-uncaught-exceptions-policy=true to handle those exceptions properly.', 'DeprecationWarning', 'DEP0168');
                return;
            }
            envObject.triggerFatalException(err);
        });
    }
    callFinalizer(cb, data, hint) {
        this.callFinalizerInternal(1, cb, data, hint);
    }
    callFinalizerInternal(forceUncaught, cb, data, hint) {
        const f = this.bridge.makeDynCall_vppp(cb);
        const env = this.bridge.address;
        const scope = this.ctx.openScope(this);
        try {
            this.callbackIntoModule(Boolean(forceUncaught), () => { f(env, data, hint); });
        }
        finally {
            this.ctx.closeScope(this, scope);
        }
    }
    enqueueFinalizer(finalizer) {
        super.enqueueFinalizer(finalizer);
        if (!this.finalizationScheduled && !this.destructing) {
            this.finalizationScheduled = true;
            this.ref();
            this.ctx.features.setImmediate(() => {
                this.finalizationScheduled = false;
                this.unref();
                this.drainFinalizerQueue();
            });
        }
    }
    drainFinalizerQueue() {
        while (this.pendingFinalizers.length > 0) {
            const refTracker = this.pendingFinalizers.shift();
            refTracker.finalize();
        }
    }
}

//#endregion src/env.ts

//#region src/errors.ts
class EmnapiError extends Error {
    constructor(message) {
        super(message);
        const ErrorConstructor = new.target;
        const proto = ErrorConstructor.prototype;
        if (!(this instanceof EmnapiError)) {
            const setPrototypeOf = Object.setPrototypeOf;
            if (typeof setPrototypeOf === 'function') {
                setPrototypeOf.call(Object, this, proto);
            }
            else {
                this.__proto__ = proto;
            }
            if (typeof Error.captureStackTrace === 'function') {
                Error.captureStackTrace(this, ErrorConstructor);
            }
        }
    }
}
Object.defineProperty(EmnapiError.prototype, 'name', {
    configurable: true,
    writable: true,
    value: 'EmnapiError'
});
class NotSupportWeakRefError extends EmnapiError {
    constructor(api, message) {
        super(`${api}: The current runtime does not support "FinalizationRegistry" and "WeakRef".${message ? ` ${message}` : ''}`);
    }
}
Object.defineProperty(NotSupportWeakRefError.prototype, 'name', {
    configurable: true,
    writable: true,
    value: 'NotSupportWeakRefError'
});
class NotSupportBufferError extends EmnapiError {
    constructor(api, message) {
        super(`${api}: The current runtime does not support "Buffer". Consider using buffer polyfill to make sure \`globalThis.Buffer\` is defined.${message ? ` ${message}` : ''}`);
    }
}
Object.defineProperty(NotSupportBufferError.prototype, 'name', {
    configurable: true,
    writable: true,
    value: 'NotSupportBufferError'
});

//#endregion src/errors.ts

//#region src/Reference.ts
var ReferenceOwnership;
(function (ReferenceOwnership) {
    ReferenceOwnership[ReferenceOwnership["kRuntime"] = 0] = "kRuntime";
    ReferenceOwnership[ReferenceOwnership["kUserland"] = 1] = "kUserland";
})(ReferenceOwnership || (ReferenceOwnership = {}));
function canBeHeldWeakly(value) {
    if (!value)
        return false;
    const type = typeof value;
    return type === 'object' || type === 'function' || type === 'symbol';
}
class Reference extends RefTracker {
    static weakCallback(ref) {
        const persistent = ref.getPersistent();
        persistent.reset();
        ref.invokeFinalizerFromGC();
    }
    static create(ctx, envObject, handle_id, initialRefcount, ownership, _unused1, _unused2, _unused3) {
        const ref = new Reference(ctx, envObject, handle_id, initialRefcount, ownership);
        if (envObject) {
            ref.link(envObject.reflist);
        }
        return ref;
    }
    constructor(ctx, envObject, handle_id, initialRefcount, ownership) {
        super();
        this.envObject = envObject;
        this._refcount = initialRefcount;
        this._ownership = ownership;
        const value = envObject ? envObject.ctx.jsValueFromNapiValue(handle_id) : handle_id;
        this.canBeWeak = canBeHeldWeakly(value);
        this.ctx = ctx;
        this.id = new Persistent(ctx.isolate, value).id;
        ctx.refStore.set(this.id, this);
        if (initialRefcount === 0) {
            this._setWeak();
        }
    }
    getPersistent() {
        return this.ctx.isolate.getRef(this.id);
    }
    ref() {
        const persistent = this.getPersistent();
        if (persistent.isEmpty()) {
            return 0;
        }
        if (++this._refcount === 1 && this.canBeWeak) {
            persistent.clearWeak();
        }
        return this._refcount;
    }
    unref() {
        const persistent = this.getPersistent();
        if (persistent.isEmpty() || this._refcount === 0) {
            return 0;
        }
        if (--this._refcount === 0) {
            this._setWeak();
        }
        return this._refcount;
    }
    deref() {
        const persistent = this.getPersistent();
        return persistent.deref();
    }
    get() {
        const persistent = this.getPersistent();
        if (persistent.isEmpty()) {
            return 0;
        }
        return persistent.slot();
    }
    resetFinalizer() { }
    data() { return 0; }
    refcount() { return this._refcount; }
    ownership() { return this._ownership; }
    callUserFinalizer() { }
    invokeFinalizerFromGC() {
        this.finalize();
    }
    _setWeak() {
        this.setWeakWithData(this, Reference.weakCallback);
    }
    setWeakWithData(data, callback) {
        const persistent = this.getPersistent();
        if (this.canBeWeak) {
            persistent.setWeak(data, callback);
        }
        else {
            persistent.reset();
        }
    }
    clearWeak() {
        const persistent = this.getPersistent();
        persistent.clearWeak();
    }
    finalize() {
        const persistent = this.getPersistent();
        persistent.reset();
        const deleteMe = this._ownership === ReferenceOwnership.kRuntime;
        this.unlink();
        this.callUserFinalizer();
        if (deleteMe) {
            this.dispose();
        }
    }
    dispose() {
        if (this.id === 0)
            return;
        this.unlink();
        this.ctx.isolate.removeRef(this.id);
        this.ctx.refStore.delete(this.id);
        super.dispose();
        this.ctx = undefined;
        this.envObject = undefined;
        this.id = 0;
    }
}
class ReferenceWithData extends Reference {
    static create(ctx, envObject, value, initialRefcount, ownership, data) {
        const reference = new ReferenceWithData(ctx, envObject, value, initialRefcount, ownership, data);
        if (envObject) {
            reference.link(envObject.reflist);
        }
        return reference;
    }
    constructor(ctx, envObject, value, initialRefcount, ownership, data) {
        super(ctx, envObject, value, initialRefcount, ownership);
        this._data = data;
    }
    data() {
        return this._data;
    }
}
class ReferenceWithFinalizer extends Reference {
    static create(ctx, envObject, value, initialRefcount, ownership, finalize_callback, finalize_data, finalize_hint) {
        if (!envObject) {
            throw new TypeError('envObject is required for ReferenceWithFinalizer');
        }
        const reference = new ReferenceWithFinalizer(ctx, envObject, value, initialRefcount, ownership, finalize_callback, finalize_data, finalize_hint);
        reference.link(envObject.finalizing_reflist);
        return reference;
    }
    constructor(ctx, envObject, value, initialRefcount, ownership, finalize_callback, finalize_data, finalize_hint) {
        super(ctx, envObject, value, initialRefcount, ownership);
        this._finalizer = new Finalizer(envObject, finalize_callback, finalize_data, finalize_hint);
    }
    resetFinalizer() {
        this._finalizer.resetFinalizer();
    }
    data() {
        return this._finalizer.data();
    }
    callUserFinalizer() {
        this._finalizer.callFinalizer();
    }
    invokeFinalizerFromGC() {
        this._finalizer.envObject.invokeFinalizerFromGC(this);
    }
    dispose() {
        if (!this._finalizer)
            return;
        this._finalizer.envObject.dequeueFinalizer(this);
        this._finalizer.dispose();
        super.dispose();
        this._finalizer = undefined;
    }
}

//#endregion src/Reference.ts

//#region src/Handle.ts
class HandleStore extends BaseArrayStore {
    constructor(features) {
        super(HandleStore.MIN_ID);
        this._features = features;
        this._allocator = new CountIdAllocator(HandleStore.MIN_ID);
        this.refValues = new Map();
        this._values[2] = undefined;
        this._values[3] = null;
        this._values[4] = false;
        this._values[5] = true;
        this._values[6] = features.getGlobalThis();
        this._values[7] = '';
        const _erase = (start, end) => {
            for (let i = start; i < end; ++i) {
                this.dealloc(i);
            }
        };
        this._erase = this._features.finalizer
            ? this._features.weakSymbol
                ? (start, end, weak) => {
                    if (!weak) {
                        _erase(start, end);
                    }
                    else {
                        for (let i = start; i < end; ++i) {
                            const value = this._values[i];
                            const type = typeof value;
                            if ((type === 'object' && value !== null) || (type === 'function') || (type === 'symbol' && Symbol.keyFor(value) === undefined)) {
                                this._values[i] = new WeakRef(value);
                            }
                        }
                    }
                }
                : (start, end, weak) => {
                    if (!weak) {
                        _erase(start, end);
                    }
                    else {
                        for (let i = start; i < end; ++i) {
                            const value = this._values[i];
                            const type = typeof value;
                            if ((type === 'object' && value !== null) || (type === 'function')) {
                                this._values[i] = new WeakRef(value);
                            }
                        }
                    }
                }
            : _erase;
        this._deref = this._features.finalizer
            ? (id) => {
                id = Number(id);
                if (id < 0 || id > 0x7fffffff) {
                    const ref = this.refValues.get(id >>> 0);
                    if (ref === undefined)
                        return undefined;
                    return ref.deref();
                }
                const value = this._values[id];
                if (value instanceof WeakRef && this.isOutOfScope(id)) {
                    return value.deref();
                }
                return value;
            }
            : (id) => {
                id = Number(id);
                if (id < 0 || id > 0x7fffffff) {
                    const ref = this.refValues.get(id >>> 0);
                    if (ref === undefined)
                        return undefined;
                    return ref.deref();
                }
                const value = this._values[id];
                return value;
            };
    }
    isOutOfScope(id) {
        return id >= this._allocator.next;
    }
    deepDeref(id) {
        return this._deref(id);
    }
    push(value) {
        const next = this._allocator.aquire();
        this._values[next] = value;
        return next;
    }
    erase(start, end, weak) {
        this._allocator.next = start;
        this._erase(start, end, weak);
    }
    swap(a, b) {
        const values = this._values;
        const h = values[a];
        values[a] = values[b];
        values[b] = h;
    }
}
HandleStore.MIN_ID = 8;

//#endregion src/Handle.ts

//#region src/External.ts
const externalValue = new WeakMap();
function isExternal(object) {
    return externalValue.has(object);
}
const External = (() => {
    function External(value) {
        Object.setPrototypeOf(this, null);
        externalValue.set(this, value);
    }
    External.prototype = null;
    return External;
})();
function getExternalValue(external) {
    if (!isExternal(external)) {
        throw new TypeError('not external');
    }
    return externalValue.get(external);
}

//#endregion src/External.ts

//#region src/HandleScope.ts
class HandleScope extends Disposable {
    static create(parentScope, handleStore, start = parentScope?.end ?? 1, end = start) {
        return new HandleScope(parentScope, handleStore, start, end);
    }
    constructor(parentScope, handleStore, start = parentScope?.end ?? 1, end = start) {
        super();
        this._escapeCalled = false;
        this.handleStore = handleStore;
        this.id = 0;
        this.parent = parentScope;
        this.child = null;
        if (parentScope !== null)
            parentScope.child = this;
        this.start = start;
        this.end = end;
        this.callbackInfo = {
            thiz: undefined,
            holder: undefined,
            data: 0,
            args: undefined,
            fn: undefined
        };
    }
    reuse(parentScope) {
        this.start = this.end = parentScope.end;
        this._escapeCalled = false;
    }
    add(value) {
        const h = this.handleStore.push(value);
        this.end = h + 1;
        return h;
    }
    addExternal(data) {
        return this.add(new External(data));
    }
    dispose() {
        const weak = this.callbackInfo.fn === undefined;
        if (!weak) {
            this.callbackInfo.data = 0;
            this.callbackInfo.args = undefined;
            this.callbackInfo.thiz = undefined;
            this.callbackInfo.holder = undefined;
            this.callbackInfo.fn = undefined;
        }
        if (this.start === this.end)
            return;
        this.handleStore.erase(this.start, this.end, weak);
    }
    escape(handle) {
        if (handle < this.start || handle >= this.end)
            return handle;
        if (this._escapeCalled)
            return 0;
        this._escapeCalled = true;
        if (handle < this.start || handle >= this.end) {
            return 0;
        }
        const id = this.start;
        this.handleStore.swap(handle, id);
        this.start++;
        this.parent.end++;
        return id;
    }
    escapeCalled() {
        return this._escapeCalled;
    }
}

//#endregion src/HandleScope.ts

//#region src/ScopeStore.ts
class ScopeStore extends BaseArrayStore {
    constructor() {
        super();
        this._rootScope = new HandleScope(null, null, 1, HandleStore.MIN_ID);
        this.currentScope = this._rootScope;
    }
    openScope(handleStore) {
        const currentScope = this.currentScope;
        let scope = currentScope.child;
        if (scope) {
            scope.reuse(currentScope);
        }
        else {
            scope = new HandleScope(currentScope, handleStore);
            const id = currentScope.id + 1;
            scope.id = id;
            this._values[id] = scope;
        }
        this.currentScope = scope;
        return scope;
    }
    closeScope() {
        const scope = this.currentScope;
        this.currentScope = scope.parent;
        scope.dispose();
    }
    isEmpty() {
        return this.currentScope === this._rootScope;
    }
}

//#endregion src/ScopeStore.ts

//#region src/TryCatch.ts
class TryCatch {
    constructor(id) {
        this.id = 0;
        this._exception = undefined;
        this._caught = false;
        this._next = null;
        this.id = id;
        this._next = TryCatch.top;
        TryCatch.top = this;
        TryCatch._map.set(id, this);
    }
    static deref(id) {
        return this._map.get(id);
    }
    static pop() {
        const top = TryCatch.top;
        if (top) {
            TryCatch._map.delete(top.id);
            TryCatch.top = top._next;
            top._next = null;
            top.id = 0;
            top._exception = undefined;
            top._caught = false;
        }
    }
    isEmpty() {
        return !this._caught;
    }
    hasCaught() {
        return this._caught;
    }
    exception() {
        return this._exception;
    }
    rethrow(ctx) {
        if (this._caught) {
            const e = this.extractException();
            ctx.setLastException(e);
            return e;
        }
        return undefined;
    }
    setError(err) {
        this._caught = true;
        this._exception = err;
    }
    reset() {
        this._caught = false;
        this._exception = undefined;
    }
    extractException() {
        const e = this._exception;
        this.reset();
        return e;
    }
}
TryCatch.top = null;
TryCatch._map = new Map();

//#endregion src/TryCatch.ts

//#region src/Template.ts
var PropertyAttribute;
(function (PropertyAttribute) {
    PropertyAttribute[PropertyAttribute["None"] = 0] = "None";
    PropertyAttribute[PropertyAttribute["ReadOnly"] = 1] = "ReadOnly";
    PropertyAttribute[PropertyAttribute["DontEnum"] = 2] = "DontEnum";
    PropertyAttribute[PropertyAttribute["DontDelete"] = 4] = "DontDelete";
})(PropertyAttribute || (PropertyAttribute = {}));
class Template {
    constructor(ctx) {
        this._properties = new Map();
        this.ctx = ctx;
    }
    set(name, value, attr) {
        this._properties.set(name, [value, attr]);
    }
    _addPropertiesToInstance(instance) {
        this._properties.forEach((property, name) => {
            const [v, attr] = property;
            if (v instanceof Template) {
                if ('newInstance' in v) {
                    Object.defineProperty(instance, name, {
                        value: v.newInstance(6),
                        writable: !(attr & 1),
                        enumerable: !(attr & 2),
                        configurable: !(attr & 4)
                    });
                }
                else if ('getFunction' in v) {
                    Object.defineProperty(instance, name, {
                        value: v.getFunction(),
                        writable: !(attr & 1),
                        enumerable: !(attr & 2),
                        configurable: !(attr & 4)
                    });
                }
            }
            else {
                Object.defineProperty(instance, name, {
                    value: v,
                    writable: !(attr & 1),
                    enumerable: !(attr & 2),
                    configurable: !(attr & 4)
                });
            }
        });
    }
}

//#endregion src/Template.ts

//#region src/ObjectTemplate.ts
function findHolder(obj, _target) {
    return obj;
}
const internalField = new WeakMap();
function getInternalFieldCount(instance) {
    return internalField.get(instance)?.length ?? 0;
}
function getInternalField(instance, index) {
    return internalField.get(instance)?.[index];
}
function setInternalField(instance, index, value) {
    let fields = internalField.get(instance);
    if (fields) {
        fields[index] = value;
    }
    else {
        fields = [];
        fields[index] = value;
        internalField.set(instance, fields);
    }
}
class ObjectTemplate extends Template {
    constructor(ctx, Ctor) {
        super(ctx);
        this.internalFieldCount = 0;
        this._accessors = new Map();
        this.Ctor = Ctor ?? Object;
    }
    setAccessor(name, getterWrap, setterWrap, getter, setter, data, attribute, getterSideEffectType, setterSideEffectType) {
        this._accessors.set(name, {
            name,
            getterWrap,
            setterWrap,
            getter,
            setter,
            data,
            attribute,
            getterSideEffectType,
            setterSideEffectType
        });
    }
    setInternalFieldCount(value) {
        this.internalFieldCount = value;
    }
    applyToInstance(instance) {
        internalField.set(instance, Array(this.internalFieldCount));
        this._addPropertiesToInstance(instance);
        const createAccessorWrapper = (type, data, cb) => {
            const { ctx } = this;
            function _(value) {
                const scope = ctx.openScope();
                const callbackInfo = scope.callbackInfo;
                let returnValue;
                try {
                    callbackInfo.data = data;
                    callbackInfo.args = type === 'getter' ? [] : [value];
                    callbackInfo.thiz = this;
                    callbackInfo.holder = findHolder(this, _) || this;
                    callbackInfo.fn = _;
                    const ret = cb(value);
                    returnValue = ret ? ctx.jsValueFromNapiValue(ret) : undefined;
                }
                catch (err) {
                    ctx.throwException(err);
                }
                ctx.closeScope(scope);
                if (ctx.hasPendingException()) {
                    if (TryCatch.top) {
                        TryCatch.top.setError(ctx.getAndClearLastException());
                    }
                    else {
                        throw ctx.getAndClearLastException();
                    }
                }
                return returnValue;
            }
            return _;
        };
        this._accessors.forEach((config, name) => {
            const { ctx } = this;
            const { getterWrap, setterWrap, getter, setter, data, attribute } = config;
            Object.defineProperty(instance, name, {
                get: getter
                    ? createAccessorWrapper('getter', data, () => {
                        return getterWrap(ctx.napiValueFromJsValue(name), ctx.getCurrentScope().id, getter);
                    }).bind(instance)
                    : undefined,
                set: setter
                    ? createAccessorWrapper('setter', data, (value) => {
                        return setterWrap(ctx.napiValueFromJsValue(name), ctx.napiValueFromJsValue(value), ctx.getCurrentScope().id, setter);
                    }).bind(instance)
                    : undefined,
                enumerable: !(attribute & 2),
                configurable: !(attribute & 4)
            });
        });
    }
    newInstance(_context) {
        const { ctx, Ctor } = this;
        let instance;
        try {
            instance = new Ctor();
        }
        catch (err) {
            ctx.throwException(err);
        }
        this.applyToInstance(instance);
        return instance;
    }
}

//#endregion src/ObjectTemplate.ts

//#region src/FunctionTemplate.ts
class Signature {
    constructor(receiver) {
        this.receiver = receiver;
    }
}
class FunctionTemplate extends Template {
    constructor(ctx, callback, v8FunctionCallback, data, signature) {
        super(ctx);
        this.ctx = ctx;
        this.callback = callback;
        this.v8FunctionCallback = v8FunctionCallback;
        this.data = data;
        this.className = undefined;
        this.signature = signature;
        this._cached = [undefined];
    }
    setClassName(name) {
        this.className = name;
    }
    instanceTemplate() {
        if (!this._instanceTemplate) {
            this._instanceTemplate = new ObjectTemplate(this.ctx);
        }
        return this._instanceTemplate;
    }
    prototypeTemplate() {
        if (!this._prototypeTemplate) {
            this._prototypeTemplate = new ObjectTemplate(this.ctx);
        }
        return this._prototypeTemplate;
    }
    getFunction() {
        if (this._cached[0]) {
            return this._cached[0];
        }
        const { ctx, callback, v8FunctionCallback, data, signature, _instanceTemplate } = this;
        function _(...args) {
            if (signature && signature.receiver) {
                const f = signature.receiver.getFunction();
                if (!(this instanceof f)) {
                    throw new TypeError('Illegal invocation');
                }
            }
            const scope = ctx.openScope();
            const callbackInfo = scope.callbackInfo;
            let returnValue;
            try {
                callbackInfo.data = data;
                callbackInfo.args = args;
                callbackInfo.thiz = this;
                callbackInfo.holder = findHolder(this, _) || this;
                callbackInfo.fn = _;
                if (_instanceTemplate && this instanceof _) {
                    _instanceTemplate.applyToInstance(this);
                }
                const ret = callback(ctx.getCurrentScope().id, v8FunctionCallback);
                returnValue = ret ? ctx.jsValueFromNapiValue(ret) : undefined;
            }
            catch (err) {
                if (err !== 'unwind') {
                    ctx.throwException(err);
                }
            }
            finally {
                ctx.closeScope(scope);
            }
            if (ctx.hasPendingException()) {
                if (TryCatch.top) {
                    TryCatch.top.setError(ctx.getAndClearLastException());
                }
                else {
                    throw ctx.getAndClearLastException();
                }
            }
            return returnValue;
        }
        if (typeof this.className === 'string') {
            this.ctx.features.setFunctionName?.(_, this.className);
        }
        if (this._prototypeTemplate) {
            this._prototypeTemplate.applyToInstance(_.prototype);
        }
        this._addPropertiesToInstance(_);
        this._cached[0] = _;
        return _;
    }
}

//#endregion src/FunctionTemplate.ts

//#region src/Private.ts
const globalPrivateRegistry = new Map();
const map = new WeakMap();
class Private {
    constructor(name) {
        this._name = name;
    }
    name() {
        return this._name;
    }
    static forApi(name) {
        let privateInstance = globalPrivateRegistry.get(name);
        if (!privateInstance) {
            privateInstance = new Private(name);
            globalPrivateRegistry.set(name, privateInstance);
        }
        return privateInstance;
    }
}
function setPrivate(obj, key, value) {
    if (!(key instanceof Private)) {
        throw new TypeError('Expected key to be an instance of Private');
    }
    let m = map.get(key);
    if (!m) {
        m = new WeakMap();
        map.set(key, m);
    }
    m.set(obj, value);
}
function getPrivate(obj, key) {
    if (!(key instanceof Private)) {
        throw new TypeError('Expected key to be an instance of Private');
    }
    const m = map.get(key);
    if (!m) {
        return undefined;
    }
    return m.get(obj);
}
function hasPrivate(obj, key) {
    if (!(key instanceof Private)) {
        throw new TypeError('Expected key to be an instance of Private');
    }
    const m = map.get(key);
    if (!m) {
        return false;
    }
    return m.has(obj);
}
function deletePrivate(obj, key) {
    if (!(key instanceof Private)) {
        throw new TypeError('Expected key to be an instance of Private');
    }
    const m = map.get(key);
    if (!m || !m.has(obj)) {
        return true;
    }
    return m.delete(obj);
}

//#endregion src/Private.ts

//#region src/ExternalMemory.ts
const kMaxReasonableBytes = BigInt(1) << BigInt(60);
const kMinReasonableBytes = -kMaxReasonableBytes;
class ExternalMemory {
    constructor(onChange) {
        this.total = BigInt(0);
        this.onChange = onChange ?? null;
    }
    adjust(changeInBytes) {
        changeInBytes = BigInt(changeInBytes);
        if (!(kMinReasonableBytes <= changeInBytes && changeInBytes < kMaxReasonableBytes)) {
            throw new RangeError(`changeInBytes ${changeInBytes} is out of reasonable range`);
        }
        const old = this.total;
        this.total += changeInBytes;
        const amount = this.total;
        const onChange = this.onChange;
        if (changeInBytes) {
            onChange?.(amount, old, changeInBytes);
        }
        return amount;
    }
}

//#endregion src/ExternalMemory.ts

//#region src/Isolate.ts
class Isolate {
    constructor(options) {
        this.features = detectFeatures(options?.features);
        this._globalThis = this.features.getGlobalThis();
        this._scopeStore = new ScopeStore();
        this._handleStore = new HandleStore(this.features);
        this.globalHandleStore = new PersistentStore();
        this._lastException = new Persistent(this);
        this._externalMemory = new ExternalMemory(options?.onExternalMemoryChange);
    }
    napiValueFromJsValue(value) {
        switch (value) {
            case undefined: return 2;
            case null: return 3;
            case false: return 4;
            case true: return 5;
            case '': return 7;
            case this._globalThis: return 6;
            default: return this._scopeStore.currentScope.add(value);
        }
    }
    jsValueFromNapiValue(napiValue) {
        return this._handleStore.deepDeref(napiValue);
    }
    deleteRefSlotValue(id) {
        this._handleStore.refValues.delete(Number(id));
    }
    getRefSlotValue(id) {
        return this._handleStore.refValues.get(Number(id));
    }
    setRefSlotValue(id, ref) {
        this._handleStore.refValues.set(Number(id), ref);
    }
    createReference(...args) {
        return new Persistent(this, ...args);
    }
    insertRef(persistent) {
        this.globalHandleStore.insert(persistent);
    }
    getRef(ref) {
        return this.globalHandleStore.deref(ref);
    }
    removeRef(ref, force = false) {
        if (force || this._scopeStore.isEmpty()) {
            const persistent = this.globalHandleStore.deref(ref);
            persistent?.dispose();
        }
        else {
            this.globalHandleStore.markUnused(ref);
        }
    }
    getTryCatch(address) {
        return TryCatch.deref(address);
    }
    pushTryCatch(address) {
        const tryCatch = new TryCatch(address);
        return tryCatch;
    }
    popTryCatch(address) {
        if (address !== TryCatch.top?.id) {
            throw new Error('TryCatch mismatch');
        }
        return TryCatch.pop();
    }
    setLastException(err) {
        this._lastException.resetTo(err);
    }
    throwException(err) {
        if (TryCatch.top) {
            TryCatch.top.setError(err);
        }
        else {
            this.setLastException(err);
        }
        return err;
    }
    hasPendingException() {
        return !this._lastException.isEmpty();
    }
    getAndClearLastException() {
        const err = this._lastException.deref();
        this._lastException.reset();
        return err;
    }
    adjustAmountOfExternalAllocatedMemory(changeInBytes) {
        return this._externalMemory.adjust(changeInBytes);
    }
    createSignature(template) {
        return new Signature(template);
    }
    createObjectTemplate(constructor) {
        return new ObjectTemplate(this, constructor);
    }
    setInternalField(obj, index, value) {
        setInternalField(obj, index, value);
    }
    getInternalField(obj, index) {
        return getInternalField(obj, index);
    }
    getInternalFieldCount(obj) {
        return getInternalFieldCount(obj);
    }
    createFunctionTemplate(callback, v8FunctionCallback, data, signature) {
        const functionTemplate = new FunctionTemplate(this, callback, v8FunctionCallback, data, signature);
        return functionTemplate;
    }
    isScopeEmpty() {
        return this._scopeStore.isEmpty();
    }
    getCurrentScope() {
        return this._scopeStore.currentScope;
    }
    openScope() {
        return this._scopeStore.openScope(this._handleStore);
    }
    closeScope(_scope) {
        this._scopeStore.closeScope();
        if (this.isScopeEmpty()) {
            this.globalHandleStore.recycle();
        }
    }
    getHandleScope(scope) {
        return this._scopeStore.deref(scope);
    }
    getCallbackInfo(info) {
        return this._scopeStore.deref(info).callbackInfo;
    }
    createExternal(data) {
        return new External(data);
    }
    getExternalValue(external) {
        return getExternalValue(external);
    }
    isExternal(value) {
        return isExternal(value);
    }
    createResolver() {
        return this.features.withResolvers.call(Promise);
    }
    createPrivate(name) {
        return new Private(name);
    }
    getOrCreateGlobalPrivate(name) {
        return Private.forApi(name);
    }
    setPrivate(obj, key, value) {
        return setPrivate(obj, key, value);
    }
    getPrivate(obj, key) {
        return getPrivate(obj, key);
    }
    hasPrivate(obj, key) {
        return hasPrivate(obj, key);
    }
    deletePrivate(obj, key) {
        return deletePrivate(obj, key);
    }
}

//#endregion src/Isolate.ts

//#region src/Context.ts
const callbackWrapper = (envObject, callback) => {
    const napiValue = envObject.callIntoModule(callback);
    return (!napiValue) ? undefined : envObject.ctx.jsValueFromNapiValue(napiValue);
};
const withScope = (envObject, thiz, args, data, getFunction, wrapper, callback) => {
    const scope = envObject.ctx.openScope(envObject);
    const callbackInfo = scope.callbackInfo;
    callbackInfo.data = data;
    callbackInfo.args = args;
    callbackInfo.thiz = thiz;
    callbackInfo.fn = getFunction;
    try {
        return wrapper(envObject, callback);
    }
    catch (e) {
        if (e !== 'unwind') {
            throw e;
        }
    }
    finally {
        envObject.ctx.closeScope(envObject, scope);
    }
};
class CleanupHookCallback {
    constructor(envObject, fn, arg, order) {
        this.envObject = envObject;
        this.fn = fn;
        this.arg = arg;
        this.order = order;
    }
}
class CleanupQueue {
    constructor() {
        this._cleanupHooks = [];
        this._cleanupHookCounter = 0;
    }
    empty() {
        return this._cleanupHooks.length === 0;
    }
    add(envObject, fn, arg) {
        if (this._cleanupHooks.filter((hook) => (hook.envObject === envObject && hook.fn === fn && hook.arg === arg)).length > 0) {
            throw new Error('Can not add same fn and arg twice');
        }
        this._cleanupHooks.push(new CleanupHookCallback(envObject, fn, arg, this._cleanupHookCounter++));
    }
    remove(envObject, fn, arg) {
        for (let i = 0; i < this._cleanupHooks.length; ++i) {
            const hook = this._cleanupHooks[i];
            if (hook.envObject === envObject && hook.fn === fn && hook.arg === arg) {
                this._cleanupHooks.splice(i, 1);
                return;
            }
        }
    }
    drain() {
        const hooks = this._cleanupHooks.slice();
        hooks.sort((a, b) => (b.order - a.order));
        for (let i = 0; i < hooks.length; ++i) {
            const cb = hooks[i];
            if (typeof cb.fn === 'number') {
                cb.envObject.bridge.makeDynCall_vp(cb.fn)(cb.arg);
            }
            else {
                cb.fn(cb.arg);
            }
            this._cleanupHooks.splice(this._cleanupHooks.indexOf(cb), 1);
        }
    }
    dispose() {
        this._cleanupHooks.length = 0;
        this._cleanupHookCounter = 0;
    }
}
class NodejsWaitingRequestCounter {
    constructor(MessageChannel) {
        this.refHandle = new MessageChannel().port1;
        this.count = 0;
    }
    increase() {
        if (this.count === 0) {
            if (this.refHandle.ref) {
                this.refHandle.ref();
            }
        }
        this.count++;
    }
    decrease() {
        if (this.count === 0)
            return;
        if (this.count === 1) {
            if (this.refHandle.unref) {
                this.refHandle.unref();
            }
        }
        this.count--;
    }
}
class Context {
    constructor(options) {
        this._isStopping = false;
        this._canCallIntoJs = true;
        this._suppressDestroy = false;
        this.envStore = new ArrayStore();
        this.refStore = new Map();
        this.isolate = new Isolate(options);
        this.features = this.isolate.features;
        this.cleanupQueue = new CleanupQueue();
        if (typeof process === 'object' && process !== null && typeof process.once === 'function' && this.features.MessageChannel) {
            this.refCounter = new NodejsWaitingRequestCounter(this.features.MessageChannel);
            process.once('beforeExit', () => {
                if (!this._suppressDestroy) {
                    this.destroy();
                }
            });
        }
    }
    getIsolate() {
        return this.isolate;
    }
    suppressDestroy() {
        this._suppressDestroy = true;
    }
    getRuntimeVersions() {
        return {
            version,
            NODE_API_SUPPORTED_VERSION_MAX,
            NAPI_VERSION_EXPERIMENTAL,
            NODE_API_DEFAULT_MODULE_API_VERSION,
            NODE_MODULE_VERSION
        };
    }
    createNotSupportWeakRefError(api, message) {
        return new NotSupportWeakRefError(api, message);
    }
    createNotSupportBufferError(api, message) {
        return new NotSupportBufferError(api, message);
    }
    createReference(envObject, handle_id, initialRefcount, ownership) {
        return Reference.create(this, envObject, handle_id, initialRefcount, ownership);
    }
    createReferenceWithData(envObject, handle_id, initialRefcount, ownership, data) {
        return ReferenceWithData.create(this, envObject, handle_id, initialRefcount, ownership, data);
    }
    createReferenceWithFinalizer(envObject, handle_id, initialRefcount, ownership, finalize_callback = 0, finalize_data = 0, finalize_hint = 0) {
        return ReferenceWithFinalizer.create(this, envObject, handle_id, initialRefcount, ownership, finalize_callback, finalize_data, finalize_hint);
    }
    createResolver() {
        return this.isolate.createResolver();
    }
    adjustAmountOfExternalAllocatedMemory(changeInBytes) {
        return this.isolate.adjustAmountOfExternalAllocatedMemory(changeInBytes);
    }
    createEnv(filename, moduleApiVersion, bridge, nodeBinding) {
        moduleApiVersion = typeof moduleApiVersion !== 'number' ? NODE_API_DEFAULT_MODULE_API_VERSION : moduleApiVersion;
        if (moduleApiVersion < NODE_API_DEFAULT_MODULE_API_VERSION) {
            moduleApiVersion = NODE_API_DEFAULT_MODULE_API_VERSION;
        }
        else if (moduleApiVersion > NODE_API_SUPPORTED_VERSION_MAX && moduleApiVersion !== NAPI_VERSION_EXPERIMENTAL) {
            const errorMessage = `${filename} requires Node-API version ${moduleApiVersion}, but this version of Node.js only supports version ${NODE_API_SUPPORTED_VERSION_MAX} add-ons.`;
            throw new Error(errorMessage);
        }
        const env = new NodeEnv(this, this.envStore, { ...bridge });
        env.filename = filename;
        env.moduleApiVersion = moduleApiVersion;
        env.nodeBinding = nodeBinding;
        this.addCleanupHook(env, () => { env.unref(); }, 0);
        return env;
    }
    createFunction(envObject, napiCallback, data, name, dynamicExecution) {
        if (envObject.ctx !== this) {
            throw new Error(`The napi_env (${envObject.bridge.address}) is not created by this context`);
        }
        const callback = (envObject) => {
            return napiCallback(envObject.bridge.address, envObject.ctx.getCurrentScope().id);
        };
        let _;
        const staticFunctionWrapper = (withScope, envObject, data, callbackWrapper, callback) => {
            return function (...args) {
                return withScope(envObject, this, args, data, _, callbackWrapper, callback);
            };
        };
        let functionWrapper;
        if (name && dynamicExecution && this.features.makeDynamicFunction) {
            try {
                functionWrapper = this.features.makeDynamicFunction('withScope', 'envObject', 'data', 'callbackWrapper', 'callback', 'return function ' + name + '(...args){' +
                    'return withScope(envObject,this,args,data,' + name + ',callbackWrapper,callback)' +
                    '};');
            }
            catch (_) {
                functionWrapper = staticFunctionWrapper;
            }
        }
        else {
            functionWrapper = staticFunctionWrapper;
        }
        _ = functionWrapper(withScope, envObject, data, callbackWrapper, callback);
        if (functionWrapper === staticFunctionWrapper && this.features.setFunctionName && name) {
            this.features.setFunctionName(_, name);
        }
        return _;
    }
    createTrackedFinalizer(envObject, finalize_callback, finalize_data, finalize_hint) {
        return TrackedFinalizer.create(envObject, finalize_callback, finalize_data, finalize_hint);
    }
    getCurrentScope() {
        return this.isolate.getCurrentScope();
    }
    openScope(envObject) {
        const scope = this.isolate.openScope();
        envObject.openHandleScopes++;
        return scope;
    }
    closeScope(envObject, scope) {
        this.isolate.closeScope(scope);
        envObject.openHandleScopes--;
    }
    getEnv(env) {
        return this.envStore.deref(env);
    }
    getRef(ref) {
        return this.refStore.get(Number(ref));
    }
    getHandleScope(scope) {
        return this.isolate.getHandleScope(scope);
    }
    getCallbackInfo(info) {
        return this.isolate.getCallbackInfo(info);
    }
    napiValueFromJsValue(value) {
        return this.isolate.napiValueFromJsValue(value);
    }
    jsValueFromNapiValue(napiValue) {
        return this.isolate.jsValueFromNapiValue(napiValue);
    }
    createExternal(data) {
        return this.isolate.createExternal(data);
    }
    getExternalValue(external) {
        return this.isolate.getExternalValue(external);
    }
    isExternal(value) {
        return this.isolate.isExternal(value);
    }
    addCleanupHook(envObject, fn, arg) {
        this.cleanupQueue.add(envObject, fn, arg);
    }
    removeCleanupHook(envObject, fn, arg) {
        this.cleanupQueue.remove(envObject, fn, arg);
    }
    runCleanup() {
        while (!this.cleanupQueue.empty()) {
            this.cleanupQueue.drain();
        }
    }
    increaseWaitingRequestCounter() {
        this.refCounter?.increase();
    }
    decreaseWaitingRequestCounter() {
        this.refCounter?.decrease();
    }
    setCanCallIntoJs(value) {
        this._canCallIntoJs = value;
    }
    setStopping(value) {
        this._isStopping = value;
    }
    canCallIntoJs() {
        return this._canCallIntoJs && !this._isStopping;
    }
    getDylinkMetadata(binary) {
        return getDylinkMetadata(binary);
    }
    destroy() {
        this.setStopping(true);
        this.setCanCallIntoJs(false);
        this.runCleanup();
    }
}
let defaultContext;
function createContext(options) {
    return new Context(options);
}
function getDefaultContext() {
    if (!defaultContext) {
        defaultContext = createContext();
    }
    return defaultContext;
}

//#endregion src/Context.ts

export { ArrayStore, BaseArrayStore, Context, CountIdAllocator, CountIdReuseAllocator, Disposable, EmnapiError, Env, External, Finalizer, FunctionTemplate, HandleScope, HandleStore, Isolate, NAPI_VERSION_EXPERIMENTAL, NODE_API_DEFAULT_MODULE_API_VERSION, NODE_API_SUPPORTED_VERSION_MAX, NODE_API_SUPPORTED_VERSION_MIN, NodeEnv, NotSupportBufferError, NotSupportWeakRefError, ObjectTemplate, Persistent, PersistentStore, Private, RefTracker, Reference, ReferenceOwnership, ReferenceWithData, ReferenceWithFinalizer, ScopeStore, Signature, StrongRef, Template, TrackedFinalizer, TryCatch, createContext, deletePrivate, getDefaultContext, getDylinkMetadata, getExternalValue, getInternalField, getPrivate, hasPrivate, isExternal, isReferenceType, setInternalField, setPrivate, version };
//# sourceMappingURL=emnapi.js.map

//#region src/util.ts
const _WebAssembly$1 = typeof WebAssembly !== 'undefined'
    ? WebAssembly
    : typeof WXWebAssembly !== 'undefined'
        ? WXWebAssembly
        : undefined;
function validateImports(imports) {
    if (imports && typeof imports !== 'object') {
        throw new TypeError('imports must be an object or undefined');
    }
    return true;
}
function load(wasmInput, imports) {
    if (!wasmInput)
        throw new TypeError('Invalid wasm source');
    validateImports(imports);
    imports = imports ?? {};
    try {
        const then = typeof wasmInput === 'object' && wasmInput !== null && 'then' in wasmInput ? wasmInput.then : undefined;
        if (typeof then === 'function') {
            return then.call(wasmInput, (input) => load(input, imports));
        }
    }
    catch (_) { }
    if (wasmInput instanceof ArrayBuffer || ArrayBuffer.isView(wasmInput)) {
        return _WebAssembly$1.instantiate(wasmInput, imports);
    }
    if (wasmInput instanceof _WebAssembly$1.Module) {
        return _WebAssembly$1.instantiate(wasmInput, imports).then((instance) => {
            return { instance, module: wasmInput };
        });
    }
    if (typeof Response !== 'undefined' && wasmInput instanceof Response) {
        return wasmInput.arrayBuffer().then(buffer => {
            return _WebAssembly$1.instantiate(buffer, imports);
        });
    }
    const inputIsString = typeof wasmInput === 'string';
    if (inputIsString || (typeof URL !== 'undefined' && wasmInput instanceof URL)) {
        if (inputIsString && typeof wx !== 'undefined' && typeof __wxConfig !== 'undefined') {
            return _WebAssembly$1.instantiate(wasmInput, imports);
        }
        if (typeof fetch !== 'function') {
            throw new TypeError('wasm source can not be a string or URL in this environment');
        }
        if (typeof _WebAssembly$1.instantiateStreaming === 'function') {
            try {
                return _WebAssembly$1.instantiateStreaming(fetch(wasmInput), imports).catch(() => {
                    return load(fetch(wasmInput), imports);
                });
            }
            catch (_) {
                return load(fetch(wasmInput), imports);
            }
        }
        else {
            return load(fetch(wasmInput), imports);
        }
    }
    throw new TypeError('Invalid wasm source');
}
function loadSync(wasmInput, imports) {
    if (!wasmInput)
        throw new TypeError('Invalid wasm source');
    validateImports(imports);
    imports = imports ?? {};
    let module;
    if ((wasmInput instanceof ArrayBuffer) || ArrayBuffer.isView(wasmInput)) {
        module = new _WebAssembly$1.Module(wasmInput);
    }
    else if (wasmInput instanceof WebAssembly.Module) {
        module = wasmInput;
    }
    else {
        throw new TypeError('Invalid wasm source');
    }
    const instance = new _WebAssembly$1.Instance(module, imports);
    const source = { instance, module };
    return source;
}

//#endregion src/util.ts

//#region dist/wasi-threads.js
//#region src/util.ts
const _WebAssembly = typeof WebAssembly !== 'undefined'
    ? WebAssembly
    : typeof WXWebAssembly !== 'undefined'
        ? WXWebAssembly
        : undefined;
const ENVIRONMENT_IS_NODE = typeof process === 'object' && process !== null &&
    typeof process.versions === 'object' && process.versions !== null &&
    typeof process.versions.node === 'string';
function getPostMessage(options) {
    return typeof options?.postMessage === 'function'
        ? options.postMessage
        : typeof postMessage === 'function'
            ? postMessage
            : undefined;
}
function serizeErrorToBuffer(sab, code, error) {
    const i32array = new Int32Array(sab);
    Atomics.store(i32array, 0, code);
    if (code > 1 && error) {
        const name = error.name;
        const message = error.message;
        const stack = error.stack;
        const nameBuffer = new TextEncoder().encode(name);
        const messageBuffer = new TextEncoder().encode(message);
        const stackBuffer = new TextEncoder().encode(stack);
        Atomics.store(i32array, 1, nameBuffer.length);
        Atomics.store(i32array, 2, messageBuffer.length);
        Atomics.store(i32array, 3, stackBuffer.length);
        const buffer = new Uint8Array(sab);
        buffer.set(nameBuffer, 16);
        buffer.set(messageBuffer, 16 + nameBuffer.length);
        buffer.set(stackBuffer, 16 + nameBuffer.length + messageBuffer.length);
    }
}
function deserizeErrorFromBuffer(sab) {
    const i32array = new Int32Array(sab);
    const status = Atomics.load(i32array, 0);
    if (status <= 1) {
        return null;
    }
    const nameLength = Atomics.load(i32array, 1);
    const messageLength = Atomics.load(i32array, 2);
    const stackLength = Atomics.load(i32array, 3);
    const buffer = new Uint8Array(sab);
    const nameBuffer = buffer.slice(16, 16 + nameLength);
    const messageBuffer = buffer.slice(16 + nameLength, 16 + nameLength + messageLength);
    const stackBuffer = buffer.slice(16 + nameLength + messageLength, 16 + nameLength + messageLength + stackLength);
    const name = new TextDecoder().decode(nameBuffer);
    const message = new TextDecoder().decode(messageBuffer);
    const stack = new TextDecoder().decode(stackBuffer);
    const ErrorConstructor = globalThis[name] ?? (name === 'RuntimeError' ? (_WebAssembly.RuntimeError ?? Error) : Error);
    const error = new ErrorConstructor(message);
    Object.defineProperty(error, 'stack', {
        value: stack,
        writable: true,
        enumerable: false,
        configurable: true
    });
    return error;
}
function isSharedArrayBuffer(value) {
    return ((typeof SharedArrayBuffer === 'function' && value instanceof SharedArrayBuffer) ||
        (Object.prototype.toString.call(value) === '[object SharedArrayBuffer]'));
}
function isTrapError(e) {
    try {
        return e instanceof _WebAssembly.RuntimeError;
    }
    catch (_) {
        return false;
    }
}

//#endregion src/util.ts

//#region src/command.ts
function createMessage(type, payload) {
    return {
        __emnapi__: {
            type,
            payload
        }
    };
}

//#endregion src/command.ts

//#region src/thread-manager.ts
const WASI_THREADS_MAX_TID = 0x1FFFFFFF;
function checkSharedWasmMemory(wasmMemory) {
    if (wasmMemory) {
        if (!isSharedArrayBuffer(wasmMemory.buffer)) {
            throw new Error('Multithread features require shared wasm memory. ' +
                'Try to compile with `-matomics -mbulk-memory` and use `--import-memory --shared-memory` during linking, ' +
                'then create WebAssembly.Memory with `shared: true` option');
        }
    }
    else {
        if (typeof SharedArrayBuffer === 'undefined') {
            throw new Error('Current environment does not support SharedArrayBuffer, threads are not available!');
        }
    }
}
function getReuseWorker(value) {
    if (typeof value === 'boolean') {
        return value ? { size: 0, strict: false } : false;
    }
    if (typeof value === 'number') {
        if (!(value >= 0)) {
            throw new RangeError('reuseWorker: size must be a non-negative integer');
        }
        return { size: value, strict: false };
    }
    if (!value) {
        return false;
    }
    const size = Number(value.size) || 0;
    const strict = Boolean(value.strict);
    if (!(size > 0) && strict) {
        throw new RangeError('reuseWorker: size must be set to positive integer if strict is set to true');
    }
    return { size, strict };
}
let nextWorkerID = 0;
class ThreadManager {
    get nextWorkerID() { return nextWorkerID; }
    constructor(options) {
        this.unusedWorkers = [];
        this.pthreads = Object.create(null);
        this.wasmModule = null;
        this.wasmMemory = null;
        this.messageEvents = new WeakMap();
        if (!options) {
            throw new TypeError('ThreadManager(): options is not provided');
        }
        if ('childThread' in options) {
            this._childThread = Boolean(options.childThread);
        }
        else {
            this._childThread = false;
        }
        if (this._childThread) {
            this._onCreateWorker = undefined;
            this._reuseWorker = false;
            this._beforeLoad = undefined;
        }
        else {
            this._onCreateWorker = options.onCreateWorker;
            this._reuseWorker = getReuseWorker(options.reuseWorker);
            this._beforeLoad = options.beforeLoad;
        }
        this.printErr = options.printErr ?? console.error.bind(console);
        this.threadSpawn = options.threadSpawn;
    }
    init() {
        if (!this._childThread) {
            this.initMainThread();
        }
    }
    initMainThread() {
        this.preparePool();
    }
    preparePool() {
        if (this._reuseWorker) {
            if (this._reuseWorker.size) {
                let pthreadPoolSize = this._reuseWorker.size;
                while (pthreadPoolSize--) {
                    const worker = this.allocateUnusedWorker();
                    if (ENVIRONMENT_IS_NODE) {
                        worker.once('message', () => { });
                        worker.unref();
                    }
                }
            }
        }
    }
    shouldPreloadWorkers() {
        return !this._childThread && this._reuseWorker && this._reuseWorker.size > 0;
    }
    loadWasmModuleToAllWorkers() {
        const promises = Array(this.unusedWorkers.length);
        for (let i = 0; i < this.unusedWorkers.length; ++i) {
            const worker = this.unusedWorkers[i];
            if (ENVIRONMENT_IS_NODE)
                worker.ref();
            promises[i] = this.loadWasmModuleToWorker(worker).then((w) => {
                if (ENVIRONMENT_IS_NODE)
                    worker.unref();
                return w;
            }, (e) => {
                if (ENVIRONMENT_IS_NODE)
                    worker.unref();
                throw e;
            });
        }
        return Promise.all(promises).catch((err) => {
            this.terminateAllThreads();
            throw err;
        });
    }
    preloadWorkers() {
        if (this.shouldPreloadWorkers()) {
            return this.loadWasmModuleToAllWorkers();
        }
        return Promise.resolve([]);
    }
    setup(wasmModule, wasmMemory) {
        this.wasmModule = wasmModule;
        this.wasmMemory = wasmMemory;
    }
    markId(worker) {
        if (worker.__emnapi_tid)
            return worker.__emnapi_tid;
        const tid = nextWorkerID + 43;
        nextWorkerID = (nextWorkerID + 1) % (WASI_THREADS_MAX_TID - 42);
        this.pthreads[tid] = worker;
        worker.__emnapi_tid = tid;
        return tid;
    }
    returnWorkerToPool(worker) {
        var tid = worker.__emnapi_tid;
        if (tid !== undefined) {
            delete this.pthreads[tid];
        }
        this.unusedWorkers.push(worker);
        delete worker.__emnapi_tid;
        if (ENVIRONMENT_IS_NODE) {
            worker.unref();
        }
    }
    loadWasmModuleToWorker(worker, sab) {
        if (worker.whenLoaded)
            return worker.whenLoaded;
        const err = this.printErr;
        const beforeLoad = this._beforeLoad;
        const _this = this;
        worker.whenLoaded = new Promise((resolve, reject) => {
            const handleError = function (e) {
                let message = 'worker sent an error!';
                if (worker.__emnapi_tid !== undefined) {
                    message = 'worker (tid = ' + worker.__emnapi_tid + ') sent an error!';
                }
                if ('message' in e) {
                    err(message + ' ' + e.message);
                    if (e.message.indexOf('RuntimeError') !== -1 || e.message.indexOf('unreachable') !== -1) {
                        try {
                            _this.terminateAllThreads();
                        }
                        catch (_) { }
                    }
                }
                else {
                    err(message);
                }
                reject(e);
                throw e;
            };
            const handleMessage = (data) => {
                if (data.__emnapi__) {
                    const type = data.__emnapi__.type;
                    const payload = data.__emnapi__.payload;
                    if (type === 'loaded') {
                        worker.loaded = true;
                        if (ENVIRONMENT_IS_NODE && !worker.__emnapi_tid) {
                            worker.unref();
                        }
                        resolve(worker);
                    }
                    else if (type === 'cleanup-thread') {
                        if (payload.tid in this.pthreads) {
                            this.cleanThread(worker, payload.tid);
                        }
                    }
                    else if (type === 'spawn-thread') {
                        this.threadSpawn(payload.startArg, payload.errorOrTid);
                    }
                    else if (type === 'terminate-all-threads') {
                        this.terminateAllThreads();
                    }
                }
            };
            worker.onmessage = (e) => {
                handleMessage(e.data);
                this.fireMessageEvent(worker, e);
            };
            worker.onerror = handleError;
            if (ENVIRONMENT_IS_NODE) {
                worker.on('message', function (data) {
                    worker.onmessage?.({
                        data
                    });
                });
                worker.on('error', function (e) {
                    worker.onerror?.(e);
                });
                worker.on('detachedExit', function () { });
            }
            if (typeof beforeLoad === 'function') {
                beforeLoad(worker);
            }
            try {
                worker.postMessage(createMessage('load', {
                    wasmModule: this.wasmModule,
                    wasmMemory: this.wasmMemory,
                    sab
                }));
            }
            catch (err) {
                checkSharedWasmMemory(this.wasmMemory);
                throw err;
            }
        });
        return worker.whenLoaded;
    }
    allocateUnusedWorker() {
        const _onCreateWorker = this._onCreateWorker;
        if (typeof _onCreateWorker !== 'function') {
            throw new TypeError('`options.onCreateWorker` is not provided');
        }
        const worker = _onCreateWorker({ type: 'thread', name: 'emnapi-pthread' });
        this.unusedWorkers.push(worker);
        return worker;
    }
    getNewWorker(sab) {
        if (this._reuseWorker) {
            if (this.unusedWorkers.length === 0) {
                if (this._reuseWorker.strict) {
                    if (!ENVIRONMENT_IS_NODE) {
                        const err = this.printErr;
                        err('Tried to spawn a new thread, but the thread pool is exhausted.\n' +
                            'This might result in a deadlock unless some threads eventually exit or the code explicitly breaks out to the event loop.');
                        return;
                    }
                }
                const worker = this.allocateUnusedWorker();
                this.loadWasmModuleToWorker(worker, sab);
            }
            return this.unusedWorkers.pop();
        }
        const worker = this.allocateUnusedWorker();
        this.loadWasmModuleToWorker(worker, sab);
        return this.unusedWorkers.pop();
    }
    cleanThread(worker, tid, force) {
        if (!force && this._reuseWorker) {
            this.returnWorkerToPool(worker);
        }
        else {
            delete this.pthreads[tid];
            this.terminateWorker(worker);
            delete worker.__emnapi_tid;
        }
    }
    terminateWorker(worker) {
        const tid = worker.__emnapi_tid;
        worker.terminate();
        this.messageEvents.get(worker)?.clear();
        this.messageEvents.delete(worker);
        worker.onmessage = (e) => {
            if (e.data.__emnapi__) {
                const err = this.printErr;
                err('received "' + e.data.__emnapi__.type + '" command from terminated worker: ' + tid);
            }
        };
    }
    terminateAllThreads() {
        const runningWorkers = Object.values(this.pthreads);
        for (let i = 0; i < runningWorkers.length; ++i) {
            this.terminateWorker(runningWorkers[i]);
        }
        for (let i = 0; i < this.unusedWorkers.length; ++i) {
            this.terminateWorker(this.unusedWorkers[i]);
        }
        this.unusedWorkers = [];
        this.pthreads = Object.create(null);
        this.preparePool();
    }
    addMessageEventListener(worker, onMessage) {
        let listeners = this.messageEvents.get(worker);
        if (!listeners) {
            listeners = new Set();
            this.messageEvents.set(worker, listeners);
        }
        listeners.add(onMessage);
        return () => {
            listeners?.delete(onMessage);
        };
    }
    fireMessageEvent(worker, e) {
        const listeners = this.messageEvents.get(worker);
        if (!listeners)
            return;
        const err = this.printErr;
        listeners.forEach((listener) => {
            try {
                listener(e);
            }
            catch (e) {
                err(e.stack);
            }
        });
    }
}

//#endregion src/thread-manager.ts

//#region src/proxy.ts
const kIsProxy = Symbol('kIsProxy');
function createInstanceProxy(instance, memory) {
    if (instance[kIsProxy])
        return instance;
    const originalExports = instance.exports;
    const createHandler = function (target) {
        const handlers = [
            'apply',
            'construct',
            'defineProperty',
            'deleteProperty',
            'get',
            'getOwnPropertyDescriptor',
            'getPrototypeOf',
            'has',
            'isExtensible',
            'ownKeys',
            'preventExtensions',
            'set',
            'setPrototypeOf'
        ];
        const handler = {};
        for (let i = 0; i < handlers.length; i++) {
            const name = handlers[i];
            handler[name] = function () {
                const args = Array.prototype.slice.call(arguments, 1);
                args.unshift(target);
                return Reflect[name].apply(Reflect, args);
            };
        }
        return handler;
    };
    const handler = createHandler(originalExports);
    const _initialize = () => { };
    const _start = () => 0;
    handler.get = function (_target, p, receiver) {
        if (p === 'memory') {
            return (typeof memory === 'function' ? memory() : memory) ?? Reflect.get(originalExports, p, receiver);
        }
        if (p === '_initialize') {
            return p in originalExports ? _initialize : undefined;
        }
        if (p === '_start') {
            return p in originalExports ? _start : undefined;
        }
        return Reflect.get(originalExports, p, receiver);
    };
    handler.has = function (_target, p) {
        if (p === 'memory')
            return true;
        return Reflect.has(originalExports, p);
    };
    const exportsProxy = new Proxy(Object.create(null), handler);
    return new Proxy(instance, {
        get(target, p, receiver) {
            if (p === 'exports') {
                return exportsProxy;
            }
            if (p === kIsProxy) {
                return true;
            }
            return Reflect.get(target, p, receiver);
        }
    });
}

//#endregion src/proxy.ts

//#region src/wasi-threads.ts
const patchedWasiInstances = new WeakMap();
const THREAD_SPAWN_RESULT_SIZE = Int32Array.BYTES_PER_ELEMENT * 2;
const sharedArrayBufferByteLength = typeof SharedArrayBuffer === 'function'
    ? Object.getOwnPropertyDescriptor(SharedArrayBuffer.prototype, 'byteLength').get
    : undefined;
function isConclusivelySharedArrayBuffer(buffer) {
    if (sharedArrayBufferByteLength === undefined)
        return false;
    try {
        sharedArrayBufferByteLength.call(buffer);
        return true;
    }
    catch (_) {
        return false;
    }
}
function getThreadSpawnResultView(memory, address, wasm64) {
    const offset = typeof address === 'bigint' ? Number(address) : address >>> 0;
    let buffer = memory.buffer;
    if (offset + THREAD_SPAWN_RESULT_SIZE > buffer.byteLength &&
        isConclusivelySharedArrayBuffer(buffer)) {
        if (wasm64) {
            memory.grow(BigInt(0));
        }
        else {
            memory.grow(0);
        }
        buffer = memory.buffer;
    }
    return new Int32Array(buffer, offset, 2);
}
class WASIThreads {
    constructor(options) {
        if (!options) {
            throw new TypeError('WASIThreads(): options is not provided');
        }
        if (!options.wasi) {
            throw new TypeError('WASIThreads(): options.wasi is not provided');
        }
        patchedWasiInstances.set(this, new WeakSet());
        const wasi = options.wasi;
        patchWasiInstance(this, wasi);
        this.wasi = wasi;
        if ('childThread' in options) {
            this.childThread = Boolean(options.childThread);
        }
        else {
            this.childThread = false;
        }
        this.PThread = undefined;
        if ('threadManager' in options) {
            if (typeof options.threadManager === 'function') {
                this.PThread = options.threadManager();
            }
            else {
                this.PThread = options.threadManager;
            }
        }
        else {
            if (!this.childThread) {
                this.PThread = new ThreadManager(options);
                this.PThread.init();
            }
        }
        let waitThreadStart = false;
        if ('waitThreadStart' in options) {
            waitThreadStart = typeof options.waitThreadStart === 'number' ? options.waitThreadStart : Boolean(options.waitThreadStart);
        }
        const postMessage = getPostMessage(options);
        if (this.childThread && typeof postMessage !== 'function') {
            throw new TypeError('options.postMessage is not a function');
        }
        this.postMessage = postMessage;
        const wasm64 = Boolean(options.wasm64);
        const threadSpawn = (startArg, errorOrTid) => {
            const EAGAIN = 6;
            const isNewABI = errorOrTid !== undefined;
            try {
                checkSharedWasmMemory(this.wasmMemory);
            }
            catch (err) {
                this.PThread?.printErr(err.stack);
                if (isNewABI) {
                    const struct = getThreadSpawnResultView(this.wasmMemory, errorOrTid, wasm64);
                    Atomics.store(struct, 0, 1);
                    Atomics.store(struct, 1, EAGAIN);
                    Atomics.notify(struct, 1);
                    return 1;
                }
                else {
                    return -EAGAIN;
                }
            }
            if (!isNewABI) {
                const malloc = this.wasmInstance.exports.malloc;
                errorOrTid = wasm64 ? Number(malloc(BigInt(8))) : (malloc(8) >>> 0);
                if (!errorOrTid) {
                    return -48;
                }
            }
            const _free = this.wasmInstance.exports.free;
            const free = wasm64 ? (ptr) => { _free(BigInt(ptr)); } : _free;
            const struct = getThreadSpawnResultView(this.wasmMemory, errorOrTid, wasm64);
            Atomics.store(struct, 0, 0);
            Atomics.store(struct, 1, 0);
            if (this.childThread) {
                postMessage(createMessage('spawn-thread', {
                    startArg,
                    errorOrTid: errorOrTid
                }));
                Atomics.wait(struct, 1, 0);
                const isError = Atomics.load(struct, 0);
                const result = Atomics.load(struct, 1);
                if (isNewABI) {
                    return isError;
                }
                free(errorOrTid);
                return isError ? -result : result;
            }
            const shouldWait = waitThreadStart || (waitThreadStart === 0);
            let sab;
            if (shouldWait) {
                sab = new Int32Array(new SharedArrayBuffer(16 + 8192));
                Atomics.store(sab, 0, 0);
            }
            let worker;
            let tid;
            const PThread = this.PThread;
            try {
                worker = PThread.getNewWorker(sab);
                if (!worker) {
                    throw new Error('failed to get new worker');
                }
                tid = PThread.markId(worker);
                if (ENVIRONMENT_IS_NODE) {
                    worker.unref();
                }
                worker.postMessage(createMessage('start', {
                    tid,
                    arg: startArg,
                    sab
                }));
                if (shouldWait) {
                    if (typeof waitThreadStart === 'number') {
                        const waitResult = Atomics.wait(sab, 0, 0, waitThreadStart);
                        if (waitResult === 'timed-out') {
                            throw new Error('Spawning thread timed out. Please check if the worker is created successfully and if message is handled properly in the worker.');
                        }
                    }
                    else {
                        Atomics.wait(sab, 0, 0);
                    }
                    const r = Atomics.load(sab, 0);
                    if (r > 1) {
                        throw deserizeErrorFromBuffer(sab.buffer);
                    }
                }
            }
            catch (e) {
                if (worker !== undefined && tid !== undefined) {
                    try {
                        PThread.cleanThread(worker, tid, true);
                    }
                    catch (_) { }
                }
                Atomics.store(struct, 0, 1);
                Atomics.store(struct, 1, EAGAIN);
                Atomics.notify(struct, 1);
                PThread?.printErr(e.stack);
                if (isNewABI) {
                    return 1;
                }
                free(errorOrTid);
                return -EAGAIN;
            }
            Atomics.store(struct, 0, 0);
            Atomics.store(struct, 1, tid);
            Atomics.notify(struct, 1);
            if (!shouldWait) {
                worker.whenLoaded.catch((err) => {
                    delete worker.whenLoaded;
                    PThread.cleanThread(worker, tid, true);
                    throw err;
                });
            }
            if (isNewABI) {
                return 0;
            }
            free(errorOrTid);
            return tid;
        };
        this.threadSpawn = threadSpawn;
        if (this.PThread) {
            this.PThread.threadSpawn = threadSpawn;
        }
    }
    getImportObject() {
        return {
            wasi: {
                'thread-spawn': this.threadSpawn
            }
        };
    }
    setup(wasmInstance, wasmModule, wasmMemory) {
        wasmMemory ??= wasmInstance.exports.memory;
        this.wasmInstance = wasmInstance;
        this.wasmMemory = wasmMemory;
        if (this.PThread) {
            this.PThread.setup(wasmModule, wasmMemory);
        }
    }
    preloadWorkers() {
        if (this.PThread) {
            return this.PThread.preloadWorkers();
        }
        return Promise.resolve([]);
    }
    initialize(instance, module, memory) {
        const exports = instance.exports;
        memory ??= exports.memory;
        if (this.childThread) {
            instance = createInstanceProxy(instance, memory);
        }
        this.setup(instance, module, memory);
        const wasi = this.wasi;
        if (('_start' in exports) && (typeof exports._start === 'function')) {
            if (this.childThread) {
                wasi.start(instance);
                try {
                    const kStarted = getWasiSymbol(wasi, 'kStarted');
                    wasi[kStarted] = false;
                }
                catch (_) { }
            }
            else {
                setupInstance(wasi, instance);
            }
        }
        else {
            wasi.initialize(instance);
        }
        return instance;
    }
    start(instance, module, memory) {
        const exports = instance.exports;
        memory ??= exports.memory;
        if (this.childThread) {
            instance = createInstanceProxy(instance, memory);
        }
        this.setup(instance, module, memory);
        const exitCode = this.wasi.start(instance);
        return { exitCode, instance };
    }
    terminateAllThreads() {
        if (!this.childThread) {
            this.PThread?.terminateAllThreads();
        }
        else {
            this.postMessage(createMessage('terminate-all-threads', {}));
        }
    }
}
function patchWasiInstance(wasiThreads, wasi) {
    const patched = patchedWasiInstances.get(wasiThreads);
    if (patched.has(wasi)) {
        return;
    }
    const _this = wasiThreads;
    const wasiImport = wasi.wasiImport;
    if (wasiImport) {
        const proc_exit = wasiImport.proc_exit;
        wasiImport.proc_exit = function (code) {
            _this.terminateAllThreads();
            return proc_exit.call(this, code);
        };
    }
    if (!_this.childThread) {
        const start = wasi.start;
        if (typeof start === 'function') {
            wasi.start = function (instance) {
                try {
                    return start.call(this, instance);
                }
                catch (err) {
                    if (isTrapError(err)) {
                        _this.terminateAllThreads();
                    }
                    throw err;
                }
            };
        }
    }
    patched.add(wasi);
}
function getWasiSymbol(wasi, description) {
    const symbols = Object.getOwnPropertySymbols(wasi);
    const selectDescription = (description) => (s) => {
        if (s.description) {
            return s.description === description;
        }
        return s.toString() === `Symbol(${description})`;
    };
    if (Array.isArray(description)) {
        return description.map(d => symbols.filter(selectDescription(d))[0]);
    }
    return symbols.filter(selectDescription(description))[0];
}
function setupInstance(wasi, instance) {
    const [kInstance, kSetMemory] = getWasiSymbol(wasi, ['kInstance', 'kSetMemory']);
    wasi[kInstance] = instance;
    wasi[kSetMemory](instance.exports.memory);
}

//#endregion src/wasi-threads.ts

//#region src/worker.ts
class ThreadMessageHandler {
    constructor(options) {
        const postMsg = getPostMessage(options);
        if (typeof postMsg !== 'function') {
            throw new TypeError('options.postMessage is not a function');
        }
        this.postMessage = postMsg;
        this.onLoad = options?.onLoad;
        this.onError = typeof options?.onError === 'function' ? options.onError : (_type, err) => { throw err; };
        this.instance = undefined;
        this.messagesBeforeLoad = [];
    }
    instantiate(data) {
        if (typeof this.onLoad === 'function') {
            return this.onLoad(data);
        }
        throw new Error('ThreadMessageHandler.prototype.instantiate is not implemented');
    }
    handle(e) {
        if (e?.data?.__emnapi__) {
            const type = e.data.__emnapi__.type;
            const payload = e.data.__emnapi__.payload;
            try {
                if (type === 'load') {
                    this._load(payload);
                }
                else if (type === 'start') {
                    this.handleAfterLoad(e, () => {
                        this._start(payload);
                    });
                }
            }
            catch (err) {
                this.onError(err, type);
            }
        }
    }
    _load(payload) {
        if (this.instance !== undefined)
            return;
        let source;
        try {
            source = this.instantiate(payload);
        }
        catch (err) {
            this._loaded(err, null, payload);
            return;
        }
        const then = source && 'then' in source ? source.then : undefined;
        if (typeof then === 'function') {
            then.call(source, (source) => { this._loaded(null, source, payload); }, (err) => { this._loaded(err, null, payload); });
        }
        else {
            this._loaded(null, source, payload);
        }
    }
    _start(payload) {
        const wasi_thread_start = this.instance.exports.wasi_thread_start;
        if (typeof wasi_thread_start !== 'function') {
            const err = new TypeError('wasi_thread_start is not exported');
            notifyPthreadCreateResult(payload.sab, 2, err);
            throw err;
        }
        const postMessage = this.postMessage;
        const tid = payload.tid;
        const startArg = payload.arg;
        notifyPthreadCreateResult(payload.sab, 1);
        try {
            wasi_thread_start(tid, startArg);
        }
        catch (err) {
            if (err !== 'unwind') {
                throw err;
            }
            else {
                return;
            }
        }
        postMessage(createMessage('cleanup-thread', { tid }));
    }
    _loaded(err, source, payload) {
        if (err) {
            notifyPthreadCreateResult(payload.sab, 2, err);
            throw err;
        }
        if (source == null) {
            const err = new TypeError('onLoad should return an object');
            notifyPthreadCreateResult(payload.sab, 2, err);
            throw err;
        }
        const instance = source.instance;
        if (!instance) {
            const err = new TypeError('onLoad should return an object which includes "instance"');
            notifyPthreadCreateResult(payload.sab, 2, err);
            throw err;
        }
        this.instance = instance;
        const postMessage = this.postMessage;
        postMessage(createMessage('loaded', {}));
        const messages = this.messagesBeforeLoad;
        this.messagesBeforeLoad = [];
        for (let i = 0; i < messages.length; i++) {
            const data = messages[i];
            this.handle({ data });
        }
    }
    handleAfterLoad(e, f) {
        if (this.instance !== undefined) {
            f.call(this, e);
        }
        else {
            this.messagesBeforeLoad.push(e.data);
        }
    }
}
function notifyPthreadCreateResult(sab, result, error) {
    if (sab) {
        serizeErrorToBuffer(sab.buffer, result, error);
        Atomics.notify(sab, 0);
    }
}

//#endregion dist/wasi-threads.js

//#region src/emnapi/index.js

function createNapiModule (options) {
  var napiModule = (function () {

    //#region src/core/addfunction.ts
    // This gives correct answers for everything less than 2^{14} = 16384
    // I hope nobody is contemplating functions with 16384 arguments...
    function uleb128EncodeWithLen(arr) {
        const n = arr.length;
        // Note: this LEB128 length encoding produces extra byte for n < 128,
        // but we don't care as it's only used in a temporary representation.
        return [(n % 128) | 128, n >> 7, ...arr];
    }
    // Converts a signature like 'vii' into a description of the wasm types, like
    // { parameters: ['i32', 'i32'], results: [] }.
    function sigToWasmTypes(sig) {
        const typeNames = {
            i: 'i32',
            j: 'i64',
            f: 'f32',
            d: 'f64',
            e: 'externref',
            p: 'i32',
        };
        const type = {
            parameters: [],
            results: sig[0] === 'v' ? [] : [typeNames[sig[0]]]
        };
        for (let i = 1; i < sig.length; ++i) {
            type.parameters.push(typeNames[sig[i]]);
        }
        return type;
    }
    // Note: using template literal here instead of plain object
    // because jsify serializes objects w/o quotes and Closure will then
    // incorrectly mangle the properties.
    const wasmTypeCodes = (function () {
        const map = {
            i: 0x7f, // i32
            p: 0x7f,
            j: 0x7e, // i64
            f: 0x7d, // f32
            d: 0x7c, // f64
            e: 0x6f, // externref
        };
        return map;
    })();
    function generateTypePack(types) {
        return uleb128EncodeWithLen(Array.from(types, (type) => {
            const code = wasmTypeCodes[type];
            return code;
        }));
    }
    function convertJsFunctionToWasm(func, sig) {
        if (_WebAssembly$1.Function) {
            return new _WebAssembly$1.Function(sigToWasmTypes(sig), func);
        }
        // Rest of the module is static
        const bytes = Uint8Array.of(0x00, 0x61, 0x73, 0x6d, // magic ("\0asm")
        0x01, 0x00, 0x00, 0x00, // version: 1
        0x01, // Type section code
        // The module is static, with the exception of the type section, which is
        // generated based on the signature passed in.
        ...uleb128EncodeWithLen([
            0x01, // count: 1
            0x60 /* form: func */,
            // param types
            ...generateTypePack(sig.slice(1)),
            // return types (for now only supporting [] if `void` and single [T] otherwise)
            ...generateTypePack(sig[0] === 'v' ? '' : sig[0])
        ]), 
        // The rest of the module is static
        0x02, 0x07, // import section
        // (import "e" "f" (func 0 (type 0)))
        0x01, 0x01, 0x65, 0x01, 0x66, 0x00, 0x00, 0x07, 0x05, // export section
        // (export "f" (func 0 (type 0)))
        0x01, 0x01, 0x66, 0x00, 0x00);
        // We can compile this wasm module synchronously because it is very small.
        // This accepts an import (at "e.f"), that it reroutes to an export (at "f")
        const module = new _WebAssembly$1.Module(bytes);
        const instance = new _WebAssembly$1.Instance(module, { e: { f: func } });
        const wrappedFunc = instance.exports['f'];
        return wrappedFunc;
    }
    const freeTableIndexes = [];
    // Weak map of functions in the table to their indexes, created on first use.
    let functionsInTableMap;
    function getEmptyTableSlot() {
        // Reuse a free index if there is one, otherwise grow.
        if (freeTableIndexes.length) {
            return freeTableIndexes.pop();
        }
        try {
            // Grow the table
            return wasmTable.grow(1);
        }
        catch (err) {
            if (!(err instanceof RangeError)) {
                throw err;
            }
            throw new Error('Unable to grow wasm table. Specify `--growable-table` for wasm-ld.');
        }
    }
    function updateTableMap(offset, count) {
        if (functionsInTableMap) {
            for (let i = offset; i < offset + count; i++) {
                const item = getWasmTableEntry(i);
                // Ignore null values.
                if (item) {
                    functionsInTableMap.set(item, i);
                }
            }
        }
    }
    function getFunctionAddress(func) {
        // First, create the map if this is the first use.
        if (!functionsInTableMap) {
            functionsInTableMap = new WeakMap();
            let count = wasmTable.length;
            count >>>= 0;
            updateTableMap(0, count);
        }
        return functionsInTableMap.get(func) || 0;
    }
    /**
     * Add a function to the table.
     * 'sig' parameter is required if the function being added is a JS function.
     */
    function addFunction(func, sig) {
        // Check if the function is already in the table, to ensure each function
        // gets a unique index.
        let rtn = getFunctionAddress(func);
        if (rtn) {
            return rtn;
        }
        // It's not in the table, add it now.
        const ret = getEmptyTableSlot();
        // Set the new value.
        try {
            // Attempting to call this with JS function will cause table.set() to fail
            setWasmTableEntry(ret, func);
        }
        catch (err) {
            if (!(err instanceof TypeError)) {
                throw err;
            }
            if (!sig) {
                throw new Error('Missing signature argument to addFunction: ' + func);
            }
            const wrapped = convertJsFunctionToWasm(func, sig);
            setWasmTableEntry(ret, wrapped);
        }
        functionsInTableMap.set(func, ret);
        return ret;
    }
    function removeFunction(index) {
        if (!functionsInTableMap)
            return;
        functionsInTableMap.delete(getWasmTableEntry(index));
        setWasmTableEntry(index, null);
        freeTableIndexes.push(index);
    }

    //#endregion src/core/addfunction.ts

    //#region src/core/init.ts
    var ENVIRONMENT_IS_NODE = typeof process === 'object' && process !== null && typeof process.versions === 'object' && process.versions !== null && typeof process.versions.node === 'string';
    var ENVIRONMENT_IS_PTHREAD = Boolean(options.childThread);
    var waitThreadStart = typeof options.waitThreadStart === 'number' ? options.waitThreadStart : Boolean(options.waitThreadStart);
    var wasmInstance;
    var wasmModule;
    var wasmMemory;
    var wasmTable;
    var _malloc;
    var _free;
    var _emnapi_create_env;
    var _emnapi_delete_env;
    function abort(msg) {
        if (typeof _WebAssembly$1.RuntimeError === 'function') {
            throw new _WebAssembly$1.RuntimeError(msg);
        }
        throw Error(msg);
    }
    function runtimeKeepalivePush() { }
    function runtimeKeepalivePop() { }
    function getWasmTableEntry(index) {
        return wasmTable.get(index);
    }
    function setWasmTableEntry(index, func) {
        wasmTable.set(index, func);
    }
    function setLastError(env, error_code, engine_error_code, engine_reserved) {
        env >>>= 0;
        env -= 8;
        engine_reserved >>>= 0;
        var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
        GET_HEAP_DATA_VIEW().setInt32(env + 40 /* NapiEnvOffset32.last_error_error_code */, error_code, true);
        GET_HEAP_DATA_VIEW().setUint32(env + 36 /* NapiEnvOffset32.last_error_engine_error_code */, engine_error_code, true);
        GET_HEAP_DATA_VIEW().setUint32(env + 32 /* NapiEnvOffset32.last_error_engine_reserved */, engine_reserved, true);
        return error_code;
    }
    var napiModule = {
        imports: {
            env: {},
            napi: {},
            emnapi: {}
        },
        exports: {},
        emnapi: {},
        loaded: false,
        filename: '',
        childThread: ENVIRONMENT_IS_PTHREAD,
        initWorker: undefined,
        waitThreadStart,
        PThread: undefined,
        init(options) {
            if (napiModule.loaded)
                return napiModule.exports;
            if (!options)
                throw new TypeError('Invalid napi init options');
            const instance = options.instance;
            if (!instance?.exports)
                throw new TypeError('Invalid wasm instance');
            wasmInstance = instance;
            const exports = instance.exports;
            const module = options.module;
            const memory = options.memory || exports.memory;
            const table = options.table || exports.__indirect_function_table;
            if (!(module instanceof _WebAssembly$1.Module))
                throw new TypeError('Invalid wasm module');
            if (!(memory instanceof _WebAssembly$1.Memory))
                throw new TypeError('Invalid wasm memory');
            if (!(table instanceof _WebAssembly$1.Table))
                throw new TypeError('Invalid wasm table');
            wasmModule = module;
            wasmMemory = memory;
            wasmTable = table;
            if (typeof exports.malloc !== 'function')
                throw new TypeError('malloc is not exported');
            if (typeof exports.free !== 'function')
                throw new TypeError('free is not exported');
            _malloc = exports.malloc;
            _free = exports.free;
            _emnapi_create_env = exports.emnapi_create_env;
            _emnapi_delete_env = exports.emnapi_delete_env;
            if (!napiModule.childThread) {
                // main thread only
                const NODE_MODULE_VERSION = 127 /* Version.NODE_MODULE_VERSION */;
                const nodeRegisterModuleSymbol = `node_register_module_v${NODE_MODULE_VERSION}`;
                if (typeof instance.exports[nodeRegisterModuleSymbol] === 'function') {
                    const scope = emnapiCtx.isolate.openScope();
                    try {
                        const exports = napiModule.exports;
                        const exportsHandle = scope.add(exports);
                        const moduleHandle = scope.add(napiModule);
                        instance.exports[nodeRegisterModuleSymbol](exportsHandle, moduleHandle, 5);
                    }
                    catch (err) {
                        if (err !== 'unwind') {
                            throw err;
                        }
                    }
                    finally {
                        emnapiCtx.isolate.closeScope(scope);
                    }
                    napiModule.loaded = true;
                    delete napiModule.envObject;
                    return napiModule.exports;
                }
                const find = Object.keys(instance.exports).filter(k => k.startsWith('node_register_module_v'));
                if (find.length > 0) {
                    throw new Error(`The module${napiModule.filename ? ` '${napiModule.filename}'` : ''}
    was compiled against a different Node.js version using
    NODE_MODULE_VERSION ${find[0].slice(22)}. This version of Node.js requires
    NODE_MODULE_VERSION ${NODE_MODULE_VERSION}.`);
                }
                let moduleApiVersion = 8 /* Version.NODE_API_DEFAULT_MODULE_API_VERSION */;
                const node_api_module_get_api_version_v1 = instance.exports.node_api_module_get_api_version_v1;
                if (typeof node_api_module_get_api_version_v1 === 'function') {
                    moduleApiVersion = node_api_module_get_api_version_v1();
                }
                const envObject = napiModule.envObject || (() => {
                    let address = _emnapi_create_env();
                    address >>>= 0;
                    address += 8;
                    const envObject = napiModule.envObject = emnapiEnv = emnapiCtx.createEnv(napiModule.filename, moduleApiVersion, {
                        address,
                        deleteEnv: (ptr) => {
                            _emnapi_delete_env(ptr - 8);
                        },
                        setLastError,
                        makeDynCall_vppp: (cb) => (wasmTable.get(cb)),
                        makeDynCall_vp: (cb) => (wasmTable.get(cb)),
                        abort,
                    }, emnapiNodeBinding);
                    var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
                    GET_HEAP_DATA_VIEW().setUint32(address - 8 + 24 /* NapiEnvOffset32.id */, envObject.id, true);
                    return envObject;
                })();
                const scope = emnapiCtx.openScope(envObject);
                try {
                    envObject.callIntoModule((_envObject) => {
                        const exports = napiModule.exports;
                        const env = envObject.bridge.address;
                        const exportsHandle = scope.add(exports);
                        const napi_register_wasm_v1 = instance.exports.napi_register_wasm_v1;
                        const napiValue = napi_register_wasm_v1(env, exportsHandle);
                        napiModule.exports = (!napiValue) ? exports : emnapiCtx.jsValueFromNapiValue(napiValue);
                    });
                }
                catch (e) {
                    if (e !== 'unwind') {
                        throw e;
                    }
                }
                finally {
                    emnapiCtx.closeScope(envObject, scope);
                }
                napiModule.loaded = true;
                delete napiModule.envObject;
                return napiModule.exports;
            }
        }
    };
    var emnapiCtx;
    var emnapiEnv;
    var emnapiNodeBinding;
    var onCreateWorker = undefined;
    var out;
    var err;
    if (!ENVIRONMENT_IS_PTHREAD) {
        const context = options.context;
        if (typeof context !== 'object' || context === null) {
            throw new TypeError("Invalid `options.context`. Use `import { getDefaultContext } from '@emnapi/runtime'`");
        }
        emnapiCtx = context;
    }
    else {
        emnapiCtx = options?.context;
        const postMsg = typeof options.postMessage === 'function'
            ? options.postMessage
            : typeof postMessage === 'function'
                ? postMessage
                : undefined;
        if (typeof postMsg !== 'function') {
            throw new TypeError('No postMessage found');
        }
        napiModule.postMessage = postMsg;
    }
    if (typeof options.filename === 'string') {
        napiModule.filename = options.filename;
    }
    if (typeof options.onCreateWorker === 'function') {
        onCreateWorker = options.onCreateWorker;
    }
    if (typeof options.print === 'function') {
        out = options.print;
    }
    else {
        out = console.log.bind(console);
    }
    if (typeof options.printErr === 'function') {
        err = options.printErr;
    }
    else {
        err = console.warn.bind(console);
    }
    if ('nodeBinding' in options) {
        const nodeBinding = options.nodeBinding;
        if (typeof nodeBinding !== 'object' || nodeBinding === null) {
            throw new TypeError('Invalid `options.nodeBinding`. Use @emnapi/node-binding package');
        }
        emnapiNodeBinding = nodeBinding;
    }
    var emnapiAsyncWorkPoolSize = 0;
    if ('asyncWorkPoolSize' in options) {
        if (typeof options.asyncWorkPoolSize !== 'number') {
            throw new TypeError('options.asyncWorkPoolSize must be a integer');
        }
        emnapiAsyncWorkPoolSize = options.asyncWorkPoolSize >> 0;
        if (emnapiAsyncWorkPoolSize > 1024) {
            emnapiAsyncWorkPoolSize = 1024;
        }
        else if (emnapiAsyncWorkPoolSize < -1024) {
            emnapiAsyncWorkPoolSize = -1024;
        }
    }
    var singleThreadAsyncWork = ENVIRONMENT_IS_PTHREAD ? false : (emnapiAsyncWorkPoolSize <= 0);
    function _emnapi_async_work_pool_size() {
        return Math.abs(emnapiAsyncWorkPoolSize);
    }
    napiModule.imports.env._emnapi_async_work_pool_size = _emnapi_async_work_pool_size;
    // ------------------------------ pthread -------------------------------
    function emnapiAddSendListener(worker) {
        if (!worker)
            return false;
        if (worker._emnapiSendListener)
            return true;
        const handler = function (e) {
            const data = ENVIRONMENT_IS_NODE ? e : e.data;
            const __emnapi__ = data.__emnapi__;
            if (__emnapi__ && __emnapi__.type === 'async-send') {
                if (ENVIRONMENT_IS_PTHREAD) {
                    const postMessage = napiModule.postMessage;
                    postMessage({ __emnapi__ });
                }
                else {
                    const callback = __emnapi__.payload.callback;
                    (wasmTable.get(callback))(__emnapi__.payload.data);
                }
            }
        };
        const dispose = function () {
            if (ENVIRONMENT_IS_NODE) {
                worker.off('message', handler);
            }
            else {
                worker.removeEventListener('message', handler, false);
            }
            delete worker._emnapiSendListener;
        };
        worker._emnapiSendListener = { handler, dispose };
        if (ENVIRONMENT_IS_NODE) {
            worker.on('message', handler);
        }
        else {
            worker.addEventListener('message', handler, false);
        }
        return true;
    }
    napiModule.emnapi.addSendListener = emnapiAddSendListener;
    var PThread = new ThreadManager(ENVIRONMENT_IS_PTHREAD
        ? {
            printErr: err,
            childThread: true
        }
        : {
            printErr: err,
            beforeLoad: (worker) => {
                emnapiAddSendListener(worker);
            },
            reuseWorker: options.reuseWorker,
            onCreateWorker: onCreateWorker
        });
    napiModule.PThread = PThread;

    //#endregion src/core/init.ts

    var initMod = /*#__PURE__*/Object.freeze({
        __proto__: null,
        ENVIRONMENT_IS_NODE: ENVIRONMENT_IS_NODE,
        ENVIRONMENT_IS_PTHREAD: ENVIRONMENT_IS_PTHREAD,
        PThread: PThread,
        _emnapi_async_work_pool_size: _emnapi_async_work_pool_size,
        get _emnapi_create_env () { return _emnapi_create_env; },
        get _emnapi_delete_env () { return _emnapi_delete_env; },
        get _free () { return _free; },
        get _malloc () { return _malloc; },
        abort: abort,
        addFunction: addFunction,
        get emnapiAsyncWorkPoolSize () { return emnapiAsyncWorkPoolSize; },
        get emnapiCtx () { return emnapiCtx; },
        get emnapiEnv () { return emnapiEnv; },
        get emnapiNodeBinding () { return emnapiNodeBinding; },
        get err () { return err; },
        getWasmTableEntry: getWasmTableEntry,
        napiModule: napiModule,
        get onCreateWorker () { return onCreateWorker; },
        get out () { return out; },
        removeFunction: removeFunction,
        runtimeKeepalivePop: runtimeKeepalivePop,
        runtimeKeepalivePush: runtimeKeepalivePush,
        setWasmTableEntry: setWasmTableEntry,
        singleThreadAsyncWork: singleThreadAsyncWork,
        waitThreadStart: waitThreadStart,
        get wasmInstance () { return wasmInstance; },
        get wasmMemory () { return wasmMemory; },
        get wasmModule () { return wasmModule; },
        get wasmTable () { return wasmTable; }
    });

    //#region src/util.ts
    // /**
    //  * @__sig ipp
    //  */
    // export function napi_get_last_error_info (env: napi_env, result: void_pp): napi_status {
    //   return emnapiRuntimeModuleExports.napi_get_last_error_info(env, result)
    // }
    /** @__sig p */
    function _emnapi_get_node_api_js_vtable() {
        return 0;
    }
    /** @__sig p */
    function _emnapi_get_node_api_module_vtable() {
        return 0;
    }
    /**
     * @__sig vppp
     */
    function _emnapi_get_node_version(major, minor, patch) {
        major >>>= 0;
        minor >>>= 0;
        patch >>>= 0;
        const versions = (typeof process === 'object' && process !== null &&
            typeof process.versions === 'object' && process.versions !== null &&
            typeof process.versions.node === 'string')
            ? process.versions.node.split('.').map((n) => Number(n))
            : [0, 0, 0];
        var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
        GET_HEAP_DATA_VIEW().setUint32(major, versions[0], true);
        GET_HEAP_DATA_VIEW().setUint32(minor, versions[1], true);
        GET_HEAP_DATA_VIEW().setUint32(patch, versions[2], true);
    }
    /**
     * @__sig v
     * @__deps $runtimeKeepalivePush
     */
    function _emnapi_runtime_keepalive_push() {
    }
    /**
     * @__sig v
     * @__deps $runtimeKeepalivePop
     */
    function _emnapi_runtime_keepalive_pop() {
    }
    /**
     * @__sig vpp
     */
    function _emnapi_set_immediate(callback, data) {
        emnapiCtx.features.setImmediate(() => {
            (wasmTable.get(callback))(data);
        });
    }
    /**
     * @__sig vpp
     */
    function _emnapi_next_tick(callback, data) {
        Promise.resolve().then(() => {
            (wasmTable.get(callback))(data);
        });
    }
    /**
     * @__sig vipppi
     */
    function _emnapi_callback_into_module(forceUncaught, env, callback, data, close_scope_if_throw) {
        const envObject = emnapiEnv;
        const scope = emnapiCtx.openScope(envObject);
        try {
            envObject.callbackIntoModule(Boolean(forceUncaught), () => {
                (wasmTable.get(callback))(env, data);
            });
        }
        catch (err) {
            emnapiCtx.closeScope(envObject, scope);
            if (close_scope_if_throw) {
                emnapiCtx.closeScope(envObject);
            }
            throw err;
        }
        emnapiCtx.closeScope(envObject, scope);
    }
    /**
     * @__sig vipppp
     */
    function _emnapi_call_finalizer(forceUncaught, env, callback, data, hint) {
        const envObject = emnapiEnv;
        callback >>>= 0;
        envObject.callFinalizerInternal(forceUncaught, callback, data, hint);
    }
    /**
     * @__sig v
     */
    function _emnapi_ctx_increase_waiting_request_counter() {
        emnapiCtx.increaseWaitingRequestCounter();
    }
    /**
     * @__sig v
     */
    function _emnapi_ctx_decrease_waiting_request_counter() {
        emnapiCtx.decreaseWaitingRequestCounter();
    }
    /**
     * @__sig i
     */
    function _emnapi_is_main_runtime_thread() {
        return ENVIRONMENT_IS_PTHREAD ? 0 : 1;
    }
    /**
     * @__sig i
     */
    function _emnapi_is_main_browser_thread() {
        return (typeof window !== 'undefined' && typeof document !== 'undefined' && !ENVIRONMENT_IS_NODE) ? 1 : 0;
    }
    /**
     * @__sig v
     */
    function _emnapi_unwind() {
        throw 'unwind';
    }
    /**
     * @__sig d
     */
    function _emnapi_get_now() {
        return performance.timeOrigin + performance.now();
    }
    function $emnapiSetValueI64(result, numberValue) {
        let tempDouble;
        const tempI64 = [
            numberValue >>> 0,
            (tempDouble = numberValue, +Math.abs(tempDouble) >= 1 ? tempDouble > 0 ? (Math.min(+Math.floor(tempDouble / 4294967296), 4294967295) | 0) >>> 0 : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0)
        ];
        var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
        GET_HEAP_DATA_VIEW().setInt32(result, tempI64[0], true);
        GET_HEAP_DATA_VIEW().setInt32(result + 4, tempI64[1], true);
    }
    /**
     * @__deps $emnapiCtx
     * @__sig p
     */
    function _emnapi_open_handle_scope() {
        return emnapiCtx.isolate.openScope().id;
    }
    /**
     * @__deps $emnapiCtx
     * @__sig vp
     */
    function _emnapi_close_handle_scope(_scope) {
        return emnapiCtx.isolate.closeScope();
    }

    //#endregion src/util.ts

    var utilMod = /*#__PURE__*/Object.freeze({
        __proto__: null,
        $emnapiSetValueI64: $emnapiSetValueI64,
        _emnapi_call_finalizer: _emnapi_call_finalizer,
        _emnapi_callback_into_module: _emnapi_callback_into_module,
        _emnapi_close_handle_scope: _emnapi_close_handle_scope,
        _emnapi_ctx_decrease_waiting_request_counter: _emnapi_ctx_decrease_waiting_request_counter,
        _emnapi_ctx_increase_waiting_request_counter: _emnapi_ctx_increase_waiting_request_counter,
        _emnapi_get_node_api_js_vtable: _emnapi_get_node_api_js_vtable,
        _emnapi_get_node_api_module_vtable: _emnapi_get_node_api_module_vtable,
        _emnapi_get_node_version: _emnapi_get_node_version,
        _emnapi_get_now: _emnapi_get_now,
        _emnapi_is_main_browser_thread: _emnapi_is_main_browser_thread,
        _emnapi_is_main_runtime_thread: _emnapi_is_main_runtime_thread,
        _emnapi_next_tick: _emnapi_next_tick,
        _emnapi_open_handle_scope: _emnapi_open_handle_scope,
        _emnapi_runtime_keepalive_pop: _emnapi_runtime_keepalive_pop,
        _emnapi_runtime_keepalive_push: _emnapi_runtime_keepalive_push,
        _emnapi_set_immediate: _emnapi_set_immediate,
        _emnapi_unwind: _emnapi_unwind
    });

    //#region src/core/async.ts
    function emnapiGetWorkerByPthreadPtr(pthreadPtr) {
        const view = new DataView(wasmMemory.buffer);
        /**
         * wasi-sdk-20.0+threads
         *
         * struct pthread {
         *   struct pthread *self;        // 0
         *   struct pthread *prev, *next; // 4, 8
         *   uintptr_t sysinfo;           // 12
         *   uintptr_t canary;            // 16
         *   int tid;                     // 20
         *   // ...
         * }
         */
        const tidOffset = 20;
        const tid = view.getInt32(pthreadPtr + tidOffset, true);
        const worker = PThread.pthreads[tid];
        return worker;
    }
    /** @__sig vp */
    function _emnapi_worker_ref(pthreadPtr) {
        if (ENVIRONMENT_IS_PTHREAD)
            return;
        pthreadPtr >>>= 0;
        const worker = emnapiGetWorkerByPthreadPtr(pthreadPtr);
        if (worker && typeof worker.ref === 'function') {
            worker.ref();
        }
    }
    /** @__sig vp */
    function _emnapi_worker_unref(pthreadPtr) {
        if (ENVIRONMENT_IS_PTHREAD)
            return;
        pthreadPtr >>>= 0;
        const worker = emnapiGetWorkerByPthreadPtr(pthreadPtr);
        if (worker && typeof worker.unref === 'function') {
            worker.unref();
        }
    }
    /** @__sig vipp */
    function _emnapi_async_send_js(type, callback, data) {
        if (ENVIRONMENT_IS_PTHREAD) {
            const postMessage = napiModule.postMessage;
            postMessage({
                __emnapi__: {
                    type: 'async-send',
                    payload: {
                        callback,
                        data
                    }
                }
            });
        }
        else {
            switch (type) {
                case 0:
                    _emnapi_set_immediate(callback, data);
                    break;
                case 1:
                    _emnapi_next_tick(callback, data);
                    break;
            }
        }
    }
    // function ptrToString (ptr: number): string {
    //   return '0x' + ('00000000' + ptr.toString(16)).slice(-8)
    // }
    var uvThreadpoolReadyResolve;
    var uvThreadpoolReady = new Promise((resolve) => {
        uvThreadpoolReadyResolve = function () {
            uvThreadpoolReady.ready = true;
            resolve();
        };
    });
    uvThreadpoolReady.ready = false;
    /** @__sig vppi */
    function _emnapi_after_uvthreadpool_ready(callback, q, type) {
        if (uvThreadpoolReady.ready) {
            (wasmTable.get(callback))(q, type);
        }
        else {
            uvThreadpoolReady.then(() => {
                (wasmTable.get(callback))(q, type);
            });
        }
    }
    /** @__sig vpi */
    function _emnapi_tell_js_uvthreadpool(threads, size) {
        const p = [];
        var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
        for (let i = 0; i < size; i++) {
            const pthreadPtr = GET_HEAP_DATA_VIEW().getUint32(threads + i * 4, true);
            const worker = emnapiGetWorkerByPthreadPtr(pthreadPtr);
            p.push(new Promise((resolve) => {
                const handler = function (e) {
                    const data = ENVIRONMENT_IS_NODE ? e : e.data;
                    const __emnapi__ = data.__emnapi__;
                    if (__emnapi__ && __emnapi__.type === 'async-thread-ready') {
                        resolve();
                        if (worker && typeof worker.unref === 'function') {
                            worker.unref();
                        }
                        if (ENVIRONMENT_IS_NODE) {
                            worker.off('message', handler);
                        }
                        else {
                            worker.removeEventListener('message', handler);
                        }
                    }
                };
                if (ENVIRONMENT_IS_NODE) {
                    worker.on('message', handler);
                }
                else {
                    worker.addEventListener('message', handler);
                }
            }));
        }
        Promise.all(p).then(uvThreadpoolReadyResolve);
    }
    /** @__sig v */
    function _emnapi_emit_async_thread_ready() {
        if (!ENVIRONMENT_IS_PTHREAD)
            return;
        const postMessage = napiModule.postMessage;
        postMessage({
            __emnapi__: {
                type: 'async-thread-ready',
                payload: {}
            }
        });
    }

    //#endregion src/core/async.ts

    var asyncMod = /*#__PURE__*/Object.freeze({
        __proto__: null,
        _emnapi_after_uvthreadpool_ready: _emnapi_after_uvthreadpool_ready,
        _emnapi_async_send_js: _emnapi_async_send_js,
        _emnapi_emit_async_thread_ready: _emnapi_emit_async_thread_ready,
        _emnapi_tell_js_uvthreadpool: _emnapi_tell_js_uvthreadpool,
        _emnapi_worker_ref: _emnapi_worker_ref,
        _emnapi_worker_unref: _emnapi_worker_unref
    });

    //#region src/macro.ts

    //#endregion src/macro.ts

    //#region src/core/memory.ts
    /** @__sig ipjp */
    function napi_adjust_external_memory(env, change_in_bytes, adjusted_value) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        const envObject = emnapiEnv;
        if (!adjusted_value)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        let adjusted_memory = emnapiCtx.adjustAmountOfExternalAllocatedMemory(change_in_bytes);
        adjusted_value >>>= 0;
        if (emnapiCtx.features.BigInt) {
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
            GET_HEAP_DATA_VIEW().setBigInt64(adjusted_value, BigInt(adjusted_memory), true);
        }
        else {
            $emnapiSetValueI64(adjusted_value, Number(adjusted_memory));
        }
        return envObject.clearLastError();
    }

    //#endregion src/core/memory.ts

    var memoryMod = /*#__PURE__*/Object.freeze({
        __proto__: null,
        napi_adjust_external_memory: napi_adjust_external_memory
    });

    //#region src/memory.ts
    /**
     * @__deps malloc
     * @__deps free
     * @__postset
     * ```
     * emnapiExternalMemory.init();
     * ```
     */
    const emnapiExternalMemory = {
        registry: typeof FinalizationRegistry === 'function' ? new FinalizationRegistry(function (_pointer) { _free(_pointer); }) : undefined,
        table: new WeakMap(),
        wasmMemoryViewTable: new WeakMap(),
        // populated by init(): live intrinsic function references must not exist at
        // library definition time — the emscripten jsifier re-serializes this object
        // and native functions do not stringify to parseable source
        intrinsics: undefined,
        init: function () {
            emnapiExternalMemory.registry = typeof FinalizationRegistry === 'function' ? new FinalizationRegistry(function (_pointer) { _free(_pointer); }) : undefined;
            emnapiExternalMemory.table = new WeakMap();
            emnapiExternalMemory.wasmMemoryViewTable = new WeakMap();
            const sharedArrayBufferByteLength = typeof SharedArrayBuffer === 'function'
                ? Object.getOwnPropertyDescriptor(SharedArrayBuffer.prototype, 'byteLength')?.get
                : undefined;
            // cached intrinsic prototype getters and element-type constructors: they
            // read the internal slots directly like native Node-API does, so user
            // accessors and user subclass constructors can never run inside get-info
            // metadata reads, descriptor registration or view reconstruction, and they
            // work for instances from any realm
            emnapiExternalMemory.intrinsics = {
                // ArrayBuffer.isView ignores its `this`, so a bare cached reference is
                // safe and cannot be swapped out by user code replacing the global
                isView: ArrayBuffer.isView,
                typedArray: {
                    buffer: Object.getOwnPropertyDescriptor(Object.getPrototypeOf(Uint8Array.prototype), 'buffer').get,
                    byteOffset: Object.getOwnPropertyDescriptor(Object.getPrototypeOf(Uint8Array.prototype), 'byteOffset').get,
                    length: Object.getOwnPropertyDescriptor(Object.getPrototypeOf(Uint8Array.prototype), 'length').get,
                    tag: Object.getOwnPropertyDescriptor(Object.getPrototypeOf(Uint8Array.prototype), Symbol.toStringTag).get
                },
                dataView: {
                    buffer: Object.getOwnPropertyDescriptor(DataView.prototype, 'buffer').get,
                    byteOffset: Object.getOwnPropertyDescriptor(DataView.prototype, 'byteOffset').get,
                    byteLength: Object.getOwnPropertyDescriptor(DataView.prototype, 'byteLength').get
                },
                arrayBuffer: {
                    byteLength: Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, 'byteLength').get
                },
                // a SharedArrayBuffer polyfill may lack the byteLength accessor: degrade
                // to the hidden-global classification path instead of throwing here
                sharedArrayBuffer: sharedArrayBufferByteLength !== undefined
                    ? {
                        byteLength: sharedArrayBufferByteLength
                    }
                    : undefined,
                ctors: {
                    Int8Array,
                    Uint8Array,
                    Uint8ClampedArray,
                    Int16Array,
                    Uint16Array,
                    Int32Array,
                    Uint32Array,
                    Float16Array: typeof Float16Array === 'function' ? Float16Array : undefined,
                    Float32Array,
                    Float64Array,
                    BigInt64Array,
                    BigUint64Array
                },
                bufferFrom: undefined
            };
        },
        isSharedArrayBuffer(value) {
            const sharedArrayBuffer = emnapiExternalMemory.intrinsics.sharedArrayBuffer;
            if (sharedArrayBuffer !== undefined) {
                if (typeof SharedArrayBuffer === 'function' && value instanceof SharedArrayBuffer)
                    return true;
                // the intrinsic byteLength getter reads the internal slot: it accepts
                // SharedArrayBuffer instances from any realm and throws for anything
                // else, without consulting user-controllable properties
                try {
                    sharedArrayBuffer.byteLength.call(value);
                    return true;
                }
                catch (_) {
                    return false;
                }
            }
            // hidden-global environment (see #143): the SharedArrayBuffer global was
            // absent at init time, but the engine can still hand out genuine SABs
            // (e.g. a shared WebAssembly.Memory buffer). A genuine ArrayBuffer
            // answers the intrinsic byteLength probe, settling the common case
            // without the (spoofable, user-JS-running) toString tag read below.
            try {
                emnapiExternalMemory.intrinsics.arrayBuffer.byteLength.call(value);
                return false;
            }
            catch (_) { }
            return Object.prototype.toString.call(value) === '[object SharedArrayBuffer]';
        },
        isDetachedArrayBuffer: function (arrayBuffer) {
            if (emnapiExternalMemory.bufferByteLength(arrayBuffer) === 0) {
                try {
                    // eslint-disable-next-line no-new
                    new Uint8Array(arrayBuffer);
                }
                catch (_) {
                    return true;
                }
            }
            return false;
        },
        bufferByteLength: function (buffer) {
            const intrinsics = emnapiExternalMemory.intrinsics;
            try {
                return intrinsics.arrayBuffer.byteLength.call(buffer);
            }
            catch (err) {
                const sharedArrayBuffer = intrinsics.sharedArrayBuffer;
                if (sharedArrayBuffer !== undefined) {
                    return sharedArrayBuffer.byteLength.call(buffer);
                }
                // hidden-global environment (see isSharedArrayBuffer): no SAB getter
                // was capturable at init, recover it from the instance's own prototype
                // (for a genuine SAB that is the hidden SharedArrayBuffer.prototype)
                const proto = Object.getPrototypeOf(buffer);
                const get = proto !== null && proto !== undefined
                    ? Object.getOwnPropertyDescriptor(proto, 'byteLength')?.get
                    : undefined;
                if (get === undefined)
                    throw err;
                return get.call(buffer);
            }
        },
        viewBuffer: function (view) {
            const intrinsics = emnapiExternalMemory.intrinsics;
            return intrinsics.typedArray.tag.call(view) === undefined
                ? intrinsics.dataView.buffer.call(view)
                : intrinsics.typedArray.buffer.call(view);
        },
        viewByteOffset: function (view) {
            const intrinsics = emnapiExternalMemory.intrinsics;
            return intrinsics.typedArray.tag.call(view) === undefined
                ? intrinsics.dataView.byteOffset.call(view)
                : intrinsics.typedArray.byteOffset.call(view);
        },
        // element count for typed arrays, byteLength for DataViews (the unit used
        // by the napi_get_typedarray_info / napi_get_dataview_info length outputs
        // and by the view constructors at reconstruction)
        viewLength: function (view) {
            const intrinsics = emnapiExternalMemory.intrinsics;
            return intrinsics.typedArray.tag.call(view) === undefined
                ? intrinsics.dataView.byteLength.call(view)
                : intrinsics.typedArray.length.call(view);
        },
        // Buffer descriptors are only ever created by emnapi's own buffer creation
        // paths; capturing Buffer.from the first time one is created snapshots the
        // legitimate function before any later reconstruction, so a user replacing
        // Buffer.from afterwards cannot influence a refreshed view
        getBufferFrom: function () {
            return emnapiExternalMemory.intrinsics.bufferFrom ??
                (emnapiExternalMemory.intrinsics.bufferFrom = emnapiCtx.features.Buffer.from);
        },
        getArrayBufferPointer: function (arrayBuffer, shouldCopy) {
            const info = {
                address: 0,
                ownership: 0 /* ReferenceOwnership.kRuntime */,
                runtimeAllocated: 0
            };
            if (arrayBuffer === wasmMemory.buffer) {
                return info;
            }
            const isDetached = emnapiExternalMemory.isDetachedArrayBuffer(arrayBuffer);
            if (emnapiExternalMemory.table.has(arrayBuffer)) {
                const cachedInfo = emnapiExternalMemory.table.get(arrayBuffer);
                if (isDetached) {
                    cachedInfo.address = 0;
                    return cachedInfo;
                }
                if (shouldCopy && cachedInfo.ownership === 0 /* ReferenceOwnership.kRuntime */ && cachedInfo.runtimeAllocated === 1) {
                    new Uint8Array(wasmMemory.buffer).set(new Uint8Array(arrayBuffer), cachedInfo.address);
                }
                return cachedInfo;
            }
            const byteLength = emnapiExternalMemory.bufferByteLength(arrayBuffer);
            if (isDetached || (byteLength === 0)) {
                return info;
            }
            if (!shouldCopy) {
                return info;
            }
            let pointer = _malloc(byteLength);
            if (!pointer)
                throw new Error('Out of memory');
            pointer >>>= 0;
            new Uint8Array(wasmMemory.buffer).set(new Uint8Array(arrayBuffer), pointer);
            info.address = pointer;
            info.ownership = emnapiExternalMemory.registry ? 0 /* ReferenceOwnership.kRuntime */ : 1 /* ReferenceOwnership.kUserland */;
            info.runtimeAllocated = 1;
            emnapiExternalMemory.table.set(arrayBuffer, info);
            emnapiExternalMemory.registry?.register(arrayBuffer, pointer);
            return info;
        },
        getOrUpdateMemoryView: function (view) {
            // classify and read the view state through the cached intrinsic
            // prototype getters only: own accessors on the instance could otherwise
            // run user JS that grows (and detaches) a non-shared memory in the
            // middle of registration, poisoning the stored descriptor; the intrinsic
            // reads return primitives from the internal slots and run zero user JS.
            // The @@toStringTag slot getter classifies views from any realm: it
            // returns the element-type name for typed arrays (seeing through user
            // subclasses) and undefined for DataViews
            const intrinsics = emnapiExternalMemory.intrinsics;
            const tag = intrinsics.typedArray.tag.call(view);
            const isDataView = tag === undefined;
            const buffer = isDataView ? intrinsics.dataView.buffer.call(view) : intrinsics.typedArray.buffer.call(view);
            if (buffer === wasmMemory.buffer) {
                if (!emnapiExternalMemory.wasmMemoryViewTable.has(view)) {
                    emnapiExternalMemory.wasmMemoryViewTable.set(view, {
                        // store the intrinsic element-type constructor keyed by the
                        // @@toStringTag slot (never view.constructor and never a
                        // user-definable Buffer @@hasInstance check): reconstruction after a
                        // memory growth must not run any user code, because it could grow
                        // again after the fresh buffer was captured as an argument. Buffers
                        // are tagged 'Uint8Array' and reconstruct as base Uint8Array views
                        Ctor: isDataView ? DataView : intrinsics.ctors[tag],
                        address: isDataView ? intrinsics.dataView.byteOffset.call(view) : intrinsics.typedArray.byteOffset.call(view),
                        length: isDataView ? intrinsics.dataView.byteLength.call(view) : intrinsics.typedArray.length.call(view),
                        ownership: 1 /* ReferenceOwnership.kUserland */,
                        runtimeAllocated: 0
                    });
                }
                return view;
            }
            const maybeOldWasmMemory = emnapiExternalMemory.isDetachedArrayBuffer(buffer) || emnapiExternalMemory.isSharedArrayBuffer(buffer);
            if (maybeOldWasmMemory && emnapiExternalMemory.wasmMemoryViewTable.has(view)) {
                const info = emnapiExternalMemory.wasmMemoryViewTable.get(view);
                const Ctor = info.Ctor;
                let newView;
                const Buffer = emnapiCtx.features.Buffer;
                if (typeof Buffer === 'function' && Ctor === Buffer) {
                    // reconstruct through the Buffer.from captured at creation time
                    newView = emnapiExternalMemory.getBufferFrom()(wasmMemory.buffer, info.address, info.length);
                }
                else {
                    newView = new Ctor(wasmMemory.buffer, info.address, info.length);
                }
                emnapiExternalMemory.wasmMemoryViewTable.set(newView, info);
                return newView;
            }
            return view;
        },
        getViewPointer: function (view, shouldCopy) {
            view = emnapiExternalMemory.getOrUpdateMemoryView(view);
            const buffer = emnapiExternalMemory.viewBuffer(view);
            if (buffer === wasmMemory.buffer) {
                if (emnapiExternalMemory.wasmMemoryViewTable.has(view)) {
                    const { address, ownership, runtimeAllocated } = emnapiExternalMemory.wasmMemoryViewTable.get(view);
                    return { address, ownership, runtimeAllocated, view };
                }
                return { address: emnapiExternalMemory.viewByteOffset(view), ownership: 1 /* ReferenceOwnership.kUserland */, runtimeAllocated: 0, view };
            }
            const { address, ownership, runtimeAllocated } = emnapiExternalMemory.getArrayBufferPointer(buffer, shouldCopy);
            return { address: address === 0 ? 0 : (address + emnapiExternalMemory.viewByteOffset(view)), ownership, runtimeAllocated, view };
        }
    };
    /**
     * Metadata layout in wasm shared memory (allocated with _malloc):
     *   offset 0:              refcount     (int32, 4 bytes - for Atomics)
     *   offset POINTER_SIZE:   external_data (pointer)
     *   offset 2*POINTER_SIZE: byte_length   (size_t)
     *   offset 3*POINTER_SIZE: finalize_cb   (pointer)
     *   offset 4*POINTER_SIZE: finalize_data (pointer)
     *   offset 5*POINTER_SIZE: finalize_hint (pointer)
     *   Total: 6 * POINTER_SIZE bytes
     */
    /**
     * @__postset
     * ```
     * emnapiExternalSAB.init();
     * ```
     */
    const emnapiExternalSAB = {
        registry: undefined,
        handleTable: new WeakMap(),
        init: function () {
            emnapiExternalSAB.handleTable = new WeakMap();
            emnapiExternalSAB.registry = typeof FinalizationRegistry === 'function'
                ? new FinalizationRegistry(function (metaPtr) {
                    emnapiExternalSAB.release(metaPtr);
                })
                : undefined;
        },
        allocMeta: function (external_data, byte_length, finalize_cb, finalize_data, finalize_hint) {
            const size = 4 * 6;
            let metaPtr = _malloc(size);
            if (!metaPtr)
                throw new Error('Out of memory');
            metaPtr >>>= 0;
            // refcount = 1
            Atomics.store(new Int32Array(wasmMemory.buffer, metaPtr, 1), 0, 1);
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
            GET_HEAP_DATA_VIEW().setUint32(metaPtr + 4, external_data, true);
            GET_HEAP_DATA_VIEW().setUint32(metaPtr + 8, byte_length, true);
            GET_HEAP_DATA_VIEW().setUint32(metaPtr + 12, finalize_cb, true);
            GET_HEAP_DATA_VIEW().setUint32(metaPtr + 16, finalize_data, true);
            GET_HEAP_DATA_VIEW().setUint32(metaPtr + 20, finalize_hint, true);
            return metaPtr;
        },
        readMeta: function (metaPtr) {
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
            const external_data = GET_HEAP_DATA_VIEW().getUint32(metaPtr + 4, true);
            const byte_length = GET_HEAP_DATA_VIEW().getUint32(metaPtr + 8, true);
            const finalize_cb = GET_HEAP_DATA_VIEW().getUint32(metaPtr + 12, true);
            const finalize_data = GET_HEAP_DATA_VIEW().getUint32(metaPtr + 16, true);
            const finalize_hint = GET_HEAP_DATA_VIEW().getUint32(metaPtr + 20, true);
            return { external_data, byte_length, finalize_cb, finalize_data, finalize_hint };
        },
        release: function (metaPtr) {
            const oldRefcount = Atomics.sub(new Int32Array(wasmMemory.buffer, metaPtr, 1), 0, 1);
            if (oldRefcount === 1) {
                // refcount reached 0, we are the last holder
                const info = emnapiExternalSAB.readMeta(metaPtr);
                const finalize_cb = info.finalize_cb;
                if (finalize_cb) {
                    const finalize_data = info.finalize_data;
                    const finalize_hint = info.finalize_hint;
                    (wasmTable.get(finalize_cb))(finalize_data, finalize_hint);
                }
                _free(metaPtr);
            }
        }
    };

    //#endregion src/memory.ts

    //#region src/string.ts
    /* eslint-disable @stylistic/indent */
    /**
     * @__postset
     * ```
     * emnapiString.init();
     * ```
     */
    var emnapiString = {
        utf8Decoder: undefined,
        utf16Decoder: undefined,
        init() {
            const fallbackDecoder = {
                decode(bytes) {
                    let inputIndex = 0;
                    const pendingSize = Math.min(0x1000, bytes.length + 1);
                    const pending = new Uint16Array(pendingSize);
                    const chunks = [];
                    let pendingIndex = 0;
                    for (;;) {
                        const more = inputIndex < bytes.length;
                        if (!more || (pendingIndex >= pendingSize - 1)) {
                            const subarray = pending.subarray(0, pendingIndex);
                            const arraylike = subarray;
                            chunks.push(String.fromCharCode.apply(null, arraylike));
                            if (!more) {
                                return chunks.join('');
                            }
                            bytes = bytes.subarray(inputIndex);
                            inputIndex = 0;
                            pendingIndex = 0;
                        }
                        const byte1 = bytes[inputIndex++];
                        if ((byte1 & 0x80) === 0) {
                            pending[pendingIndex++] = byte1;
                        }
                        else if ((byte1 & 0xe0) === 0xc0) {
                            const byte2 = bytes[inputIndex++] & 0x3f;
                            pending[pendingIndex++] = ((byte1 & 0x1f) << 6) | byte2;
                        }
                        else if ((byte1 & 0xf0) === 0xe0) {
                            const byte2 = bytes[inputIndex++] & 0x3f;
                            const byte3 = bytes[inputIndex++] & 0x3f;
                            pending[pendingIndex++] = ((byte1 & 0x1f) << 12) | (byte2 << 6) | byte3;
                        }
                        else if ((byte1 & 0xf8) === 0xf0) {
                            const byte2 = bytes[inputIndex++] & 0x3f;
                            const byte3 = bytes[inputIndex++] & 0x3f;
                            const byte4 = bytes[inputIndex++] & 0x3f;
                            let codepoint = ((byte1 & 0x07) << 0x12) | (byte2 << 0x0c) | (byte3 << 0x06) | byte4;
                            if (codepoint > 0xffff) {
                                codepoint -= 0x10000;
                                pending[pendingIndex++] = (codepoint >>> 10) & 0x3ff | 0xd800;
                                codepoint = 0xdc00 | codepoint & 0x3ff;
                            }
                            pending[pendingIndex++] = codepoint;
                        }
                        else ;
                    }
                }
            };
            let utf8Decoder;
            utf8Decoder = typeof TextDecoder === 'function' ? new TextDecoder() : fallbackDecoder;
            emnapiString.utf8Decoder = utf8Decoder;
            const fallbackDecoder2 = {
                decode(input) {
                    const bytes = new Uint16Array(input.buffer, input.byteOffset, input.byteLength / 2);
                    if (bytes.length <= 0x1000) {
                        return String.fromCharCode.apply(null, bytes);
                    }
                    const chunks = [];
                    let i = 0;
                    let len = 0;
                    for (; i < bytes.length; i += len) {
                        len = Math.min(0x1000, bytes.length - i);
                        chunks.push(String.fromCharCode.apply(null, bytes.subarray(i, i + len)));
                    }
                    return chunks.join('');
                }
            };
            let utf16Decoder;
            utf16Decoder = typeof TextDecoder === 'function' ? new TextDecoder('utf-16le') : fallbackDecoder2;
            emnapiString.utf16Decoder = utf16Decoder;
        },
        lengthBytesUTF8(str) {
            let c;
            let len = 0;
            for (let i = 0; i < str.length; ++i) {
                c = str.charCodeAt(i);
                if (c <= 0x7F) {
                    len++;
                }
                else if (c <= 0x7FF) {
                    len += 2;
                }
                else if (c >= 0xD800 && c <= 0xDFFF) {
                    len += 4;
                    ++i;
                }
                else {
                    len += 3;
                }
            }
            return len;
        },
        UTF8ToString(ptr, length) {
            if (!ptr || !length)
                return '';
            ptr >>>= 0;
            const HEAPU8 = new Uint8Array(wasmMemory.buffer);
            let end = ptr;
            if (length === -1 || length === 4294967295) {
                for (; HEAPU8[end];)
                    ++end;
            }
            else {
                end = ptr + (length >>> 0);
            }
            length = end - ptr;
            if (length <= 16) {
                let idx = ptr;
                var str = '';
                while (idx < end) {
                    var u0 = HEAPU8[idx++];
                    if (!(u0 & 0x80)) {
                        str += String.fromCharCode(u0);
                        continue;
                    }
                    var u1 = HEAPU8[idx++] & 63;
                    if ((u0 & 0xE0) === 0xC0) {
                        str += String.fromCharCode(((u0 & 31) << 6) | u1);
                        continue;
                    }
                    var u2 = HEAPU8[idx++] & 63;
                    if ((u0 & 0xF0) === 0xE0) {
                        u0 = ((u0 & 15) << 12) | (u1 << 6) | u2;
                    }
                    else {
                        u0 = ((u0 & 7) << 18) | (u1 << 12) | (u2 << 6) | (HEAPU8[idx++] & 63);
                    }
                    if (u0 < 0x10000) {
                        str += String.fromCharCode(u0);
                    }
                    else {
                        var ch = u0 - 0x10000;
                        str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
                    }
                }
                return str;
            }
            return emnapiString.utf8Decoder.decode(((typeof SharedArrayBuffer === "function" && HEAPU8.buffer instanceof SharedArrayBuffer) || (Object.prototype.toString.call(HEAPU8.buffer) === "[object SharedArrayBuffer]")) ? HEAPU8.slice(ptr, end) : HEAPU8.subarray(ptr, end));
        },
        stringToUTF8(str, outPtr, maxBytesToWrite) {
            const HEAPU8 = new Uint8Array(wasmMemory.buffer);
            let outIdx = outPtr;
            outIdx >>>= 0;
            if (!(maxBytesToWrite > 0)) {
                return 0;
            }
            var startIdx = outIdx;
            var endIdx = outIdx + maxBytesToWrite - 1;
            for (var i = 0; i < str.length; ++i) {
                var u = str.charCodeAt(i);
                if (u >= 0xD800 && u <= 0xDFFF) {
                    var u1 = str.charCodeAt(++i);
                    u = 0x10000 + ((u & 0x3FF) << 10) | (u1 & 0x3FF);
                }
                if (u <= 0x7F) {
                    if (outIdx >= endIdx)
                        break;
                    HEAPU8[outIdx++] = u;
                }
                else if (u <= 0x7FF) {
                    if (outIdx + 1 >= endIdx)
                        break;
                    HEAPU8[outIdx++] = 0xC0 | (u >> 6);
                    HEAPU8[outIdx++] = 0x80 | (u & 63);
                }
                else if (u <= 0xFFFF) {
                    if (outIdx + 2 >= endIdx)
                        break;
                    HEAPU8[outIdx++] = 0xE0 | (u >> 12);
                    HEAPU8[outIdx++] = 0x80 | ((u >> 6) & 63);
                    HEAPU8[outIdx++] = 0x80 | (u & 63);
                }
                else {
                    if (outIdx + 3 >= endIdx)
                        break;
                    HEAPU8[outIdx++] = 0xF0 | (u >> 18);
                    HEAPU8[outIdx++] = 0x80 | ((u >> 12) & 63);
                    HEAPU8[outIdx++] = 0x80 | ((u >> 6) & 63);
                    HEAPU8[outIdx++] = 0x80 | (u & 63);
                }
            }
            HEAPU8[outIdx] = 0;
            return outIdx - startIdx;
        },
        UTF16ToString(ptr, length) {
            if (!ptr || !length)
                return '';
            ptr >>>= 0;
            let end = ptr;
            if (length === -1 || length === 4294967295) {
                let idx = end >>> 1;
                const HEAPU16 = new Uint16Array(wasmMemory.buffer);
                while (HEAPU16[idx])
                    ++idx;
                end = (idx << 1) >>> 0;
            }
            else {
                end = ptr + (length >>> 0) * 2;
            }
            length = end - ptr;
            if (length <= 32) {
                return String.fromCharCode.apply(null, new Uint16Array(wasmMemory.buffer, ptr, length / 2));
            }
            const HEAPU8 = new Uint8Array(wasmMemory.buffer);
            return emnapiString.utf16Decoder.decode(((typeof SharedArrayBuffer === "function" && HEAPU8.buffer instanceof SharedArrayBuffer) || (Object.prototype.toString.call(HEAPU8.buffer) === "[object SharedArrayBuffer]")) ? HEAPU8.slice(ptr, end) : HEAPU8.subarray(ptr, end));
        },
        stringToUTF16(str, outPtr, maxBytesToWrite) {
            if (maxBytesToWrite === undefined) {
                maxBytesToWrite = 0x7FFFFFFF;
            }
            if (maxBytesToWrite < 2)
                return 0;
            maxBytesToWrite -= 2;
            var startPtr = outPtr;
            var numCharsToWrite = (maxBytesToWrite < str.length * 2) ? (maxBytesToWrite / 2) : str.length;
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
            for (var i = 0; i < numCharsToWrite; ++i) {
                var codeUnit = str.charCodeAt(i);
                GET_HEAP_DATA_VIEW().setInt16(outPtr, codeUnit, true);
                outPtr += 2;
            }
            GET_HEAP_DATA_VIEW().setInt16(outPtr, 0, true);
            return outPtr - startPtr;
        },
        newString(env, str, length, result, stringMaker) {
            length >>>= 0;
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            const envObject = emnapiEnv;
            envObject.checkGCAccess();
            const autoLength = length === -1 || length === 4294967295;
            const sizelength = length >>> 0;
            if (length !== 0) {
                if (!str)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            }
            if (!result)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            if (!(autoLength || (sizelength <= 2147483647)))
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            str >>>= 0;
            const strValue = stringMaker(str, autoLength, sizelength);
            result >>>= 0;
            const value = emnapiCtx.napiValueFromJsValue(strValue);
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
            GET_HEAP_DATA_VIEW().setUint32(result, value, true);
            return envObject.clearLastError();
        },
        newExternalString(env, str, length, finalize_callback, finalize_hint, result, copied, createApi, stringMaker) {
            length >>>= 0;
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            const envObject = emnapiEnv;
            envObject.checkGCAccess();
            const autoLength = length === -1 || length === 4294967295;
            const sizelength = length >>> 0;
            if (length !== 0) {
                if (!str)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            }
            if (!result)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            if (!(autoLength || (sizelength <= 2147483647)))
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            const status = createApi(env, str, length, result);
            if (status === 0 /* napi_status.napi_ok */) {
                if (copied) {
                    var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
                    GET_HEAP_DATA_VIEW().setInt8(copied, 1, true);
                }
                if (finalize_callback) {
                    envObject.callFinalizer(finalize_callback, str, finalize_hint);
                }
            }
            return status;
        },
        encode(str, autoLength, sizeLength, convert) {
            let latin1String = '';
            let len = 0;
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
            if (autoLength) {
                while (true) {
                    const ch = GET_HEAP_DATA_VIEW().getUint8(str, true);
                    if (!ch)
                        break;
                    latin1String += convert(ch);
                    str++;
                }
            }
            else {
                while (len < sizeLength) {
                    const ch = GET_HEAP_DATA_VIEW().getUint8(str, true);
                    if (!ch)
                        break;
                    latin1String += convert(ch);
                    len++;
                    str++;
                }
            }
            return latin1String;
        }
    };

    //#endregion src/string.ts

    //#region src/value/convert2c.ts
    /**
     * @__sig ippp
     */
    function napi_get_array_length(env, value, result) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!envObject.lastException.isEmpty())
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        if (!envObject.canCallIntoJs())
            return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
        envObject.clearLastError();
        try {
            if (!value)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            if (!result)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            const jsValue = emnapiCtx.jsValueFromNapiValue(value);
            if (!Array.isArray(jsValue)) {
                return envObject.setLastError(8 /* napi_status.napi_array_expected */);
            }
            result >>>= 0;
            const v = jsValue.length >>> 0;
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
            GET_HEAP_DATA_VIEW().setUint32(result, v, true);
            return (0 /* napi_status.napi_ok */);
        }
        catch (err) {
            envObject.lastException.resetTo(err);
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        }
    }
    /**
     * @__sig ipppp
     */
    function napi_get_arraybuffer_info(env, arraybuffer, data, byte_length) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!arraybuffer)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        const jsValue = emnapiCtx.jsValueFromNapiValue(arraybuffer);
        if (!(jsValue instanceof ArrayBuffer) && !emnapiExternalMemory.isSharedArrayBuffer(jsValue)) {
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        }
        var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
        // metadata is read through cached intrinsic getters (internal slots, like
        // native Node-API): no user JS can run inside this call. Only emnapi's own
        // getArrayBufferPointer() can still grow the memory (malloc for the copy of
        // an external buffer), which detaches the previous non-shared buffer, so
        // each value is resolved into a local BEFORE its makeSetValue write (the
        // store target is evaluated before the RHS).
        if (data) {
            data >>>= 0;
            const p = emnapiExternalMemory.getArrayBufferPointer(jsValue, true).address;
            GET_HEAP_DATA_VIEW().setUint32(data, p, true);
        }
        if (byte_length) {
            byte_length >>>= 0;
            const len = emnapiExternalMemory.bufferByteLength(jsValue);
            GET_HEAP_DATA_VIEW().setUint32(byte_length, len, true);
        }
        return envObject.clearLastError();
    }
    /**
     * @__sig ippp
     */
    function node_api_set_prototype(env, object, value) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!envObject.lastException.isEmpty())
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        if (!envObject.canCallIntoJs())
            return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
        envObject.clearLastError();
        try {
            if (!value)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            const obj = emnapiCtx.jsValueFromNapiValue(object);
            if (obj == null) {
                throw new TypeError('Cannot convert undefined or null to object');
            }
            const type = typeof obj;
            let v;
            try {
                v = (type === 'object' && obj !== null) || type === 'function' ? obj : Object(obj);
            }
            catch (_) {
                return envObject.setLastError(2 /* napi_status.napi_object_expected */);
            }
            const val = emnapiCtx.jsValueFromNapiValue(value);
            Object.setPrototypeOf(v, val);
            return (0 /* napi_status.napi_ok */);
        }
        catch (err) {
            envObject.lastException.resetTo(err);
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        }
    }
    /**
     * @__sig ippp
     */
    function napi_get_prototype(env, value, result) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!envObject.lastException.isEmpty())
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        if (!envObject.canCallIntoJs())
            return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
        envObject.clearLastError();
        try {
            if (!value)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            if (!result)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            const jsValue = emnapiCtx.jsValueFromNapiValue(value);
            if (jsValue == null) {
                throw new TypeError('Cannot convert undefined or null to object');
            }
            const type = typeof jsValue;
            let v;
            try {
                v = (type === 'object' && jsValue !== null) || type === 'function' ? jsValue : Object(jsValue);
            }
            catch (_) {
                return envObject.setLastError(2 /* napi_status.napi_object_expected */);
            }
            result >>>= 0;
            const p = emnapiCtx.napiValueFromJsValue(Object.getPrototypeOf(v));
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
            GET_HEAP_DATA_VIEW().setUint32(result, p, true);
            return (0 /* napi_status.napi_ok */);
        }
        catch (err) {
            envObject.lastException.resetTo(err);
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        }
    }
    /**
     * @__sig ippppppp
     */
    function napi_get_typedarray_info(env, typedarray, type, length, data, arraybuffer, byte_offset) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!typedarray)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        const jsValue = emnapiCtx.jsValueFromNapiValue(typedarray);
        if (!(emnapiExternalMemory.intrinsics.isView(jsValue))) {
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        }
        let v = jsValue;
        var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
        // all view metadata (kind, buffer, byteOffset, length) is read through
        // cached intrinsic prototype getters: like native Node-API they read the
        // internal slots, never consult user accessors (no user JS can run inside
        // this call) and work for instances from any realm. Only emnapi's own
        // getViewPointer() can still grow the memory (malloc for the copy of an
        // external buffer), which detaches the previous non-shared buffer, so each
        // value is resolved into a local BEFORE its makeSetValue write (the store
        // target is evaluated before the RHS).
        if (type) {
            type >>>= 0;
            let t;
            switch (emnapiExternalMemory.intrinsics.typedArray.tag.call(v)) {
                case 'Int8Array':
                    t = 0 /* napi_typedarray_type.napi_int8_array */;
                    break;
                case 'Uint8Array':
                    t = 1 /* napi_typedarray_type.napi_uint8_array */;
                    break;
                case 'Uint8ClampedArray':
                    t = 2 /* napi_typedarray_type.napi_uint8_clamped_array */;
                    break;
                case 'Int16Array':
                    t = 3 /* napi_typedarray_type.napi_int16_array */;
                    break;
                case 'Uint16Array':
                    t = 4 /* napi_typedarray_type.napi_uint16_array */;
                    break;
                case 'Int32Array':
                    t = 5 /* napi_typedarray_type.napi_int32_array */;
                    break;
                case 'Uint32Array':
                    t = 6 /* napi_typedarray_type.napi_uint32_array */;
                    break;
                case 'Float16Array':
                    t = 11 /* napi_typedarray_type.napi_float16_array */;
                    break;
                case 'Float32Array':
                    t = 7 /* napi_typedarray_type.napi_float32_array */;
                    break;
                case 'Float64Array':
                    t = 8 /* napi_typedarray_type.napi_float64_array */;
                    break;
                case 'BigInt64Array':
                    t = 9 /* napi_typedarray_type.napi_bigint64_array */;
                    break;
                case 'BigUint64Array':
                    t = 10 /* napi_typedarray_type.napi_biguint64_array */;
                    break;
                default:
                    return envObject.setLastError(9 /* napi_status.napi_generic_failure */);
            }
            GET_HEAP_DATA_VIEW().setInt32(type, t, true);
        }
        v = emnapiExternalMemory.getOrUpdateMemoryView(v);
        if (length) {
            length >>>= 0;
            const len = emnapiExternalMemory.viewLength(v);
            GET_HEAP_DATA_VIEW().setUint32(length, len, true);
        }
        if (data || arraybuffer) {
            if (data) {
                data >>>= 0;
                const vp = emnapiExternalMemory.getViewPointer(v, true);
                v = vp.view;
                const p = vp.address;
                GET_HEAP_DATA_VIEW().setUint32(data, p, true);
            }
            if (arraybuffer) {
                arraybuffer >>>= 0;
                const ab = emnapiCtx.napiValueFromJsValue(emnapiExternalMemory.viewBuffer(v));
                GET_HEAP_DATA_VIEW().setUint32(arraybuffer, ab, true);
            }
        }
        if (byte_offset) {
            byte_offset >>>= 0;
            const offset = emnapiExternalMemory.viewByteOffset(v);
            GET_HEAP_DATA_VIEW().setUint32(byte_offset, offset, true);
        }
        return envObject.clearLastError();
    }
    /**
     * @__sig ipppp
     */
    function napi_get_buffer_info(env, buffer, data, length) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!buffer)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        const jsValue = emnapiCtx.jsValueFromNapiValue(buffer);
        const Buffer = emnapiCtx.features.Buffer;
        const bool = (emnapiExternalMemory.intrinsics.isView(jsValue) || (typeof Buffer === 'function' && Buffer.isBuffer(jsValue)));
        if (!bool)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        // any-realm slot-based classification: the intrinsic @@toStringTag getter
        // returns undefined exactly for DataViews among ArrayBuffer views
        if (emnapiExternalMemory.intrinsics.typedArray.tag.call(jsValue) === undefined) {
            return napi_get_dataview_info(env, buffer, length, data, 0, 0);
        }
        return napi_get_typedarray_info(env, buffer, 0, length, data, 0, 0);
    }
    /**
     * @__sig ipppppp
     */
    function napi_get_dataview_info(env, dataview, byte_length, data, arraybuffer, byte_offset) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!dataview)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        const jsValue = emnapiCtx.jsValueFromNapiValue(dataview);
        // any-realm slot-based classification (see napi_get_buffer_info)
        if (!(emnapiExternalMemory.intrinsics.isView(jsValue)) || emnapiExternalMemory.intrinsics.typedArray.tag.call(jsValue) !== undefined) {
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        }
        let v = emnapiExternalMemory.getOrUpdateMemoryView(jsValue);
        var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
        // all view metadata is read through cached intrinsic prototype getters:
        // like native Node-API they read the internal slots, never consult user
        // accessors (no user JS can run inside this call) and work for instances
        // from any realm. Only emnapi's own getViewPointer() can still grow the
        // memory (malloc for the copy of an external buffer), which detaches the
        // previous non-shared buffer, so each value is resolved into a local
        // BEFORE its makeSetValue write (the store target is evaluated before
        // the RHS).
        if (byte_length) {
            byte_length >>>= 0;
            const len = emnapiExternalMemory.viewLength(v);
            GET_HEAP_DATA_VIEW().setUint32(byte_length, len, true);
        }
        if (data || arraybuffer) {
            if (data) {
                data >>>= 0;
                const vp = emnapiExternalMemory.getViewPointer(v, true);
                v = vp.view;
                const p = vp.address;
                GET_HEAP_DATA_VIEW().setUint32(data, p, true);
            }
            if (arraybuffer) {
                arraybuffer >>>= 0;
                const ab = emnapiCtx.napiValueFromJsValue(emnapiExternalMemory.viewBuffer(v));
                GET_HEAP_DATA_VIEW().setUint32(arraybuffer, ab, true);
            }
        }
        if (byte_offset) {
            byte_offset >>>= 0;
            const offset = emnapiExternalMemory.viewByteOffset(v);
            GET_HEAP_DATA_VIEW().setUint32(byte_offset, offset, true);
        }
        return envObject.clearLastError();
    }
    /**
     * @__sig ippp
     */
    function napi_get_date_value(env, value, result) {
        let v;
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!envObject.lastException.isEmpty())
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        if (!envObject.canCallIntoJs())
            return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
        envObject.clearLastError();
        try {
            if (!value)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            if (!result)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            const jsValue = emnapiCtx.jsValueFromNapiValue(value);
            if (!(jsValue instanceof Date)) {
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            }
            result >>>= 0;
            v = jsValue.valueOf();
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
            GET_HEAP_DATA_VIEW().setFloat64(result, v, true);
            return (0 /* napi_status.napi_ok */);
        }
        catch (err) {
            envObject.lastException.resetTo(err);
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        }
    }
    /**
     * @__sig ippp
     */
    function napi_get_value_bool(env, value, result) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!value)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        if (!result)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        const jsValue = emnapiCtx.jsValueFromNapiValue(value);
        if (typeof jsValue !== 'boolean') {
            return envObject.setLastError(7 /* napi_status.napi_boolean_expected */);
        }
        result >>>= 0;
        const r = jsValue ? 1 : 0;
        var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
        GET_HEAP_DATA_VIEW().setInt8(result, r, true);
        return envObject.clearLastError();
    }
    /**
     * @__sig ippp
     */
    function napi_get_value_double(env, value, result) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!value)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        if (!result)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        const jsValue = emnapiCtx.jsValueFromNapiValue(value);
        if (typeof jsValue !== 'number') {
            return envObject.setLastError(6 /* napi_status.napi_number_expected */);
        }
        result >>>= 0;
        const r = jsValue;
        var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
        GET_HEAP_DATA_VIEW().setFloat64(result, r, true);
        return envObject.clearLastError();
    }
    /**
     * @__sig ipppp
     */
    function napi_get_value_bigint_int64(env, value, result, lossless) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!emnapiCtx.features.BigInt) {
            return envObject.setLastError(9 /* napi_status.napi_generic_failure */);
        }
        if (!value)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        if (!result)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        if (!lossless)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        let numberValue = emnapiCtx.jsValueFromNapiValue(value);
        if (typeof numberValue !== 'bigint') {
            return envObject.setLastError(6 /* napi_status.napi_number_expected */);
        }
        lossless >>>= 0;
        result >>>= 0;
        var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
        if ((numberValue >= (BigInt(-1) * (BigInt(1) << BigInt(63)))) && (numberValue < (BigInt(1) << BigInt(63)))) {
            GET_HEAP_DATA_VIEW().setInt8(lossless, 1, true);
        }
        else {
            GET_HEAP_DATA_VIEW().setInt8(lossless, 0, true);
            numberValue = numberValue & ((BigInt(1) << BigInt(64)) - BigInt(1));
            if (numberValue >= (BigInt(1) << BigInt(63))) {
                numberValue = numberValue - (BigInt(1) << BigInt(64));
            }
        }
        const low = Number(numberValue & BigInt(0xffffffff));
        const high = Number(numberValue >> BigInt(32));
        GET_HEAP_DATA_VIEW().setInt32(result, low, true);
        GET_HEAP_DATA_VIEW().setInt32(result + 4, high, true);
        return envObject.clearLastError();
    }
    /**
     * @__sig ipppp
     */
    function napi_get_value_bigint_uint64(env, value, result, lossless) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!emnapiCtx.features.BigInt) {
            return envObject.setLastError(9 /* napi_status.napi_generic_failure */);
        }
        if (!value)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        if (!result)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        if (!lossless)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        let numberValue = emnapiCtx.jsValueFromNapiValue(value);
        if (typeof numberValue !== 'bigint') {
            return envObject.setLastError(6 /* napi_status.napi_number_expected */);
        }
        lossless >>>= 0;
        result >>>= 0;
        var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
        if ((numberValue >= BigInt(0)) && (numberValue < (BigInt(1) << BigInt(64)))) {
            GET_HEAP_DATA_VIEW().setInt8(lossless, 1, true);
        }
        else {
            GET_HEAP_DATA_VIEW().setInt8(lossless, 0, true);
            numberValue = numberValue & ((BigInt(1) << BigInt(64)) - BigInt(1));
        }
        const low = Number(numberValue & BigInt(0xffffffff));
        const high = Number(numberValue >> BigInt(32));
        GET_HEAP_DATA_VIEW().setUint32(result, low, true);
        GET_HEAP_DATA_VIEW().setUint32(result + 4, high, true);
        return envObject.clearLastError();
    }
    /**
     * @__sig ippppp
     */
    function napi_get_value_bigint_words(env, value, sign_bit, word_count, words) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!emnapiCtx.features.BigInt) {
            return envObject.setLastError(9 /* napi_status.napi_generic_failure */);
        }
        if (!value)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        if (!word_count)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        const jsValue = emnapiCtx.jsValueFromNapiValue(value);
        if (typeof jsValue !== 'bigint') {
            return envObject.setLastError(17 /* napi_status.napi_bigint_expected */);
        }
        const isMinus = jsValue < BigInt(0);
        sign_bit >>>= 0;
        words >>>= 0;
        word_count >>>= 0;
        var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
        let word_count_int = GET_HEAP_DATA_VIEW().getUint32(word_count, true);
        word_count_int >>>= 0;
        let wordCount = 0;
        let bigintValue = isMinus ? (jsValue * BigInt(-1)) : jsValue;
        while (bigintValue !== BigInt(0)) {
            wordCount++;
            bigintValue = bigintValue >> BigInt(64);
        }
        bigintValue = isMinus ? (jsValue * BigInt(-1)) : jsValue;
        if (!sign_bit && !words) {
            word_count_int = wordCount;
            GET_HEAP_DATA_VIEW().setUint32(word_count, word_count_int, true);
        }
        else {
            if (!sign_bit)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            if (!words)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            const wordsArr = [];
            while (bigintValue !== BigInt(0)) {
                const uint64 = bigintValue & ((BigInt(1) << BigInt(64)) - BigInt(1));
                wordsArr.push(uint64);
                bigintValue = bigintValue >> BigInt(64);
            }
            const len = Math.min(word_count_int, wordsArr.length);
            for (let i = 0; i < len; i++) {
                const low = Number(wordsArr[i] & BigInt(0xffffffff));
                const high = Number(wordsArr[i] >> BigInt(32));
                GET_HEAP_DATA_VIEW().setUint32(words + i * 8, low, true);
                GET_HEAP_DATA_VIEW().setUint32(words + (i * 8 + 4), high, true);
            }
            GET_HEAP_DATA_VIEW().setInt32(sign_bit, isMinus ? 1 : 0, true);
            GET_HEAP_DATA_VIEW().setUint32(word_count, len, true);
        }
        return envObject.clearLastError();
    }
    /**
     * @__sig ippp
     */
    function napi_get_value_external(env, value, result) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!value)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        if (!result)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        const jsValue = emnapiCtx.jsValueFromNapiValue(value);
        if (!emnapiCtx.isExternal(jsValue)) {
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        }
        result >>>= 0;
        const p = emnapiCtx.getExternalValue(jsValue);
        var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
        GET_HEAP_DATA_VIEW().setUint32(result, p, true);
        return envObject.clearLastError();
    }
    /**
     * @__sig ippp
     */
    function napi_get_value_int32(env, value, result) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!value)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        if (!result)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        const jsValue = emnapiCtx.jsValueFromNapiValue(value);
        if (typeof jsValue !== 'number') {
            return envObject.setLastError(6 /* napi_status.napi_number_expected */);
        }
        result >>>= 0;
        const v = new Int32Array([jsValue])[0];
        var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
        GET_HEAP_DATA_VIEW().setInt32(result, v, true);
        return envObject.clearLastError();
    }
    /**
     * @__sig ippp
     */
    function napi_get_value_int64(env, value, result) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!value)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        if (!result)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        const jsValue = emnapiCtx.jsValueFromNapiValue(value);
        if (typeof jsValue !== 'number') {
            return envObject.setLastError(6 /* napi_status.napi_number_expected */);
        }
        const numberValue = jsValue;
        result >>>= 0;
        var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
        if (numberValue === Number.POSITIVE_INFINITY || numberValue === Number.NEGATIVE_INFINITY || isNaN(numberValue)) {
            GET_HEAP_DATA_VIEW().setInt32(result, 0, true);
            GET_HEAP_DATA_VIEW().setInt32(result + 4, 0, true);
        }
        else if (numberValue < /* INT64_RANGE_NEGATIVE */ -9223372036854776e3) {
            GET_HEAP_DATA_VIEW().setInt32(result, 0, true);
            GET_HEAP_DATA_VIEW().setInt32(result + 4, 2147483648, true);
        }
        else if (numberValue >= /* INT64_RANGE_POSITIVE */ 9223372036854776000) {
            GET_HEAP_DATA_VIEW().setUint32(result, 4294967295, true);
            GET_HEAP_DATA_VIEW().setUint32(result + 4, 2147483647, true);
        }
        else {
            $emnapiSetValueI64(result, Math.trunc(numberValue));
        }
        return envObject.clearLastError();
    }
    /**
     * @__sig ippppp
     */
    function napi_get_value_string_latin1(env, value, buf, buf_size, result) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!value)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        result >>>= 0;
        buf >>>= 0;
        buf_size >>>= 0;
        buf_size = buf_size >>> 0;
        const jsValue = emnapiCtx.jsValueFromNapiValue(value);
        if (typeof jsValue !== 'string') {
            return envObject.setLastError(3 /* napi_status.napi_string_expected */);
        }
        var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
        if (!buf) {
            if (!result)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            GET_HEAP_DATA_VIEW().setUint32(result, jsValue.length, true);
        }
        else if (buf_size !== 0) {
            let copied = 0;
            let v;
            for (let i = 0; i < buf_size - 1; ++i) {
                v = jsValue.charCodeAt(i) & 0xff;
                GET_HEAP_DATA_VIEW().setUint8(buf + i, v, true);
                copied++;
            }
            GET_HEAP_DATA_VIEW().setUint8(buf + copied, 0, true);
            if (result) {
                GET_HEAP_DATA_VIEW().setUint32(result, copied, true);
            }
        }
        else if (result) {
            GET_HEAP_DATA_VIEW().setUint32(result, 0, true);
        }
        return envObject.clearLastError();
    }
    /**
     * @__sig ippppp
     */
    function napi_get_value_string_utf8(env, value, buf, buf_size, result) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!value)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        result >>>= 0;
        buf >>>= 0;
        buf_size >>>= 0;
        buf_size = buf_size >>> 0;
        const jsValue = emnapiCtx.jsValueFromNapiValue(value);
        if (typeof jsValue !== 'string') {
            return envObject.setLastError(3 /* napi_status.napi_string_expected */);
        }
        var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
        if (!buf) {
            if (!result)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            const strLength = emnapiString.lengthBytesUTF8(jsValue);
            GET_HEAP_DATA_VIEW().setUint32(result, strLength, true);
        }
        else if (buf_size !== 0) {
            const copied = emnapiString.stringToUTF8(jsValue, buf, buf_size);
            if (result) {
                GET_HEAP_DATA_VIEW().setUint32(result, copied, true);
            }
        }
        else if (result) {
            GET_HEAP_DATA_VIEW().setUint32(result, 0, true);
        }
        return envObject.clearLastError();
    }
    /**
     * @__sig ippppp
     */
    function napi_get_value_string_utf16(env, value, buf, buf_size, result) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!value)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        result >>>= 0;
        buf >>>= 0;
        buf_size >>>= 0;
        buf_size = buf_size >>> 0;
        const jsValue = emnapiCtx.jsValueFromNapiValue(value);
        if (typeof jsValue !== 'string') {
            return envObject.setLastError(3 /* napi_status.napi_string_expected */);
        }
        var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
        if (!buf) {
            if (!result)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            GET_HEAP_DATA_VIEW().setUint32(result, jsValue.length, true);
        }
        else if (buf_size !== 0) {
            const copied = emnapiString.stringToUTF16(jsValue, buf, buf_size * 2);
            if (result) {
                GET_HEAP_DATA_VIEW().setUint32(result, copied / 2, true);
            }
        }
        else if (result) {
            GET_HEAP_DATA_VIEW().setUint32(result, 0, true);
        }
        return envObject.clearLastError();
    }
    /**
     * @__sig ippp
     */
    function napi_get_value_uint32(env, value, result) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!value)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        if (!result)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        const jsValue = emnapiCtx.jsValueFromNapiValue(value);
        if (typeof jsValue !== 'number') {
            return envObject.setLastError(6 /* napi_status.napi_number_expected */);
        }
        result >>>= 0;
        const v = new Uint32Array([jsValue])[0];
        var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
        GET_HEAP_DATA_VIEW().setUint32(result, v, true);
        return envObject.clearLastError();
    }

    //#endregion src/value/convert2c.ts

    var convert2cMod = /*#__PURE__*/Object.freeze({
        __proto__: null,
        napi_get_array_length: napi_get_array_length,
        napi_get_arraybuffer_info: napi_get_arraybuffer_info,
        napi_get_buffer_info: napi_get_buffer_info,
        napi_get_dataview_info: napi_get_dataview_info,
        napi_get_date_value: napi_get_date_value,
        napi_get_prototype: napi_get_prototype,
        napi_get_typedarray_info: napi_get_typedarray_info,
        napi_get_value_bigint_int64: napi_get_value_bigint_int64,
        napi_get_value_bigint_uint64: napi_get_value_bigint_uint64,
        napi_get_value_bigint_words: napi_get_value_bigint_words,
        napi_get_value_bool: napi_get_value_bool,
        napi_get_value_double: napi_get_value_double,
        napi_get_value_external: napi_get_value_external,
        napi_get_value_int32: napi_get_value_int32,
        napi_get_value_int64: napi_get_value_int64,
        napi_get_value_string_latin1: napi_get_value_string_latin1,
        napi_get_value_string_utf16: napi_get_value_string_utf16,
        napi_get_value_string_utf8: napi_get_value_string_utf8,
        napi_get_value_uint32: napi_get_value_uint32,
        node_api_set_prototype: node_api_set_prototype
    });

    //#region src/value/convert2napi.ts
    /**
     * @__sig ipip
     */
    function napi_create_int32(env, value, result) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!result)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        result >>>= 0;
        const v = emnapiCtx.napiValueFromJsValue(value);
        var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
        GET_HEAP_DATA_VIEW().setUint32(result, v, true);
        return envObject.clearLastError();
    }
    /**
     * @__sig ipip
     */
    function napi_create_uint32(env, value, result) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!result)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        result >>>= 0;
        const v = emnapiCtx.napiValueFromJsValue(value >>> 0);
        var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
        GET_HEAP_DATA_VIEW().setUint32(result, v, true);
        return envObject.clearLastError();
    }
    /**
     * @__sig ipjp
     */
    function napi_create_int64(env, low, high, result) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        let value;
        if (!high)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        value = Number(low);
        const v1 = emnapiCtx.napiValueFromJsValue(value);
        high >>>= 0;
        var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
        GET_HEAP_DATA_VIEW().setUint32(high, v1, true);
        return envObject.clearLastError();
    }
    /**
     * @__sig ipdp
     */
    function napi_create_double(env, value, result) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!result)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        result >>>= 0;
        const v = emnapiCtx.napiValueFromJsValue(value);
        var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
        GET_HEAP_DATA_VIEW().setUint32(result, v, true);
        return envObject.clearLastError();
    }
    /**
     * @__sig ipppp
     */
    function napi_create_string_latin1(env, str, length, result) {
        return emnapiString.newString(env, str, length, result, (str, autoLength, sizeLength) => {
            return emnapiString.encode(str, autoLength, sizeLength, (c) => String.fromCharCode(c));
        });
    }
    /**
     * @__sig ipppp
     */
    function napi_create_string_utf16(env, str, length, result) {
        return emnapiString.newString(env, str, length, result, (str) => {
            return emnapiString.UTF16ToString(str, length);
        });
    }
    /**
     * @__sig ipppp
     */
    function napi_create_string_utf8(env, str, length, result) {
        return emnapiString.newString(env, str, length, result, (str) => {
            return emnapiString.UTF8ToString(str, length);
        });
    }
    /**
     * @__sig ippppppp
     */
    function node_api_create_external_string_latin1(env, str, length, finalize_callback, finalize_hint, result, copied) {
        return emnapiString.newExternalString(env, str, length, finalize_callback, finalize_hint, result, copied, napi_create_string_latin1, undefined);
    }
    /**
     * @__sig ippppppp
     */
    function node_api_create_external_string_utf16(env, str, length, finalize_callback, finalize_hint, result, copied) {
        return emnapiString.newExternalString(env, str, length, finalize_callback, finalize_hint, result, copied, napi_create_string_utf16, undefined);
    }
    /**
     * @__sig ipppp
     */
    function node_api_create_property_key_latin1(env, str, length, result) {
        return napi_create_string_latin1(env, str, length, result);
    }
    /**
     * @__sig ipppp
     */
    function node_api_create_property_key_utf8(env, str, length, result) {
        return napi_create_string_utf8(env, str, length, result);
    }
    /**
     * @__sig ipppp
     */
    function node_api_create_property_key_utf16(env, str, length, result) {
        return napi_create_string_utf16(env, str, length, result);
    }
    /**
     * @__sig ipjp
     */
    function napi_create_bigint_int64(env, low, high, result) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!emnapiCtx.features.BigInt) {
            return envObject.setLastError(9 /* napi_status.napi_generic_failure */);
        }
        let value;
        if (!high)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        value = low;
        const v1 = emnapiCtx.napiValueFromJsValue(value);
        high >>>= 0;
        var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
        GET_HEAP_DATA_VIEW().setUint32(high, v1, true);
        return envObject.clearLastError();
    }
    /**
     * @__sig ipjp
     */
    function napi_create_bigint_uint64(env, low, high, result) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!emnapiCtx.features.BigInt) {
            return envObject.setLastError(9 /* napi_status.napi_generic_failure */);
        }
        let value;
        if (!high)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        value = low & ((BigInt(1) << BigInt(64)) - BigInt(1));
        const v1 = emnapiCtx.napiValueFromJsValue(value);
        high >>>= 0;
        var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
        GET_HEAP_DATA_VIEW().setUint32(high, v1, true);
        return envObject.clearLastError();
    }
    /**
     * @__sig ipippp
     */
    function napi_create_bigint_words(env, sign_bit, word_count, words, result) {
        let v, i;
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!envObject.lastException.isEmpty())
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        if (!envObject.canCallIntoJs())
            return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
        envObject.clearLastError();
        try {
            if (!emnapiCtx.features.BigInt) {
                return envObject.setLastError(9 /* napi_status.napi_generic_failure */);
            }
            if (!result)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            words >>>= 0;
            word_count >>>= 0;
            word_count = word_count >>> 0;
            if (word_count > 2147483647) {
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            }
            if (word_count > (1024 * 1024 / (4 * 8) / 2)) {
                throw new RangeError('Maximum BigInt size exceeded');
            }
            let value = BigInt(0);
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
            for (i = 0; i < word_count; i++) {
                const low = GET_HEAP_DATA_VIEW().getUint32(words + i * 8, true);
                const high = GET_HEAP_DATA_VIEW().getUint32(words + (i * 8 + 4), true);
                const wordi = BigInt(low) | (BigInt(high) << BigInt(32));
                value += wordi << BigInt(64 * i);
            }
            value *= ((BigInt(sign_bit) % BigInt(2) === BigInt(0)) ? BigInt(1) : BigInt(-1));
            result >>>= 0;
            v = emnapiCtx.napiValueFromJsValue(value);
            GET_HEAP_DATA_VIEW().setUint32(result, v, true);
            return (0 /* napi_status.napi_ok */);
        }
        catch (err) {
            envObject.lastException.resetTo(err);
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        }
    }

    //#endregion src/value/convert2napi.ts

    var convert2napiMod = /*#__PURE__*/Object.freeze({
        __proto__: null,
        napi_create_bigint_int64: napi_create_bigint_int64,
        napi_create_bigint_uint64: napi_create_bigint_uint64,
        napi_create_bigint_words: napi_create_bigint_words,
        napi_create_double: napi_create_double,
        napi_create_int32: napi_create_int32,
        napi_create_int64: napi_create_int64,
        napi_create_string_latin1: napi_create_string_latin1,
        napi_create_string_utf16: napi_create_string_utf16,
        napi_create_string_utf8: napi_create_string_utf8,
        napi_create_uint32: napi_create_uint32,
        node_api_create_external_string_latin1: node_api_create_external_string_latin1,
        node_api_create_external_string_utf16: node_api_create_external_string_utf16,
        node_api_create_property_key_latin1: node_api_create_property_key_latin1,
        node_api_create_property_key_utf16: node_api_create_property_key_utf16,
        node_api_create_property_key_utf8: node_api_create_property_key_utf8
    });

    //#region src/internal.ts
    function emnapiCreateFunction(envObject, utf8name, length, cb, data) {
        utf8name >>>= 0;
        const functionName = (!utf8name || !length) ? '' : (emnapiString.UTF8ToString(utf8name, length));
        let dynamicExecution;
        dynamicExecution = true;
        if (!functionName) {
            return {
                status: 0 /* napi_status.napi_ok */,
                f: emnapiCtx.createFunction(envObject, (wasmTable.get(cb)), data, functionName, dynamicExecution)
            };
        }
        if (!(/^[_$a-zA-Z][_$a-zA-Z0-9]*$/.test(functionName))) {
            return { status: 1 /* napi_status.napi_invalid_arg */, f: undefined };
        }
        return {
            status: 0 /* napi_status.napi_ok */,
            f: emnapiCtx.createFunction(envObject, (wasmTable.get(cb)), data, functionName, dynamicExecution)
        };
    }
    function emnapiDefineProperty(envObject, obj, propertyName, method, getter, setter, value, attributes, data) {
        if (getter || setter) {
            let localGetter;
            let localSetter;
            if (getter) {
                localGetter = emnapiCreateFunction(envObject, 0, 0, getter, data).f;
            }
            if (setter) {
                localSetter = emnapiCreateFunction(envObject, 0, 0, setter, data).f;
            }
            const desc = {
                configurable: (attributes & 4 /* napi_property_attributes.napi_configurable */) !== 0,
                enumerable: (attributes & 2 /* napi_property_attributes.napi_enumerable */) !== 0,
                get: localGetter,
                set: localSetter
            };
            Object.defineProperty(obj, propertyName, desc);
        }
        else if (method) {
            const localMethod = emnapiCreateFunction(envObject, 0, 0, method, data).f;
            const desc = {
                configurable: (attributes & 4 /* napi_property_attributes.napi_configurable */) !== 0,
                enumerable: (attributes & 2 /* napi_property_attributes.napi_enumerable */) !== 0,
                writable: (attributes & 1 /* napi_property_attributes.napi_writable */) !== 0,
                value: localMethod
            };
            Object.defineProperty(obj, propertyName, desc);
        }
        else {
            const desc = {
                configurable: (attributes & 4 /* napi_property_attributes.napi_configurable */) !== 0,
                enumerable: (attributes & 2 /* napi_property_attributes.napi_enumerable */) !== 0,
                writable: (attributes & 1 /* napi_property_attributes.napi_writable */) !== 0,
                value: emnapiCtx.jsValueFromNapiValue(value)
            };
            Object.defineProperty(obj, propertyName, desc);
        }
    }
    function emnapiGetHandle(js_object) {
        let jsValue = emnapiCtx.jsValueFromNapiValue(js_object);
        const type = typeof jsValue;
        if (!((type === 'object' && jsValue !== null) || type === 'function')) {
            return { status: 1 /* napi_status.napi_invalid_arg */ };
        }
        if (typeof emnapiExternalMemory !== 'undefined' && ArrayBuffer.isView(jsValue)) {
            if (emnapiExternalMemory.wasmMemoryViewTable.has(jsValue)) {
                jsValue = emnapiExternalMemory.wasmMemoryViewTable.get(jsValue);
            }
        }
        return { status: 0 /* napi_status.napi_ok */, value: jsValue };
    }
    function emnapiWrap(env, js_object, native_object, finalize_cb, finalize_hint, result) {
        let referenceId;
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!envObject.lastException.isEmpty())
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        if (!envObject.canCallIntoJs())
            return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
        envObject.clearLastError();
        try {
            if (!emnapiCtx.features.finalizer) {
                if (finalize_cb) {
                    throw emnapiCtx.createNotSupportWeakRefError('napi_wrap', 'Parameter "finalize_cb" must be 0(NULL)');
                }
                if (result) {
                    throw emnapiCtx.createNotSupportWeakRefError('napi_wrap', 'Parameter "result" must be 0(NULL)');
                }
            }
            if (!js_object)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            const handleResult = emnapiGetHandle(js_object);
            if (handleResult.status !== 0 /* napi_status.napi_ok */) {
                return envObject.setLastError(handleResult.status);
            }
            const v = handleResult.value;
            if (envObject.getObjectBinding(v).wrapped !== 0) {
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            }
            const id = emnapiCtx.napiValueFromJsValue(v);
            let reference;
            if (result) {
                if (!finalize_cb)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                reference = emnapiCtx.createReferenceWithFinalizer(envObject, id, 0, 1 /* ReferenceOwnership.kUserland */, finalize_cb, native_object, finalize_hint);
                result >>>= 0;
                referenceId = reference.id;
                var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
                GET_HEAP_DATA_VIEW().setUint32(result, referenceId, true);
            }
            else {
                if (finalize_cb) {
                    reference = emnapiCtx.createReferenceWithFinalizer(envObject, id, 0, 0 /* ReferenceOwnership.kRuntime */, finalize_cb, native_object, finalize_hint);
                }
                else {
                    reference = emnapiCtx.createReferenceWithData(envObject, id, 0, 0 /* ReferenceOwnership.kRuntime */, native_object);
                }
            }
            envObject.getObjectBinding(v).wrapped = reference.id;
            return (0 /* napi_status.napi_ok */);
        }
        catch (err) {
            envObject.lastException.resetTo(err);
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        }
    }
    function emnapiUnwrap(env, js_object, result, action) {
        let data;
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!envObject.lastException.isEmpty())
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        if (!envObject.canCallIntoJs())
            return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
        envObject.clearLastError();
        try {
            if (!js_object)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            if (action === 0 /* UnwrapAction.KeepWrap */) {
                if (!result)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            }
            const value = emnapiCtx.jsValueFromNapiValue(js_object);
            const type = typeof value;
            if (!((type === 'object' && value !== null) || type === 'function')) {
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            }
            const binding = envObject.getObjectBinding(value);
            const referenceId = binding.wrapped;
            const ref = emnapiCtx.getRef(referenceId);
            if (!ref)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            if (result) {
                result >>>= 0;
                data = ref.data();
                var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
                GET_HEAP_DATA_VIEW().setUint32(result, data, true);
            }
            if (action === 1 /* UnwrapAction.RemoveWrap */) {
                binding.wrapped = 0;
                if (ref.ownership() === 1 /* ReferenceOwnership.kUserland */) {
                    // When the wrap is been removed, the finalizer should be reset.
                    ref.resetFinalizer();
                }
                else {
                    ref.dispose();
                }
            }
            return (0 /* napi_status.napi_ok */);
        }
        catch (err) {
            envObject.lastException.resetTo(err);
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        }
    }

    //#endregion src/internal.ts

    //#region src/wrap.ts
    /**
     * @__sig ipppppppp
     */
    function napi_define_class(env, utf8name, length, constructor, callback_data, property_count, properties, result) {
        let propPtr, valueHandleId, attributes;
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!envObject.lastException.isEmpty())
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        if (!envObject.canCallIntoJs())
            return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
        envObject.clearLastError();
        try {
            if (!result)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            if (!constructor)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            length >>>= 0;
            properties >>>= 0;
            property_count >>>= 0;
            property_count = property_count >>> 0;
            if (property_count > 0) {
                if (!properties)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            }
            if (!((length >= -1 && length <= 2147483647) || length === 4294967295) || (!utf8name)) {
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            }
            const fresult = emnapiCreateFunction(envObject, utf8name, length, constructor, callback_data);
            if (fresult.status !== 0 /* napi_status.napi_ok */)
                return envObject.setLastError(fresult.status);
            const F = fresult.f;
            let propertyName;
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
            for (let i = 0; i < property_count; i++) {
                propPtr = properties + (i * (4 * 8));
                const utf8Name = GET_HEAP_DATA_VIEW().getUint32(propPtr, true);
                const name = GET_HEAP_DATA_VIEW().getUint32(propPtr + 4, true);
                const method = GET_HEAP_DATA_VIEW().getUint32(propPtr + 8, true);
                const getter = GET_HEAP_DATA_VIEW().getUint32(propPtr + 12, true);
                const setter = GET_HEAP_DATA_VIEW().getUint32(propPtr + 16, true);
                const value = GET_HEAP_DATA_VIEW().getUint32(propPtr + 20, true);
                attributes = GET_HEAP_DATA_VIEW().getInt32(propPtr + 24, true);
                attributes >>>= 0;
                const data = GET_HEAP_DATA_VIEW().getUint32(propPtr + 28, true);
                if (utf8Name) {
                    propertyName = emnapiString.UTF8ToString(utf8Name, -1);
                }
                else {
                    if (!name) {
                        return envObject.setLastError(4 /* napi_status.napi_name_expected */);
                    }
                    propertyName = emnapiCtx.jsValueFromNapiValue(name);
                    if (typeof propertyName !== 'string' && typeof propertyName !== 'symbol') {
                        return envObject.setLastError(4 /* napi_status.napi_name_expected */);
                    }
                }
                if ((attributes & 1024 /* napi_property_attributes.napi_static */) !== 0) {
                    emnapiDefineProperty(envObject, F, propertyName, method, getter, setter, value, attributes, data);
                    continue;
                }
                emnapiDefineProperty(envObject, F.prototype, propertyName, method, getter, setter, value, attributes, data);
            }
            valueHandleId = emnapiCtx.napiValueFromJsValue(F);
            result >>>= 0;
            GET_HEAP_DATA_VIEW().setUint32(result, valueHandleId, true);
            return (0 /* napi_status.napi_ok */);
        }
        catch (err) {
            envObject.lastException.resetTo(err);
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        }
    }
    /**
     * @__sig ipppppp
     */
    function napi_wrap(env, js_object, native_object, finalize_cb, finalize_hint, result) {
        return emnapiWrap(env, js_object, native_object, finalize_cb, finalize_hint, result);
    }
    /**
     * @__sig ippp
     */
    function napi_unwrap(env, js_object, result) {
        return emnapiUnwrap(env, js_object, result, 0 /* UnwrapAction.KeepWrap */);
    }
    /**
     * @__sig ippp
     */
    function napi_remove_wrap(env, js_object, result) {
        return emnapiUnwrap(env, js_object, result, 1 /* UnwrapAction.RemoveWrap */);
    }
    /**
     * @__sig ippp
     */
    function napi_type_tag_object(env, object, type_tag) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!envObject.lastException.isEmpty())
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        if (!envObject.canCallIntoJs())
            return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
        envObject.clearLastError();
        try {
            if (!object) {
                return envObject.setLastError(!envObject.lastException.isEmpty() ? 10 /* napi_status.napi_pending_exception */ : 1 /* napi_status.napi_invalid_arg */);
            }
            const value = emnapiCtx.jsValueFromNapiValue(object);
            const type = typeof value;
            if (!((type === 'object' && value !== null) || type === 'function')) {
                return envObject.setLastError(!envObject.lastException.isEmpty() ? 10 /* napi_status.napi_pending_exception */ : 2 /* napi_status.napi_object_expected */);
            }
            type_tag >>>= 0;
            if (!type_tag) {
                return envObject.setLastError(!envObject.lastException.isEmpty() ? 10 /* napi_status.napi_pending_exception */ : 1 /* napi_status.napi_invalid_arg */);
            }
            const binding = envObject.getObjectBinding(value);
            if (binding.tag !== null) {
                return envObject.setLastError(!envObject.lastException.isEmpty() ? 10 /* napi_status.napi_pending_exception */ : 1 /* napi_status.napi_invalid_arg */);
            }
            const tag = new Uint8Array(16);
            tag.set(new Uint8Array(wasmMemory.buffer, type_tag, 16));
            binding.tag = new Uint32Array(tag.buffer);
            return (0 /* napi_status.napi_ok */);
        }
        catch (err) {
            envObject.lastException.resetTo(err);
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        }
    }
    /**
     * @__sig ipppp
     */
    function napi_check_object_type_tag(env, object, type_tag, result) {
        // eslint-disable-next-line one-var
        let ret = true;
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!envObject.lastException.isEmpty())
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        if (!envObject.canCallIntoJs())
            return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
        envObject.clearLastError();
        try {
            if (!object) {
                return envObject.setLastError(!envObject.lastException.isEmpty() ? 10 /* napi_status.napi_pending_exception */ : 1 /* napi_status.napi_invalid_arg */);
            }
            const value = emnapiCtx.jsValueFromNapiValue(object);
            const type = typeof value;
            if (!((type === 'object' && value !== null) || type === 'function')) {
                return envObject.setLastError(!envObject.lastException.isEmpty() ? 10 /* napi_status.napi_pending_exception */ : 2 /* napi_status.napi_object_expected */);
            }
            if (!type_tag) {
                return envObject.setLastError(!envObject.lastException.isEmpty() ? 10 /* napi_status.napi_pending_exception */ : 1 /* napi_status.napi_invalid_arg */);
            }
            if (!result) {
                return envObject.setLastError(!envObject.lastException.isEmpty() ? 10 /* napi_status.napi_pending_exception */ : 1 /* napi_status.napi_invalid_arg */);
            }
            const binding = envObject.getObjectBinding(value);
            if (binding.tag !== null) {
                type_tag >>>= 0;
                const tag = binding.tag;
                const typeTag = new Uint32Array(wasmMemory.buffer, type_tag, 4);
                ret = (tag[0] === typeTag[0] &&
                    tag[1] === typeTag[1] &&
                    tag[2] === typeTag[2] &&
                    tag[3] === typeTag[3]);
            }
            else {
                ret = false;
            }
            result >>>= 0;
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
            GET_HEAP_DATA_VIEW().setInt8(result, ret ? 1 : 0, true);
            return (0 /* napi_status.napi_ok */);
        }
        catch (err) {
            envObject.lastException.resetTo(err);
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        }
    }
    /**
     * @__sig ipppppp
     */
    function napi_add_finalizer(env, js_object, finalize_data, finalize_cb, finalize_hint, result) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!emnapiCtx.features.finalizer) {
            return envObject.setLastError(9 /* napi_status.napi_generic_failure */);
        }
        if (!js_object)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        if (!finalize_cb)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        const handleResult = emnapiGetHandle(js_object);
        if (handleResult.status !== 0 /* napi_status.napi_ok */) {
            return envObject.setLastError(handleResult.status);
        }
        const id = emnapiCtx.napiValueFromJsValue(handleResult.value);
        const ownership = !result ? 0 /* ReferenceOwnership.kRuntime */ : 1 /* ReferenceOwnership.kUserland */;
        finalize_data >>>= 0;
        finalize_cb >>>= 0;
        finalize_hint >>>= 0;
        const reference = emnapiCtx.createReferenceWithFinalizer(envObject, id, 0, ownership, finalize_cb, finalize_data, finalize_hint);
        if (result) {
            result >>>= 0;
            const referenceId = reference.id;
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
            GET_HEAP_DATA_VIEW().setUint32(result, referenceId, true);
        }
        return envObject.clearLastError();
    }
    /**
     * @__sig ipppp
     */
    function node_api_post_finalizer(env, finalize_cb, finalize_data, finalize_hint) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        const envObject = emnapiEnv;
        envObject.enqueueFinalizer(emnapiCtx.createTrackedFinalizer(envObject, finalize_cb, finalize_data, finalize_hint));
        return envObject.clearLastError();
    }

    //#endregion src/wrap.ts

    var wrapMod = /*#__PURE__*/Object.freeze({
        __proto__: null,
        napi_add_finalizer: napi_add_finalizer,
        napi_check_object_type_tag: napi_check_object_type_tag,
        napi_define_class: napi_define_class,
        napi_remove_wrap: napi_remove_wrap,
        napi_type_tag_object: napi_type_tag_object,
        napi_unwrap: napi_unwrap,
        napi_wrap: napi_wrap,
        node_api_post_finalizer: node_api_post_finalizer
    });

    //#region src/emnapi.ts
    /**
     * @__sig vpippi
     */
    function emnapi_debug(file, lineno, str, ptr, type) {
        str >>>= 0;
        file >>>= 0;
        const string = str ? emnapiString.UTF8ToString(str, -1) : '';
        const message = `[emnapi_debug] ${emnapiString.UTF8ToString(file, -1)}:${lineno} ${string} ${ptr}`;
        const logArgs = [message];
        if (ptr) {
            logArgs.push(type === 1 ? emnapiCtx.isolate.getRef(ptr) : emnapiCtx.jsValueFromNapiValue(ptr));
        }
        console.log(...logArgs);
        // eslint-disable-next-line no-debugger
        debugger;
    }
    /**
     * @__sig ipippppp
     */
    function emnapi_create_memory_view(env, typedarray_type, external_data, byte_length, finalize_cb, finalize_hint, result) {
        let value;
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!envObject.lastException.isEmpty())
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        if (!envObject.canCallIntoJs())
            return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
        envObject.clearLastError();
        try {
            if (!result)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            byte_length >>>= 0;
            external_data >>>= 0;
            result >>>= 0;
            byte_length = byte_length >>> 0;
            if (!external_data) {
                byte_length = 0;
            }
            if (byte_length > 2147483647) {
                throw new RangeError('Cannot create a memory view larger than 2147483647 bytes');
            }
            if ((external_data + byte_length) > wasmMemory.buffer.byteLength) {
                throw new RangeError('Memory out of range');
            }
            if (!emnapiCtx.features.finalizer && finalize_cb) {
                throw emnapiCtx.createNotSupportWeakRefError('emnapi_create_memory_view', 'Parameter "finalize_cb" must be 0(NULL)');
            }
            let viewDescriptor;
            switch (typedarray_type) {
                case 0 /* emnapi_memory_view_type.emnapi_int8_array */:
                    viewDescriptor = { Ctor: Int8Array, address: external_data, length: byte_length, ownership: 1 /* ReferenceOwnership.kUserland */, runtimeAllocated: 0 };
                    break;
                case 1 /* emnapi_memory_view_type.emnapi_uint8_array */:
                    viewDescriptor = { Ctor: Uint8Array, address: external_data, length: byte_length, ownership: 1 /* ReferenceOwnership.kUserland */, runtimeAllocated: 0 };
                    break;
                case 2 /* emnapi_memory_view_type.emnapi_uint8_clamped_array */:
                    viewDescriptor = { Ctor: Uint8ClampedArray, address: external_data, length: byte_length, ownership: 1 /* ReferenceOwnership.kUserland */, runtimeAllocated: 0 };
                    break;
                case 3 /* emnapi_memory_view_type.emnapi_int16_array */:
                    viewDescriptor = { Ctor: Int16Array, address: external_data, length: byte_length >> 1, ownership: 1 /* ReferenceOwnership.kUserland */, runtimeAllocated: 0 };
                    break;
                case 4 /* emnapi_memory_view_type.emnapi_uint16_array */:
                    viewDescriptor = { Ctor: Uint16Array, address: external_data, length: byte_length >> 1, ownership: 1 /* ReferenceOwnership.kUserland */, runtimeAllocated: 0 };
                    break;
                case 5 /* emnapi_memory_view_type.emnapi_int32_array */:
                    viewDescriptor = { Ctor: Int32Array, address: external_data, length: byte_length >> 2, ownership: 1 /* ReferenceOwnership.kUserland */, runtimeAllocated: 0 };
                    break;
                case 6 /* emnapi_memory_view_type.emnapi_uint32_array */:
                    viewDescriptor = { Ctor: Uint32Array, address: external_data, length: byte_length >> 2, ownership: 1 /* ReferenceOwnership.kUserland */, runtimeAllocated: 0 };
                    break;
                case 7 /* emnapi_memory_view_type.emnapi_float32_array */:
                    viewDescriptor = { Ctor: Float32Array, address: external_data, length: byte_length >> 2, ownership: 1 /* ReferenceOwnership.kUserland */, runtimeAllocated: 0 };
                    break;
                case 8 /* emnapi_memory_view_type.emnapi_float64_array */:
                    viewDescriptor = { Ctor: Float64Array, address: external_data, length: byte_length >> 3, ownership: 1 /* ReferenceOwnership.kUserland */, runtimeAllocated: 0 };
                    break;
                case 9 /* emnapi_memory_view_type.emnapi_bigint64_array */:
                    viewDescriptor = { Ctor: BigInt64Array, address: external_data, length: byte_length >> 3, ownership: 1 /* ReferenceOwnership.kUserland */, runtimeAllocated: 0 };
                    break;
                case 10 /* emnapi_memory_view_type.emnapi_biguint64_array */:
                    viewDescriptor = { Ctor: BigUint64Array, address: external_data, length: byte_length >> 3, ownership: 1 /* ReferenceOwnership.kUserland */, runtimeAllocated: 0 };
                    break;
                case -1 /* emnapi_memory_view_type.emnapi_data_view */:
                    viewDescriptor = { Ctor: DataView, address: external_data, length: byte_length, ownership: 1 /* ReferenceOwnership.kUserland */, runtimeAllocated: 0 };
                    break;
                case 11 /* emnapi_memory_view_type.emnapi_float16_array */:
                    if (typeof Float16Array !== 'function') {
                        return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                    }
                    viewDescriptor = { Ctor: Float16Array, address: external_data, length: byte_length >> 1, ownership: 1 /* ReferenceOwnership.kUserland */, runtimeAllocated: 0 };
                    break;
                case -2 /* emnapi_memory_view_type.emnapi_buffer */: {
                    if (!emnapiCtx.features.Buffer) {
                        throw emnapiCtx.createNotSupportBufferError('emnapi_create_memory_view', '');
                    }
                    viewDescriptor = { Ctor: emnapiCtx.features.Buffer, address: external_data, length: byte_length, ownership: 1 /* ReferenceOwnership.kUserland */, runtimeAllocated: 0 };
                    break;
                }
                default: return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            }
            const Ctor = viewDescriptor.Ctor;
            const typedArray = typedarray_type === -2 /* emnapi_memory_view_type.emnapi_buffer */
                // capture Buffer.from at creation so a later refreshed view uses it
                ? emnapiExternalMemory.getBufferFrom()(wasmMemory.buffer, viewDescriptor.address, viewDescriptor.length)
                : new Ctor(wasmMemory.buffer, viewDescriptor.address, viewDescriptor.length);
            value = emnapiCtx.napiValueFromJsValue(typedArray);
            emnapiExternalMemory.wasmMemoryViewTable.set(typedArray, viewDescriptor);
            if (finalize_cb) {
                const status = napi_add_finalizer(env, value, external_data, finalize_cb, finalize_hint, /* NULL */ 0);
                if (status === 10 /* napi_status.napi_pending_exception */) {
                    const err = envObject.lastException.deref();
                    envObject.clearLastError();
                    envObject.lastException.reset();
                    throw err;
                }
                else if (status !== 0 /* napi_status.napi_ok */) {
                    return envObject.setLastError(status);
                }
            }
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
            GET_HEAP_DATA_VIEW().setUint32(result, value, true);
            return (0 /* napi_status.napi_ok */);
        }
        catch (err) {
            envObject.lastException.resetTo(err);
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        }
    }
    /**
     * @__sig i
     */
    function emnapi_is_support_weakref() {
        return emnapiCtx.features.finalizer ? 1 : 0;
    }
    /**
     * @__sig i
     */
    function emnapi_is_support_bigint() {
        return emnapiCtx.features.BigInt ? 1 : 0;
    }
    /**
     * @__sig i
     */
    function emnapi_is_node_binding_available() {
        return emnapiNodeBinding ? 1 : 0;
    }
    /**
     * Synchronize data between the wasm memory and an ArrayBuffer / view.
     *
     * Note: when a non-shared wasm memory has grown, a view over the detached
     * old buffer is re-created over the current buffer through the intrinsic
     * base-class constructor, so for view inputs the returned view may be a
     * base-class instance (e.g. `Uint8Array` or `DataView`) instead of the
     * subclass that was passed in.
     */
    function $emnapiSyncMemory(js_to_wasm, arrayBufferOrView, offset, len) {
        offset = offset ?? 0;
        offset = offset >>> 0;
        let view;
        if (arrayBufferOrView instanceof ArrayBuffer || emnapiExternalMemory.isSharedArrayBuffer(arrayBufferOrView)) {
            const pointer = emnapiExternalMemory.getArrayBufferPointer(arrayBufferOrView, false).address;
            if (!pointer)
                throw new Error('Unknown ArrayBuffer address');
            if (typeof len !== 'number' || len === -1 || len === 4294967295) {
                len = arrayBufferOrView.byteLength - offset;
            }
            len = len >>> 0;
            if (len === 0)
                return arrayBufferOrView;
            view = new Uint8Array(arrayBufferOrView, offset, len);
            const wasmMemoryU8 = new Uint8Array(wasmMemory.buffer);
            if (!js_to_wasm) {
                view.set(wasmMemoryU8.subarray(pointer, pointer + len));
            }
            else {
                wasmMemoryU8.set(view, pointer);
            }
            return arrayBufferOrView;
        }
        if (ArrayBuffer.isView(arrayBufferOrView)) {
            const viewPointerInfo = emnapiExternalMemory.getViewPointer(arrayBufferOrView, false);
            const latestView = viewPointerInfo.view;
            const pointer = viewPointerInfo.address;
            if (!pointer)
                throw new Error('Unknown ArrayBuffer address');
            if (typeof len !== 'number' || len === -1 || len === 4294967295) {
                len = latestView.byteLength - offset;
            }
            len = len >>> 0;
            if (len === 0)
                return latestView;
            view = new Uint8Array(latestView.buffer, latestView.byteOffset + offset, len);
            const wasmMemoryU8 = new Uint8Array(wasmMemory.buffer);
            if (!js_to_wasm) {
                view.set(wasmMemoryU8.subarray(pointer, pointer + len));
            }
            else {
                wasmMemoryU8.set(view, pointer);
            }
            return latestView;
        }
        throw new TypeError('emnapiSyncMemory expect ArrayBuffer or ArrayBufferView as first parameter');
    }
    /**
     * @__sig ipippp
     */
    function emnapi_sync_memory(env, js_to_wasm, arraybuffer_or_view, offset, len) {
        let v;
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!envObject.lastException.isEmpty())
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        if (!envObject.canCallIntoJs())
            return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
        envObject.clearLastError();
        try {
            if (!arraybuffer_or_view)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            arraybuffer_or_view >>>= 0;
            offset >>>= 0;
            len >>>= 0;
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
            const id = GET_HEAP_DATA_VIEW().getUint32(arraybuffer_or_view, true);
            const jsValue = emnapiCtx.jsValueFromNapiValue(id);
            const isArrayBuffer = jsValue instanceof ArrayBuffer;
            const isDataView = jsValue instanceof DataView;
            const isTypedArray = ArrayBuffer.isView(jsValue) && !isDataView;
            if (!isArrayBuffer && !isTypedArray && !isDataView && !emnapiExternalMemory.isSharedArrayBuffer(jsValue)) {
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            }
            const ret = $emnapiSyncMemory(Boolean(js_to_wasm), jsValue, offset, len);
            if (jsValue !== ret) {
                arraybuffer_or_view >>>= 0;
                v = emnapiCtx.napiValueFromJsValue(ret);
                GET_HEAP_DATA_VIEW().setUint32(arraybuffer_or_view, v, true);
            }
            return (0 /* napi_status.napi_ok */);
        }
        catch (err) {
            envObject.lastException.resetTo(err);
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        }
    }
    function $emnapiGetMemoryAddress(arrayBufferOrView) {
        const isArrayBuffer = arrayBufferOrView instanceof ArrayBuffer;
        const isDataView = arrayBufferOrView instanceof DataView;
        const isTypedArray = ArrayBuffer.isView(arrayBufferOrView) && !isDataView;
        if (!isArrayBuffer && !isTypedArray && !isDataView && !emnapiExternalMemory.isSharedArrayBuffer(arrayBufferOrView)) {
            throw new TypeError('emnapiGetMemoryAddress expect ArrayBuffer or ArrayBufferView as first parameter');
        }
        let info;
        if (isArrayBuffer) {
            info = emnapiExternalMemory.getArrayBufferPointer(arrayBufferOrView, false);
        }
        else {
            info = emnapiExternalMemory.getViewPointer(arrayBufferOrView, false);
        }
        return {
            address: info.address,
            ownership: info.ownership,
            runtimeAllocated: info.runtimeAllocated
        };
    }
    /**
     * @__sig ipppp
     */
    function emnapi_get_memory_address(env, arraybuffer_or_view, address, ownership, runtime_allocated) {
        let p, runtimeAllocated, ownershipOut;
        let info;
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!envObject.lastException.isEmpty())
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        if (!envObject.canCallIntoJs())
            return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
        envObject.clearLastError();
        try {
            if (!arraybuffer_or_view)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            if (!address && !ownership && !runtime_allocated) {
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            }
            const value = emnapiCtx.jsValueFromNapiValue(arraybuffer_or_view);
            info = $emnapiGetMemoryAddress(value);
            p = info.address;
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
            if (address) {
                address >>>= 0;
                GET_HEAP_DATA_VIEW().setUint32(address, p, true);
            }
            if (ownership) {
                ownership >>>= 0;
                ownershipOut = info.ownership;
                GET_HEAP_DATA_VIEW().setInt32(ownership, ownershipOut, true);
            }
            if (runtime_allocated) {
                runtime_allocated >>>= 0;
                runtimeAllocated = info.runtimeAllocated;
                GET_HEAP_DATA_VIEW().setInt8(runtime_allocated, runtimeAllocated, true);
            }
            return (0 /* napi_status.napi_ok */);
        }
        catch (err) {
            envObject.lastException.resetTo(err);
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        }
    }
    /**
     * @__sig ipp
     */
    function emnapi_get_runtime_version(env, version) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        const envObject = emnapiEnv;
        if (!version)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        let runtimeVersion;
        try {
            runtimeVersion = emnapiCtx.getRuntimeVersions().version;
        }
        catch (_) {
            return envObject.setLastError(9 /* napi_status.napi_generic_failure */);
        }
        const versions = runtimeVersion.split('.')
            .map((n) => Number(n));
        version >>>= 0;
        var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
        GET_HEAP_DATA_VIEW().setUint32(version, versions[0], true);
        GET_HEAP_DATA_VIEW().setUint32(version + 4, versions[1], true);
        GET_HEAP_DATA_VIEW().setUint32(version + 8, versions[2], true);
        return envObject.clearLastError();
    }
    /**
     * Get the handle for an external SharedArrayBuffer.
     * Must be called on the emnapi main thread.
     * @__sig ippp
     */
    function emnapi_get_external_sharedarraybuffer_handle(env, sharedarraybuffer, handle) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!envObject.lastException.isEmpty())
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        if (!envObject.canCallIntoJs())
            return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
        envObject.clearLastError();
        try {
            if (!sharedarraybuffer)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            if (!handle)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            handle >>>= 0;
            const jsValue = emnapiCtx.jsValueFromNapiValue(sharedarraybuffer);
            if (!emnapiExternalMemory.isSharedArrayBuffer(jsValue)) {
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            }
            const metaPtr = emnapiExternalSAB.handleTable.get(jsValue);
            if (metaPtr === undefined) {
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            }
            let p = metaPtr;
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
            GET_HEAP_DATA_VIEW().setUint32(handle, p, true);
            return (0 /* napi_status.napi_ok */);
        }
        catch (err) {
            envObject.lastException.resetTo(err);
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        }
    }
    /**
     * Acquire a reference to an external SharedArrayBuffer.
     * Can be called on any thread.
     * @__sig vp
     */
    function emnapi_acquire_external_sharedarraybuffer(handle) {
        handle >>>= 0;
        Atomics.add(new Int32Array(wasmMemory.buffer, handle, 1), 0, 1);
    }
    /**
     * Release a reference to an external SharedArrayBuffer.
     * Can be called on any thread.
     * @__sig vp
     */
    function emnapi_release_external_sharedarraybuffer(handle) {
        handle >>>= 0;
        emnapiExternalSAB.release(handle);
    }
    /**
     * Acquire a reference to an external SharedArrayBuffer on the current thread.
     * Can be called on any thread. Increments refcount and registers in
     * the current thread's FinalizationRegistry.
     * Exposed as Module.emnapiAcquireExternalSharedArrayBuffer (emscripten) or
     * napiModule.emnapi.acquireExternalSharedArrayBuffer (core).
     */
    function $emnapiAcquireExternalSharedArrayBuffer(handle, sab) {
        if (sab != null && !emnapiExternalMemory.isSharedArrayBuffer(sab)) {
            throw new TypeError('Expected a SharedArrayBuffer');
        }
        if (!emnapiExternalSAB.registry) {
            throw new Error('FinalizationRegistry is not supported in this environment');
        }
        handle >>>= 0;
        const meta = emnapiExternalSAB.readMeta(handle);
        let external_data = meta.external_data;
        external_data >>>= 0;
        if (sab == null) {
            sab = new SharedArrayBuffer(meta.byte_length);
            new Uint8Array(sab).set(new Uint8Array(wasmMemory.buffer, external_data, meta.byte_length));
        }
        else {
            if (emnapiExternalSAB.handleTable.has(sab)) {
                return sab;
            }
        }
        // Increment refcount atomically
        Atomics.add(new Int32Array(wasmMemory.buffer, handle, 1), 0, 1);
        // Register in emnapiExternalMemory.table for emnapi_sync_memory support
        if (!emnapiExternalMemory.table.has(sab)) {
            if (external_data) {
                emnapiExternalMemory.table.set(sab, {
                    address: external_data,
                    ownership: 1 /* ReferenceOwnership.kUserland */,
                    runtimeAllocated: 0
                });
            }
        }
        // Register in handleTable and FinalizationRegistry for this thread
        emnapiExternalSAB.handleTable.set(sab, handle);
        emnapiExternalSAB.registry.register(sab, handle);
        return sab;
    }

    //#endregion src/emnapi.ts

    var emnapiMod = /*#__PURE__*/Object.freeze({
        __proto__: null,
        $emnapiAcquireExternalSharedArrayBuffer: $emnapiAcquireExternalSharedArrayBuffer,
        $emnapiGetMemoryAddress: $emnapiGetMemoryAddress,
        $emnapiSyncMemory: $emnapiSyncMemory,
        emnapi_acquire_external_sharedarraybuffer: emnapi_acquire_external_sharedarraybuffer,
        emnapi_create_memory_view: emnapi_create_memory_view,
        emnapi_debug: emnapi_debug,
        emnapi_get_external_sharedarraybuffer_handle: emnapi_get_external_sharedarraybuffer_handle,
        emnapi_get_memory_address: emnapi_get_memory_address,
        emnapi_get_runtime_version: emnapi_get_runtime_version,
        emnapi_is_node_binding_available: emnapi_is_node_binding_available,
        emnapi_is_support_bigint: emnapi_is_support_bigint,
        emnapi_is_support_weakref: emnapi_is_support_weakref,
        emnapi_release_external_sharedarraybuffer: emnapi_release_external_sharedarraybuffer,
        emnapi_sync_memory: emnapi_sync_memory
    });

    //#region src/value/create.ts
    /**
     * @__sig ipp
     */
    function napi_create_array(env, result) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!result)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        result >>>= 0;
        const value = emnapiCtx.napiValueFromJsValue([]);
        var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
        GET_HEAP_DATA_VIEW().setUint32(result, value, true);
        return envObject.clearLastError();
    }
    /**
     * @__sig ippp
     */
    function napi_create_array_with_length(env, length, result) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!result)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        length >>>= 0;
        result >>>= 0;
        length = length >>> 0;
        const value = emnapiCtx.napiValueFromJsValue(new Array(length));
        var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
        GET_HEAP_DATA_VIEW().setUint32(result, value, true);
        return envObject.clearLastError();
    }
    function emnapiCreateArrayBuffer(byte_length, data, shared) {
        byte_length >>>= 0;
        byte_length = byte_length >>> 0;
        const arrayBuffer = shared ? new SharedArrayBuffer(byte_length) : new ArrayBuffer(byte_length);
        if (data) {
            data >>>= 0;
            const p = emnapiExternalMemory.getArrayBufferPointer(arrayBuffer, true).address;
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
            GET_HEAP_DATA_VIEW().setUint32(data, p, true);
        }
        return arrayBuffer;
    }
    /**
     * @__sig ipppp
     */
    function napi_create_arraybuffer(env, byte_length, data, result) {
        let value;
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!envObject.lastException.isEmpty())
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        if (!envObject.canCallIntoJs())
            return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
        envObject.clearLastError();
        try {
            if (!result)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            result >>>= 0;
            const arrayBuffer = emnapiCreateArrayBuffer(byte_length, data, false);
            value = emnapiCtx.napiValueFromJsValue(arrayBuffer);
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
            GET_HEAP_DATA_VIEW().setUint32(result, value, true);
            return (0 /* napi_status.napi_ok */);
        }
        catch (err) {
            envObject.lastException.resetTo(err);
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        }
    }
    /**
     * @__sig ipppp
     */
    function node_api_create_sharedarraybuffer(env, byte_length, data, result) {
        let value;
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!envObject.lastException.isEmpty())
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        if (!envObject.canCallIntoJs())
            return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
        envObject.clearLastError();
        try {
            if (!result)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            result >>>= 0;
            const arrayBuffer = emnapiCreateArrayBuffer(byte_length, data, true);
            value = emnapiCtx.napiValueFromJsValue(arrayBuffer);
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
            GET_HEAP_DATA_VIEW().setUint32(result, value, true);
            return (0 /* napi_status.napi_ok */);
        }
        catch (err) {
            envObject.lastException.resetTo(err);
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        }
    }
    /**
     * @__sig ipdp
     */
    function napi_create_date(env, time, result) {
        let value;
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!envObject.lastException.isEmpty())
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        if (!envObject.canCallIntoJs())
            return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
        envObject.clearLastError();
        try {
            if (!result)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            result >>>= 0;
            value = emnapiCtx.napiValueFromJsValue(new Date(time));
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
            GET_HEAP_DATA_VIEW().setUint32(result, value, true);
            return (0 /* napi_status.napi_ok */);
        }
        catch (err) {
            envObject.lastException.resetTo(err);
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        }
    }
    /**
     * @__sig ippppp
     */
    function napi_create_external(env, data, finalize_cb, finalize_hint, result) {
        let value;
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!envObject.lastException.isEmpty())
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        if (!envObject.canCallIntoJs())
            return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
        envObject.clearLastError();
        try {
            if (!result)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            if (!emnapiCtx.features.finalizer && finalize_cb) {
                throw emnapiCtx.createNotSupportWeakRefError('napi_create_external', 'Parameter "finalize_cb" must be 0(NULL)');
            }
            value = emnapiCtx.getCurrentScope().addExternal(data);
            if (finalize_cb) {
                emnapiCtx.createReferenceWithFinalizer(envObject, value, 0, 0 /* ReferenceOwnership.kRuntime */, finalize_cb, data, finalize_hint);
            }
            result >>>= 0;
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
            GET_HEAP_DATA_VIEW().setUint32(result, value, true);
            return envObject.clearLastError();
        }
        catch (err) {
            envObject.lastException.resetTo(err);
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        }
    }
    /**
     * @__sig ipppppp
     */
    function napi_create_external_arraybuffer(env, external_data, byte_length, finalize_cb, finalize_hint, result) {
        let value;
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!envObject.lastException.isEmpty())
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        if (!envObject.canCallIntoJs())
            return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
        envObject.clearLastError();
        try {
            if (!result)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            byte_length >>>= 0;
            external_data >>>= 0;
            result >>>= 0;
            byte_length = byte_length >>> 0;
            if (!external_data) {
                byte_length = 0;
            }
            if ((external_data + byte_length) > wasmMemory.buffer.byteLength) {
                throw new RangeError('Memory out of range');
            }
            if (!emnapiCtx.features.finalizer && finalize_cb) {
                throw emnapiCtx.createNotSupportWeakRefError('napi_create_external_arraybuffer', 'Parameter "finalize_cb" must be 0(NULL)');
            }
            const arrayBuffer = new ArrayBuffer(byte_length);
            if (byte_length === 0) {
                try {
                    const MessageChannel = emnapiCtx.features.MessageChannel;
                    const messageChannel = new MessageChannel();
                    messageChannel.port1.postMessage(arrayBuffer, [arrayBuffer]);
                }
                catch (_) { }
            }
            else {
                const u8arr = new Uint8Array(arrayBuffer);
                u8arr.set(new Uint8Array(wasmMemory.buffer).subarray(external_data, external_data + byte_length));
                emnapiExternalMemory.table.set(arrayBuffer, {
                    address: external_data,
                    ownership: 1 /* ReferenceOwnership.kUserland */,
                    runtimeAllocated: 0
                });
            }
            value = emnapiCtx.napiValueFromJsValue(arrayBuffer);
            if (finalize_cb) {
                const status = napi_add_finalizer(env, value, external_data, finalize_cb, finalize_hint, /* NULL */ 0);
                if (status === 10 /* napi_status.napi_pending_exception */) {
                    const err = envObject.lastException.deref();
                    envObject.clearLastError();
                    envObject.lastException.reset();
                    throw err;
                }
                else if (status !== 0 /* napi_status.napi_ok */) {
                    return envObject.setLastError(status);
                }
            }
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
            GET_HEAP_DATA_VIEW().setUint32(result, value, true);
            return (0 /* napi_status.napi_ok */);
        }
        catch (err) {
            envObject.lastException.resetTo(err);
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        }
    }
    /**
     * @__sig ipppppp
     */
    function node_api_create_external_sharedarraybuffer(env, external_data, byte_length, finalize_cb, finalize_hint, result) {
        let value;
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!envObject.lastException.isEmpty())
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        if (!envObject.canCallIntoJs())
            return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
        envObject.clearLastError();
        try {
            if (!result)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            byte_length >>>= 0;
            external_data >>>= 0;
            result >>>= 0;
            byte_length = byte_length >>> 0;
            if (!external_data) {
                byte_length = 0;
            }
            if ((external_data + byte_length) > wasmMemory.buffer.byteLength) {
                throw new RangeError('Memory out of range');
            }
            if (!emnapiExternalSAB.registry && finalize_cb) {
                throw emnapiCtx.createNotSupportWeakRefError('node_api_create_external_sharedarraybuffer', 'Parameter "finalize_cb" must be 0(NULL)');
            }
            const sharedArrayBuffer = new SharedArrayBuffer(byte_length);
            if (byte_length !== 0) {
                const u8arr = new Uint8Array(sharedArrayBuffer);
                u8arr.set(new Uint8Array(wasmMemory.buffer).subarray(external_data, external_data + byte_length));
                emnapiExternalMemory.table.set(sharedArrayBuffer, {
                    address: external_data,
                    ownership: 1 /* ReferenceOwnership.kUserland */,
                    runtimeAllocated: 0
                });
            }
            value = emnapiCtx.napiValueFromJsValue(sharedArrayBuffer);
            if (finalize_cb) {
                finalize_cb >>>= 0;
                finalize_hint >>>= 0;
                const metaPtr = emnapiExternalSAB.allocMeta(external_data, byte_length, finalize_cb, external_data, finalize_hint);
                emnapiExternalSAB.handleTable.set(sharedArrayBuffer, metaPtr);
                emnapiExternalSAB.registry.register(sharedArrayBuffer, metaPtr);
            }
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
            GET_HEAP_DATA_VIEW().setUint32(result, value, true);
            return (0 /* napi_status.napi_ok */);
        }
        catch (err) {
            envObject.lastException.resetTo(err);
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        }
    }
    /**
     * @__sig ipp
     */
    function napi_create_object(env, result) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!result)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        result >>>= 0;
        const value = emnapiCtx.napiValueFromJsValue({});
        var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
        GET_HEAP_DATA_VIEW().setUint32(result, value, true);
        return envObject.clearLastError();
    }
    /**
     * @__sig ipppppp
     */
    function node_api_create_object_with_properties(env, prototype_or_null, property_names, property_values, property_count, result) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!result)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        property_count >>>= 0;
        property_count = property_count >>> 0;
        if (property_count > 0) {
            if (!property_names)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            if (!property_values)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        }
        const v8_prototype_or_null = prototype_or_null
            ? emnapiCtx.jsValueFromNapiValue(prototype_or_null)
            : null;
        const properties = {};
        property_names >>>= 0;
        property_values >>>= 0;
        var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
        for (let i = 0; i < property_count; i++) {
            const name_value = emnapiCtx.jsValueFromNapiValue(GET_HEAP_DATA_VIEW().getUint32(property_names + i * 4, true));
            if (!(typeof name_value === "string" || typeof name_value === "symbol"))
                return envObject.setLastError(4 /* napi_status.napi_name_expected */);
            properties[name_value] = {
                value: emnapiCtx.jsValueFromNapiValue(GET_HEAP_DATA_VIEW().getUint32(property_values + i * 4, true)),
                writable: true,
                enumerable: true,
                configurable: true
            };
        }
        let obj;
        try {
            obj = Object.defineProperties(Object.create(v8_prototype_or_null), properties);
        }
        catch (_) {
            return envObject.setLastError(9 /* napi_status.napi_generic_failure */);
        }
        const value = emnapiCtx.napiValueFromJsValue(obj);
        result >>>= 0;
        GET_HEAP_DATA_VIEW().setUint32(result, value, true);
        return envObject.clearLastError();
    }
    /**
     * @__sig ippp
     */
    function napi_create_symbol(env, description, result) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!result)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        result >>>= 0;
        var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
        if (!description) {
            // eslint-disable-next-line symbol-description
            const value = emnapiCtx.napiValueFromJsValue(Symbol());
            GET_HEAP_DATA_VIEW().setUint32(result, value, true);
        }
        else {
            const desc = emnapiCtx.jsValueFromNapiValue(description);
            if (typeof desc !== 'string') {
                return envObject.setLastError(3 /* napi_status.napi_string_expected */);
            }
            const v = emnapiCtx.napiValueFromJsValue(Symbol(desc));
            GET_HEAP_DATA_VIEW().setUint32(result, v, true);
        }
        return envObject.clearLastError();
    }
    /**
     * @__sig ipipppp
     */
    function napi_create_typedarray(env, type, length, arraybuffer, byte_offset, result) {
        let value;
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!envObject.lastException.isEmpty())
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        if (!envObject.canCallIntoJs())
            return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
        envObject.clearLastError();
        try {
            if (!arraybuffer)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            if (!result)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            const buffer = emnapiCtx.jsValueFromNapiValue(arraybuffer);
            byte_offset >>>= 0;
            length >>>= 0;
            const createTypedArray = function (envObject, Type, size_of_element, buffer, byte_offset, length) {
                byte_offset = byte_offset >>> 0;
                length = length >>> 0;
                if (size_of_element > 1) {
                    if ((byte_offset) % (size_of_element) !== 0) {
                        const err = new RangeError(`start offset of ${Type.name ?? ''} should be a multiple of ${size_of_element}`);
                        err.code = 'ERR_NAPI_INVALID_TYPEDARRAY_ALIGNMENT';
                        envObject.lastException.resetTo(err);
                        return envObject.setLastError(9 /* napi_status.napi_generic_failure */);
                    }
                }
                if (((length * size_of_element) + byte_offset) > buffer.byteLength) {
                    const err = new RangeError('Invalid typed array length');
                    err.code = 'ERR_NAPI_INVALID_TYPEDARRAY_LENGTH';
                    envObject.lastException.resetTo(err);
                    return envObject.setLastError(9 /* napi_status.napi_generic_failure */);
                }
                const out = new Type(buffer, byte_offset, length);
                if (buffer === wasmMemory.buffer) {
                    if (!emnapiExternalMemory.wasmMemoryViewTable.has(out)) {
                        emnapiExternalMemory.wasmMemoryViewTable.set(out, {
                            Ctor: Type,
                            address: byte_offset,
                            length,
                            ownership: 1 /* ReferenceOwnership.kUserland */,
                            runtimeAllocated: 0
                        });
                    }
                }
                result >>>= 0;
                value = emnapiCtx.napiValueFromJsValue(out);
                var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
                GET_HEAP_DATA_VIEW().setUint32(result, value, true);
                return (0 /* napi_status.napi_ok */);
            };
            if (buffer instanceof ArrayBuffer || emnapiExternalMemory.isSharedArrayBuffer(buffer)) {
                switch (type) {
                    case 0 /* napi_typedarray_type.napi_int8_array */:
                        return createTypedArray(envObject, Int8Array, 1, buffer, byte_offset, length);
                    case 1 /* napi_typedarray_type.napi_uint8_array */:
                        return createTypedArray(envObject, Uint8Array, 1, buffer, byte_offset, length);
                    case 2 /* napi_typedarray_type.napi_uint8_clamped_array */:
                        return createTypedArray(envObject, Uint8ClampedArray, 1, buffer, byte_offset, length);
                    case 3 /* napi_typedarray_type.napi_int16_array */:
                        return createTypedArray(envObject, Int16Array, 2, buffer, byte_offset, length);
                    case 4 /* napi_typedarray_type.napi_uint16_array */:
                        return createTypedArray(envObject, Uint16Array, 2, buffer, byte_offset, length);
                    case 5 /* napi_typedarray_type.napi_int32_array */:
                        return createTypedArray(envObject, Int32Array, 4, buffer, byte_offset, length);
                    case 6 /* napi_typedarray_type.napi_uint32_array */:
                        return createTypedArray(envObject, Uint32Array, 4, buffer, byte_offset, length);
                    case 7 /* napi_typedarray_type.napi_float32_array */:
                        return createTypedArray(envObject, Float32Array, 4, buffer, byte_offset, length);
                    case 8 /* napi_typedarray_type.napi_float64_array */:
                        return createTypedArray(envObject, Float64Array, 8, buffer, byte_offset, length);
                    case 9 /* napi_typedarray_type.napi_bigint64_array */:
                        return createTypedArray(envObject, BigInt64Array, 8, buffer, byte_offset, length);
                    case 10 /* napi_typedarray_type.napi_biguint64_array */:
                        return createTypedArray(envObject, BigUint64Array, 8, buffer, byte_offset, length);
                    case 11 /* napi_typedarray_type.napi_float16_array */:
                        if (typeof Float16Array !== 'function') {
                            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                        }
                        return createTypedArray(envObject, Float16Array, 2, buffer, byte_offset, length);
                    default:
                        return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
                }
            }
            else {
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            }
        }
        catch (err) {
            envObject.lastException.resetTo(err);
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        }
    }
    /**
     * @__deps malloc
     * @__sig ippp
     */
    function napi_create_buffer(env, size, data, result) {
        let value, pointer;
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!envObject.lastException.isEmpty())
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        if (!envObject.canCallIntoJs())
            return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
        envObject.clearLastError();
        try {
            if (!result)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            const Buffer = emnapiCtx.features.Buffer;
            if (!Buffer) {
                throw emnapiCtx.createNotSupportBufferError('napi_create_buffer', '');
            }
            result >>>= 0;
            let buffer;
            size >>>= 0;
            size = size >>> 0;
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
            if (!data || (size === 0)) {
                buffer = Buffer.alloc(size);
                value = emnapiCtx.napiValueFromJsValue(buffer);
                GET_HEAP_DATA_VIEW().setUint32(result, value, true);
            }
            else {
                pointer = _malloc(size);
                if (!pointer)
                    throw new Error('Out of memory');
                pointer >>>= 0;
                new Uint8Array(wasmMemory.buffer).subarray(pointer, pointer + size).fill(0);
                // capture Buffer.from at creation so a later refreshed view uses it
                const buffer = emnapiExternalMemory.getBufferFrom()(wasmMemory.buffer, pointer, size);
                const viewDescriptor = {
                    Ctor: Buffer,
                    address: pointer,
                    length: size,
                    ownership: emnapiExternalMemory.registry ? 0 /* ReferenceOwnership.kRuntime */ : 1 /* ReferenceOwnership.kUserland */,
                    runtimeAllocated: 1
                };
                emnapiExternalMemory.wasmMemoryViewTable.set(buffer, viewDescriptor);
                emnapiExternalMemory.registry?.register(viewDescriptor, pointer);
                value = emnapiCtx.napiValueFromJsValue(buffer);
                GET_HEAP_DATA_VIEW().setUint32(result, value, true);
                data >>>= 0;
                GET_HEAP_DATA_VIEW().setUint32(data, pointer, true);
            }
            return (0 /* napi_status.napi_ok */);
        }
        catch (err) {
            envObject.lastException.resetTo(err);
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        }
    }
    /**
     * @__sig ippppp
     */
    function napi_create_buffer_copy(env, length, data, result_data, result) {
        let value;
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!envObject.lastException.isEmpty())
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        if (!envObject.canCallIntoJs())
            return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
        envObject.clearLastError();
        try {
            if (!result)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            const Buffer = emnapiCtx.features.Buffer;
            if (!Buffer) {
                throw emnapiCtx.createNotSupportBufferError('napi_create_buffer_copy', '');
            }
            const arrayBuffer = emnapiCreateArrayBuffer(length, result_data, false);
            const buffer = Buffer.from(arrayBuffer);
            data >>>= 0;
            length >>>= 0;
            buffer.set(new Uint8Array(wasmMemory.buffer).subarray(data, data + length));
            value = emnapiCtx.napiValueFromJsValue(buffer);
            result >>>= 0;
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
            GET_HEAP_DATA_VIEW().setUint32(result, value, true);
            return (0 /* napi_status.napi_ok */);
        }
        catch (err) {
            envObject.lastException.resetTo(err);
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        }
    }
    /**
     * @__sig ipppppp
     */
    function napi_create_external_buffer(env, length, data, finalize_cb, finalize_hint, result) {
        return emnapi_create_memory_view(env, -2 /* emnapi_memory_view_type.emnapi_buffer */, data, length, finalize_cb, finalize_hint, result);
    }
    /**
     * @__sig ippppp
     */
    function node_api_create_buffer_from_arraybuffer(env, arraybuffer, byte_offset, byte_length, result) {
        let value;
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!envObject.lastException.isEmpty())
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        if (!envObject.canCallIntoJs())
            return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
        envObject.clearLastError();
        try {
            if (!arraybuffer)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            if (!result)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            byte_offset >>>= 0;
            byte_length >>>= 0;
            byte_offset = byte_offset >>> 0;
            byte_length = byte_length >>> 0;
            const buffer = emnapiCtx.jsValueFromNapiValue(arraybuffer);
            if (!(buffer instanceof ArrayBuffer)) {
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            }
            if ((byte_length + byte_offset) > buffer.byteLength) {
                const err = new RangeError('The byte offset + length is out of range');
                err.code = 'ERR_OUT_OF_RANGE';
                throw err;
            }
            const Buffer = emnapiCtx.features.Buffer;
            if (!Buffer) {
                throw emnapiCtx.createNotSupportBufferError('node_api_create_buffer_from_arraybuffer', '');
            }
            // capture Buffer.from at creation so a later refreshed view uses it
            const out = emnapiExternalMemory.getBufferFrom()(buffer, byte_offset, byte_length);
            if (buffer === wasmMemory.buffer) {
                if (!emnapiExternalMemory.wasmMemoryViewTable.has(out)) {
                    emnapiExternalMemory.wasmMemoryViewTable.set(out, {
                        Ctor: Buffer,
                        address: byte_offset,
                        length: byte_length,
                        ownership: 1 /* ReferenceOwnership.kUserland */,
                        runtimeAllocated: 0
                    });
                }
            }
            result >>>= 0;
            value = emnapiCtx.napiValueFromJsValue(out);
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
            GET_HEAP_DATA_VIEW().setUint32(result, value, true);
            return (0 /* napi_status.napi_ok */);
        }
        catch (err) {
            envObject.lastException.resetTo(err);
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        }
    }
    /**
     * @__sig ippppp
     */
    function napi_create_dataview(env, byte_length, arraybuffer, byte_offset, result) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!envObject.lastException.isEmpty())
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        if (!envObject.canCallIntoJs())
            return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
        envObject.clearLastError();
        try {
            if (!arraybuffer)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            if (!result)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            byte_length >>>= 0;
            byte_offset >>>= 0;
            byte_length = byte_length >>> 0;
            byte_offset = byte_offset >>> 0;
            const value = emnapiCtx.jsValueFromNapiValue(arraybuffer);
            const createDataview = (buffer) => {
                if ((byte_length + byte_offset) > buffer.byteLength) {
                    const err = new RangeError('byte_offset + byte_length should be less than or equal to the size in bytes of the array passed in');
                    err.code = 'ERR_NAPI_INVALID_DATAVIEW_ARGS';
                    throw err;
                }
                const dataview = new DataView(buffer, byte_offset, byte_length);
                if (buffer === wasmMemory.buffer) {
                    if (!emnapiExternalMemory.wasmMemoryViewTable.has(dataview)) {
                        emnapiExternalMemory.wasmMemoryViewTable.set(dataview, {
                            Ctor: DataView,
                            address: byte_offset,
                            length: byte_length,
                            ownership: 1 /* ReferenceOwnership.kUserland */,
                            runtimeAllocated: 0
                        });
                    }
                }
                result >>>= 0;
                let v = emnapiCtx.napiValueFromJsValue(dataview);
                var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
                GET_HEAP_DATA_VIEW().setUint32(result, v, true);
                return (0 /* napi_status.napi_ok */);
            };
            if (value instanceof ArrayBuffer || emnapiExternalMemory.isSharedArrayBuffer(value)) {
                return createDataview(value);
            }
            else {
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            }
        }
        catch (err) {
            envObject.lastException.resetTo(err);
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        }
    }
    /**
     * @__sig ipppp
     */
    function node_api_symbol_for(env, utf8description, length, result) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!result)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        length >>>= 0;
        utf8description >>>= 0;
        result >>>= 0;
        const autoLength = length === -1 || length === 4294967295;
        const sizelength = length >>> 0;
        if (length !== 0) {
            if (!utf8description)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        }
        if (!(autoLength || (sizelength <= 2147483647))) {
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        }
        const descriptionString = emnapiString.UTF8ToString(utf8description, length);
        const value = emnapiCtx.napiValueFromJsValue(Symbol.for(descriptionString));
        var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
        GET_HEAP_DATA_VIEW().setUint32(result, value, true);
        return envObject.clearLastError();
    }

    //#endregion src/value/create.ts

    var createMod = /*#__PURE__*/Object.freeze({
        __proto__: null,
        napi_create_array: napi_create_array,
        napi_create_array_with_length: napi_create_array_with_length,
        napi_create_arraybuffer: napi_create_arraybuffer,
        napi_create_buffer: napi_create_buffer,
        napi_create_buffer_copy: napi_create_buffer_copy,
        napi_create_dataview: napi_create_dataview,
        napi_create_date: napi_create_date,
        napi_create_external: napi_create_external,
        napi_create_external_arraybuffer: napi_create_external_arraybuffer,
        napi_create_external_buffer: napi_create_external_buffer,
        napi_create_object: napi_create_object,
        napi_create_symbol: napi_create_symbol,
        napi_create_typedarray: napi_create_typedarray,
        node_api_create_buffer_from_arraybuffer: node_api_create_buffer_from_arraybuffer,
        node_api_create_external_sharedarraybuffer: node_api_create_external_sharedarraybuffer,
        node_api_create_object_with_properties: node_api_create_object_with_properties,
        node_api_create_sharedarraybuffer: node_api_create_sharedarraybuffer,
        node_api_symbol_for: node_api_symbol_for
    });

    //#region src/value/global.ts
    /** @__sig ipip */
    function napi_get_boolean(env, value, result) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!result)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        result >>>= 0;
        const v = value === 0 ? 4 /* Constant.FALSE */ : 5 /* Constant.TRUE */;
        var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
        GET_HEAP_DATA_VIEW().setUint32(result, v, true);
        return envObject.clearLastError();
    }
    /** @__sig ipp */
    function napi_get_global(env, result) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!result)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        result >>>= 0;
        const value = 6 /* Constant.GLOBAL */;
        var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
        GET_HEAP_DATA_VIEW().setUint32(result, value, true);
        return envObject.clearLastError();
    }
    /** @__sig ipp */
    function napi_get_null(env, result) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!result)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        result >>>= 0;
        const value = 3 /* Constant.NULL */;
        var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
        GET_HEAP_DATA_VIEW().setUint32(result, value, true);
        return envObject.clearLastError();
    }
    /** @__sig ipp */
    function napi_get_undefined(env, result) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!result)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        result >>>= 0;
        const value = 2 /* Constant.UNDEFINED */;
        var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
        GET_HEAP_DATA_VIEW().setUint32(result, value, true);
        return envObject.clearLastError();
    }

    //#endregion src/value/global.ts

    var globalMod = /*#__PURE__*/Object.freeze({
        __proto__: null,
        napi_get_boolean: napi_get_boolean,
        napi_get_global: napi_get_global,
        napi_get_null: napi_get_null,
        napi_get_undefined: napi_get_undefined
    });

    //#region src/env.ts
    /** @__sig ipppp */
    function napi_set_instance_data(env, data, finalize_cb, finalize_hint) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        const envObject = emnapiEnv;
        data >>>= 0;
        finalize_cb >>>= 0;
        finalize_hint >>>= 0;
        envObject.setInstanceData(data, finalize_cb, finalize_hint);
        return envObject.clearLastError();
    }
    /** @__sig ipp */
    function napi_get_instance_data(env, data) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        const envObject = emnapiEnv;
        if (!data)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        data >>>= 0;
        const value = envObject.getInstanceData();
        var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
        GET_HEAP_DATA_VIEW().setUint32(data, value, true);
        return envObject.clearLastError();
    }

    //#endregion src/env.ts

    var envMod = /*#__PURE__*/Object.freeze({
        __proto__: null,
        napi_get_instance_data: napi_get_instance_data,
        napi_set_instance_data: napi_set_instance_data
    });

    //#region src/error.ts
    /** @__sig ipp */
    function napi_throw(env, error) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!envObject.lastException.isEmpty())
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        if (!envObject.canCallIntoJs())
            return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
        envObject.clearLastError();
        try {
            if (!error)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            envObject.lastException.resetTo(emnapiCtx.jsValueFromNapiValue(error));
            return envObject.clearLastError();
        }
        catch (err) {
            envObject.lastException.resetTo(err);
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        }
    }
    /** @__sig ippp */
    function napi_throw_error(env, code, msg) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!envObject.lastException.isEmpty())
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        if (!envObject.canCallIntoJs())
            return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
        envObject.clearLastError();
        try {
            if (!msg)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            code >>>= 0;
            msg >>>= 0;
            const error = new Error(emnapiString.UTF8ToString(msg, -1));
            if (code)
                error.code = emnapiString.UTF8ToString(code, -1);
            envObject.lastException.resetTo(error);
            return envObject.clearLastError();
        }
        catch (err) {
            envObject.lastException.resetTo(err);
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        }
    }
    /** @__sig ippp */
    function napi_throw_type_error(env, code, msg) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!envObject.lastException.isEmpty())
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        if (!envObject.canCallIntoJs())
            return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
        envObject.clearLastError();
        try {
            if (!msg)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            code >>>= 0;
            msg >>>= 0;
            const error = new TypeError(emnapiString.UTF8ToString(msg, -1));
            if (code)
                error.code = emnapiString.UTF8ToString(code, -1);
            envObject.lastException.resetTo(error);
            return envObject.clearLastError();
        }
        catch (err) {
            envObject.lastException.resetTo(err);
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        }
    }
    /** @__sig ippp */
    function napi_throw_range_error(env, code, msg) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!envObject.lastException.isEmpty())
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        if (!envObject.canCallIntoJs())
            return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
        envObject.clearLastError();
        try {
            if (!msg)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            code >>>= 0;
            msg >>>= 0;
            const error = new RangeError(emnapiString.UTF8ToString(msg, -1));
            if (code)
                error.code = emnapiString.UTF8ToString(code, -1);
            envObject.lastException.resetTo(error);
            return envObject.clearLastError();
        }
        catch (err) {
            envObject.lastException.resetTo(err);
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        }
    }
    /** @__sig ippp */
    function node_api_throw_syntax_error(env, code, msg) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!envObject.lastException.isEmpty())
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        if (!envObject.canCallIntoJs())
            return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
        envObject.clearLastError();
        try {
            if (!msg)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            code >>>= 0;
            msg >>>= 0;
            const error = new SyntaxError(emnapiString.UTF8ToString(msg, -1));
            if (code)
                error.code = emnapiString.UTF8ToString(code, -1);
            envObject.lastException.resetTo(error);
            return envObject.clearLastError();
        }
        catch (err) {
            envObject.lastException.resetTo(err);
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        }
    }
    /** @__sig ipp */
    function napi_is_exception_pending(env, result) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!result)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        const r = !envObject.lastException.isEmpty();
        result >>>= 0;
        var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
        GET_HEAP_DATA_VIEW().setInt8(result, r ? 1 : 0, true);
        return envObject.clearLastError();
    }
    /** @__sig ipppp */
    function napi_create_error(env, code, msg, result) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!msg)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        if (!result)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        const msgValue = emnapiCtx.jsValueFromNapiValue(msg);
        if (typeof msgValue !== 'string') {
            return envObject.setLastError(3 /* napi_status.napi_string_expected */);
        }
        const error = new Error(msgValue);
        if (code) {
            const codeValue = emnapiCtx.jsValueFromNapiValue(code);
            if (typeof codeValue !== 'string') {
                return envObject.setLastError(3 /* napi_status.napi_string_expected */);
            }
            error.code = codeValue;
        }
        result >>>= 0;
        const value = emnapiCtx.napiValueFromJsValue(error);
        var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
        GET_HEAP_DATA_VIEW().setUint32(result, value, true);
        return envObject.clearLastError();
    }
    /** @__sig ipppp */
    function napi_create_type_error(env, code, msg, result) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!msg)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        if (!result)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        const msgValue = emnapiCtx.jsValueFromNapiValue(msg);
        if (typeof msgValue !== 'string') {
            return envObject.setLastError(3 /* napi_status.napi_string_expected */);
        }
        const error = new TypeError(msgValue);
        if (code) {
            const codeValue = emnapiCtx.jsValueFromNapiValue(code);
            if (typeof codeValue !== 'string') {
                return envObject.setLastError(3 /* napi_status.napi_string_expected */);
            }
            error.code = codeValue;
        }
        result >>>= 0;
        const value = emnapiCtx.napiValueFromJsValue(error);
        var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
        GET_HEAP_DATA_VIEW().setUint32(result, value, true);
        return envObject.clearLastError();
    }
    /** @__sig ipppp */
    function napi_create_range_error(env, code, msg, result) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!msg)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        if (!result)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        const msgValue = emnapiCtx.jsValueFromNapiValue(msg);
        if (typeof msgValue !== 'string') {
            return envObject.setLastError(3 /* napi_status.napi_string_expected */);
        }
        const error = new RangeError(msgValue);
        if (code) {
            const codeValue = emnapiCtx.jsValueFromNapiValue(code);
            if (typeof codeValue !== 'string') {
                return envObject.setLastError(3 /* napi_status.napi_string_expected */);
            }
            error.code = codeValue;
        }
        result >>>= 0;
        const value = emnapiCtx.napiValueFromJsValue(error);
        var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
        GET_HEAP_DATA_VIEW().setUint32(result, value, true);
        return envObject.clearLastError();
    }
    /** @__sig ipppp */
    function node_api_create_syntax_error(env, code, msg, result) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!msg)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        if (!result)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        const msgValue = emnapiCtx.jsValueFromNapiValue(msg);
        if (typeof msgValue !== 'string') {
            return envObject.setLastError(3 /* napi_status.napi_string_expected */);
        }
        const error = new SyntaxError(msgValue);
        if (code) {
            const codeValue = emnapiCtx.jsValueFromNapiValue(code);
            if (typeof codeValue !== 'string') {
                return envObject.setLastError(3 /* napi_status.napi_string_expected */);
            }
            error.code = codeValue;
        }
        result >>>= 0;
        const value = emnapiCtx.napiValueFromJsValue(error);
        var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
        GET_HEAP_DATA_VIEW().setUint32(result, value, true);
        return envObject.clearLastError();
    }
    /** @__sig ipp */
    function napi_get_and_clear_last_exception(env, result) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!result)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        result >>>= 0;
        var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
        if (envObject.lastException.isEmpty()) {
            GET_HEAP_DATA_VIEW().setUint32(result, 1, true); // ID_UNDEFINED
            return envObject.clearLastError();
        }
        else {
            const err = envObject.lastException.deref();
            const value = emnapiCtx.napiValueFromJsValue(err);
            GET_HEAP_DATA_VIEW().setUint32(result, value, true);
            envObject.lastException.reset();
        }
        return envObject.clearLastError();
    }
    /** @__sig vpppp */
    function napi_fatal_error(location, location_len, message, message_len) {
        location >>>= 0;
        location_len >>>= 0;
        message >>>= 0;
        message_len >>>= 0;
        const locationStr = emnapiString.UTF8ToString(location, location_len);
        const messageStr = emnapiString.UTF8ToString(message, message_len);
        if (emnapiNodeBinding) {
            emnapiNodeBinding.napi.fatalError(locationStr, messageStr);
        }
        else {
            abort('FATAL ERROR: ' + locationStr + ' ' + messageStr);
        }
    }
    /** @__sig ipp */
    function napi_fatal_exception(env, err) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!envObject.lastException.isEmpty())
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        if (!envObject.canCallIntoJs())
            return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
        envObject.clearLastError();
        try {
            if (!err)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            const error = emnapiCtx.jsValueFromNapiValue(err);
            try {
                envObject.triggerFatalException(error);
            }
            catch (_) {
                return envObject.setLastError(9 /* napi_status.napi_generic_failure */);
            }
            return envObject.clearLastError();
        }
        catch (err) {
            envObject.lastException.resetTo(err);
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        }
    }

    //#endregion src/error.ts

    var errorMod = /*#__PURE__*/Object.freeze({
        __proto__: null,
        napi_create_error: napi_create_error,
        napi_create_range_error: napi_create_range_error,
        napi_create_type_error: napi_create_type_error,
        napi_fatal_error: napi_fatal_error,
        napi_fatal_exception: napi_fatal_exception,
        napi_get_and_clear_last_exception: napi_get_and_clear_last_exception,
        napi_is_exception_pending: napi_is_exception_pending,
        napi_throw: napi_throw,
        napi_throw_error: napi_throw_error,
        napi_throw_range_error: napi_throw_range_error,
        napi_throw_type_error: napi_throw_type_error,
        node_api_create_syntax_error: node_api_create_syntax_error,
        node_api_throw_syntax_error: node_api_throw_syntax_error
    });

    //#region src/function.ts
    /** @__sig ippppp */
    function _emnapi_create_function(utf8name, length, cb, data, result) {
        length >>>= 0;
        const fresult = emnapiCreateFunction(emnapiEnv, utf8name, length, cb, data);
        if (fresult.status !== 0 /* napi_status.napi_ok */)
            return emnapiEnv.setLastError(fresult.status);
        const f = fresult.f;
        const value = emnapiCtx.napiValueFromJsValue(f);
        result >>>= 0;
        var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
        GET_HEAP_DATA_VIEW().setUint32(result, value, true);
        return (0 /* napi_status.napi_ok */);
    }
    /** @__sig ipppppp */
    function napi_create_function(env, utf8name, length, cb, data, result) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!envObject.lastException.isEmpty())
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        if (!envObject.canCallIntoJs())
            return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
        envObject.clearLastError();
        try {
            if (!result)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            if (!cb)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            return _emnapi_create_function(utf8name, length, cb, data, result);
        }
        catch (err) {
            envObject.lastException.resetTo(err);
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        }
    }
    /** @__sig ipppppp */
    function napi_get_cb_info(env, cbinfo, argc, argv, this_arg, data) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        const envObject = emnapiEnv;
        if (!cbinfo)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        const cbinfoValue = emnapiCtx.getCallbackInfo(cbinfo);
        argc >>>= 0;
        argv >>>= 0;
        var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
        if (argv) {
            if (!argc)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            let argcValue = GET_HEAP_DATA_VIEW().getUint32(argc, true);
            argcValue >>>= 0;
            const len = cbinfoValue.args.length;
            const arrlen = argcValue < len ? argcValue : len;
            let i = 0;
            for (; i < arrlen; i++) {
                const argVal = emnapiCtx.napiValueFromJsValue(cbinfoValue.args[i]);
                GET_HEAP_DATA_VIEW().setUint32(argv + i * 4, argVal, true);
            }
            if (i < argcValue) {
                for (; i < argcValue; i++) {
                    GET_HEAP_DATA_VIEW().setUint32(argv + i * 4, 1, true);
                }
            }
        }
        if (argc) {
            GET_HEAP_DATA_VIEW().setUint32(argc, cbinfoValue.args.length, true);
        }
        if (this_arg) {
            this_arg >>>= 0;
            const v = emnapiCtx.napiValueFromJsValue(cbinfoValue.thiz);
            GET_HEAP_DATA_VIEW().setUint32(this_arg, v, true);
        }
        if (data) {
            data >>>= 0;
            GET_HEAP_DATA_VIEW().setUint32(data, cbinfoValue.data, true);
        }
        return envObject.clearLastError();
    }
    /** @__sig ipppppp */
    function napi_call_function(env, recv, func, argc, argv, result) {
        let i = 0;
        let v;
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!envObject.lastException.isEmpty())
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        if (!envObject.canCallIntoJs())
            return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
        envObject.clearLastError();
        try {
            if (!recv)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            argc >>>= 0;
            argv >>>= 0;
            result >>>= 0;
            argc = argc >>> 0;
            if (argc > 0) {
                if (!argv)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            }
            const v8recv = emnapiCtx.jsValueFromNapiValue(recv);
            if (!func)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            const v8func = emnapiCtx.jsValueFromNapiValue(func);
            if (typeof v8func !== 'function')
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            const args = [];
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
            for (; i < argc; i++) {
                const argVal = GET_HEAP_DATA_VIEW().getUint32(argv + i * 4, true);
                args.push(emnapiCtx.jsValueFromNapiValue(argVal));
            }
            const ret = v8func.apply(v8recv, args);
            if (result) {
                // resolving v BEFORE the write matters: the store target is evaluated
                // before the RHS, so an RHS running user JS could otherwise write
                // through a stale heap view after a growth
                v = emnapiCtx.napiValueFromJsValue(ret);
                GET_HEAP_DATA_VIEW().setUint32(result, v, true);
            }
            return envObject.clearLastError();
        }
        catch (err) {
            envObject.lastException.resetTo(err);
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        }
    }
    /** @__sig ippppp */
    function napi_new_instance(env, constructor, argc, argv, result) {
        let i;
        let v;
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!envObject.lastException.isEmpty())
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        if (!envObject.canCallIntoJs())
            return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
        envObject.clearLastError();
        try {
            if (!constructor)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            argc >>>= 0;
            argv >>>= 0;
            result >>>= 0;
            argc = argc >>> 0;
            if (argc > 0) {
                if (!argv)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            }
            if (!result)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            const Ctor = emnapiCtx.jsValueFromNapiValue(constructor);
            if (typeof Ctor !== 'function')
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            let ret;
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
            if (emnapiCtx.features.Reflect) {
                const argList = Array(argc);
                for (i = 0; i < argc; i++) {
                    const argVal = GET_HEAP_DATA_VIEW().getUint32(argv + i * 4, true);
                    argList[i] = emnapiCtx.jsValueFromNapiValue(argVal);
                }
                ret = emnapiCtx.features.Reflect.construct(Ctor, argList, Ctor);
            }
            else {
                const args = Array(argc + 1);
                args[0] = undefined;
                for (i = 0; i < argc; i++) {
                    const argVal = GET_HEAP_DATA_VIEW().getUint32(argv + i * 4, true);
                    args[i + 1] = emnapiCtx.jsValueFromNapiValue(argVal);
                }
                const BoundCtor = Ctor.bind.apply(Ctor, args);
                ret = new BoundCtor();
            }
            if (result) {
                // see napi_call_function: resolve v before the write
                v = emnapiCtx.napiValueFromJsValue(ret);
                GET_HEAP_DATA_VIEW().setUint32(result, v, true);
            }
            return (0 /* napi_status.napi_ok */);
        }
        catch (err) {
            envObject.lastException.resetTo(err);
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        }
    }
    /** @__sig ippp */
    function napi_get_new_target(env, cbinfo, result) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!cbinfo)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        if (!result)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        result >>>= 0;
        const cbinfoValue = emnapiCtx.getCallbackInfo(cbinfo);
        const { thiz, fn } = cbinfoValue;
        const value = thiz == null || thiz.constructor == null
            ? 0
            : thiz instanceof fn
                ? emnapiCtx.napiValueFromJsValue(thiz.constructor)
                : 0;
        var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
        GET_HEAP_DATA_VIEW().setUint32(result, value, true);
        return envObject.clearLastError();
    }

    //#endregion src/function.ts

    var functionMod = /*#__PURE__*/Object.freeze({
        __proto__: null,
        _emnapi_create_function: _emnapi_create_function,
        napi_call_function: napi_call_function,
        napi_create_function: napi_create_function,
        napi_get_cb_info: napi_get_cb_info,
        napi_get_new_target: napi_get_new_target,
        napi_new_instance: napi_new_instance
    });

    //#region src/life.ts
    /** @__sig ipp */
    function napi_open_handle_scope(env, result) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!result)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        const scope = emnapiCtx.openScope(envObject);
        result >>>= 0;
        var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
        GET_HEAP_DATA_VIEW().setUint32(result, scope.id, true);
        return envObject.clearLastError();
    }
    /** @__sig ipp */
    function napi_close_handle_scope(env, scope) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!scope)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        if ((envObject.openHandleScopes === 0)) {
            return 13 /* napi_status.napi_handle_scope_mismatch */;
        }
        emnapiCtx.closeScope(envObject);
        return envObject.clearLastError();
    }
    /** @__sig ipp */
    function napi_open_escapable_handle_scope(env, result) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!result)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        const scope = emnapiCtx.openScope(envObject);
        result >>>= 0;
        var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
        GET_HEAP_DATA_VIEW().setUint32(result, scope.id, true);
        return envObject.clearLastError();
    }
    /** @__sig ipp */
    function napi_close_escapable_handle_scope(env, scope) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!scope)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        if ((envObject.openHandleScopes === 0)) {
            return 13 /* napi_status.napi_handle_scope_mismatch */;
        }
        emnapiCtx.closeScope(envObject);
        return envObject.clearLastError();
    }
    /** @__sig ipppp */
    function napi_escape_handle(env, scope, escapee, result) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!scope)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        if (!escapee)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        if (!result)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        const scopeObject = emnapiCtx.getHandleScope(scope);
        if (!scopeObject.escapeCalled()) {
            escapee >>>= 0;
            result >>>= 0;
            const newHandle = scopeObject.escape(escapee);
            const value = newHandle;
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
            GET_HEAP_DATA_VIEW().setUint32(result, value, true);
            return envObject.clearLastError();
        }
        return envObject.setLastError(12 /* napi_status.napi_escape_called_twice */);
    }
    /** @__sig ippip */
    function napi_create_reference(env, value, initial_refcount, result) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!value)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        if (!result)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        const jsValue = emnapiCtx.jsValueFromNapiValue(value);
        const type = typeof jsValue;
        if (envObject.moduleApiVersion < 10) {
            if (!((type === 'object' && jsValue !== null) || type === 'function' || typeof jsValue === 'symbol')) {
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            }
        }
        const ref = emnapiCtx.createReference(envObject, value, initial_refcount >>> 0, 1 /* ReferenceOwnership.kUserland */);
        result >>>= 0;
        var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
        GET_HEAP_DATA_VIEW().setUint32(result, ref.id, true);
        return envObject.clearLastError();
    }
    /** @__sig ipp */
    function napi_delete_reference(env, ref) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        const envObject = emnapiEnv;
        if (!ref)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        emnapiCtx.getRef(ref).dispose();
        return envObject.clearLastError();
    }
    /** @__sig ippp */
    function napi_reference_ref(env, ref, result) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!ref)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        const count = emnapiCtx.getRef(ref).ref();
        if (result) {
            result >>>= 0;
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
            GET_HEAP_DATA_VIEW().setUint32(result, count, true);
        }
        return envObject.clearLastError();
    }
    /** @__sig ippp */
    function napi_reference_unref(env, ref, result) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!ref)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        const reference = emnapiCtx.getRef(ref);
        const refcount = reference.refcount();
        if (refcount === 0) {
            return envObject.setLastError(9 /* napi_status.napi_generic_failure */);
        }
        const count = reference.unref();
        if (result) {
            result >>>= 0;
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
            GET_HEAP_DATA_VIEW().setUint32(result, count, true);
        }
        return envObject.clearLastError();
    }
    /** @__sig ippp */
    function napi_get_reference_value(env, ref, result) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!ref)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        if (!result)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        const reference = emnapiCtx.getRef(ref);
        const id = reference.get();
        result >>>= 0;
        var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
        GET_HEAP_DATA_VIEW().setUint32(result, id, true);
        return envObject.clearLastError();
    }
    /** @__sig ippp */
    function napi_add_env_cleanup_hook(env, fun, arg) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        const envObject = emnapiEnv;
        if (!fun)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        fun >>>= 0;
        arg >>>= 0;
        emnapiCtx.addCleanupHook(envObject, fun, arg);
        return 0 /* napi_status.napi_ok */;
    }
    /** @__sig ippp */
    function napi_remove_env_cleanup_hook(env, fun, arg) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        const envObject = emnapiEnv;
        if (!fun)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        fun >>>= 0;
        arg >>>= 0;
        emnapiCtx.removeCleanupHook(envObject, fun, arg);
        return 0 /* napi_status.napi_ok */;
    }
    /** @__sig vp */
    function _emnapi_env_ref(env) {
        const envObject = emnapiEnv;
        envObject.ref();
    }
    /** @__sig vp */
    function _emnapi_env_unref(env) {
        const envObject = emnapiEnv;
        envObject.unref();
    }

    //#endregion src/life.ts

    var lifeMod = /*#__PURE__*/Object.freeze({
        __proto__: null,
        _emnapi_env_ref: _emnapi_env_ref,
        _emnapi_env_unref: _emnapi_env_unref,
        napi_add_env_cleanup_hook: napi_add_env_cleanup_hook,
        napi_close_escapable_handle_scope: napi_close_escapable_handle_scope,
        napi_close_handle_scope: napi_close_handle_scope,
        napi_create_reference: napi_create_reference,
        napi_delete_reference: napi_delete_reference,
        napi_escape_handle: napi_escape_handle,
        napi_get_reference_value: napi_get_reference_value,
        napi_open_escapable_handle_scope: napi_open_escapable_handle_scope,
        napi_open_handle_scope: napi_open_handle_scope,
        napi_reference_ref: napi_reference_ref,
        napi_reference_unref: napi_reference_unref,
        napi_remove_env_cleanup_hook: napi_remove_env_cleanup_hook
    });

    //#region src/miscellaneous.ts
    /** @__sig ippi */
    function _emnapi_get_filename(env, buf, len) {
        const envObject = emnapiEnv;
        const filename = envObject.filename;
        if (!buf) {
            return emnapiString.lengthBytesUTF8(filename);
        }
        buf >>>= 0;
        return emnapiString.stringToUTF8(filename, buf, len);
    }

    //#endregion src/miscellaneous.ts

    var miscellaneousMod = /*#__PURE__*/Object.freeze({
        __proto__: null,
        _emnapi_get_filename: _emnapi_get_filename
    });

    //#region src/node.ts
    /** @__sig vppdp */
    function _emnapi_node_emit_async_init(async_resource, async_resource_name, trigger_async_id, result) {
        if (!emnapiNodeBinding)
            return;
        const resource = emnapiCtx.jsValueFromNapiValue(async_resource);
        const resource_name = emnapiCtx.jsValueFromNapiValue(async_resource_name);
        const asyncContext = emnapiNodeBinding.node.emitAsyncInit(resource, resource_name, trigger_async_id);
        const asyncId = asyncContext.asyncId;
        const triggerAsyncId = asyncContext.triggerAsyncId;
        if (result) {
            result >>>= 0;
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
            GET_HEAP_DATA_VIEW().setFloat64(result, asyncId, true);
            GET_HEAP_DATA_VIEW().setFloat64(result + 8, triggerAsyncId, true);
        }
    }
    /** @__sig vdd */
    function _emnapi_node_emit_async_destroy(async_id, trigger_async_id) {
        if (!emnapiNodeBinding)
            return;
        emnapiNodeBinding.node.emitAsyncDestroy({
            asyncId: async_id,
            triggerAsyncId: trigger_async_id
        });
    }
    /* vpddp export function _emnapi_node_open_callback_scope (async_resource: napi_value, async_id: double, trigger_async_id: double, result: Pointer<int64_t>): void {
      if (!emnapiNodeBinding || !result) return
      const resource = emnapiCtx.jsValueFromNapiValue(async_resource)!
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const nativeCallbackScopePointer = emnapiNodeBinding.node.openCallbackScope(resource, {
        asyncId: async_id,
        triggerAsyncId: trigger_async_id
      })

      from64('result')
      $_TODO_makeSetValue('result', 0, 'nativeCallbackScopePointer', 'i64')
    }

    vp
    export function _emnapi_node_close_callback_scope (scope: Pointer<int64_t>): void {
      if (!emnapiNodeBinding || !scope) return
      from64('scope')
      const nativeCallbackScopePointer = $_TODO_makeGetValue('scope', 0, 'i64')
      emnapiNodeBinding.node.closeCallbackScope(BigInt(nativeCallbackScopePointer))
    } */
    /** @__sig ipppppddp */
    function _emnapi_node_make_callback(env, async_resource, cb, argv, size, async_id, trigger_async_id, result) {
        let i = 0;
        let v;
        if (!emnapiNodeBinding)
            return;
        const resource = emnapiCtx.jsValueFromNapiValue(async_resource);
        const callback = emnapiCtx.jsValueFromNapiValue(cb);
        argv >>>= 0;
        size >>>= 0;
        size = size >>> 0;
        const arr = Array(size);
        var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
        for (; i < size; i++) {
            const argVal = GET_HEAP_DATA_VIEW().getUint32(argv + i * 4, true);
            arr[i] = emnapiCtx.jsValueFromNapiValue(argVal);
        }
        const ret = emnapiNodeBinding.node.makeCallback(resource, callback, arr, {
            asyncId: async_id,
            triggerAsyncId: trigger_async_id
        });
        if (result) {
            result >>>= 0;
            v = emnapiCtx.napiValueFromJsValue(ret);
            GET_HEAP_DATA_VIEW().setUint32(result, v, true);
        }
    }
    /** @__sig ippp */
    function _emnapi_async_init_js(async_resource, async_resource_name, result) {
        if (!emnapiNodeBinding) {
            return 9 /* napi_status.napi_generic_failure */;
        }
        let resource;
        if (async_resource) {
            resource = Object(emnapiCtx.jsValueFromNapiValue(async_resource));
        }
        const name = emnapiCtx.jsValueFromNapiValue(async_resource_name);
        const ret = emnapiNodeBinding.napi.asyncInit(resource, name);
        if (ret.status !== 0)
            return ret.status;
        let numberValue = ret.value;
        if (!((numberValue >= (BigInt(-1) * (BigInt(1) << BigInt(63)))) && (numberValue < (BigInt(1) << BigInt(63))))) {
            numberValue = numberValue & ((BigInt(1) << BigInt(64)) - BigInt(1));
            if (numberValue >= (BigInt(1) << BigInt(63))) {
                numberValue = numberValue - (BigInt(1) << BigInt(64));
            }
        }
        const low = Number(numberValue & BigInt(0xffffffff));
        const high = Number(numberValue >> BigInt(32));
        result >>>= 0;
        var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
        GET_HEAP_DATA_VIEW().setInt32(result, low, true);
        GET_HEAP_DATA_VIEW().setInt32(result + 4, high, true);
        return 0 /* napi_status.napi_ok */;
    }
    /** @__sig ip */
    function _emnapi_async_destroy_js(async_context) {
        if (!emnapiNodeBinding) {
            return 9 /* napi_status.napi_generic_failure */;
        }
        async_context >>>= 0;
        var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
        const low = GET_HEAP_DATA_VIEW().getInt32(async_context, true);
        const high = GET_HEAP_DATA_VIEW().getInt32(async_context + 4, true);
        const pointer = BigInt(low >>> 0) | (BigInt(high) << BigInt(32));
        const ret = emnapiNodeBinding.napi.asyncDestroy(pointer);
        if (ret.status !== 0)
            return ret.status;
        return 0 /* napi_status.napi_ok */;
    }
    // https://github.com/nodejs/node-addon-api/pull/1283
    /** @__sig ipppp */
    function napi_open_callback_scope(env, ignored, async_context_handle, result) {
        throw new Error('napi_open_callback_scope has not been implemented yet');
    }
    /** @__sig ipp */
    function napi_close_callback_scope(env, scope) {
        throw new Error('napi_close_callback_scope has not been implemented yet');
    }
    /** @__sig ippppppp */
    function napi_make_callback(env, async_context, recv, func, argc, argv, result) {
        let i = 0;
        let v;
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!envObject.lastException.isEmpty())
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        if (!envObject.canCallIntoJs())
            return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
        envObject.clearLastError();
        try {
            if (!emnapiNodeBinding) {
                return envObject.setLastError(9 /* napi_status.napi_generic_failure */);
            }
            if (!recv)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            if (argc > 0) {
                if (!argv)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            }
            const v8recv = Object(emnapiCtx.jsValueFromNapiValue(recv));
            const v8func = emnapiCtx.jsValueFromNapiValue(func);
            if (typeof v8func !== 'function') {
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            }
            async_context >>>= 0;
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
            const low = GET_HEAP_DATA_VIEW().getInt32(async_context, true);
            const high = GET_HEAP_DATA_VIEW().getInt32(async_context + 4, true);
            const ctx = BigInt(low >>> 0) | (BigInt(high) << BigInt(32));
            argv >>>= 0;
            argc >>>= 0;
            argc = argc >>> 0;
            const arr = Array(argc);
            for (; i < argc; i++) {
                const argVal = GET_HEAP_DATA_VIEW().getUint32(argv + i * 4, true);
                arr[i] = emnapiCtx.jsValueFromNapiValue(argVal);
            }
            const ret = emnapiNodeBinding.napi.makeCallback(ctx, v8recv, v8func, arr);
            if (ret.error) {
                throw ret.error;
            }
            if (ret.status !== 0 /* napi_status.napi_ok */)
                return envObject.setLastError(ret.status);
            if (result) {
                result >>>= 0;
                // The makeCallback call into JS above may have grown wasm memory:
                // resolve v before the write (the store target is evaluated before the
                // RHS, so an RHS running user JS could write through a stale heap view)
                v = emnapiCtx.napiValueFromJsValue(ret.value);
                GET_HEAP_DATA_VIEW().setUint32(result, v, true);
            }
            return (0 /* napi_status.napi_ok */);
        }
        catch (err) {
            envObject.lastException.resetTo(err);
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        }
    }
    /** @__sig vp */
    function _emnapi_env_check_gc_access(env) {
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
    }

    //#endregion src/node.ts

    var nodeMod = /*#__PURE__*/Object.freeze({
        __proto__: null,
        _emnapi_async_destroy_js: _emnapi_async_destroy_js,
        _emnapi_async_init_js: _emnapi_async_init_js,
        _emnapi_env_check_gc_access: _emnapi_env_check_gc_access,
        _emnapi_node_emit_async_destroy: _emnapi_node_emit_async_destroy,
        _emnapi_node_emit_async_init: _emnapi_node_emit_async_init,
        _emnapi_node_make_callback: _emnapi_node_make_callback,
        napi_close_callback_scope: napi_close_callback_scope,
        napi_make_callback: napi_make_callback,
        napi_open_callback_scope: napi_open_callback_scope
    });

    //#region src/promise.ts
    /** @__sig ippp */
    function napi_create_promise(env, deferred, promise) {
        let deferredObjectId, value;
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!envObject.lastException.isEmpty())
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        if (!envObject.canCallIntoJs())
            return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
        envObject.clearLastError();
        try {
            if (!deferred)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            if (!promise)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            const resolver = emnapiCtx.createResolver();
            deferredObjectId = emnapiCtx.isolate.createReference(resolver).id;
            deferred >>>= 0;
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
            GET_HEAP_DATA_VIEW().setUint32(deferred, deferredObjectId, true);
            value = emnapiCtx.napiValueFromJsValue(resolver.promise);
            promise >>>= 0;
            GET_HEAP_DATA_VIEW().setUint32(promise, value, true);
            return (0 /* napi_status.napi_ok */);
        }
        catch (err) {
            envObject.lastException.resetTo(err);
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        }
    }
    /** @__sig ippp */
    function napi_resolve_deferred(env, deferred, resolution) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!envObject.lastException.isEmpty())
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        if (!envObject.canCallIntoJs())
            return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
        envObject.clearLastError();
        try {
            if (!deferred)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            if (!resolution)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            const deferredRef = emnapiCtx.isolate.getRef(deferred);
            const resolver = deferredRef.deref();
            resolver.resolve(emnapiCtx.jsValueFromNapiValue(resolution));
            deferredRef.dispose();
            return (0 /* napi_status.napi_ok */);
        }
        catch (err) {
            envObject.lastException.resetTo(err);
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        }
    }
    /** @__sig ippp */
    function napi_reject_deferred(env, deferred, resolution) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!envObject.lastException.isEmpty())
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        if (!envObject.canCallIntoJs())
            return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
        envObject.clearLastError();
        try {
            if (!deferred)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            if (!resolution)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            const deferredRef = emnapiCtx.isolate.getRef(deferred);
            const resolver = deferredRef.deref();
            resolver.reject(emnapiCtx.jsValueFromNapiValue(resolution));
            deferredRef.dispose();
            return (0 /* napi_status.napi_ok */);
        }
        catch (err) {
            envObject.lastException.resetTo(err);
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        }
    }
    /** @__sig ippp */
    function napi_is_promise(env, value, is_promise) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!value)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        if (!is_promise)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        const promise = emnapiCtx.jsValueFromNapiValue(value);
        is_promise >>>= 0;
        const r = promise instanceof Promise ? 1 : 0;
        var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
        GET_HEAP_DATA_VIEW().setInt8(is_promise, r, true);
        return envObject.clearLastError();
    }

    //#endregion src/promise.ts

    var promiseMod = /*#__PURE__*/Object.freeze({
        __proto__: null,
        napi_create_promise: napi_create_promise,
        napi_is_promise: napi_is_promise,
        napi_reject_deferred: napi_reject_deferred,
        napi_resolve_deferred: napi_resolve_deferred
    });

    //#region src/property.ts
    /** @__sig ippiiip */
    function napi_get_all_property_names(env, object, key_mode, key_filter, key_conversion, result) {
        let value;
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!envObject.lastException.isEmpty())
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        if (!envObject.canCallIntoJs())
            return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
        envObject.clearLastError();
        try {
            if (!result)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            if (!object)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            const jsValue = emnapiCtx.jsValueFromNapiValue(object);
            if (jsValue == null) {
                throw new TypeError('Cannot convert undefined or null to object');
            }
            const type = typeof jsValue;
            let obj;
            try {
                obj = (type === 'object' && jsValue !== null) || type === 'function' ? jsValue : Object(jsValue);
            }
            catch (_) {
                return envObject.setLastError(2 /* napi_status.napi_object_expected */);
            }
            if (key_mode !== 0 /* napi_key_collection_mode.napi_key_include_prototypes */ && key_mode !== 1 /* napi_key_collection_mode.napi_key_own_only */) {
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            }
            if (key_conversion !== 0 /* napi_key_conversion.napi_key_keep_numbers */ && key_conversion !== 1 /* napi_key_conversion.napi_key_numbers_to_strings */) {
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            }
            const props = [];
            let names;
            let symbols;
            let i;
            let own = true;
            const integerIndiceRegex = /^(0|[1-9][0-9]*)$/;
            do {
                names = Object.getOwnPropertyNames(obj);
                symbols = Object.getOwnPropertySymbols(obj);
                for (i = 0; i < names.length; i++) {
                    props.push({
                        name: integerIndiceRegex.test(names[i]) ? Number(names[i]) : names[i],
                        desc: Object.getOwnPropertyDescriptor(obj, names[i]),
                        own
                    });
                }
                for (i = 0; i < symbols.length; i++) {
                    props.push({
                        name: symbols[i],
                        desc: Object.getOwnPropertyDescriptor(obj, symbols[i]),
                        own
                    });
                }
                if (key_mode === 1 /* napi_key_collection_mode.napi_key_own_only */) {
                    break;
                }
                obj = Object.getPrototypeOf(obj);
                own = false;
            } while (obj);
            const ret = [];
            const addName = function (ret, name, key_filter, conversion_mode) {
                if (ret.indexOf(name) !== -1)
                    return;
                if (conversion_mode === 0 /* napi_key_conversion.napi_key_keep_numbers */) {
                    ret.push(name);
                }
                else if (conversion_mode === 1 /* napi_key_conversion.napi_key_numbers_to_strings */) {
                    const realName = typeof name === 'number' ? String(name) : name;
                    if (typeof realName === 'string') {
                        if (!(key_filter & 8 /* napi_key_filter.napi_key_skip_strings */)) {
                            ret.push(realName);
                        }
                    }
                    else {
                        ret.push(realName);
                    }
                }
            };
            for (i = 0; i < props.length; i++) {
                const prop = props[i];
                const name = prop.name;
                const desc = prop.desc;
                if (key_filter === 0 /* napi_key_filter.napi_key_all_properties */) {
                    addName(ret, name, key_filter, key_conversion);
                }
                else {
                    if (key_filter & 8 /* napi_key_filter.napi_key_skip_strings */ && typeof name === 'string') {
                        continue;
                    }
                    if (key_filter & 16 /* napi_key_filter.napi_key_skip_symbols */ && typeof name === 'symbol') {
                        continue;
                    }
                    let shouldAdd = true;
                    switch (key_filter & 7) {
                        case 1 /* napi_key_filter.napi_key_writable */: {
                            shouldAdd = Boolean(desc.writable);
                            break;
                        }
                        case 2 /* napi_key_filter.napi_key_enumerable */: {
                            shouldAdd = Boolean(desc.enumerable);
                            break;
                        }
                        case (1 /* napi_key_filter.napi_key_writable */ | 2 /* napi_key_filter.napi_key_enumerable */): {
                            shouldAdd = Boolean(desc.writable && desc.enumerable);
                            break;
                        }
                        case 4 /* napi_key_filter.napi_key_configurable */: {
                            shouldAdd = Boolean(desc.configurable);
                            break;
                        }
                        case (4 /* napi_key_filter.napi_key_configurable */ | 1 /* napi_key_filter.napi_key_writable */): {
                            shouldAdd = Boolean(desc.configurable && desc.writable);
                            break;
                        }
                        case (4 /* napi_key_filter.napi_key_configurable */ | 2 /* napi_key_filter.napi_key_enumerable */): {
                            shouldAdd = Boolean(desc.configurable && desc.enumerable);
                            break;
                        }
                        case (4 /* napi_key_filter.napi_key_configurable */ | 2 /* napi_key_filter.napi_key_enumerable */ | 1 /* napi_key_filter.napi_key_writable */): {
                            shouldAdd = Boolean(desc.configurable && desc.enumerable && desc.writable);
                            break;
                        }
                    }
                    if (shouldAdd) {
                        addName(ret, name, key_filter, key_conversion);
                    }
                }
            }
            result >>>= 0;
            value = emnapiCtx.napiValueFromJsValue(ret);
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
            GET_HEAP_DATA_VIEW().setUint32(result, value, true);
            return (0 /* napi_status.napi_ok */);
        }
        catch (err) {
            envObject.lastException.resetTo(err);
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        }
    }
    /** @__sig ippp */
    function napi_get_property_names(env, object, result) {
        return napi_get_all_property_names(env, object, 0 /* napi_key_collection_mode.napi_key_include_prototypes */, 2 /* napi_key_filter.napi_key_enumerable */ | 16 /* napi_key_filter.napi_key_skip_symbols */, 1 /* napi_key_conversion.napi_key_numbers_to_strings */, result);
    }
    /** @__sig ipppp */
    function napi_set_property(env, object, key, value) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!envObject.lastException.isEmpty())
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        if (!envObject.canCallIntoJs())
            return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
        envObject.clearLastError();
        try {
            if (!key)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            if (!value)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            if (!object)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            const jsValue = emnapiCtx.jsValueFromNapiValue(object);
            const type = typeof jsValue;
            if (!((type === 'object' && jsValue !== null) || type === 'function')) {
                return envObject.setLastError(2 /* napi_status.napi_object_expected */);
            }
            jsValue[emnapiCtx.jsValueFromNapiValue(key)] = emnapiCtx.jsValueFromNapiValue(value);
            return (0 /* napi_status.napi_ok */);
        }
        catch (err) {
            envObject.lastException.resetTo(err);
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        }
    }
    /** @__sig ipppp */
    function napi_has_property(env, object, key, result) {
        let r;
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!envObject.lastException.isEmpty())
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        if (!envObject.canCallIntoJs())
            return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
        envObject.clearLastError();
        try {
            if (!key)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            if (!result)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            if (!object)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            const jsValue = emnapiCtx.jsValueFromNapiValue(object);
            if (jsValue == null) {
                throw new TypeError('Cannot convert undefined or null to object');
            }
            const type = typeof jsValue;
            let v;
            try {
                v = (type === 'object' && jsValue !== null) || type === 'function' ? jsValue : Object(jsValue);
            }
            catch (_) {
                return envObject.setLastError(2 /* napi_status.napi_object_expected */);
            }
            result >>>= 0;
            r = (emnapiCtx.jsValueFromNapiValue(key) in v) ? 1 : 0;
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
            GET_HEAP_DATA_VIEW().setInt8(result, r, true);
            return (0 /* napi_status.napi_ok */);
        }
        catch (err) {
            envObject.lastException.resetTo(err);
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        }
    }
    /** @__sig ipppp */
    function napi_get_property(env, object, key, result) {
        let value;
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!envObject.lastException.isEmpty())
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        if (!envObject.canCallIntoJs())
            return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
        envObject.clearLastError();
        try {
            if (!key)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            if (!result)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            if (!object)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            const jsValue = emnapiCtx.jsValueFromNapiValue(object);
            if (jsValue == null) {
                throw new TypeError('Cannot convert undefined or null to object');
            }
            const type = typeof jsValue;
            let v;
            try {
                v = (type === 'object' && jsValue !== null) || type === 'function' ? jsValue : Object(jsValue);
            }
            catch (_) {
                return envObject.setLastError(2 /* napi_status.napi_object_expected */);
            }
            result >>>= 0;
            value = emnapiCtx.napiValueFromJsValue(v[emnapiCtx.jsValueFromNapiValue(key)]);
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
            GET_HEAP_DATA_VIEW().setUint32(result, value, true);
            return (0 /* napi_status.napi_ok */);
        }
        catch (err) {
            envObject.lastException.resetTo(err);
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        }
    }
    /** @__sig ipppp */
    function napi_delete_property(env, object, key, result) {
        let r;
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!envObject.lastException.isEmpty())
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        if (!envObject.canCallIntoJs())
            return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
        envObject.clearLastError();
        try {
            if (!key)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            if (!object)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            const jsValue = emnapiCtx.jsValueFromNapiValue(object);
            const type = typeof jsValue;
            if (!((type === 'object' && jsValue !== null) || type === 'function')) {
                return envObject.setLastError(2 /* napi_status.napi_object_expected */);
            }
            const propertyKey = emnapiCtx.jsValueFromNapiValue(key);
            if (emnapiCtx.features.Reflect) {
                r = emnapiCtx.features.Reflect.deleteProperty(jsValue, propertyKey);
            }
            else {
                try {
                    r = delete jsValue[propertyKey];
                }
                catch (_) {
                    r = false;
                }
            }
            if (result) {
                result >>>= 0;
                var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
                GET_HEAP_DATA_VIEW().setInt8(result, r ? 1 : 0, true);
            }
            return (0 /* napi_status.napi_ok */);
        }
        catch (err) {
            envObject.lastException.resetTo(err);
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        }
    }
    /** @__sig ipppp */
    function napi_has_own_property(env, object, key, result) {
        let r;
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!envObject.lastException.isEmpty())
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        if (!envObject.canCallIntoJs())
            return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
        envObject.clearLastError();
        try {
            if (!key)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            if (!result)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            if (!object)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            const jsValue = emnapiCtx.jsValueFromNapiValue(object);
            if (jsValue == null) {
                throw new TypeError('Cannot convert undefined or null to object');
            }
            const type = typeof jsValue;
            let v;
            try {
                v = ((type === 'object' && jsValue !== null) || type !== 'function') ? jsValue : Object(jsValue);
            }
            catch (_) {
                return envObject.setLastError(2 /* napi_status.napi_object_expected */);
            }
            const prop = emnapiCtx.jsValueFromNapiValue(key);
            if (typeof prop !== 'string' && typeof prop !== 'symbol') {
                return envObject.setLastError(4 /* napi_status.napi_name_expected */);
            }
            r = Object.prototype.hasOwnProperty.call(v, emnapiCtx.jsValueFromNapiValue(key));
            result >>>= 0;
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
            GET_HEAP_DATA_VIEW().setInt8(result, r ? 1 : 0, true);
            return (0 /* napi_status.napi_ok */);
        }
        catch (err) {
            envObject.lastException.resetTo(err);
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        }
    }
    /** @__sig ipppp */
    function napi_set_named_property(env, object, cname, value) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!envObject.lastException.isEmpty())
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        if (!envObject.canCallIntoJs())
            return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
        envObject.clearLastError();
        try {
            if (!value)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            if (!object)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            const jsValue = emnapiCtx.jsValueFromNapiValue(object);
            const type = typeof jsValue;
            if (!(((type === 'object' && jsValue !== null) || type === 'function'))) {
                return envObject.setLastError(2 /* napi_status.napi_object_expected */);
            }
            if (!cname) {
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            }
            cname >>>= 0;
            emnapiCtx.jsValueFromNapiValue(object)[emnapiString.UTF8ToString(cname, -1)] = emnapiCtx.jsValueFromNapiValue(value);
            return (0 /* napi_status.napi_ok */);
        }
        catch (err) {
            envObject.lastException.resetTo(err);
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        }
    }
    /** @__sig ipppp */
    function napi_has_named_property(env, object, utf8name, result) {
        let r;
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!envObject.lastException.isEmpty())
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        if (!envObject.canCallIntoJs())
            return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
        envObject.clearLastError();
        try {
            if (!result)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            if (!object)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            if (!utf8name) {
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            }
            const jsValue = emnapiCtx.jsValueFromNapiValue(object);
            if (jsValue == null) {
                throw new TypeError('Cannot convert undefined or null to object');
            }
            const type = typeof jsValue;
            let v;
            try {
                v = ((type === 'object' && jsValue !== null) || type === 'function') ? jsValue : Object(jsValue);
            }
            catch (_) {
                return envObject.setLastError(2 /* napi_status.napi_object_expected */);
            }
            utf8name >>>= 0;
            result >>>= 0;
            r = emnapiString.UTF8ToString(utf8name, -1) in v;
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
            GET_HEAP_DATA_VIEW().setInt8(result, r ? 1 : 0, true);
            return (0 /* napi_status.napi_ok */);
        }
        catch (err) {
            envObject.lastException.resetTo(err);
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        }
    }
    /** @__sig ipppp */
    function napi_get_named_property(env, object, utf8name, result) {
        let value;
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!envObject.lastException.isEmpty())
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        if (!envObject.canCallIntoJs())
            return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
        envObject.clearLastError();
        try {
            if (!result)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            if (!object)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            if (!utf8name) {
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            }
            const jsValue = emnapiCtx.jsValueFromNapiValue(object);
            if (jsValue == null) {
                throw new TypeError('Cannot convert undefined or null to object');
            }
            const type = typeof jsValue;
            let v;
            try {
                v = ((type === 'object' && jsValue !== null) || type === 'function') ? jsValue : Object(jsValue);
            }
            catch (_) {
                return envObject.setLastError(2 /* napi_status.napi_object_expected */);
            }
            utf8name >>>= 0;
            result >>>= 0;
            value = emnapiCtx.napiValueFromJsValue(v[emnapiString.UTF8ToString(utf8name, -1)]);
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
            GET_HEAP_DATA_VIEW().setUint32(result, value, true);
            return (0 /* napi_status.napi_ok */);
        }
        catch (err) {
            envObject.lastException.resetTo(err);
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        }
    }
    /** @__sig ippip */
    function napi_set_element(env, object, index, value) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!envObject.lastException.isEmpty())
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        if (!envObject.canCallIntoJs())
            return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
        envObject.clearLastError();
        try {
            if (!value)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            if (!object)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            const jsValue = emnapiCtx.jsValueFromNapiValue(object);
            const type = typeof jsValue;
            if (!(((type === 'object' && jsValue !== null) || type === 'function'))) {
                return envObject.setLastError(2 /* napi_status.napi_object_expected */);
            }
            jsValue[index >>> 0] = emnapiCtx.jsValueFromNapiValue(value);
            return (0 /* napi_status.napi_ok */);
        }
        catch (err) {
            envObject.lastException.resetTo(err);
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        }
    }
    /** @__sig ippip */
    function napi_has_element(env, object, index, result) {
        let r;
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!envObject.lastException.isEmpty())
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        if (!envObject.canCallIntoJs())
            return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
        envObject.clearLastError();
        try {
            if (!result)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            if (!object)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            const jsValue = emnapiCtx.jsValueFromNapiValue(object);
            if (jsValue == null) {
                throw new TypeError('Cannot convert undefined or null to object');
            }
            let v;
            const type = typeof jsValue;
            try {
                v = ((type === 'object' && jsValue !== null) || type === 'function') ? jsValue : Object(jsValue);
            }
            catch (_) {
                return envObject.setLastError(2 /* napi_status.napi_object_expected */);
            }
            result >>>= 0;
            r = ((index >>> 0) in v) ? 1 : 0;
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
            GET_HEAP_DATA_VIEW().setInt8(result, r, true);
            return (0 /* napi_status.napi_ok */);
        }
        catch (err) {
            envObject.lastException.resetTo(err);
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        }
    }
    /** @__sig ippip */
    function napi_get_element(env, object, index, result) {
        let value;
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!envObject.lastException.isEmpty())
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        if (!envObject.canCallIntoJs())
            return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
        envObject.clearLastError();
        try {
            if (!result)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            if (!object)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            const jsValue = emnapiCtx.jsValueFromNapiValue(object);
            if (jsValue == null) {
                throw new TypeError('Cannot convert undefined or null to object');
            }
            const type = typeof jsValue;
            let v;
            try {
                v = ((type === 'object' && jsValue !== null) || type === 'function') ? jsValue : Object(jsValue);
            }
            catch (_) {
                return envObject.setLastError(2 /* napi_status.napi_object_expected */);
            }
            result >>>= 0;
            value = emnapiCtx.napiValueFromJsValue(v[index >>> 0]);
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
            GET_HEAP_DATA_VIEW().setUint32(result, value, true);
            return (0 /* napi_status.napi_ok */);
        }
        catch (err) {
            envObject.lastException.resetTo(err);
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        }
    }
    /** @__sig ippip */
    function napi_delete_element(env, object, index, result) {
        let r;
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!envObject.lastException.isEmpty())
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        if (!envObject.canCallIntoJs())
            return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
        envObject.clearLastError();
        try {
            if (!object)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            const jsValue = emnapiCtx.jsValueFromNapiValue(object);
            const type = typeof jsValue;
            if (!(((type === 'object' && jsValue !== null) || type === 'function'))) {
                return envObject.setLastError(2 /* napi_status.napi_object_expected */);
            }
            if (emnapiCtx.features.Reflect) {
                r = emnapiCtx.features.Reflect.deleteProperty(jsValue, index >>> 0);
            }
            else {
                try {
                    r = delete jsValue[index >>> 0];
                }
                catch (_) {
                    r = false;
                }
            }
            if (result) {
                result >>>= 0;
                var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
                GET_HEAP_DATA_VIEW().setInt8(result, r ? 1 : 0, true);
            }
            return (0 /* napi_status.napi_ok */);
        }
        catch (err) {
            envObject.lastException.resetTo(err);
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        }
    }
    /** @__sig ipppp */
    function napi_define_properties(env, object, property_count, properties) {
        let propPtr, attributes;
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!envObject.lastException.isEmpty())
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        if (!envObject.canCallIntoJs())
            return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
        envObject.clearLastError();
        try {
            properties >>>= 0;
            property_count >>>= 0;
            property_count = property_count >>> 0;
            if (property_count > 0) {
                if (!properties)
                    return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            }
            if (!object)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            const maybeObject = emnapiCtx.jsValueFromNapiValue(object);
            const type = typeof maybeObject;
            if (!((type === 'object' && maybeObject !== null) || type === 'function')) {
                return envObject.setLastError(2 /* napi_status.napi_object_expected */);
            }
            let propertyName;
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
            for (let i = 0; i < property_count; i++) {
                propPtr = properties + (i * (4 * 8));
                const utf8Name = GET_HEAP_DATA_VIEW().getUint32(propPtr, true);
                const name = GET_HEAP_DATA_VIEW().getUint32(propPtr + 4, true);
                const method = GET_HEAP_DATA_VIEW().getUint32(propPtr + 8, true);
                const getter = GET_HEAP_DATA_VIEW().getUint32(propPtr + 12, true);
                const setter = GET_HEAP_DATA_VIEW().getUint32(propPtr + 16, true);
                const value = GET_HEAP_DATA_VIEW().getUint32(propPtr + 20, true);
                attributes = GET_HEAP_DATA_VIEW().getInt32(propPtr + 24, true);
                attributes >>>= 0;
                const data = GET_HEAP_DATA_VIEW().getUint32(propPtr + 28, true);
                if (utf8Name) {
                    propertyName = emnapiString.UTF8ToString(utf8Name, -1);
                }
                else {
                    if (!name) {
                        return envObject.setLastError(4 /* napi_status.napi_name_expected */);
                    }
                    propertyName = emnapiCtx.jsValueFromNapiValue(name);
                    if (typeof propertyName !== 'string' && typeof propertyName !== 'symbol') {
                        return envObject.setLastError(4 /* napi_status.napi_name_expected */);
                    }
                }
                emnapiDefineProperty(envObject, maybeObject, propertyName, method, getter, setter, value, attributes, data);
            }
            return (0 /* napi_status.napi_ok */);
        }
        catch (err) {
            envObject.lastException.resetTo(err);
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        }
    }
    /** @__sig ipp */
    function napi_object_freeze(env, object) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!envObject.lastException.isEmpty())
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        if (!envObject.canCallIntoJs())
            return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
        envObject.clearLastError();
        try {
            if (!object)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            const maybeObject = emnapiCtx.jsValueFromNapiValue(object);
            const type = typeof maybeObject;
            if (!(((type === 'object' && maybeObject !== null) || type === 'function'))) {
                return envObject.setLastError(2 /* napi_status.napi_object_expected */);
            }
            Object.freeze(maybeObject);
            return (0 /* napi_status.napi_ok */);
        }
        catch (err) {
            envObject.lastException.resetTo(err);
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        }
    }
    /** @__sig ipp */
    function napi_object_seal(env, object) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!envObject.lastException.isEmpty())
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        if (!envObject.canCallIntoJs())
            return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
        envObject.clearLastError();
        try {
            if (!object)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            const maybeObject = emnapiCtx.jsValueFromNapiValue(object);
            const type = typeof maybeObject;
            if (!(((type === 'object' && maybeObject !== null) || type === 'function'))) {
                return envObject.setLastError(2 /* napi_status.napi_object_expected */);
            }
            Object.seal(maybeObject);
            return (0 /* napi_status.napi_ok */);
        }
        catch (err) {
            envObject.lastException.resetTo(err);
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        }
    }

    //#endregion src/property.ts

    var propertyMod = /*#__PURE__*/Object.freeze({
        __proto__: null,
        napi_define_properties: napi_define_properties,
        napi_delete_element: napi_delete_element,
        napi_delete_property: napi_delete_property,
        napi_get_all_property_names: napi_get_all_property_names,
        napi_get_element: napi_get_element,
        napi_get_named_property: napi_get_named_property,
        napi_get_property: napi_get_property,
        napi_get_property_names: napi_get_property_names,
        napi_has_element: napi_has_element,
        napi_has_named_property: napi_has_named_property,
        napi_has_own_property: napi_has_own_property,
        napi_has_property: napi_has_property,
        napi_object_freeze: napi_object_freeze,
        napi_object_seal: napi_object_seal,
        napi_set_element: napi_set_element,
        napi_set_named_property: napi_set_named_property,
        napi_set_property: napi_set_property
    });

    //#region src/script.ts
    /**
     * @__sig ippp
     */
    function napi_run_script(env, script, result) {
        let status;
        let value;
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!envObject.lastException.isEmpty())
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        if (!envObject.canCallIntoJs())
            return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
        envObject.clearLastError();
        try {
            if (!script)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            if (!result)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            const v8Script = emnapiCtx.jsValueFromNapiValue(script);
            if (typeof v8Script !== 'string') {
                return envObject.setLastError(3 /* napi_status.napi_string_expected */);
            }
            const g = emnapiCtx.jsValueFromNapiValue(6 /* Constant.GLOBAL */);
            const ret = g.eval(v8Script);
            result >>>= 0;
            value = emnapiCtx.napiValueFromJsValue(ret);
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
            GET_HEAP_DATA_VIEW().setUint32(result, value, true);
            status = (0 /* napi_status.napi_ok */);
        }
        catch (err) {
            envObject.lastException.resetTo(err);
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        }
        return status;
    }

    //#endregion src/script.ts

    var scriptMod = /*#__PURE__*/Object.freeze({
        __proto__: null,
        napi_run_script: napi_run_script
    });

    //#region src/value-operation.ts
    /** @__sig ippp */
    function napi_typeof(env, value, result) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!value)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        if (!result)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        const v = emnapiCtx.jsValueFromNapiValue(value);
        const type = typeof v;
        result >>>= 0;
        let r;
        if (type === 'number') {
            r = 3 /* napi_valuetype.napi_number */;
        }
        else if (type === 'bigint') {
            r = 9 /* napi_valuetype.napi_bigint */;
        }
        else if (type === 'string') {
            r = 4 /* napi_valuetype.napi_string */;
        }
        else if (type === 'function') {
            // This test has to come before IsObject because IsFunction
            // implies IsObject
            r = 7 /* napi_valuetype.napi_function */;
        }
        else if (emnapiCtx.isExternal(v)) {
            // This test has to come before IsObject because IsExternal
            // implies IsObject
            r = 8 /* napi_valuetype.napi_external */;
        }
        else if (type === 'object' && v !== null) {
            r = 6 /* napi_valuetype.napi_object */;
        }
        else if (type === 'boolean') {
            r = 2 /* napi_valuetype.napi_boolean */;
        }
        else if (type === 'undefined') {
            r = 0 /* napi_valuetype.napi_undefined */;
        }
        else if (type === 'symbol') {
            r = 5 /* napi_valuetype.napi_symbol */;
        }
        else if (v === null) {
            r = 1 /* napi_valuetype.napi_null */;
        }
        else {
            // Should not get here unless V8 has added some new kind of value.
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        }
        var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
        GET_HEAP_DATA_VIEW().setInt32(result, r, true);
        return envObject.clearLastError();
    }
    /** @__sig ippp */
    function napi_coerce_to_bool(env, value, result) {
        let v;
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!envObject.lastException.isEmpty())
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        if (!envObject.canCallIntoJs())
            return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
        envObject.clearLastError();
        try {
            if (!value)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            if (!result)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            const jsValue = emnapiCtx.jsValueFromNapiValue(value);
            result >>>= 0;
            v = jsValue ? 5 /* Constant.TRUE */ : 4 /* Constant.FALSE */;
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
            GET_HEAP_DATA_VIEW().setUint32(result, v, true);
            return (0 /* napi_status.napi_ok */);
        }
        catch (err) {
            envObject.lastException.resetTo(err);
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        }
    }
    /** @__sig ippp */
    function napi_coerce_to_number(env, value, result) {
        let v;
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!envObject.lastException.isEmpty())
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        if (!envObject.canCallIntoJs())
            return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
        envObject.clearLastError();
        try {
            if (!value)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            if (!result)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            const jsValue = emnapiCtx.jsValueFromNapiValue(value);
            if (typeof jsValue === 'bigint') {
                throw new TypeError('Cannot convert a BigInt value to a number');
            }
            result >>>= 0;
            v = emnapiCtx.napiValueFromJsValue(Number(jsValue));
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
            GET_HEAP_DATA_VIEW().setUint32(result, v, true);
            return (0 /* napi_status.napi_ok */);
        }
        catch (err) {
            envObject.lastException.resetTo(err);
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        }
    }
    /** @__sig ippp */
    function napi_coerce_to_object(env, value, result) {
        let v;
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!envObject.lastException.isEmpty())
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        if (!envObject.canCallIntoJs())
            return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
        envObject.clearLastError();
        try {
            if (!value)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            if (!result)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            const jsValue = emnapiCtx.jsValueFromNapiValue(value);
            if (jsValue == null) {
                throw new TypeError('Cannot convert undefined or null to object');
            }
            result >>>= 0;
            v = emnapiCtx.napiValueFromJsValue(Object(jsValue));
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
            GET_HEAP_DATA_VIEW().setUint32(result, v, true);
            return (0 /* napi_status.napi_ok */);
        }
        catch (err) {
            envObject.lastException.resetTo(err);
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        }
    }
    /** @__sig ippp */
    function napi_coerce_to_string(env, value, result) {
        let v;
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!envObject.lastException.isEmpty())
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        if (!envObject.canCallIntoJs())
            return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
        envObject.clearLastError();
        try {
            if (!value)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            if (!result)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            const jsValue = emnapiCtx.jsValueFromNapiValue(value);
            if (typeof jsValue === 'symbol') {
                throw new TypeError('Cannot convert a Symbol value to a string');
            }
            result >>>= 0;
            v = emnapiCtx.napiValueFromJsValue(String(jsValue));
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
            GET_HEAP_DATA_VIEW().setUint32(result, v, true);
            return (0 /* napi_status.napi_ok */);
        }
        catch (err) {
            envObject.lastException.resetTo(err);
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        }
    }
    /** @__sig ipppp */
    function napi_instanceof(env, object, constructor, result) {
        let r;
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!envObject.lastException.isEmpty())
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        if (!envObject.canCallIntoJs())
            return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
        envObject.clearLastError();
        try {
            if (!object)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            if (!result)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            if (!constructor)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            result >>>= 0;
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
            GET_HEAP_DATA_VIEW().setInt8(result, 0, true);
            const ctor = emnapiCtx.jsValueFromNapiValue(constructor);
            if (typeof ctor !== 'function') {
                return envObject.setLastError(5 /* napi_status.napi_function_expected */);
            }
            const val = emnapiCtx.jsValueFromNapiValue(object);
            const ret = val instanceof ctor;
            r = ret ? 1 : 0;
            GET_HEAP_DATA_VIEW().setInt8(result, r, true);
            return (0 /* napi_status.napi_ok */);
        }
        catch (err) {
            envObject.lastException.resetTo(err);
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        }
    }
    /** @__sig ippp */
    function napi_is_array(env, value, result) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!value)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        if (!result)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        const jsValue = emnapiCtx.jsValueFromNapiValue(value);
        result >>>= 0;
        const r = Array.isArray(jsValue) ? 1 : 0;
        var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
        GET_HEAP_DATA_VIEW().setInt8(result, r, true);
        return envObject.clearLastError();
    }
    /** @__sig ippp */
    function napi_is_arraybuffer(env, value, result) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!value)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        if (!result)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        const h = emnapiCtx.jsValueFromNapiValue(value);
        result >>>= 0;
        const r = h instanceof ArrayBuffer ? 1 : 0;
        var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
        GET_HEAP_DATA_VIEW().setInt8(result, r, true);
        return envObject.clearLastError();
    }
    /** @__sig ippp */
    function node_api_is_sharedarraybuffer(env, value, result) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!value)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        if (!result)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        const h = emnapiCtx.jsValueFromNapiValue(value);
        result >>>= 0;
        const r = ((typeof SharedArrayBuffer === 'function' && h instanceof SharedArrayBuffer) ||
            (Object.prototype.toString.call(h) === '[object SharedArrayBuffer]'))
            ? 1
            : 0;
        var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
        GET_HEAP_DATA_VIEW().setInt8(result, r, true);
        return envObject.clearLastError();
    }
    /** @__sig ippp */
    function napi_is_date(env, value, result) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!value)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        if (!result)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        const h = emnapiCtx.jsValueFromNapiValue(value);
        result >>>= 0;
        const r = h instanceof Date ? 1 : 0;
        var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
        GET_HEAP_DATA_VIEW().setInt8(result, r, true);
        return envObject.clearLastError();
    }
    /** @__sig ippp */
    function napi_is_error(env, value, result) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!value)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        if (!result)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        const val = emnapiCtx.jsValueFromNapiValue(value);
        result >>>= 0;
        const r = (val instanceof Error) ? 1 : 0;
        var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
        GET_HEAP_DATA_VIEW().setInt8(result, r, true);
        return envObject.clearLastError();
    }
    /** @__sig ippp */
    function napi_is_typedarray(env, value, result) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!value)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        if (!result)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        const h = emnapiCtx.jsValueFromNapiValue(value);
        result >>>= 0;
        const r = (ArrayBuffer.isView(h)) && !(h instanceof DataView) ? 1 : 0;
        var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
        GET_HEAP_DATA_VIEW().setInt8(result, r, true);
        return envObject.clearLastError();
    }
    /** @__sig ippp */
    function napi_is_buffer(env, value, result) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!value)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        if (!result)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        const h = emnapiCtx.jsValueFromNapiValue(value);
        result >>>= 0;
        const Buffer = emnapiCtx.features.Buffer;
        const r = (ArrayBuffer.isView(h) || (typeof Buffer === 'function' && Buffer.isBuffer(h))) ? 1 : 0;
        var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
        GET_HEAP_DATA_VIEW().setInt8(result, r, true);
        return envObject.clearLastError();
    }
    /** @__sig ippp */
    function napi_is_dataview(env, value, result) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!value)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        if (!result)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        const h = emnapiCtx.jsValueFromNapiValue(value);
        result >>>= 0;
        const r = h instanceof DataView ? 1 : 0;
        var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
        GET_HEAP_DATA_VIEW().setInt8(result, r, true);
        return envObject.clearLastError();
    }
    /** @__sig ipppp */
    function napi_strict_equals(env, lhs, rhs, result) {
        let r;
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!envObject.lastException.isEmpty())
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        if (!envObject.canCallIntoJs())
            return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
        envObject.clearLastError();
        try {
            if (!lhs)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            if (!rhs)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            if (!result)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            const lv = emnapiCtx.jsValueFromNapiValue(lhs);
            const rv = emnapiCtx.jsValueFromNapiValue(rhs);
            result >>>= 0;
            r = (lv === rv) ? 1 : 0;
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
            GET_HEAP_DATA_VIEW().setInt8(result, r, true);
            return (0 /* napi_status.napi_ok */);
        }
        catch (err) {
            envObject.lastException.resetTo(err);
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        }
    }
    /** @__sig ipp */
    function napi_detach_arraybuffer(env, arraybuffer) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!arraybuffer)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        const value = emnapiCtx.jsValueFromNapiValue(arraybuffer);
        if (!(value instanceof ArrayBuffer)) {
            if (typeof SharedArrayBuffer === 'function' && (value instanceof SharedArrayBuffer)) {
                return envObject.setLastError(20 /* napi_status.napi_detachable_arraybuffer_expected */);
            }
            return envObject.setLastError(19 /* napi_status.napi_arraybuffer_expected */);
        }
        try {
            const MessageChannel = emnapiCtx.features.MessageChannel;
            const messageChannel = new MessageChannel();
            messageChannel.port1.postMessage(value, [value]);
        }
        catch (_) {
            return envObject.setLastError(9 /* napi_status.napi_generic_failure */);
        }
        return envObject.clearLastError();
    }
    /** @__sig ippp */
    function napi_is_detached_arraybuffer(env, arraybuffer, result) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapiEnv;
        envObject.checkGCAccess();
        if (!envObject.lastException.isEmpty())
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        if (!envObject.canCallIntoJs())
            return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
        envObject.clearLastError();
        try {
            if (!arraybuffer)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            if (!result)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            const h = emnapiCtx.jsValueFromNapiValue(arraybuffer);
            result >>>= 0;
            var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
            if (h instanceof ArrayBuffer && h.byteLength === 0) {
                try {
                    // eslint-disable-next-line no-new
                    new Uint8Array(h);
                }
                catch (_) {
                    GET_HEAP_DATA_VIEW().setInt8(result, 1, true);
                    return (0 /* napi_status.napi_ok */);
                }
            }
            GET_HEAP_DATA_VIEW().setInt8(result, 0, true);
            return (0 /* napi_status.napi_ok */);
        }
        catch (err) {
            envObject.lastException.resetTo(err);
            return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
        }
    }

    //#endregion src/value-operation.ts

    var valueOperationMod = /*#__PURE__*/Object.freeze({
        __proto__: null,
        napi_coerce_to_bool: napi_coerce_to_bool,
        napi_coerce_to_number: napi_coerce_to_number,
        napi_coerce_to_object: napi_coerce_to_object,
        napi_coerce_to_string: napi_coerce_to_string,
        napi_detach_arraybuffer: napi_detach_arraybuffer,
        napi_instanceof: napi_instanceof,
        napi_is_array: napi_is_array,
        napi_is_arraybuffer: napi_is_arraybuffer,
        napi_is_buffer: napi_is_buffer,
        napi_is_dataview: napi_is_dataview,
        napi_is_date: napi_is_date,
        napi_is_detached_arraybuffer: napi_is_detached_arraybuffer,
        napi_is_error: napi_is_error,
        napi_is_typedarray: napi_is_typedarray,
        napi_strict_equals: napi_strict_equals,
        napi_typeof: napi_typeof,
        node_api_is_sharedarraybuffer: node_api_is_sharedarraybuffer
    });

    //#region src/version.ts
    /** @__sig ipp */
    function napi_get_version(env, result) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        const envObject = emnapiEnv;
        if (!result)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        const NODE_API_SUPPORTED_VERSION_MAX = 10 /* Version.NODE_API_SUPPORTED_VERSION_MAX */;
        var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
        GET_HEAP_DATA_VIEW().setUint32(result, NODE_API_SUPPORTED_VERSION_MAX, true);
        return envObject.clearLastError();
    }

    //#endregion src/version.ts

    var versionMod = /*#__PURE__*/Object.freeze({
        __proto__: null,
        napi_get_version: napi_get_version
    });

    //#region src/core/index.ts
    emnapiExternalMemory.init();
    emnapiExternalSAB.init();
    emnapiString.init();
    // emnapiTSFN.init()
    PThread.init();
    napiModule.emnapi.syncMemory = $emnapiSyncMemory;
    napiModule.emnapi.getMemoryAddress = $emnapiGetMemoryAddress;
    napiModule.emnapi.acquireExternalSharedArrayBuffer = $emnapiAcquireExternalSharedArrayBuffer;
    function addImports(mod) {
        const keys = Object.keys(mod);
        for (let i = 0; i < keys.length; ++i) {
            const k = keys[i];
            if (k.indexOf('$') === 0)
                continue;
            if (k.indexOf('emnapi_') === 0) {
                napiModule.imports.emnapi[k] = mod[k];
            }
            else if (k.indexOf('_emnapi_') === 0 || k.indexOf('_v8_') === 0 || k === 'napi_set_last_error' || k === 'napi_clear_last_error') {
                napiModule.imports.env[k] = mod[k];
            }
            else {
                napiModule.imports.napi[k] = mod[k];
            }
        }
    }
    addImports(asyncMod);
    addImports(memoryMod);
    addImports(utilMod);
    addImports(convert2cMod);
    addImports(convert2napiMod);
    addImports(createMod);
    addImports(globalMod);
    addImports(wrapMod);
    addImports(envMod);
    addImports(emnapiMod);
    addImports(errorMod);
    addImports(functionMod);
    addImports(lifeMod);
    addImports(miscellaneousMod);
    addImports(nodeMod);
    addImports(promiseMod);
    addImports(propertyMod);
    addImports(scriptMod);
    addImports(valueOperationMod);
    addImports(versionMod);
    // napiModule.imports.napi.napi_create_threadsafe_function = napi_create_threadsafe_function
    // napiModule.imports.napi.napi_get_threadsafe_function_context = napi_get_threadsafe_function_context
    // napiModule.imports.napi.napi_call_threadsafe_function = napi_call_threadsafe_function
    // napiModule.imports.napi.napi_acquire_threadsafe_function = napi_acquire_threadsafe_function
    // napiModule.imports.napi.napi_release_threadsafe_function = napi_release_threadsafe_function
    // napiModule.imports.napi.napi_unref_threadsafe_function = napi_unref_threadsafe_function
    // napiModule.imports.napi.napi_ref_threadsafe_function = napi_ref_threadsafe_function
    const pluginCtx = {
        emnapiString
    };
    Object.keys(initMod).forEach(k => {
        Object.defineProperty(pluginCtx, k, {
            get: () => initMod[k],
            enumerable: true,
            configurable: true
        });
    });
    Object.keys(nodeMod).forEach(k => {
        Object.defineProperty(pluginCtx, k, {
            get: () => nodeMod[k],
            enumerable: true,
            configurable: true
        });
    });
    Object.keys(utilMod).forEach(k => {
        Object.defineProperty(pluginCtx, k, {
            get: () => utilMod[k],
            enumerable: true,
            configurable: true
        });
    });
    napiModule.plugins = (options.plugins ?? []).map((plugin) => {
        if (typeof plugin === 'function') {
            return plugin(pluginCtx);
        }
        if (typeof plugin === 'object' && plugin !== null) {
            return plugin;
        }
        throw new TypeError('Invalid plugin');
    });
    napiModule.plugins.forEach((plugin) => {
        if (typeof plugin.importObject === 'function') {
            const importObject = plugin.importObject(napiModule.imports);
            if (importObject) {
                napiModule.imports = importObject;
            }
        }
    });
    var index = napiModule;

    //#endregion src/core/index.ts

    return index;

})();
  return napiModule;
}

//#endregion src/emnapi/index.js

//#region src/load.ts
function loadNapiModuleImpl(loadFn, userNapiModule, wasmInput, options) {
    options = options ?? {};
    const getMemory = options.getMemory;
    const getTable = options.getTable;
    const beforeInit = options.beforeInit;
    if (getMemory != null && typeof getMemory !== 'function') {
        throw new TypeError('options.getMemory is not a function');
    }
    if (getTable != null && typeof getTable !== 'function') {
        throw new TypeError('options.getTable is not a function');
    }
    if (beforeInit != null && typeof beforeInit !== 'function') {
        throw new TypeError('options.beforeInit is not a function');
    }
    let napiModule;
    const isLoad = typeof userNapiModule === 'object' && userNapiModule !== null;
    if (isLoad) {
        if (userNapiModule.loaded) {
            throw new Error('napiModule has already loaded');
        }
        napiModule = userNapiModule;
    }
    else {
        napiModule = createNapiModule(options);
    }
    const wasi = options.wasi;
    let wasiThreads;
    let importObject = {
        env: napiModule.imports.env,
        napi: napiModule.imports.napi,
        emnapi: napiModule.imports.emnapi
    };
    if (wasi) {
        wasiThreads = new WASIThreads(napiModule.childThread
            ? {
                wasi,
                childThread: true,
                postMessage: napiModule.postMessage
            }
            : {
                wasi,
                threadManager: napiModule.PThread,
                waitThreadStart: napiModule.waitThreadStart
            });
        Object.assign(importObject, typeof wasi.getImportObject === 'function'
            ? wasi.getImportObject()
            : { wasi_snapshot_preview1: wasi.wasiImport });
        Object.assign(importObject, wasiThreads.getImportObject());
    }
    const overwriteImports = options.overwriteImports;
    if (typeof overwriteImports === 'function') {
        const newImportObject = overwriteImports(importObject);
        if (typeof newImportObject === 'object' && newImportObject !== null) {
            importObject = newImportObject;
        }
    }
    return loadFn(wasmInput, importObject, (err, source) => {
        if (err) {
            throw err;
        }
        const originalInstance = source.instance;
        let instance = originalInstance;
        const originalExports = originalInstance.exports;
        const exportMemory = 'memory' in originalExports;
        const importMemory = 'memory' in importObject.env;
        const memory = getMemory
            ? getMemory(originalExports)
            : exportMemory
                ? originalExports.memory
                : importMemory
                    ? importObject.env.memory
                    : undefined;
        if (!memory) {
            throw new Error('memory is neither exported nor imported');
        }
        const table = getTable ? getTable(originalExports) : originalExports.__indirect_function_table;
        if (wasi && !exportMemory) {
            const exports = Object.create(null);
            Object.assign(exports, originalExports, { memory });
            instance = { exports };
        }
        const module = source.module;
        if (wasi) {
            instance = wasiThreads.initialize(instance, module, memory);
        }
        else {
            napiModule.PThread.setup(module, memory);
        }
        const emnapiInit = () => {
            if (beforeInit) {
                beforeInit({
                    instance: originalInstance,
                    module
                });
            }
            napiModule.init({
                instance,
                module,
                memory,
                table
            });
            const ret = {
                instance: originalInstance,
                module,
                usedInstance: instance
            };
            if (!isLoad) {
                ret.napiModule = napiModule;
            }
            return ret;
        };
        if (napiModule.PThread.shouldPreloadWorkers()) {
            const poolReady = napiModule.PThread.loadWasmModuleToAllWorkers();
            if (loadFn === loadCallback) {
                return poolReady.then(emnapiInit);
            }
            else {
                throw new Error('Synchronous loading is not supported with worker pool (reuseWorker.size > 0)');
            }
        }
        return emnapiInit();
    });
}
function loadCallback(wasmInput, importObject, callback) {
    return load(wasmInput, importObject).then((source) => {
        return callback(null, source);
    }, err => {
        return callback(err);
    });
}
function loadSyncCallback(wasmInput, importObject, callback) {
    let source;
    try {
        source = loadSync(wasmInput, importObject);
    }
    catch (err) {
        return callback(err);
    }
    return callback(null, source);
}
function loadNapiModule(napiModule, wasmInput, options) {
    if (typeof napiModule !== 'object' || napiModule === null) {
        throw new TypeError('Invalid napiModule');
    }
    return loadNapiModuleImpl(loadCallback, napiModule, wasmInput, options);
}
function loadNapiModuleSync(napiModule, wasmInput, options) {
    if (typeof napiModule !== 'object' || napiModule === null) {
        throw new TypeError('Invalid napiModule');
    }
    return loadNapiModuleImpl(loadSyncCallback, napiModule, wasmInput, options);
}
function instantiateNapiModule(wasmInput, options) {
    return loadNapiModuleImpl(loadCallback, undefined, wasmInput, options);
}
function instantiateNapiModuleSync(wasmInput, options) {
    return loadNapiModuleImpl(loadSyncCallback, undefined, wasmInput, options);
}

//#endregion src/load.ts

//#region src/worker.ts
class MessageHandler extends ThreadMessageHandler {
    constructor(options) {
        if (typeof options.onLoad !== 'function') {
            throw new TypeError('options.onLoad is not a function');
        }
        const userOnError = options.onError;
        super({
            ...options,
            onError: (err, type) => {
                const emnapi_thread_crashed = this.instance?.exports.emnapi_thread_crashed;
                if (typeof emnapi_thread_crashed === 'function') {
                    emnapi_thread_crashed();
                }
                if (typeof userOnError === 'function') {
                    userOnError(err, type);
                }
                else {
                    throw err;
                }
            }
        });
        this.napiModule = undefined;
    }
    instantiate(data) {
        const source = this.onLoad(data);
        const then = source.then;
        if (typeof then === 'function') {
            return source.then((result) => {
                this.napiModule = result.napiModule;
                return result;
            });
        }
        this.napiModule = source.napiModule;
        return source;
    }
    handle(e) {
        super.handle(e);
        if (e?.data?.__emnapi__) {
            const type = e.data.__emnapi__.type;
            const payload = e.data.__emnapi__.payload;
            try {
                if (type === 'async-worker-init') {
                    this.handleAfterLoad(e, () => {
                        this.napiModule.initWorker(payload.arg, payload.func);
                    });
                }
            }
            catch (err) {
                this.onError(err, type);
            }
        }
    }
}

//#endregion src/worker.ts

//#region src/index.ts
const version = "2.0.0-alpha.3";

//#endregion src/index.ts

export { MessageHandler, ThreadManager, ThreadMessageHandler, WASIThreads, createInstanceProxy, createNapiModule, instantiateNapiModule, instantiateNapiModuleSync, isSharedArrayBuffer, isTrapError, loadNapiModule, loadNapiModuleSync, version };

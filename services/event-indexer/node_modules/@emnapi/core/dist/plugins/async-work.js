//#region src/emnapi/async-work.js
function asyncWork (emnapiPluginCtx) {
  const { emnapiCtx, emnapiNodeBinding, emnapiAsyncWorkPoolSize } = emnapiPluginCtx;
  var mod = (function (exports, emnapi_shared, emscripten_runtime) {

    //#region src/async-work.ts
    /**
     * @__deps $emnapiCtx
     * @__deps $emnapiEnv
     * @__deps $emnapiNodeBinding
     * @__deps $emnapiAsyncWorkPoolSize
     * @__postset
     * ```
     * emnapiAWST.init();
     * ```
     */
    var emnapiAWST = {
        idGen: {},
        values: [undefined],
        queued: new Set(),
        pending: [],
        init: function () {
            const idGen = {
                nextId: 1,
                list: [],
                generate: function () {
                    let id;
                    if (idGen.list.length) {
                        id = idGen.list.shift();
                    }
                    else {
                        id = idGen.nextId;
                        idGen.nextId++;
                    }
                    return id;
                },
                reuse: function (id) {
                    idGen.list.push(id);
                }
            };
            emnapiAWST.idGen = idGen;
            emnapiAWST.values = [undefined];
            emnapiAWST.queued = new Set();
            emnapiAWST.pending = [];
        },
        create: function (env, resource, resourceName, execute, complete, data) {
            let asyncId = 0;
            let triggerAsyncId = 0;
            if (emnapiNodeBinding) {
                const asyncContext = emnapiNodeBinding.node.emitAsyncInit(resource, resourceName, -1);
                asyncId = asyncContext.asyncId;
                triggerAsyncId = asyncContext.triggerAsyncId;
            }
            const id = emnapiAWST.idGen.generate();
            emnapiAWST.values[id] = {
                env,
                id,
                resource,
                asyncId,
                triggerAsyncId,
                status: 0,
                execute,
                complete,
                data
            };
            return id;
        },
        callComplete: function (work, status) {
            const complete = work.complete;
            const env = work.env;
            const data = work.data;
            const callback = () => {
                if (!complete)
                    return;
                const envObject = emnapi_shared.emnapiEnv;
                const scope = emnapiCtx.openScope(envObject);
                try {
                    envObject.callbackIntoModule(true, () => {
                        (emnapiPluginCtx.wasmTable.get(complete))(env, status, data);
                    });
                }
                finally {
                    emnapiCtx.closeScope(envObject, scope);
                }
            };
            if (emnapiNodeBinding) {
                emnapiNodeBinding.node.makeCallback(work.resource, callback, [], {
                    asyncId: work.asyncId,
                    triggerAsyncId: work.triggerAsyncId
                });
            }
            else {
                callback();
            }
        },
        queue: function (id) {
            const work = emnapiAWST.values[id];
            if (!work)
                return;
            if (work.status === 0) {
                work.status = 1;
                if (emnapiAWST.queued.size >= (Math.abs(emnapiAsyncWorkPoolSize) || 4)) {
                    emnapiAWST.pending.push(id);
                    return;
                }
                emnapiAWST.queued.add(id);
                const env = work.env;
                const data = work.data;
                const execute = work.execute;
                work.status = 2;
                emnapiCtx.features.setImmediate(() => {
                    (emnapiPluginCtx.wasmTable.get(execute))(env, data);
                    emnapiAWST.queued.delete(id);
                    work.status = 3;
                    emnapiCtx.features.setImmediate(() => {
                        emnapiAWST.callComplete(work, 0 /* napi_status.napi_ok */);
                    });
                    if (emnapiAWST.pending.length > 0) {
                        const nextWorkId = emnapiAWST.pending.shift();
                        emnapiAWST.values[nextWorkId].status = 0;
                        emnapiAWST.queue(nextWorkId);
                    }
                });
            }
        },
        cancel: function (id) {
            const index = emnapiAWST.pending.indexOf(id);
            if (index !== -1) {
                const work = emnapiAWST.values[id];
                if (work && (work.status === 1)) {
                    work.status = 4;
                    emnapiAWST.pending.splice(index, 1);
                    emnapiCtx.features.setImmediate(() => {
                        emnapiAWST.callComplete(work, 11 /* napi_status.napi_cancelled */);
                    });
                    return 0 /* napi_status.napi_ok */;
                }
                else {
                    return 9 /* napi_status.napi_generic_failure */;
                }
            }
            return 9 /* napi_status.napi_generic_failure */;
        },
        remove: function (id) {
            const work = emnapiAWST.values[id];
            if (!work)
                return;
            if (emnapiNodeBinding) {
                emnapiNodeBinding.node.emitAsyncDestroy({
                    asyncId: work.asyncId,
                    triggerAsyncId: work.triggerAsyncId
                });
            }
            emnapiAWST.values[id] = undefined;
            emnapiAWST.idGen.reuse(id);
        }
    };

    //#endregion src/async-work.ts

    //#region src/macro.ts

    //#endregion src/macro.ts

    //#region src/core/async-work.ts
    const { 
    // onCreateWorker, napiModule, singleThreadAsyncWork, _emnapi_async_work_pool_size,
    // PThread, ENVIRONMENT_IS_NODE, ENVIRONMENT_IS_PTHREAD, wasmInstance, _free, wasmMemory, _malloc,
    _emnapi_node_emit_async_init, _emnapi_node_emit_async_destroy, _emnapi_runtime_keepalive_pop, _emnapi_runtime_keepalive_push } = emnapiPluginCtx;
    var emnapiAWMT = {
        pool: [],
        workerReady: null,
        globalAddress: 0,
        globalOffset: {
            idle_threads: 0,
            q: 1 * 4,
            next: 1 * 4,
            prev: 2 * 4,
            mutex: 3 * 4,
            cond: 4 * 4,
            exit_message: 5 * 4,
            end: 7 * 4
        },
        offset: {
            /* napi_ref */ resource: 0,
            /* double */ async_id: 8,
            /* double */ trigger_async_id: 16,
            /* napi_env */ env: 24,
            /* int32_t */ status: 1 * 4 + 24, // 0 for pending, 1 for cancelled, 2 for completed
            queue: 2 * 4 + 24,
            queue_next: 2 * 4 + 24,
            queue_prev: 3 * 4 + 24,
            /* void* */ data: 4 * 4 + 24,
            /* napi_async_execute_callback */ execute: 5 * 4 + 24,
            /* napi_async_complete_callback */ complete: 6 * 4 + 24,
            end: 7 * 4 + 24
        },
        /**
         * When another thread grows the shared WebAssembly.Memory, this agent's
         * cached `wasmMemory.buffer` may still have the old shorter length
         * (V8 refreshes it lazily). If a pointer derived from shared memory lies
         * beyond the cached length, `wasmMemory.grow(0)` forces the agent to
         * observe the current memory size and refreshes the buffer.
         */
        ensureBufferFor(end) {
            let buffer = emscripten_runtime.wasmMemory.buffer;
            if (end > buffer.byteLength) {
                emscripten_runtime.wasmMemory.grow(0);
                buffer = emscripten_runtime.wasmMemory.buffer;
            }
            return buffer;
        },
        init() {
            emnapiAWMT.pool = [];
            emnapiAWMT.workerReady = null;
            if (typeof emscripten_runtime.PThread !== 'undefined') {
                emscripten_runtime.PThread.unusedWorkers.forEach(emnapiAWMT.addListener);
                Object.values(emscripten_runtime.PThread.pthreads).forEach(emnapiAWMT.addListener);
                const __original_getNewWorker = emscripten_runtime.PThread.getNewWorker;
                emscripten_runtime.PThread.getNewWorker = function () {
                    const r = __original_getNewWorker.apply(this, arguments);
                    emnapiAWMT.addListener(r);
                    return r;
                };
            }
        },
        addListener(worker) {
            if (!worker)
                return false;
            if (worker._emnapiAWMTListener)
                return true;
            const handler = function (e) {
                const data = emscripten_runtime.ENVIRONMENT_IS_NODE ? e : e.data;
                const __emnapi__ = data.__emnapi__;
                if (__emnapi__) {
                    const type = __emnapi__.type;
                    const payload = __emnapi__.payload;
                    if (type === 'async-work-complete') {
                        emnapiAWMT.callComplete(payload.work, 0 /* napi_status.napi_ok */);
                    }
                }
            };
            const dispose = function () {
                if (emscripten_runtime.ENVIRONMENT_IS_NODE) {
                    worker.off('message', handler);
                }
                else {
                    worker.removeEventListener('message', handler, false);
                }
                delete worker._emnapiAWMTListener;
            };
            worker._emnapiAWMTListener = { handler, dispose };
            if (emscripten_runtime.ENVIRONMENT_IS_NODE) {
                worker.on('message', handler);
            }
            else {
                worker.addEventListener('message', handler, false);
            }
            return true;
        },
        initGlobal() {
            if (!emnapiAWMT.globalAddress) {
                emnapiAWMT.globalAddress = emscripten_runtime._malloc(emnapiAWMT.globalOffset.end);
                emnapiAWMT.globalAddress >>>= 0;
                const size = emnapiAWMT.globalOffset.end;
                const addr = emnapiAWMT.globalAddress;
                new Uint8Array(emnapiAWMT.ensureBufferFor(addr + size), addr, size).fill(0);
                emnapiAWMT.queueInit(emnapiAWMT.globalAddress + emnapiAWMT.globalOffset.q);
                emnapiAWMT.queueInit(emnapiAWMT.globalAddress + emnapiAWMT.globalOffset.exit_message);
            }
        },
        terminateWorkers() {
            emnapiAWMT.pool.forEach(w => {
                w._emnapiAWMTListener?.dispose();
                w._emnapiTSFNListener?.dispose();
                w.terminate();
            });
            emnapiAWMT.pool.length = 0;
        },
        initWorkers(n) {
            if (emscripten_runtime.ENVIRONMENT_IS_PTHREAD) {
                return emnapiAWMT.workerReady || (emnapiAWMT.workerReady = Promise.resolve());
            }
            if (emnapiAWMT.workerReady)
                return emnapiAWMT.workerReady;
            if (!('emnapi_async_worker_create' in emscripten_runtime.wasmInstance.exports)) {
                throw new TypeError('`emnapi_async_worker_create` is not exported, please try to add `--export=emnapi_async_worker_create` to linker flags');
            }
            const emnapi_async_worker_create = emscripten_runtime.wasmInstance.exports.emnapi_async_worker_create;
            const args = [];
            emnapiAWMT.initGlobal();
            for (let i = 0; i < n; ++i) {
                args.push(emnapi_async_worker_create(1, emnapiAWMT.globalAddress));
            }
            const promises = args.map(index => {
                if (index === 0) {
                    return Promise.reject(new Error('Failed to create async worker'));
                }
                let worker;
                if (index < 0) {
                    worker = emnapiAWMT.pool[-index - 1];
                    if (worker)
                        return worker.whenLoaded;
                }
                index >>>= 0;
                const tidOffset = 20;
                const view = new DataView(emnapiAWMT.ensureBufferFor(index + tidOffset + 4));
                const tid = view.getInt32(index + tidOffset, true);
                worker = emscripten_runtime.PThread.pthreads[tid];
                return worker.whenLoaded;
            });
            emnapiAWMT.workerReady = Promise.all(promises);
            return emnapiAWMT.workerReady;
        },
        getResource(work) {
            emnapiAWMT.ensureBufferFor(work + emnapiAWMT.offset.resource + 4);
            var HEAP_DATA_VIEW = new DataView(emnapiPluginCtx.wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === emnapiPluginCtx.wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(emnapiPluginCtx.wasmMemory.buffer));
            return GET_HEAP_DATA_VIEW().getUint32(work + emnapiAWMT.offset.resource, true);
        },
        getExecute(work) {
            emnapiAWMT.ensureBufferFor(work + emnapiAWMT.offset.execute + 4);
            var HEAP_DATA_VIEW = new DataView(emnapiPluginCtx.wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === emnapiPluginCtx.wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(emnapiPluginCtx.wasmMemory.buffer));
            return GET_HEAP_DATA_VIEW().getUint32(work + emnapiAWMT.offset.execute, true);
        },
        getComplete(work) {
            emnapiAWMT.ensureBufferFor(work + emnapiAWMT.offset.complete + 4);
            var HEAP_DATA_VIEW = new DataView(emnapiPluginCtx.wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === emnapiPluginCtx.wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(emnapiPluginCtx.wasmMemory.buffer));
            return GET_HEAP_DATA_VIEW().getUint32(work + emnapiAWMT.offset.complete, true);
        },
        getEnv(work) {
            emnapiAWMT.ensureBufferFor(work + emnapiAWMT.offset.env + 4);
            var HEAP_DATA_VIEW = new DataView(emnapiPluginCtx.wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === emnapiPluginCtx.wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(emnapiPluginCtx.wasmMemory.buffer));
            return GET_HEAP_DATA_VIEW().getUint32(work + emnapiAWMT.offset.env, true);
        },
        getData(work) {
            emnapiAWMT.ensureBufferFor(work + emnapiAWMT.offset.data + 4);
            var HEAP_DATA_VIEW = new DataView(emnapiPluginCtx.wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === emnapiPluginCtx.wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(emnapiPluginCtx.wasmMemory.buffer));
            return GET_HEAP_DATA_VIEW().getUint32(work + emnapiAWMT.offset.data, true);
        },
        getMutex() {
            const index = emnapiAWMT.globalAddress + emnapiAWMT.globalOffset.mutex;
            const mutex = {
                lock() {
                    const isBrowserMain = typeof window !== 'undefined' && typeof document !== 'undefined' && !emscripten_runtime.ENVIRONMENT_IS_NODE;
                    const i32a = new Int32Array(emnapiAWMT.ensureBufferFor(index + 4), index, 1);
                    if (isBrowserMain) {
                        while (true) {
                            const oldValue = Atomics.compareExchange(i32a, 0, 0, 10);
                            if (oldValue === 0) {
                                return;
                            }
                        }
                    }
                    else {
                        while (true) {
                            const oldValue = Atomics.compareExchange(i32a, 0, 0, 10);
                            if (oldValue === 0) {
                                return;
                            }
                            Atomics.wait(i32a, 0, 10);
                        }
                    }
                },
                unlock() {
                    const i32a = new Int32Array(emnapiAWMT.ensureBufferFor(index + 4), index, 1);
                    const oldValue = Atomics.compareExchange(i32a, 0, 10, 0);
                    if (oldValue !== 10) {
                        throw new Error('Tried to unlock while not holding the mutex');
                    }
                    Atomics.notify(i32a, 0, 1);
                },
                execute(fn) {
                    mutex.lock();
                    try {
                        return fn();
                    }
                    finally {
                        mutex.unlock();
                    }
                }
            };
            return mutex;
        },
        getCond() {
            const index = emnapiAWMT.globalAddress + emnapiAWMT.globalOffset.cond;
            const mutex = emnapiAWMT.getMutex();
            const cond = {
                wait() {
                    const i32a = new Int32Array(emnapiAWMT.ensureBufferFor(index + 4), index, 1);
                    const value = Atomics.load(i32a, 0);
                    mutex.unlock();
                    Atomics.wait(i32a, 0, value);
                    mutex.lock();
                },
                signal() {
                    const i32a = new Int32Array(emnapiAWMT.ensureBufferFor(index + 4), index, 1);
                    Atomics.add(i32a, 0, 1);
                    Atomics.notify(i32a, 0, 1);
                }
            };
            return cond;
        },
        queueInit(q) {
            emnapiAWMT.ensureBufferFor(q + 4 + 4);
            var HEAP_DATA_VIEW = new DataView(emnapiPluginCtx.wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === emnapiPluginCtx.wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(emnapiPluginCtx.wasmMemory.buffer));
            GET_HEAP_DATA_VIEW().setUint32(q, q, true);
            GET_HEAP_DATA_VIEW().setUint32(q + 4, q, true);
        },
        queueInsertTail(h, q) {
            emnapiAWMT.ensureBufferFor(h + 4 + 4);
            emnapiAWMT.ensureBufferFor(q + 4 + 4);
            var HEAP_DATA_VIEW = new DataView(emnapiPluginCtx.wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === emnapiPluginCtx.wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(emnapiPluginCtx.wasmMemory.buffer));
            GET_HEAP_DATA_VIEW().setUint32(q, h, true);
            const tempValue = GET_HEAP_DATA_VIEW().getUint32(h + 4, true);
            GET_HEAP_DATA_VIEW().setUint32(q + 4, tempValue, true);
            const qprev = GET_HEAP_DATA_VIEW().getUint32(q + 4, true);
            GET_HEAP_DATA_VIEW().setUint32(qprev, q, true);
            GET_HEAP_DATA_VIEW().setUint32(h + 4, q, true);
        },
        queueRemove(q) {
            emnapiAWMT.ensureBufferFor(q + 4 + 4);
            var HEAP_DATA_VIEW = new DataView(emnapiPluginCtx.wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === emnapiPluginCtx.wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(emnapiPluginCtx.wasmMemory.buffer));
            const qprev = GET_HEAP_DATA_VIEW().getUint32(q + 4, true);
            const qnext = GET_HEAP_DATA_VIEW().getUint32(q, true);
            GET_HEAP_DATA_VIEW().setUint32(qprev, qnext, true);
            GET_HEAP_DATA_VIEW().setUint32(qnext + 4, qprev, true);
        },
        queueEmpty(q) {
            emnapiAWMT.ensureBufferFor(q + 4);
            var HEAP_DATA_VIEW = new DataView(emnapiPluginCtx.wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === emnapiPluginCtx.wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(emnapiPluginCtx.wasmMemory.buffer));
            // eslint-disable-next-line eqeqeq
            return q == GET_HEAP_DATA_VIEW().getUint32(q, true);
        },
        scheduleWork: function (work) {
            if (!emnapiAWMT.workerReady?.ready) {
                emnapiAWMT.initWorkers(emnapi_shared._emnapi_async_work_pool_size()).then(() => {
                    emnapiAWMT.workerReady.ready = true;
                }).catch((err) => {
                    emnapiAWMT.workerReady = null;
                    throw err;
                });
            }
            _emnapi_runtime_keepalive_push();
            emnapiCtx.increaseWaitingRequestCounter();
            const statusBuffer = new Int32Array(emnapiAWMT.ensureBufferFor(work + emnapiAWMT.offset.status + 4), work + emnapiAWMT.offset.status, 1);
            Atomics.store(statusBuffer, 0, 0 /* AsyncWorkStatus.Pending */);
            const mutex = emnapiAWMT.getMutex();
            const cond = emnapiAWMT.getCond();
            mutex.lock();
            try {
                emnapiAWMT.queueInsertTail(emnapiAWMT.globalAddress + emnapiAWMT.globalOffset.q, work + emnapiAWMT.offset.queue);
            }
            catch (err) {
                _emnapi_runtime_keepalive_pop();
                emnapiCtx.decreaseWaitingRequestCounter();
                mutex.unlock();
                throw err;
            }
            emnapiAWMT.ensureBufferFor(emnapiAWMT.globalAddress + emnapiAWMT.globalOffset.idle_threads + 4);
            var HEAP_DATA_VIEW = new DataView(emnapiPluginCtx.wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === emnapiPluginCtx.wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(emnapiPluginCtx.wasmMemory.buffer));
            if (GET_HEAP_DATA_VIEW().getUint32(emnapiAWMT.globalAddress + emnapiAWMT.globalOffset.idle_threads, true) > 0) {
                cond.signal();
            }
            mutex.unlock();
        },
        cancelWork(work) {
            let cancelled = false;
            emnapiAWMT.getMutex().execute(() => {
                emnapiAWMT.ensureBufferFor(work + emnapiAWMT.offset.status + 4);
                var HEAP_DATA_VIEW = new DataView(emnapiPluginCtx.wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === emnapiPluginCtx.wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(emnapiPluginCtx.wasmMemory.buffer));
                cancelled = !emnapiAWMT.queueEmpty(work + emnapiAWMT.offset.queue) && GET_HEAP_DATA_VIEW().getInt32(work + emnapiAWMT.offset.status, true) !== 2 /* AsyncWorkStatus.Completed */;
                if (cancelled) {
                    emnapiAWMT.queueRemove(work + emnapiAWMT.offset.queue);
                }
            });
            if (!cancelled) {
                return 9 /* napi_status.napi_generic_failure */;
            }
            if (Atomics.compareExchange(new Int32Array(emnapiAWMT.ensureBufferFor(work + emnapiAWMT.offset.status + 4), work + emnapiAWMT.offset.status, 1), 0, 0 /* AsyncWorkStatus.Pending */, 1 /* AsyncWorkStatus.Cancelled */) !== 0 /* AsyncWorkStatus.Pending */) {
                return 9 /* napi_status.napi_generic_failure */;
            }
            emnapiCtx.features.setImmediate(() => {
                emnapiAWMT.callComplete(work, 11 /* napi_status.napi_cancelled */);
            });
            return 0 /* napi_status.napi_ok */;
        },
        callComplete: function (work, status) {
            _emnapi_runtime_keepalive_pop();
            emnapiCtx.decreaseWaitingRequestCounter();
            const complete = emnapiAWMT.getComplete(work);
            const env = emnapiAWMT.getEnv(work);
            const data = emnapiAWMT.getData(work);
            const envObject = emnapi_shared.emnapiEnv;
            const scope = emnapiCtx.openScope(envObject);
            const callback = () => {
                if (!complete)
                    return;
                envObject.callbackIntoModule(true, () => {
                    (emnapiPluginCtx.wasmTable.get(complete))(env, status, data);
                });
            };
            try {
                if (emnapiNodeBinding) {
                    const resource = emnapiAWMT.getResource(work);
                    const resource_value = emnapiCtx.getRef(resource).get();
                    const resourceObject = emnapiCtx.jsValueFromNapiValue(resource_value);
                    const view = new DataView(emnapiAWMT.ensureBufferFor(work + emnapiAWMT.offset.trigger_async_id + 8));
                    const asyncId = view.getFloat64(work + emnapiAWMT.offset.async_id, true);
                    const triggerAsyncId = view.getFloat64(work + emnapiAWMT.offset.trigger_async_id, true);
                    emnapiNodeBinding.node.makeCallback(resourceObject, callback, [], {
                        asyncId,
                        triggerAsyncId
                    });
                }
                else {
                    callback();
                }
            }
            finally {
                emnapiCtx.closeScope(envObject, scope);
            }
        }
    };
    emnapiAWST.init();
    emnapiAWMT.init();
    /** @__sig ippppppp */
    var napi_create_async_work = emnapi_shared.singleThreadAsyncWork
        ? function (env, resource, resource_name, execute, complete, data, result) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            const envObject = emnapi_shared.emnapiEnv;
            envObject.checkGCAccess();
            if (!execute)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            if (!result)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            let resourceObject;
            if (resource) {
                resourceObject = Object(emnapiCtx.jsValueFromNapiValue(resource));
            }
            else {
                resourceObject = {};
            }
            if (!resource_name)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            const resourceName = String(emnapiCtx.jsValueFromNapiValue(resource_name));
            const id = emnapiAWST.create(env, resourceObject, resourceName, execute, complete, data);
            result >>>= 0;
            var HEAP_DATA_VIEW = new DataView(emnapiPluginCtx.wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === emnapiPluginCtx.wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(emnapiPluginCtx.wasmMemory.buffer));
            GET_HEAP_DATA_VIEW().setUint32(result, id, true);
            return envObject.clearLastError();
        }
        : function (env, resource, resource_name, execute, complete, data, result) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            const envObject = emnapi_shared.emnapiEnv;
            envObject.checkGCAccess();
            if (!execute)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            if (!result)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            let resourceObject;
            if (resource) {
                resourceObject = Object(emnapiCtx.jsValueFromNapiValue(resource));
            }
            else {
                resourceObject = {};
            }
            if (!resource_name)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            const sizeofAW = emnapiAWMT.offset.end;
            let aw = emscripten_runtime._malloc(sizeofAW);
            if (!aw)
                return envObject.setLastError(9 /* napi_status.napi_generic_failure */);
            aw >>>= 0;
            new Uint8Array(emnapiAWMT.ensureBufferFor(aw + sizeofAW)).subarray(aw, aw + sizeofAW).fill(0);
            const s = emnapiCtx.napiValueFromJsValue(resourceObject);
            const resourceRef = emnapiCtx.createReference(envObject, s, 1, 1 /* ReferenceOwnership.kUserland */);
            const resource_ = resourceRef.id;
            var HEAP_DATA_VIEW = new DataView(emnapiPluginCtx.wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === emnapiPluginCtx.wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(emnapiPluginCtx.wasmMemory.buffer));
            GET_HEAP_DATA_VIEW().setUint32(aw, resource_, true);
            _emnapi_node_emit_async_init(s, resource_name, -1, aw + emnapiAWMT.offset.async_id);
            GET_HEAP_DATA_VIEW().setUint32(aw + emnapiAWMT.offset.env, env, true);
            GET_HEAP_DATA_VIEW().setUint32(aw + emnapiAWMT.offset.execute, execute, true);
            GET_HEAP_DATA_VIEW().setUint32(aw + emnapiAWMT.offset.complete, complete, true);
            GET_HEAP_DATA_VIEW().setUint32(aw + emnapiAWMT.offset.data, data, true);
            emnapiAWMT.queueInit(aw + emnapiAWMT.offset.queue);
            result >>>= 0;
            GET_HEAP_DATA_VIEW().setUint32(result, aw, true);
            return envObject.clearLastError();
        };
    /** @__sig ipp */
    var napi_delete_async_work = emnapi_shared.singleThreadAsyncWork
        ? function (env, work) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            const envObject = emnapi_shared.emnapiEnv;
            envObject.checkGCAccess();
            if (!work)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            work >>>= 0;
            emnapiAWST.remove(work);
            return envObject.clearLastError();
        }
        : function (env, work) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            // @ts-expect-error
            const envObject = emnapi_shared.emnapiEnv;
            envObject.checkGCAccess();
            if (!work)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            work >>>= 0;
            const resource = emnapiAWMT.getResource(work);
            emnapiCtx.getRef(resource).dispose();
            if (emnapiNodeBinding) {
                const view = new DataView(emnapiAWMT.ensureBufferFor(work + emnapiAWMT.offset.trigger_async_id + 8));
                const asyncId = view.getFloat64(work + emnapiAWMT.offset.async_id, true);
                const triggerAsyncId = view.getFloat64(work + emnapiAWMT.offset.trigger_async_id, true);
                _emnapi_node_emit_async_destroy(asyncId, triggerAsyncId);
            }
            emscripten_runtime._free(work);
            return envObject.clearLastError();
        };
    /** @__sig ipp */
    var napi_queue_async_work = emnapi_shared.singleThreadAsyncWork
        ? function (env, work) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            const envObject = emnapi_shared.emnapiEnv;
            if (!work)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            work >>>= 0;
            emnapiAWST.queue(work);
            return envObject.clearLastError();
        }
        : function (env, work) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            const envObject = emnapi_shared.emnapiEnv;
            if (!work)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            work >>>= 0;
            emnapiAWMT.scheduleWork(work);
            return envObject.clearLastError();
        };
    /** @__sig ipp */
    var napi_cancel_async_work = emnapi_shared.singleThreadAsyncWork
        ? function (env, work) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            const envObject = emnapi_shared.emnapiEnv;
            if (!work)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            work >>>= 0;
            const status = emnapiAWST.cancel(work);
            if (status === 0 /* napi_status.napi_ok */)
                return envObject.clearLastError();
            return envObject.setLastError(status);
        }
        : function (env, work) {
            if (!env)
                return 1 /* napi_status.napi_invalid_arg */;
            const envObject = emnapi_shared.emnapiEnv;
            if (!work)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            work >>>= 0;
            const status = emnapiAWMT.cancelWork(work);
            if (status === 0 /* napi_status.napi_ok */)
                return envObject.clearLastError();
            return envObject.setLastError(status);
        };
    /** @__sig pp */
    function _emnapi_async_worker(globalAddress) {
        globalAddress >>>= 0;
        emnapiAWMT.globalAddress = globalAddress;
        const mutex = emnapiAWMT.getMutex();
        const cond = emnapiAWMT.getCond();
        mutex.lock();
        const exitMessageAddr = globalAddress + emnapiAWMT.globalOffset.exit_message;
        const idleThreadsAddr = globalAddress + emnapiAWMT.globalOffset.idle_threads;
        const workerQueueAddr = globalAddress + emnapiAWMT.globalOffset.q;
        var HEAP_DATA_VIEW = new DataView(emnapiPluginCtx.wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === emnapiPluginCtx.wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(emnapiPluginCtx.wasmMemory.buffer));
        for (;;) {
            emnapiAWMT.ensureBufferFor(workerQueueAddr + 4);
            while (emnapiAWMT.queueEmpty(workerQueueAddr)) {
                Atomics.add(new Int32Array(emnapiAWMT.ensureBufferFor(idleThreadsAddr + 4), idleThreadsAddr, 1), 0, 1);
                cond.wait();
                Atomics.sub(new Int32Array(emnapiAWMT.ensureBufferFor(idleThreadsAddr + 4), idleThreadsAddr, 1), 0, 1);
            }
            const q = GET_HEAP_DATA_VIEW().getUint32(workerQueueAddr, true);
            if (q === exitMessageAddr) {
                cond.signal();
                mutex.unlock();
                break;
            }
            const work = q - emnapiAWMT.offset.queue;
            emnapiAWMT.queueRemove(q);
            emnapiAWMT.queueInit(q);
            mutex.unlock();
            const statusBuffer = new Int32Array(emnapiAWMT.ensureBufferFor(work + emnapiAWMT.offset.status + 4), work + emnapiAWMT.offset.status, 1);
            if (Atomics.load(statusBuffer, 0) === 1 /* AsyncWorkStatus.Cancelled */) {
                emscripten_runtime.abort('unreachable');
            }
            const execute = emnapiAWMT.getExecute(work);
            const env = emnapiAWMT.getEnv(work);
            const data = emnapiAWMT.getData(work);
            (emnapiPluginCtx.wasmTable.get(execute))(env, data);
            Atomics.store(statusBuffer, 0, 2 /* AsyncWorkStatus.Completed */);
            const postMessage = emnapi_shared.napiModule.postMessage;
            postMessage({
                __emnapi__: {
                    type: 'async-work-complete',
                    payload: { work }
                }
            });
            mutex.lock();
        }
        return 0;
    }
    /** @__sig ipp */
    function _emnapi_spawn_worker(f, globalAddress) {
        if (typeof emnapi_shared.onCreateWorker !== 'function') {
            throw new TypeError('`options.onCreateWorker` is not a function');
        }
        const promises = [];
        const args = [];
        if (!('emnapi_async_worker_create' in emscripten_runtime.wasmInstance.exports)) {
            throw new TypeError('`emnapi_async_worker_create` is not exported, please try to add `--export=emnapi_async_worker_create` to linker flags');
        }
        args.push(emscripten_runtime.wasmInstance.exports.emnapi_async_worker_create(0, 0));
        const handleError = (e) => {
            if ('message' in e && (e.message.indexOf('RuntimeError') !== -1 || e.message.indexOf('unreachable') !== -1)) {
                emnapiAWMT.terminateWorkers();
            }
        };
        let ret;
        try {
            const worker = emnapi_shared.onCreateWorker({ type: 'async-work', name: 'emnapi-async-worker' });
            const p = emscripten_runtime.PThread.loadWasmModuleToWorker(worker);
            if (emscripten_runtime.ENVIRONMENT_IS_NODE) {
                worker.on('error', handleError);
            }
            else {
                worker.addEventListener('error', handleError, false);
            }
            emnapiAWMT.addListener(worker);
            if (typeof emnapiPluginCtx.emnapiTSFN !== 'undefined') {
                emnapiPluginCtx.emnapiTSFN.addListener(worker);
            }
            promises.push(p.then(() => {
                if (typeof worker.unref === 'function') {
                    worker.unref();
                }
            }));
            ret = emnapiAWMT.pool.push(worker) - 1;
            const arg = args[0];
            worker.threadBlockBase = arg;
            worker.postMessage({
                __emnapi__: {
                    type: 'async-worker-init',
                    payload: { arg, func: [f, globalAddress] }
                }
            });
        }
        catch (err) {
            const arg = args[0];
            emscripten_runtime._free(arg);
            throw err;
        }
        return ret;
    }
    function initWorker(startArg, func) {
        if (emnapi_shared.napiModule.childThread) {
            if (typeof emscripten_runtime.wasmInstance.exports.emnapi_async_worker_init !== 'function') {
                throw new TypeError('`emnapi_async_worker_init` is not exported, please try to add `--export=emnapi_async_worker_init` to linker flags');
            }
            emscripten_runtime.wasmInstance.exports.emnapi_async_worker_init(startArg);
            (emnapiPluginCtx.wasmTable.get(func[0]))(func[1]);
        }
        else {
            throw new Error('startThread is only available in child threads');
        }
    }
    emnapi_shared.napiModule.initWorker = initWorker;

    //#endregion src/core/async-work.ts

    exports._emnapi_async_worker = _emnapi_async_worker;
    exports._emnapi_spawn_worker = _emnapi_spawn_worker;
    exports.napi_cancel_async_work = napi_cancel_async_work;
    exports.napi_create_async_work = napi_create_async_work;
    exports.napi_delete_async_work = napi_delete_async_work;
    exports.napi_queue_async_work = napi_queue_async_work;

    return exports;

})({}, emnapiPluginCtx, emnapiPluginCtx);
  return {
    importObject: (original) => {

      Object.keys(mod).forEach(key => {
        if (key.startsWith('napi_') || key.startsWith('node_api_')) {
          original.napi[key] = mod[key];
        } else {
          original.env[key] = mod[key];
        }
      });
    }
  };
}

//#endregion src/emnapi/async-work.js

export { asyncWork as default };

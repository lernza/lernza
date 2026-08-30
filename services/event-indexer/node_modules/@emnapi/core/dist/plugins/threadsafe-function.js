//#region src/emnapi/threadsafe-function.js
function threadsafeFunction (emnapiPluginCtx) {
  const { emnapiCtx, emnapiNodeBinding, _emnapi_node_emit_async_destroy: __emnapi_node_emit_async_destroy, _emnapi_node_emit_async_init: __emnapi_node_emit_async_init, _emnapi_runtime_keepalive_pop: __emnapi_runtime_keepalive_pop, _emnapi_runtime_keepalive_push: __emnapi_runtime_keepalive_push } = emnapiPluginCtx;
  var mod = (function (exports, emnapi_shared, emscripten_runtime) {

    //#region src/macro.ts

    //#endregion src/macro.ts

    //#region src/threadsafe-function.ts
    /* eslint-disable @stylistic/indent */
    /**
     * @__deps malloc
     * @__deps free
     * @__deps $emnapiCtx
     * @__deps $emnapiEnv
     * @__deps $emnapiNodeBinding
     * @__deps _emnapi_node_emit_async_destroy
     * @__deps _emnapi_runtime_keepalive_pop
     * @__postset
     * ```
     * emnapiTSFN.init();
     * ```
     */
    const emnapiTSFN = {
        _liveSet: {},
        offset: {
            __size__: 0,
            /* napi_ref */ resource: 0,
            /* double */ async_id: 0,
            /* double */ trigger_async_id: 0,
            /* size_t */ queue_size: 0,
            /* bool */ is_some: 0,
            /* void* */ queue: 0,
            // Reuse uv_async_t storage as JS-side wakeup state: pending event + scheduled drain.
            async_pending: 0,
            async_u_fd: 0,
            /* size_t */ thread_count: 0,
            /* int32_t */ state: 0,
            /* atomic_uchar */ dispatch_state: 0,
            /* void* */ context: 0,
            /* size_t */ max_queue_size: 0,
            /* napi_ref */ ref: 0,
            /* napi_env */ env: 0,
            /* void* */ finalize_data: 0,
            /* napi_finalize */ finalize_cb: 0,
            /* napi_threadsafe_function_call_js */ call_js_cb: 0,
            /* bool */ handles_closing: 0,
            /* bool */ async_ref: 0,
            /* int32_t */ mutex: 0,
            /* int32_t */ cond: 0,
        },
        init() {
            emnapiTSFN._liveSet = new Set();
            emnapiTSFN.offset.__size__ = 184 /* NapiTSFNOffset32.__size__ */;
            emnapiTSFN.offset.resource = 0 /* NapiTSFNOffset32.async_resource_resource */;
            emnapiTSFN.offset.async_id = 8 /* NapiTSFNOffset32.async_resource_async_context_async_id */;
            emnapiTSFN.offset.trigger_async_id = 16 /* NapiTSFNOffset32.async_resource_async_context_trigger_async_id */;
            emnapiTSFN.offset.queue_size = 60 /* NapiTSFNOffset32.queue_size */;
            emnapiTSFN.offset.is_some = 24 /* NapiTSFNOffset32.async_resource_is_some */;
            emnapiTSFN.offset.queue = 64 /* NapiTSFNOffset32.queue */;
            emnapiTSFN.offset.async_pending = 132 /* NapiTSFNOffset32.async_pending */;
            emnapiTSFN.offset.async_u_fd = 96 /* NapiTSFNOffset32.async_u_fd */;
            emnapiTSFN.offset.thread_count = 136 /* NapiTSFNOffset32.thread_count */;
            emnapiTSFN.offset.state = 140 /* NapiTSFNOffset32.state */;
            emnapiTSFN.offset.dispatch_state = 144 /* NapiTSFNOffset32.dispatch_state */;
            emnapiTSFN.offset.context = 148 /* NapiTSFNOffset32.context */;
            emnapiTSFN.offset.max_queue_size = 152 /* NapiTSFNOffset32.max_queue_size */;
            emnapiTSFN.offset.ref = 156 /* NapiTSFNOffset32.ref */;
            emnapiTSFN.offset.env = 160 /* NapiTSFNOffset32.env */;
            emnapiTSFN.offset.finalize_data = 164 /* NapiTSFNOffset32.finalize_data */;
            emnapiTSFN.offset.finalize_cb = 168 /* NapiTSFNOffset32.finalize_cb */;
            emnapiTSFN.offset.call_js_cb = 172 /* NapiTSFNOffset32.call_js_cb */;
            emnapiTSFN.offset.handles_closing = 176 /* NapiTSFNOffset32.handles_closing */;
            emnapiTSFN.offset.async_ref = 180 /* NapiTSFNOffset32.async_ref */;
            emnapiTSFN.offset.mutex = 32 /* NapiTSFNOffset32.mutex */;
            emnapiTSFN.offset.cond = 56 /* NapiTSFNOffset32.cond */;
            emnapiTSFN.offset.mutex = emnapiTSFN.offset.mutex + 4;
            if (typeof emscripten_runtime.PThread !== 'undefined') {
                emscripten_runtime.PThread.unusedWorkers.forEach(emnapiTSFN.addListener);
                Object.values(emscripten_runtime.PThread.pthreads).forEach(emnapiTSFN.addListener);
                const __original_getNewWorker = emscripten_runtime.PThread.getNewWorker;
                emscripten_runtime.PThread.getNewWorker = function () {
                    const r = __original_getNewWorker.apply(this, arguments);
                    emnapiTSFN.addListener(r);
                    return r;
                };
            }
        },
        addListener(worker) {
            if (!worker)
                return false;
            if (worker._emnapiTSFNListener)
                return true;
            const handler = function (e) {
                const data = emscripten_runtime.ENVIRONMENT_IS_NODE ? e : e.data;
                const __emnapi__ = data.__emnapi__;
                if (__emnapi__) {
                    const type = __emnapi__.type;
                    const payload = __emnapi__.payload;
                    if (type === 'tsfn-send') {
                        const pendng = payload.tsfn + emnapiTSFN.offset.async_pending;
                        if (Atomics.load(new Int32Array(emnapiTSFN.ensureBufferFor(pendng + 4)), pendng >>> 2) !== 0) {
                            emnapiTSFN.enqueue(payload.tsfn);
                        }
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
                delete worker._emnapiTSFNListener;
            };
            worker._emnapiTSFNListener = { handler, dispose };
            if (emscripten_runtime.ENVIRONMENT_IS_NODE) {
                worker.on('message', handler);
            }
            else {
                worker.addEventListener('message', handler, false);
            }
            return true;
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
        initQueue(func) {
            const size = 2 * 4;
            let queue = emscripten_runtime._malloc(size);
            if (!queue)
                return false;
            queue >>>= 0;
            new Uint8Array(emnapiTSFN.ensureBufferFor(queue + size), queue, size).fill(0);
            emnapiTSFN.storeSizeTypeValue(func + emnapiTSFN.offset.queue, queue, false);
            return true;
        },
        destroyQueue(func) {
            const queue = emnapiTSFN.loadSizeTypeValue(func + emnapiTSFN.offset.queue, false);
            if (queue) {
                let node = emnapiTSFN.loadSizeTypeValue(queue, false);
                while (node !== 0) {
                    const next = emnapiTSFN.loadSizeTypeValue(node + 4, false);
                    emscripten_runtime._free(node);
                    node = next;
                }
                emscripten_runtime._free(queue);
            }
        },
        pushQueue(func, data) {
            const queue = emnapiTSFN.loadSizeTypeValue(func + emnapiTSFN.offset.queue, false);
            const head = emnapiTSFN.loadSizeTypeValue(queue, false);
            const tail = emnapiTSFN.loadSizeTypeValue(queue + 4, false);
            const size = 2 * 4;
            let node = emscripten_runtime._malloc(size);
            if (!node)
                throw new Error('OOM');
            node >>>= 0;
            emnapiTSFN.storeSizeTypeValue(node, data, false);
            emnapiTSFN.storeSizeTypeValue(node + 4, 0, false);
            if (head === 0 && tail === 0) {
                emnapiTSFN.storeSizeTypeValue(queue, node, false);
                emnapiTSFN.storeSizeTypeValue(queue + 4, node, false);
            }
            else {
                emnapiTSFN.storeSizeTypeValue(tail + 4, node, false);
                emnapiTSFN.storeSizeTypeValue(queue + 4, node, false);
            }
            emnapiTSFN.addQueueSize(func);
        },
        shiftQueue(func) {
            const queue = emnapiTSFN.loadSizeTypeValue(func + emnapiTSFN.offset.queue, false);
            const head = emnapiTSFN.loadSizeTypeValue(queue, false);
            if (head === 0)
                return 0;
            const node = head;
            const next = emnapiTSFN.loadSizeTypeValue(head + 4, false);
            emnapiTSFN.storeSizeTypeValue(queue, next, false);
            if (next === 0) {
                emnapiTSFN.storeSizeTypeValue(queue + 4, 0, false);
            }
            emnapiTSFN.storeSizeTypeValue(node + 4, 0, false);
            const value = emnapiTSFN.loadSizeTypeValue(node, false);
            emscripten_runtime._free(node);
            emnapiTSFN.subQueueSize(func);
            return value;
        },
        push(func, data, mode) {
            const mutex = emnapiTSFN.getMutex(func);
            const cond = emnapiTSFN.getCond(func);
            const waitCondition = () => {
                const queueSize = emnapiTSFN.getQueueSize(func);
                const maxSize = emnapiTSFN.getMaxQueueSize(func);
                return queueSize >= maxSize && maxSize > 0 && emnapiTSFN.getState(func) === 0 /* State.kOpen */;
            };
            const isBrowserMain = typeof window !== 'undefined' && typeof document !== 'undefined' && !emscripten_runtime.ENVIRONMENT_IS_NODE;
            let shouldDelete = false;
            const ret = mutex.execute(() => {
                while (waitCondition()) {
                    if (mode === 0 /* napi_threadsafe_function_call_mode.napi_tsfn_nonblocking */) {
                        return 15 /* napi_status.napi_queue_full */;
                    }
                    /**
                     * Browser JS main thread can not use `Atomics.wait`
                     *
                     * Related:
                     * https://github.com/nodejs/node/pull/32689
                     * https://github.com/nodejs/node/pull/33453
                     */
                    if (isBrowserMain) {
                        return 21 /* napi_status.napi_would_deadlock */;
                    }
                    cond.wait();
                }
                if (emnapiTSFN.getState(func) === 0 /* State.kOpen */) {
                    emnapiTSFN.pushQueue(func, data);
                    emnapiTSFN.send(func);
                    return 0 /* napi_status.napi_ok */;
                }
                if (emnapiTSFN.getThreadCount(func) === 0) {
                    return 1 /* napi_status.napi_invalid_arg */;
                }
                emnapiTSFN.subThreadCount(func);
                if (!(emnapiTSFN.getState(func) === 2 /* State.kClosed */ && emnapiTSFN.getThreadCount(func) === 0)) {
                    return 16 /* napi_status.napi_closing */;
                }
                shouldDelete = true;
                return 16 /* napi_status.napi_closing */;
            });
            if (shouldDelete) {
                emnapiTSFN.destroy(func);
            }
            return ret;
        },
        getMutex(func) {
            const index = func + emnapiTSFN.offset.mutex;
            const mutex = {
                lock() {
                    const isBrowserMain = typeof window !== 'undefined' && typeof document !== 'undefined' && !emscripten_runtime.ENVIRONMENT_IS_NODE;
                    const i32a = new Int32Array(emnapiTSFN.ensureBufferFor(index + 4), index, 1);
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
                /* lockAsync () {
                  return new Promise<void>(resolve => {
                    const again = (): void => { fn() }
                    const fn = (): void => {
                      const i32a = new Int32Array(emnapiTSFN.ensureBufferFor(index + 4), index, 1)
                      const oldValue = Atomics.compareExchange(i32a, 0, 0, 10)
                      if (oldValue === 0) {
                        resolve()
                        return
                      }
                      (Atomics as any).waitAsync(i32a, 0, 10).value.then(again)
                    }
                    fn()
                  })
                }, */
                unlock() {
                    const i32a = new Int32Array(emnapiTSFN.ensureBufferFor(index + 4), index, 1);
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
                } /* ,
                executeAsync<T> (fn: () => Promise<T>): Promise<T> {
                  return mutex.lockAsync().then(() => {
                    const r = fn()
                    mutex.unlock()
                    return r
                  }, (err) => {
                    mutex.unlock()
                    throw err
                  })
                } */
            };
            return mutex;
        },
        getCond(func) {
            const index = func + emnapiTSFN.offset.cond;
            const mutex = emnapiTSFN.getMutex(func);
            const cond = {
                wait() {
                    const i32a = new Int32Array(emnapiTSFN.ensureBufferFor(index + 4), index, 1);
                    const value = Atomics.load(i32a, 0);
                    mutex.unlock();
                    Atomics.wait(i32a, 0, value);
                    mutex.lock();
                },
                /* waitAsync () {
                  const i32a = new Int32Array(emnapiTSFN.ensureBufferFor(index + 4), index, 1)
                  const value = Atomics.load(i32a, 0)
                  mutex.unlock()
                  const lock = (): Promise<void> => mutex.lockAsync()
                  try {
                    return (Atomics as any).waitAsync(i32a, 0, value).value.then(lock, lock)
                  } catch (err) {
                    return lock()
                  }
                }, */
                signal() {
                    const i32a = new Int32Array(emnapiTSFN.ensureBufferFor(index + 4), index, 1);
                    Atomics.add(i32a, 0, 1);
                    Atomics.notify(i32a, 0, 1);
                }
            };
            return cond;
        },
        getQueueSize(func) {
            return emnapiTSFN.loadSizeTypeValue(func + emnapiTSFN.offset.queue_size, true);
        },
        addQueueSize(func) {
            const offset = emnapiTSFN.offset.queue_size;
            let arr, index;
            arr = new Uint32Array(emnapiTSFN.ensureBufferFor(func + offset + 4));
            index = (func + offset) >>> 2;
            Atomics.add(arr, index, 1);
        },
        subQueueSize(func) {
            const offset = emnapiTSFN.offset.queue_size;
            let arr, index;
            arr = new Uint32Array(emnapiTSFN.ensureBufferFor(func + offset + 4));
            index = (func + offset) >>> 2;
            Atomics.sub(arr, index, 1);
        },
        getThreadCount(func) {
            return emnapiTSFN.loadSizeTypeValue(func + emnapiTSFN.offset.thread_count, true);
        },
        addThreadCount(func) {
            const offset = emnapiTSFN.offset.thread_count;
            let arr, index;
            arr = new Uint32Array(emnapiTSFN.ensureBufferFor(func + offset + 4));
            index = (func + offset) >>> 2;
            Atomics.add(arr, index, 1);
        },
        subThreadCount(func) {
            const offset = emnapiTSFN.offset.thread_count;
            let arr, index;
            arr = new Uint32Array(emnapiTSFN.ensureBufferFor(func + offset + 4));
            index = (func + offset) >>> 2;
            Atomics.sub(arr, index, 1);
        },
        getState(func) {
            return Atomics.load(new Int32Array(emnapiTSFN.ensureBufferFor(func + emnapiTSFN.offset.state + 4)), (func + emnapiTSFN.offset.state) >>> 2);
        },
        setState(func, value) {
            Atomics.store(new Int32Array(emnapiTSFN.ensureBufferFor(func + emnapiTSFN.offset.state + 4)), (func + emnapiTSFN.offset.state) >>> 2, value);
        },
        getHandlesClosing(func) {
            return Atomics.load(new Int8Array(emnapiTSFN.ensureBufferFor(func + emnapiTSFN.offset.handles_closing + 1)), (func + emnapiTSFN.offset.handles_closing));
        },
        setHandlesClosing(func, value) {
            Atomics.store(new Int8Array(emnapiTSFN.ensureBufferFor(func + emnapiTSFN.offset.handles_closing + 1)), (func + emnapiTSFN.offset.handles_closing), value);
        },
        getDispatchState(func) {
            return Atomics.load(new Uint32Array(emnapiTSFN.ensureBufferFor(func + emnapiTSFN.offset.dispatch_state + 4)), (func + emnapiTSFN.offset.dispatch_state) >>> 2);
        },
        getContext(func) {
            return emnapiTSFN.loadSizeTypeValue(func + emnapiTSFN.offset.context, false);
        },
        getMaxQueueSize(func) {
            return emnapiTSFN.loadSizeTypeValue(func + emnapiTSFN.offset.max_queue_size, true);
        },
        getEnv(func) {
            return emnapiTSFN.loadSizeTypeValue(func + emnapiTSFN.offset.env, false);
        },
        getCallJSCb(func) {
            return emnapiTSFN.loadSizeTypeValue(func + emnapiTSFN.offset.call_js_cb, false);
        },
        getRef(func) {
            return emnapiTSFN.loadSizeTypeValue(func + emnapiTSFN.offset.ref, false);
        },
        getResource(func) {
            return emnapiTSFN.loadSizeTypeValue(func + emnapiTSFN.offset.resource, false);
        },
        getFinalizeCb(func) {
            return emnapiTSFN.loadSizeTypeValue(func + emnapiTSFN.offset.finalize_cb, false);
        },
        getFinalizeData(func) {
            return emnapiTSFN.loadSizeTypeValue(func + emnapiTSFN.offset.finalize_data, false);
        },
        loadSizeTypeValue(offset, unsigned) {
            let ret;
            let arr;
            if (unsigned) {
                arr = new Uint32Array(emnapiTSFN.ensureBufferFor(offset + 4));
                ret = Atomics.load(arr, offset >>> 2);
                return ret;
            }
            else {
                arr = new Int32Array(emnapiTSFN.ensureBufferFor(offset + 4));
                ret = Atomics.load(arr, offset >>> 2);
                return ret;
            }
        },
        storeSizeTypeValue(offset, value, unsigned) {
            let arr;
            if (unsigned) {
                arr = new Uint32Array(emnapiTSFN.ensureBufferFor(offset + 4));
                Atomics.store(arr, offset >>> 2, value);
                return undefined;
            }
            else {
                arr = new Int32Array(emnapiTSFN.ensureBufferFor(offset + 4));
                Atomics.store(arr, offset >>> 2, value >>> 0);
                return undefined;
            }
        },
        releaseResources(func) {
            if (emnapiTSFN.getState(func) !== 2 /* State.kClosed */) {
                emnapiTSFN.setState(func, 2 /* State.kClosed */);
                emnapiTSFN.getEnv(func);
                const envObject = emnapi_shared.emnapiEnv;
                const ref = emnapiTSFN.getRef(func);
                if (ref) {
                    emnapiCtx.getRef(ref).dispose();
                }
                const resource = emnapiTSFN.getResource(func);
                emnapiCtx.getRef(resource).dispose();
                emnapiTSFN.ensureBufferFor(func + emnapiTSFN.offset.is_some + 1);
                var HEAP_DATA_VIEW = new DataView(emnapiPluginCtx.wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === emnapiPluginCtx.wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(emnapiPluginCtx.wasmMemory.buffer));
                GET_HEAP_DATA_VIEW().setInt8(func + emnapiTSFN.offset.is_some, 0, true);
                emnapiCtx.removeCleanupHook(envObject, emnapiTSFN.cleanup, func);
                envObject.unref();
                const asyncRefAddress = func + emnapiTSFN.offset.async_ref;
                const asyncRefOffset = asyncRefAddress >>> 2;
                const arr = new Uint32Array(emnapiTSFN.ensureBufferFor(asyncRefAddress + 4));
                if (Atomics.load(arr, asyncRefOffset) > 0) {
                    Atomics.store(arr, asyncRefOffset, 0);
                    __emnapi_runtime_keepalive_pop();
                    emnapiCtx.decreaseWaitingRequestCounter();
                }
                if (emnapiNodeBinding) {
                    const view = new DataView(emnapiTSFN.ensureBufferFor(func + emnapiTSFN.offset.trigger_async_id + 8));
                    const asyncId = view.getFloat64(func + emnapiTSFN.offset.async_id, true);
                    const triggerAsyncId = view.getFloat64(func + emnapiTSFN.offset.trigger_async_id, true);
                    __emnapi_node_emit_async_destroy(asyncId, triggerAsyncId);
                }
            }
        },
        destroy(func) {
            emnapiTSFN._liveSet.delete(func);
            emnapiTSFN.destroyQueue(func);
            emnapiTSFN.releaseResources(func);
            emscripten_runtime._free(func);
        },
        emptyQueue(func) {
            const drainQueue = [];
            emnapiTSFN.getMutex(func).execute(() => {
                while (emnapiTSFN.getQueueSize(func) > 0) {
                    drainQueue.push(emnapiTSFN.shiftQueue(func));
                }
            });
            const callJsCb = emnapiTSFN.getCallJSCb(func);
            const context = emnapiTSFN.getContext(func);
            let data;
            for (let i = 0; i < drainQueue.length; i++) {
                data = drainQueue[i];
                if (callJsCb) {
                    (emnapiPluginCtx.wasmTable.get(callJsCb))(0, 0, context, data);
                }
            }
        },
        maybeDelete(func) {
            let shouldDelete = false;
            emnapiTSFN.getMutex(func).execute(() => {
                if (emnapiTSFN.getThreadCount(func) > 0) {
                    emnapiTSFN.releaseResources(func);
                }
                else {
                    shouldDelete = true;
                }
            });
            if (shouldDelete) {
                emnapiTSFN.destroy(func);
            }
        },
        finalize(func) {
            emnapiTSFN.getEnv(func);
            const envObject = emnapi_shared.emnapiEnv;
            emnapiCtx.openScope(envObject);
            const finalize = emnapiTSFN.getFinalizeCb(func);
            const data = emnapiTSFN.getFinalizeData(func);
            const context = emnapiTSFN.getContext(func);
            const f = () => {
                envObject.callFinalizerInternal(0, finalize, data, context);
            };
            try {
                emnapiTSFN.emptyQueue(func);
                if (finalize) {
                    if (emnapiNodeBinding) {
                        const resource = emnapiTSFN.getResource(func);
                        const resource_value = emnapiCtx.getRef(resource).get();
                        const resourceObject = emnapiCtx.jsValueFromNapiValue(resource_value);
                        const view = new DataView(emnapiTSFN.ensureBufferFor(func + emnapiTSFN.offset.trigger_async_id + 8));
                        const asyncId = view.getFloat64(func + emnapiTSFN.offset.async_id, true);
                        const triggerAsyncId = view.getFloat64(func + emnapiTSFN.offset.trigger_async_id, true);
                        emnapiNodeBinding.node.makeCallback(resourceObject, f, [], {
                            asyncId,
                            triggerAsyncId
                        });
                    }
                    else {
                        f();
                    }
                }
                emnapiTSFN.maybeDelete(func);
            }
            finally {
                emnapiCtx.closeScope(envObject);
            }
        },
        cleanup(func) {
            emnapiTSFN.closeHandlesAndMaybeDelete(func, 1);
        },
        closeHandlesAndMaybeDelete(func, set_closing) {
            emnapiTSFN.getEnv(func);
            const envObject = emnapi_shared.emnapiEnv;
            emnapiCtx.openScope(envObject);
            try {
                if (set_closing) {
                    emnapiTSFN.getMutex(func).execute(() => {
                        emnapiTSFN.setState(func, 1 /* State.kClosing */);
                        if (emnapiTSFN.getMaxQueueSize(func) > 0) {
                            emnapiTSFN.getCond(func).signal();
                        }
                    });
                }
                if (emnapiTSFN.getHandlesClosing(func)) {
                    return;
                }
                emnapiTSFN.setHandlesClosing(func, 1);
                Atomics.store(new Int32Array(emnapiTSFN.ensureBufferFor(func + emnapiTSFN.offset.async_pending + 4)), (func + emnapiTSFN.offset.async_pending) >>> 2, 1);
                emnapiCtx.features.setImmediate(() => {
                    emnapiTSFN.finalize(func);
                });
            }
            finally {
                emnapiCtx.closeScope(envObject);
            }
        },
        dispatchOne(func) {
            let data = 0;
            let popped_value = false;
            let has_more = false;
            const mutex = emnapiTSFN.getMutex(func);
            const cond = emnapiTSFN.getCond(func);
            mutex.execute(() => {
                if (emnapiTSFN.getState(func) === 0 /* State.kOpen */) {
                    let size = emnapiTSFN.getQueueSize(func);
                    if (size > 0) {
                        data = emnapiTSFN.shiftQueue(func);
                        popped_value = true;
                        const maxQueueSize = emnapiTSFN.getMaxQueueSize(func);
                        if (size === maxQueueSize && maxQueueSize > 0) {
                            cond.signal();
                        }
                        size--;
                    }
                    if (size === 0) {
                        if (emnapiTSFN.getThreadCount(func) === 0) {
                            emnapiTSFN.setState(func, 1 /* State.kClosing */);
                            if (emnapiTSFN.getMaxQueueSize(func) > 0) {
                                cond.signal();
                            }
                            emnapiTSFN.closeHandlesAndMaybeDelete(func, 0);
                        }
                    }
                    else {
                        has_more = true;
                    }
                }
                else {
                    emnapiTSFN.closeHandlesAndMaybeDelete(func, 0);
                }
            });
            if (popped_value) {
                const env = emnapiTSFN.getEnv(func);
                const envObject = emnapi_shared.emnapiEnv;
                emnapiCtx.openScope(envObject);
                const f = () => {
                    envObject.callbackIntoModule(false, () => {
                        const callJsCb = emnapiTSFN.getCallJSCb(func);
                        const ref = emnapiTSFN.getRef(func);
                        const js_callback = ref ? emnapiCtx.getRef(ref).get() : 0;
                        if (callJsCb) {
                            const context = emnapiTSFN.getContext(func);
                            (emnapiPluginCtx.wasmTable.get(callJsCb))(env, js_callback, context, data);
                        }
                        else {
                            const jsCallback = js_callback ? emnapiCtx.jsValueFromNapiValue(js_callback) : null;
                            if (typeof jsCallback === 'function') {
                                jsCallback();
                            }
                        }
                    });
                };
                try {
                    if (emnapiNodeBinding) {
                        const resource = emnapiTSFN.getResource(func);
                        const resource_value = emnapiCtx.getRef(resource).get();
                        const resourceObject = emnapiCtx.jsValueFromNapiValue(resource_value);
                        const view = new DataView(emnapiTSFN.ensureBufferFor(func + emnapiTSFN.offset.trigger_async_id + 8));
                        emnapiNodeBinding.node.makeCallback(resourceObject, f, [], {
                            asyncId: view.getFloat64(func + emnapiTSFN.offset.async_id, true),
                            triggerAsyncId: view.getFloat64(func + emnapiTSFN.offset.trigger_async_id, true)
                        });
                    }
                    else {
                        f();
                    }
                }
                finally {
                    emnapiCtx.closeScope(envObject);
                }
            }
            return has_more;
        },
        dispatch(func) {
            let has_more = true;
            let iterations_left = 1000;
            const dispatchStateAddress = func + emnapiTSFN.offset.dispatch_state;
            const index = dispatchStateAddress >>> 2;
            while (has_more && --iterations_left !== 0) {
                Atomics.store(new Uint32Array(emnapiTSFN.ensureBufferFor(dispatchStateAddress + 4)), index, 1);
                try {
                    has_more = emnapiTSFN.dispatchOne(func);
                }
                catch (err) {
                    // A throwing callback must not leave dispatch_state marked as
                    // dispatching, or every later send() would be swallowed. Re-arm
                    // the state and schedule another drain before rethrowing.
                    if (emnapiTSFN._liveSet.has(func)) {
                        Atomics.exchange(new Uint32Array(emnapiTSFN.ensureBufferFor(dispatchStateAddress + 4)), index, 0);
                        emnapiTSFN.send(func);
                    }
                    throw err;
                }
                if (Atomics.exchange(new Uint32Array(emnapiTSFN.ensureBufferFor(dispatchStateAddress + 4)), index, 0) !== 1) {
                    has_more = true;
                }
            }
            if (has_more) {
                emnapiTSFN.send(func);
            }
        },
        enqueue(func) {
            // `pending` means a worker thread has requested a wakeup that has not
            // been drained on the main thread yet.
            const pending = func + emnapiTSFN.offset.async_pending;
            // `scheduled` prevents queueing the same main-thread drain chain more than
            // once while a previous wakeup is still in flight.
            const scheduled = func + emnapiTSFN.offset.async_u_fd;
            const end = Math.max(pending, scheduled) + 4;
            const state = () => new Int32Array(emnapiTSFN.ensureBufferFor(end));
            if (Atomics.exchange(state(), scheduled >>> 2, 1) !== 0) {
                return;
            }
            // Match uv_async_send-style coalescing in JS: the first turn represents
            // the wakeup reaching the main thread, and the second turn performs the
            // actual TSFN drain after nearby Send/Signal calls have had a chance to
            // collapse into the shared AsyncProgressWorker state.
            emnapiCtx.features.setImmediate(() => {
                if (!emnapiTSFN._liveSet.has(func)) {
                    return;
                }
                if (Atomics.load(state(), pending >>> 2) === 0) {
                    Atomics.store(state(), scheduled >>> 2, 0);
                    return;
                }
                emnapiCtx.features.setImmediate(() => {
                    // After destroy(), the func address is freed.  Skip the atomics
                    // on that address entirely to avoid use-after-free (JS-side
                    // lifecycle check must run before touching the state words).
                    if (!emnapiTSFN._liveSet.has(func)) {
                        return;
                    }
                    try {
                        // Consume the coalesced wakeup once, then let dispatch() observe any
                        // queue mutations through dispatch_state like the C implementation.
                        if (Atomics.exchange(state(), pending >>> 2, 0) === 0) {
                            return;
                        }
                        emnapiTSFN.dispatch(func);
                    }
                    finally {
                        // Allow a later wakeup to schedule a new drain chain. If another
                        // worker-thread send raced with this drain, enqueue one more turn.
                        if (emnapiTSFN._liveSet.has(func)) {
                            Atomics.store(state(), scheduled >>> 2, 0);
                            if (Atomics.load(state(), pending >>> 2) !== 0) {
                                emnapiTSFN.enqueue(func);
                            }
                        }
                    }
                });
            });
        },
        send(func) {
            const dispatchStateAddress = func + emnapiTSFN.offset.dispatch_state;
            const current_state = Atomics.or(new Uint32Array(emnapiTSFN.ensureBufferFor(dispatchStateAddress + 4)), dispatchStateAddress >>> 2, 1 << 1);
            if ((current_state & 1) === 1) {
                return;
            }
            const pendng = func + emnapiTSFN.offset.async_pending;
            // A wakeup is already pending, so this send only needs to leave the queued
            // work in the TSFN queue and let the existing drain pick it up.
            if (Atomics.load(new Int32Array(emnapiTSFN.ensureBufferFor(pendng + 4)), pendng >>> 2) !== 0) {
                return;
            }
            if (Atomics.exchange(new Int32Array(emnapiTSFN.ensureBufferFor(pendng + 4)), pendng >>> 2, 1) === 0) {
                if ((typeof emscripten_runtime.ENVIRONMENT_IS_PTHREAD !== 'undefined') && emscripten_runtime.ENVIRONMENT_IS_PTHREAD) {
                    // Worker threads only post a wakeup token. Main-thread draining is
                    // serialized by enqueue() once the message is received.
                    postMessage({
                        __emnapi__: {
                            type: 'tsfn-send',
                            payload: {
                                tsfn: func
                            }
                        }
                    });
                }
                else {
                    // On the main thread we can skip the cross-thread hop and schedule the
                    // coalesced drain chain directly.
                    emnapiTSFN.enqueue(func);
                }
            }
        }
    };
    emnapiTSFN.init();
    emnapiPluginCtx.emnapiTSFN = emnapiTSFN;
    /**
     * @__deps _emnapi_node_emit_async_init
     * @__deps _emnapi_runtime_keepalive_push
     * @__sig ippppppppppp
     */
    function napi_create_threadsafe_function(env, func, async_resource, async_resource_name, max_queue_size, initial_thread_count, thread_finalize_data, thread_finalize_cb, context, call_js_cb, result) {
        if (!env)
            return 1 /* napi_status.napi_invalid_arg */;
        // @ts-expect-error
        const envObject = emnapi_shared.emnapiEnv;
        envObject.checkGCAccess();
        if (!async_resource_name)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        max_queue_size >>>= 0;
        initial_thread_count >>>= 0;
        env >>>= 0;
        thread_finalize_data >>>= 0;
        thread_finalize_cb >>>= 0;
        context >>>= 0;
        call_js_cb >>>= 0;
        max_queue_size = max_queue_size >>> 0;
        initial_thread_count = initial_thread_count >>> 0;
        if (initial_thread_count === 0) {
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        }
        if (!result)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        let ref = 0;
        func >>>= 0;
        if (!func) {
            if (!call_js_cb)
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        }
        else {
            const funcValue = emnapiCtx.jsValueFromNapiValue(func);
            if (typeof funcValue !== 'function') {
                return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
            }
            ref = emnapiCtx.createReference(envObject, func, 1, 1 /* ReferenceOwnership.kUserland */).id;
        }
        let asyncResourceObject;
        if (async_resource) {
            asyncResourceObject = emnapiCtx.jsValueFromNapiValue(async_resource);
            if (asyncResourceObject == null) {
                return envObject.setLastError(2 /* napi_status.napi_object_expected */);
            }
            asyncResourceObject = Object(asyncResourceObject);
        }
        else {
            asyncResourceObject = {};
        }
        const resource = emnapiCtx.napiValueFromJsValue(asyncResourceObject);
        let asyncResourceName = emnapiCtx.jsValueFromNapiValue(async_resource_name);
        if (typeof asyncResourceName === 'symbol') {
            return envObject.setLastError(3 /* napi_status.napi_string_expected */);
        }
        asyncResourceName = String(asyncResourceName);
        const resource_name = emnapiCtx.napiValueFromJsValue(asyncResourceName);
        // tsfn create
        const sizeofTSFN = emnapiTSFN.offset.__size__;
        let tsfn = emscripten_runtime._malloc(sizeofTSFN);
        if (!tsfn)
            return envObject.setLastError(9 /* napi_status.napi_generic_failure */);
        tsfn >>>= 0;
        new Uint8Array(emnapiTSFN.ensureBufferFor(tsfn + sizeofTSFN)).subarray(tsfn, tsfn + sizeofTSFN).fill(0);
        const resourceRef = emnapiCtx.createReference(envObject, resource, 1, 1 /* ReferenceOwnership.kUserland */);
        const resource_ = resourceRef.id;
        var HEAP_DATA_VIEW = new DataView(emnapiPluginCtx.wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === emnapiPluginCtx.wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(emnapiPluginCtx.wasmMemory.buffer));
        GET_HEAP_DATA_VIEW().setUint32(tsfn + emnapiTSFN.offset.resource, resource_, true);
        if (!emnapiTSFN.initQueue(tsfn)) {
            emscripten_runtime._free(tsfn);
            resourceRef.dispose();
            return envObject.setLastError(9 /* napi_status.napi_generic_failure */);
        }
        __emnapi_node_emit_async_init(resource, resource_name, -1, tsfn + emnapiTSFN.offset.async_id);
        GET_HEAP_DATA_VIEW().setInt8(tsfn + emnapiTSFN.offset.is_some, 1, true);
        GET_HEAP_DATA_VIEW().setUint32(tsfn + emnapiTSFN.offset.thread_count, initial_thread_count, true);
        GET_HEAP_DATA_VIEW().setUint32(tsfn + emnapiTSFN.offset.context, context, true);
        GET_HEAP_DATA_VIEW().setUint32(tsfn + emnapiTSFN.offset.max_queue_size, max_queue_size, true);
        GET_HEAP_DATA_VIEW().setUint32(tsfn + emnapiTSFN.offset.ref, ref, true);
        GET_HEAP_DATA_VIEW().setUint32(tsfn + emnapiTSFN.offset.env, env, true);
        GET_HEAP_DATA_VIEW().setUint32(tsfn + emnapiTSFN.offset.finalize_data, thread_finalize_data, true);
        GET_HEAP_DATA_VIEW().setUint32(tsfn + emnapiTSFN.offset.finalize_cb, thread_finalize_cb, true);
        GET_HEAP_DATA_VIEW().setUint32(tsfn + emnapiTSFN.offset.call_js_cb, call_js_cb, true);
        emnapiCtx.addCleanupHook(envObject, emnapiTSFN.cleanup, tsfn);
        emnapiTSFN._liveSet.add(tsfn);
        envObject.ref();
        __emnapi_runtime_keepalive_push();
        emnapiCtx.increaseWaitingRequestCounter();
        GET_HEAP_DATA_VIEW().setUint32(tsfn + emnapiTSFN.offset.async_ref, 1, true);
        result >>>= 0;
        GET_HEAP_DATA_VIEW().setUint32(result, tsfn, true);
        return envObject.clearLastError();
    }
    /** @__sig ipp */
    function napi_get_threadsafe_function_context(func, result) {
        if (!func || !result) {
            emscripten_runtime.abort();
            return 1 /* napi_status.napi_invalid_arg */;
        }
        func >>>= 0;
        result >>>= 0;
        const context = emnapiTSFN.getContext(func);
        var HEAP_DATA_VIEW = new DataView(emnapiPluginCtx.wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === emnapiPluginCtx.wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(emnapiPluginCtx.wasmMemory.buffer));
        GET_HEAP_DATA_VIEW().setUint32(result, context, true);
        return 0 /* napi_status.napi_ok */;
    }
    /** @__sig ippi */
    function napi_call_threadsafe_function(func, data, mode) {
        if (!func) {
            emscripten_runtime.abort();
            return 1 /* napi_status.napi_invalid_arg */;
        }
        func >>>= 0;
        data >>>= 0;
        return emnapiTSFN.push(func, data, mode);
    }
    /** @__sig ip */
    function napi_acquire_threadsafe_function(func) {
        if (!func) {
            emscripten_runtime.abort();
            return 1 /* napi_status.napi_invalid_arg */;
        }
        func >>>= 0;
        const mutex = emnapiTSFN.getMutex(func);
        return mutex.execute(() => {
            if (emnapiTSFN.getState(func) === 0 /* State.kOpen */) {
                emnapiTSFN.addThreadCount(func);
                return 0 /* napi_status.napi_ok */;
            }
            return 16 /* napi_status.napi_closing */;
        });
    }
    /** @__sig ipi */
    function napi_release_threadsafe_function(func, mode) {
        if (!func) {
            emscripten_runtime.abort();
            return 1 /* napi_status.napi_invalid_arg */;
        }
        func >>>= 0;
        const mutex = emnapiTSFN.getMutex(func);
        const cond = emnapiTSFN.getCond(func);
        let shouldDelete = false;
        const ret = mutex.execute(() => {
            if (emnapiTSFN.getThreadCount(func) === 0) {
                return 1 /* napi_status.napi_invalid_arg */;
            }
            emnapiTSFN.subThreadCount(func);
            if (emnapiTSFN.getThreadCount(func) === 0 || mode === 1 /* napi_threadsafe_function_release_mode.napi_tsfn_abort */) {
                if (emnapiTSFN.getState(func) === 0 /* State.kOpen */) {
                    if (mode === 1 /* napi_threadsafe_function_release_mode.napi_tsfn_abort */) {
                        emnapiTSFN.setState(func, 1 /* State.kClosing */);
                    }
                    if (emnapiTSFN.getState(func) === 1 /* State.kClosing */ && emnapiTSFN.getMaxQueueSize(func) > 0) {
                        cond.signal();
                    }
                    emnapiTSFN.send(func);
                }
            }
            if (!(emnapiTSFN.getState(func) === 2 /* State.kClosed */ && emnapiTSFN.getThreadCount(func) === 0)) {
                return 0 /* napi_status.napi_ok */;
            }
            shouldDelete = true;
            return 0 /* napi_status.napi_ok */;
        });
        if (shouldDelete) {
            emnapiTSFN.destroy(func);
        }
        return ret;
    }
    /**
     * @__deps _emnapi_runtime_keepalive_pop
     * @__sig ipp
     */
    function napi_unref_threadsafe_function(env, func) {
        if (!func) {
            emscripten_runtime.abort();
            return 1 /* napi_status.napi_invalid_arg */;
        }
        func >>>= 0;
        const asyncRefAddress = func + emnapiTSFN.offset.async_ref;
        const asyncRefOffset = asyncRefAddress >>> 2;
        const arr = new Uint32Array(emnapiTSFN.ensureBufferFor(asyncRefAddress + 4));
        const currentValue = Atomics.load(arr, asyncRefOffset);
        if (currentValue > 0) {
            Atomics.store(arr, asyncRefOffset, currentValue - 1);
            if (currentValue === 1) {
                __emnapi_runtime_keepalive_pop();
                emnapiCtx.decreaseWaitingRequestCounter();
            }
        }
        return 0 /* napi_status.napi_ok */;
    }
    /**
     * @__deps _emnapi_runtime_keepalive_push
     * @__sig ipp
     */
    function napi_ref_threadsafe_function(env, func) {
        if (!func) {
            emscripten_runtime.abort();
            return 1 /* napi_status.napi_invalid_arg */;
        }
        func >>>= 0;
        const asyncRefAddress = func + emnapiTSFN.offset.async_ref;
        const asyncRefOffset = asyncRefAddress >>> 2;
        const arr = new Uint32Array(emnapiTSFN.ensureBufferFor(asyncRefAddress + 4));
        const currentValue = Atomics.load(arr, asyncRefOffset);
        if (!currentValue) {
            __emnapi_runtime_keepalive_push();
            emnapiCtx.increaseWaitingRequestCounter();
        }
        Atomics.store(arr, asyncRefOffset, currentValue + 1);
        return 0 /* napi_status.napi_ok */;
    }

    //#endregion src/threadsafe-function.ts

    exports.napi_acquire_threadsafe_function = napi_acquire_threadsafe_function;
    exports.napi_call_threadsafe_function = napi_call_threadsafe_function;
    exports.napi_create_threadsafe_function = napi_create_threadsafe_function;
    exports.napi_get_threadsafe_function_context = napi_get_threadsafe_function_context;
    exports.napi_ref_threadsafe_function = napi_ref_threadsafe_function;
    exports.napi_release_threadsafe_function = napi_release_threadsafe_function;
    exports.napi_unref_threadsafe_function = napi_unref_threadsafe_function;

    return exports;

})({}, emnapiPluginCtx, emnapiPluginCtx);
  return {
    importObject: (original) => {
      Object.assign(original.napi, mod);
    }
  };
}

//#endregion src/emnapi/threadsafe-function.js

export { threadsafeFunction as default };

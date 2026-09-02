/// <reference lib="esnext.disposable" />

export declare type Ptr = number | bigint

export declare interface IBuffer extends Uint8Array {
  toString (encoding?: string, start?: number, end?: number): string
}

export declare interface BufferCtor {
  readonly prototype: IBuffer
  /** @deprecated */
  new (...args: any[]): IBuffer
  from: {
    (buffer: ArrayBufferLike): IBuffer
    (buffer: ArrayBufferLike, byteOffset: number, length: number): IBuffer
  }
  alloc: (size: number) => IBuffer
  isBuffer: (obj: unknown) => obj is IBuffer
}

export declare const enum Constant {
  HOLE,
  EMPTY,
  UNDEFINED,
  NULL,
  FALSE,
  TRUE,
  GLOBAL,
  EMPTY_STRING,
}

export declare const enum Version {
  NODE_API_SUPPORTED_VERSION_MIN = 1,
  NODE_API_DEFAULT_MODULE_API_VERSION = 8,
  NODE_API_SUPPORTED_VERSION_MAX = 10,
  NODE_MODULE_VERSION = 127,
  NAPI_VERSION_EXPERIMENTAL = 2147483647 // INT_MAX
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export declare type Pointer<T> = number | bigint
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export declare type PointerPointer<T> = number
export declare type FunctionPointer<T extends (...args: any[]) => any> = Pointer<T>
export declare type Const<T> = T

export declare type void_p = Pointer<void>
export declare type void_pp = Pointer<void_p>
export declare type bool = number
export declare type char = number
export declare type char_p = Pointer<char>
export declare type unsigned_char = number
export declare type const_char = Const<char>
export declare type const_char_p = Pointer<const_char>
export declare type char16_t = number
export declare type const_char16_t = number
export declare type char16_t_p = Pointer<char16_t>
export declare type const_char16_t_p = Pointer<const_char16_t>

export declare type short = number
export declare type unsigned_short = number
export declare type int = number
export declare type unsigned_int = number
export declare type long = number
export declare type unsigned_long = number
export declare type long_long = bigint
export declare type unsigned_long_long = bigint
export declare type float = number
export declare type double = number
export declare type long_double = number
export declare type size_t = number

export declare type int8_t = number
export declare type uint8_t = number
export declare type int16_t = number
export declare type uint16_t = number
export declare type int32_t = number
export declare type uint32_t = number
export declare type int64_t = bigint
export declare type uint64_t = bigint
export declare type napi_env = Pointer<unknown>

export declare type napi_value = Pointer<unknown>
export declare type napi_ref = Pointer<unknown>
export declare type napi_deferred = Pointer<unknown>
export declare type napi_handle_scope = Pointer<unknown>
export declare type napi_escapable_handle_scope = Pointer<unknown>

export declare type napi_addon_register_func = FunctionPointer<(env: napi_env, exports: napi_value) => napi_value>

export declare type napi_callback_info = Pointer<unknown>
export declare type napi_callback = FunctionPointer<(env: napi_env, info: napi_callback_info) => napi_value>

export declare interface napi_extended_error_info {
  error_message: const_char_p
  engine_reserved: void_p
  engine_error_code: uint32_t
  error_code: napi_status
}

export declare interface napi_property_descriptor {
  // One of utf8name or name should be NULL.
  utf8name: const_char_p
  name: napi_value

  method: napi_callback
  getter: napi_callback
  setter: napi_callback
  value: napi_value
  /* napi_property_attributes */
  attributes: number
  data: void_p
}

export declare type napi_finalize = FunctionPointer<(
  env: napi_env,
  finalize_data: void_p,
  finalize_hint: void_p
) => void>

export declare interface node_module {
  nm_version: int32_t
  nm_flags: uint32_t
  nm_filename: Pointer<const_char>
  nm_register_func: napi_addon_register_func
  nm_modname: Pointer<const_char>
  nm_priv: Pointer<void>
  reserved: PointerPointer<void>
}

export declare interface napi_node_version {
  major: uint32_t
  minor: uint32_t
  patch: uint32_t
  release: const_char_p
}

export declare interface emnapi_emscripten_version {
  major: uint32_t
  minor: uint32_t
  patch: uint32_t
}

export declare const enum napi_status {
  napi_ok,
  napi_invalid_arg,
  napi_object_expected,
  napi_string_expected,
  napi_name_expected,
  napi_function_expected,
  napi_number_expected,
  napi_boolean_expected,
  napi_array_expected,
  napi_generic_failure,
  napi_pending_exception,
  napi_cancelled,
  napi_escape_called_twice,
  napi_handle_scope_mismatch,
  napi_callback_scope_mismatch,
  napi_queue_full,
  napi_closing,
  napi_bigint_expected,
  napi_date_expected,
  napi_arraybuffer_expected,
  napi_detachable_arraybuffer_expected,
  napi_would_deadlock, // unused
  napi_no_external_buffers_allowed,
  napi_cannot_run_js
}

export declare const enum napi_property_attributes {
  napi_default = 0,
  napi_writable = 1 << 0,
  napi_enumerable = 1 << 1,
  napi_configurable = 1 << 2,

  // Used with napi_define_class to distinguish static properties
  // from instance properties. Ignored by napi_define_properties.
  napi_static = 1 << 10,

  /// #ifdef NAPI_EXPERIMENTAL
  // Default for class methods.
  napi_default_method = napi_writable | napi_configurable,

  // Default for object properties, like in JS obj[prop].
  napi_default_jsproperty = napi_writable | napi_enumerable | napi_configurable
  /// #endif  // NAPI_EXPERIMENTAL
}

export declare const enum napi_valuetype {
  napi_undefined,
  napi_null,
  napi_boolean,
  napi_number,
  napi_string,
  napi_symbol,
  napi_object,
  napi_function,
  napi_external,
  napi_bigint
}

export declare const enum napi_typedarray_type {
  napi_int8_array,
  napi_uint8_array,
  napi_uint8_clamped_array,
  napi_int16_array,
  napi_uint16_array,
  napi_int32_array,
  napi_uint32_array,
  napi_float32_array,
  napi_float64_array,
  napi_bigint64_array,
  napi_biguint64_array,
  napi_float16_array,
}

export declare const enum napi_key_collection_mode {
  napi_key_include_prototypes,
  napi_key_own_only
}

export declare const enum napi_key_filter {
  napi_key_all_properties = 0,
  napi_key_writable = 1,
  napi_key_enumerable = 1 << 1,
  napi_key_configurable = 1 << 2,
  napi_key_skip_strings = 1 << 3,
  napi_key_skip_symbols = 1 << 4
}

export declare const enum napi_key_conversion {
  napi_key_keep_numbers,
  napi_key_numbers_to_strings
}

export declare const enum emnapi_memory_view_type {
  emnapi_int8_array,
  emnapi_uint8_array,
  emnapi_uint8_clamped_array,
  emnapi_int16_array,
  emnapi_uint16_array,
  emnapi_int32_array,
  emnapi_uint32_array,
  emnapi_float32_array,
  emnapi_float64_array,
  emnapi_bigint64_array,
  emnapi_biguint64_array,
  emnapi_float16_array,
  emnapi_data_view = -1,
  emnapi_buffer = -2
}

export declare const enum napi_threadsafe_function_call_mode {
  napi_tsfn_nonblocking,
  napi_tsfn_blocking
}

export declare const enum napi_threadsafe_function_release_mode {
  napi_tsfn_release,
  napi_tsfn_abort
}
export declare class ArrayStore<T extends {
    id: number | bigint;
}> extends BaseArrayStore<T> {
    protected _allocator: IdAllocator;
    constructor(initialCapacity?: number);
    insert(value: T): void;
    alloc<P extends any[]>(factory: (...args: P) => T, ...args: P): T;
    dealloc(id: number | bigint): void;
}

export declare class BaseArrayStore<T> extends Disposable_2 implements ObjectAllocator<T> {
    protected _values: [undefined, ...(T | undefined)[]];
    constructor(initialCapacity?: number);
    assign(id: number | bigint, value: T): T;
    deref<R extends T = T>(id: number | bigint): R | undefined;
    alloc<P extends any[]>(factory: (...args: P) => T, ...args: P): T;
    dealloc(id: number | bigint): void;
    dispose(): void;
}

export declare type CleanupHookCallbackFunction = number | ((arg: number) => void);

export declare class Context {
    private _isStopping;
    private _canCallIntoJs;
    private _suppressDestroy;
    private envStore;
    refStore: Map<number, Reference>;
    private readonly refCounter?;
    private readonly cleanupQueue;
    readonly features: Features;
    readonly isolate: Isolate;
    constructor(options?: ContextOptions);
    getIsolate(): Isolate;
    suppressDestroy(): void;
    getRuntimeVersions(): {
        version: string;
        NODE_API_SUPPORTED_VERSION_MAX: Version;
        NAPI_VERSION_EXPERIMENTAL: Version;
        NODE_API_DEFAULT_MODULE_API_VERSION: Version;
        NODE_MODULE_VERSION: Version;
    };
    createNotSupportWeakRefError(api: string, message: string): NotSupportWeakRefError;
    createNotSupportBufferError(api: string, message: string): NotSupportBufferError;
    createReference(envObject: Env, handle_id: napi_value, initialRefcount: uint32_t, ownership: ReferenceOwnership): Reference;
    createReferenceWithData(envObject: Env, handle_id: napi_value, initialRefcount: uint32_t, ownership: ReferenceOwnership, data: void_p): Reference;
    createReferenceWithFinalizer(envObject: Env, handle_id: napi_value, initialRefcount: uint32_t, ownership: ReferenceOwnership, finalize_callback?: napi_finalize, finalize_data?: void_p, finalize_hint?: void_p): Reference;
    createResolver<T>(): Resolver<T>;
    adjustAmountOfExternalAllocatedMemory(changeInBytes: number | bigint): bigint;
    createEnv(filename: string, moduleApiVersion: number, bridge: EnvNativeBridge, nodeBinding?: any): Env;
    createFunction(envObject: Env, napiCallback: (env: napi_env, info: napi_callback_info) => void_p, data: number | bigint, name: string, dynamicExecution: boolean): Function;
    createTrackedFinalizer(envObject: Env, finalize_callback: napi_finalize, finalize_data: void_p, finalize_hint: void_p): TrackedFinalizer;
    getCurrentScope(): HandleScope;
    openScope(envObject: Env): HandleScope;
    closeScope(envObject: Env, scope?: HandleScope): void;
    getEnv(env: napi_env): Env | undefined;
    getRef(ref: napi_ref): Reference | undefined;
    getHandleScope(scope: napi_handle_scope): HandleScope | undefined;
    getCallbackInfo(info: napi_callback_info): ICallbackInfo;
    napiValueFromJsValue(value: unknown): number | bigint;
    jsValueFromNapiValue<T = any>(napiValue: number | bigint): T | undefined;
    createExternal(data: number | bigint): External_2;
    getExternalValue(external: External_2): number | bigint;
    isExternal(value: unknown): boolean;
    addCleanupHook(envObject: Env, fn: CleanupHookCallbackFunction, arg: number): void;
    removeCleanupHook(envObject: Env, fn: CleanupHookCallbackFunction, arg: number): void;
    runCleanup(): void;
    increaseWaitingRequestCounter(): void;
    decreaseWaitingRequestCounter(): void;
    setCanCallIntoJs(value: boolean): void;
    setStopping(value: boolean): void;
    canCallIntoJs(): boolean;
    getDylinkMetadata(binary: WebAssembly.Module | Uint8Array): DylinkMetadata;
    destroy(): void;
}

export declare interface ContextOptions extends IsolateOptions {
}

export declare class CountIdAllocator extends Disposable_2 implements IdAllocator {
    next: number;
    constructor(initialNext?: number);
    aquire(): number;
    release(_: number): void;
    dispose(): void;
}

export declare class CountIdReuseAllocator extends CountIdAllocator implements IdAllocator {
    private _freeList;
    aquire(): number;
    release(id: number): void;
    dispose(): void;
}

export declare function createContext(options?: ContextOptions): Context;

export declare function deletePrivate(obj: any, key: Private): boolean;

declare abstract class Disposable_2 implements globalThis.Disposable {
    abstract dispose(): void;
    [Symbol.dispose](): void;
}
export { Disposable_2 as Disposable }

export declare interface DylinkMetadata {
    neededDynlibs: string[];
    tlsExports: Set<string>;
    weakImports: Set<string>;
    runtimePaths: string[];
    memorySize: number;
    memoryAlign: number;
    tableSize: number;
    tableAlign: number;
}

export declare class EmnapiError extends Error {
    constructor(message?: string);
}

export declare abstract class Env extends Disposable_2 {
    id: number | bigint;
    openHandleScopes: number;
    instanceData: TrackedFinalizer | null;
    lastException: Persistent<any>;
    refs: number;
    reflist: RefTracker;
    finalizing_reflist: RefTracker;
    pendingFinalizers: RefTracker[];
    moduleApiVersion: number;
    filename: string;
    nodeBinding?: any;
    inGcFinalizer: boolean;
    bridge: EnvNativeBridge;
    readonly ctx: Context;
    private store;
    constructor(ctx: Context, store: ArrayStore<Env>, bridge: EnvNativeBridge);
    canCallIntoJs(): boolean;
    terminatedOrTerminating(): boolean;
    ref(): void;
    unref(): void;
    clearLastError(): napi_status;
    setLastError(error_code: napi_status, engine_error_code?: uint32_t, engine_reserved?: number): napi_status;
    callIntoModule<T>(fn: (env: Env) => T, handleException?: (envObject: Env, value: any) => void): T;
    abstract callFinalizer(cb: napi_finalize, data: void_p, hint: void_p): void;
    invokeFinalizerFromGC(finalizer: RefTracker): void;
    checkGCAccess(): void;
    enqueueFinalizer(finalizer: RefTracker): void;
    dequeueFinalizer(finalizer: RefTracker): void;
    deleteMe(): void;
    dispose(): void;
    private readonly _bindingMap;
    initObjectBinding<S extends object>(value: S): IReferenceBinding;
    getObjectBinding<S extends object>(value: S): IReferenceBinding;
    setInstanceData(data: number, finalize_cb: number, finalize_hint: number): void;
    getInstanceData(): number | bigint;
}

export declare interface EnvNativeBridge {
    address: number;
    deleteEnv: (ptr: number) => void;
    setLastError: (env: napi_env, error_code: napi_status, engine_error_code: uint32_t, engine_reserved: number) => void;
    makeDynCall_vppp: (cb: Ptr) => (a: Ptr, b: Ptr, c: Ptr) => void;
    makeDynCall_vp: (cb: Ptr) => (a: Ptr) => void;
    abort: (msg?: string) => never;
    wasm64?: boolean;
}

declare interface External_2 extends Record<any, any> {
}

declare const External_2: {
    new (value: number | bigint): External_2;
    prototype: null;
};
export { External_2 as External }

export declare interface Features {
    makeDynamicFunction: ((...args: any[]) => Function) | undefined;
    getGlobalThis: () => typeof globalThis;
    setFunctionName: ((fn: Function, name: string) => void) | undefined;
    Reflect: typeof Reflect | undefined;
    finalizer: boolean;
    weakSymbol: boolean;
    BigInt: typeof BigInt | undefined;
    MessageChannel: typeof MessageChannel | undefined;
    Buffer: BufferCtor | undefined;
    setImmediate: (callback: () => void) => any;
    withResolvers: <T>(this: PromiseConstructor) => Resolver<T>;
}

export declare class Finalizer {
    envObject: Env;
    private _finalizeCallback;
    private _finalizeData;
    private _finalizeHint;
    private _makeDynCall_vppp;
    constructor(envObject: Env, _finalizeCallback?: napi_finalize, _finalizeData?: void_p, _finalizeHint?: void_p);
    copy(): Finalizer;
    move(target: Finalizer): void;
    callback(): napi_finalize;
    data(): void_p;
    hint(): void_p;
    resetEnv(): void;
    resetFinalizer(): void;
    callFinalizer(): void;
    dispose(): void;
}

export declare class FunctionTemplate extends Template {
    callback: (info: napi_callback_info, v8FunctionCallback: Ptr) => Ptr;
    v8FunctionCallback: Ptr;
    data: any;
    className: string | undefined;
    signature: Signature | undefined;
    private _instanceTemplate;
    private _prototypeTemplate;
    private _cached;
    constructor(ctx: Isolate, callback: (info: napi_callback_info, v8FunctionCallback: Ptr) => Ptr, v8FunctionCallback: Ptr, data: any, signature?: Signature);
    setClassName(name: string): void;
    instanceTemplate(): ObjectTemplate;
    prototypeTemplate(): ObjectTemplate;
    getFunction(): (...args: any[]) => any;
}

export declare function getDefaultContext(): Context;

export declare function getDylinkMetadata(binary: WebAssembly.Module | Uint8Array): DylinkMetadata;

export declare function getExternalValue(external: External_2): number | bigint;

export declare function getInternalField(instance: object, index: number): any;

export declare function getPrivate(obj: any, key: Private): any;

export declare class HandleScope extends Disposable_2 {
    handleStore: HandleStore;
    id: number | bigint;
    parent: HandleScope | null;
    child: HandleScope | null;
    start: number;
    end: number;
    private _escapeCalled;
    callbackInfo: ICallbackInfo;
    static create(parentScope: HandleScope | null, handleStore: HandleStore, start?: number, end?: number): HandleScope;
    constructor(parentScope: HandleScope | null, handleStore: HandleStore, start?: number, end?: number);
    reuse(parentScope: HandleScope): void;
    add<V>(value: V): number;
    addExternal(data: number | bigint): number;
    dispose(): void;
    escape(handle: number): number;
    escapeCalled(): boolean;
}

export declare class HandleStore extends BaseArrayStore<any> {
    static MIN_ID: 8;
    private _allocator;
    private _features;
    readonly refValues: Map<number, PersistentValueType<any>>;
    private _erase;
    private _deref;
    constructor(features: Features);
    isOutOfScope(id: number): boolean;
    deepDeref<R = any>(id: number | bigint): R | undefined;
    push<S>(value: S): number;
    erase(start: number, end: number, weak: boolean): void;
    swap(a: number, b: number): void;
}

export declare function hasPrivate(obj: any, key: Private): boolean;

export declare interface ICallbackInfo {
    thiz: any;
    holder: any;
    data: void_p;
    args: ArrayLike<any>;
    fn: Function;
}

export declare interface IdAllocator extends Disposable_2 {
    aquire(): number;
    release(id: number): void;
}

export declare interface IReferenceBinding {
    wrapped: number;
    tag: Uint32Array | null;
}

export declare function isExternal(object: unknown): object is External_2;

export declare class Isolate {
    private _lastException;
    private _globalThis;
    private _scopeStore;
    private _handleStore;
    private _externalMemory;
    globalHandleStore: PersistentStore;
    readonly features: Features;
    constructor(options?: IsolateOptions);
    napiValueFromJsValue(value: unknown): number | bigint;
    jsValueFromNapiValue<T = any>(napiValue: number | bigint): T | undefined;
    deleteRefSlotValue(id: number | bigint): void;
    getRefSlotValue(id: number | bigint): PersistentValueType<any>;
    setRefSlotValue(id: number | bigint, ref: PersistentValueType<any>): void;
    createReference<T>(...args: [T] | []): Persistent<T>;
    insertRef<T>(persistent: Persistent<T>): void;
    getRef<T = any>(ref: napi_ref): Persistent<T> | undefined;
    removeRef(ref: napi_ref, force?: boolean): void;
    getTryCatch(address: number | bigint): TryCatch | undefined;
    pushTryCatch(address: number | bigint): TryCatch;
    popTryCatch(address: number | bigint): void;
    setLastException(err: any): void;
    throwException(err: any): any;
    hasPendingException(): boolean;
    getAndClearLastException(): any;
    adjustAmountOfExternalAllocatedMemory(changeInBytes: number | bigint): bigint;
    createSignature(template: FunctionTemplate): Signature;
    createObjectTemplate(constructor: any): ObjectTemplate;
    setInternalField(obj: any, index: number, value: any): void;
    getInternalField(obj: any, index: number): any;
    getInternalFieldCount(obj: any): number;
    createFunctionTemplate(callback: (info: napi_callback_info, v8FunctionCallback: Ptr) => Ptr, v8FunctionCallback: Ptr, data: any, signature?: Signature): FunctionTemplate;
    isScopeEmpty(): boolean;
    getCurrentScope(): HandleScope;
    openScope(): HandleScope;
    closeScope(_scope?: HandleScope): void;
    getHandleScope(scope: napi_handle_scope): HandleScope | undefined;
    getCallbackInfo(info: napi_callback_info): ICallbackInfo;
    createExternal(data: number | bigint): External_2;
    getExternalValue(external: External_2): number | bigint;
    isExternal(value: unknown): boolean;
    createResolver<T>(): Resolver<T>;
    createPrivate(name: string): Private;
    getOrCreateGlobalPrivate(name: string): Private;
    setPrivate(obj: any, key: Private, value: any): void;
    getPrivate(obj: any, key: Private): any;
    hasPrivate(obj: any, key: Private): boolean;
    deletePrivate(obj: any, key: Private): boolean;
}

export declare interface IsolateOptions {
    features?: Partial<Features>;
    onExternalMemoryChange?: (current: bigint, old: bigint, delta: bigint) => any;
}

export declare function isReferenceType(v: any): v is object;

export declare const NAPI_VERSION_EXPERIMENTAL = Version.NAPI_VERSION_EXPERIMENTAL;

export declare const NODE_API_DEFAULT_MODULE_API_VERSION = Version.NODE_API_DEFAULT_MODULE_API_VERSION;

export declare const NODE_API_SUPPORTED_VERSION_MAX = Version.NODE_API_SUPPORTED_VERSION_MAX;

export declare const NODE_API_SUPPORTED_VERSION_MIN = Version.NODE_API_SUPPORTED_VERSION_MIN;

export declare class NodeEnv extends Env {
    destructing: boolean;
    finalizationScheduled: boolean;
    constructor(ctx: Context, store: ArrayStore<Env>, bridge: EnvNativeBridge);
    deleteMe(): void;
    canCallIntoJs(): boolean;
    triggerFatalException(err: any): void;
    callbackIntoModule<T>(enforceUncaughtExceptionPolicy: boolean, fn: (env: Env) => T): T;
    callFinalizer(cb: napi_finalize, data: void_p, hint: void_p): void;
    callFinalizerInternal(forceUncaught: int, cb: napi_finalize, data: void_p, hint: void_p): void;
    enqueueFinalizer(finalizer: RefTracker): void;
    drainFinalizerQueue(): void;
}

export declare class NotSupportBufferError extends EmnapiError {
    constructor(api: string, message: string);
}

export declare class NotSupportWeakRefError extends EmnapiError {
    constructor(api: string, message: string);
}

export declare interface ObjectAllocator<T> extends Disposable_2 {
    deref<R extends T = T>(id: number | bigint): R | undefined;
    alloc<P extends any[]>(factory: (...args: P) => T, ...args: P): T;
    dealloc(id: number | bigint): void;
}

export declare class ObjectTemplate extends Template {
    Ctor: any;
    internalFieldCount: number;
    private _accessors;
    constructor(ctx: Isolate, Ctor?: any);
    setAccessor(name: string | symbol, getterWrap: (property: Ptr, info: Ptr, getter: Ptr) => Ptr, setterWrap: (property: Ptr, value: Ptr, info: Ptr, setter: Ptr) => Ptr, getter: Ptr, setter: Ptr, data: any, attribute: number, getterSideEffectType: number, setterSideEffectType: number): void;
    setInternalFieldCount(value: number): void;
    applyToInstance(instance: any): void;
    newInstance(_context: any): any;
}

export declare class Persistent<T> extends Disposable_2 {
    private _param;
    private _callback;
    private _isolate;
    id: number;
    private static readonly _registry;
    constructor(isolate: Isolate, ...args: [T] | []);
    dispose(): void;
    copy(): Persistent<T>;
    move(to: Persistent<T>): void;
    slot(): number;
    getSlot(): PersistentValueType<T>;
    setSlot(ref: PersistentValueType<T>): void;
    deleteSlot(): void;
    setWeak<P>(param: P, callback: (param: P) => void): void;
    clearWeak(): void;
    reset(): void;
    resetTo(value: T): void;
    isEmpty(): boolean;
    deref(): T | undefined;
}

export declare class PersistentStore extends ArrayStore<Persistent<any>> {
    private _recyleList;
    constructor(initialCapacity?: number);
    markUnused(id: number | bigint): void;
    recycle(): void;
}

export declare type PersistentValueType<T> = StrongRef<T> | WeakRef<T extends object ? T : never> | undefined;

export declare class Private {
    private _name;
    constructor(name: string);
    name(): string;
    static forApi(name: string): Private;
}

export declare class Reference extends RefTracker {
    private static weakCallback;
    id: number;
    envObject: Env | undefined;
    private ctx;
    private canBeWeak;
    private _refcount;
    private _ownership;
    static create(ctx: Context, envObject: Env, handle_id: napi_value, initialRefcount: uint32_t, ownership: ReferenceOwnership, _unused1?: void_p, _unused2?: void_p, _unused3?: void_p): Reference;
    constructor(ctx: Context, envObject: Env, handle_id: napi_value, initialRefcount: uint32_t, ownership: ReferenceOwnership);
    getPersistent(): Persistent<any>;
    ref(): number;
    unref(): number;
    deref(): any;
    get(): napi_value;
    resetFinalizer(): void;
    data(): void_p;
    refcount(): number;
    ownership(): ReferenceOwnership;
    protected callUserFinalizer(): void;
    protected invokeFinalizerFromGC(): void;
    private _setWeak;
    setWeakWithData<T>(data: T, callback: (data: T) => void): void;
    clearWeak(): void;
    finalize(): void;
    dispose(): void;
}

export declare enum ReferenceOwnership {
    kRuntime = 0,
    kUserland = 1
}

export declare class ReferenceWithData extends Reference {
    private _data;
    static create(ctx: Context, envObject: Env, value: napi_value, initialRefcount: uint32_t, ownership: ReferenceOwnership, data: void_p): ReferenceWithData;
    constructor(ctx: Context, envObject: Env, value: napi_value, initialRefcount: uint32_t, ownership: ReferenceOwnership, data: void_p);
    data(): void_p;
}

export declare class ReferenceWithFinalizer extends Reference {
    private _finalizer;
    static create(ctx: Context, envObject: Env, value: napi_value, initialRefcount: uint32_t, ownership: ReferenceOwnership, finalize_callback: napi_finalize, finalize_data: void_p, finalize_hint: void_p): ReferenceWithFinalizer;
    constructor(ctx: Context, envObject: Env, value: napi_value, initialRefcount: uint32_t, ownership: ReferenceOwnership, finalize_callback: napi_finalize, finalize_data: void_p, finalize_hint: void_p);
    resetFinalizer(): void;
    data(): void_p;
    protected callUserFinalizer(): void;
    protected invokeFinalizerFromGC(): void;
    dispose(): void;
}

export declare class RefTracker extends Disposable_2 {
    dispose(): void;
    finalize(): void;
    protected _next: RefTracker | null;
    protected _prev: RefTracker | null;
    link(list: RefTracker): void;
    unlink(): void;
    static finalizeAll(list: RefTracker): void;
}

export declare interface Resolver<T> {
    promise: Promise<T>;
    resolve: (value: T | PromiseLike<T>) => void;
    reject: (reason?: any) => void;
}

export declare interface ReusableStoreValue extends Disposable_2 {
    reuse(...args: any[]): void;
}

export declare class ScopeStore extends BaseArrayStore<HandleScope> {
    private readonly _rootScope;
    currentScope: HandleScope;
    constructor();
    openScope(handleStore: HandleStore): HandleScope;
    closeScope(): void;
    isEmpty(): boolean;
}

export declare function setInternalField(instance: object, index: number, value: any): void;

export declare function setPrivate(obj: any, key: Private, value: any): void;

export declare class Signature {
    receiver: FunctionTemplate | undefined;
    constructor(receiver: FunctionTemplate | undefined);
}

export declare class StrongRef<T> extends Disposable_2 {
    private _value;
    constructor(value: T);
    deref(): T;
    dispose(): void;
}

export declare class Template {
    protected ctx: Isolate;
    protected _properties: Map<string | symbol, [any, number]>;
    constructor(ctx: Isolate);
    set(name: string | symbol, value: any, attr: number): void;
    protected _addPropertiesToInstance(instance: any): void;
}

export declare class TrackedFinalizer extends RefTracker {
    private _finalizer;
    static create(envObject: Env, finalize_callback: napi_finalize, finalize_data: void_p, finalize_hint: void_p): TrackedFinalizer;
    private constructor();
    data(): void_p;
    dispose(): void;
    finalize(): void;
}

export declare class TryCatch {
    static top: TryCatch | null;
    private static _map;
    id: number | bigint;
    private _exception;
    private _caught;
    private _next;
    constructor(id: number | bigint);
    static deref(id: number | bigint): TryCatch | undefined;
    static pop(): void;
    isEmpty(): boolean;
    hasCaught(): boolean;
    exception(): any;
    rethrow(ctx: Isolate): any;
    setError(err: any): void;
    reset(): void;
    extractException(): any;
}

export declare const version: string;

export { }

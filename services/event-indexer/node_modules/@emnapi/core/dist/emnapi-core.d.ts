import type { Context } from '@emnapi/runtime';
import type { ReferenceOwnership } from '@emnapi/runtime';
import type { Worker as Worker_2 } from 'worker_threads';

/** @public */
export declare type BaseCreateOptions = {
    filename?: string
    nodeBinding?: NodeBinding
    reuseWorker?: ThreadManagerOptionsMain['reuseWorker']
    asyncWorkPoolSize?: number
    waitThreadStart?: MainThreadBaseOptions['waitThreadStart']
    onCreateWorker?: (info: CreateWorkerInfo) => any
    print?: (str: string) => void
    printErr?: (str: string) => void
    postMessage?: (msg: any) => any
    plugins?: (PluginFactory | EmnapiPlugin)[]
}

export declare interface BaseOptions {
    wasi: WASIInstance;
    version?: 'preview1';
    wasm64?: boolean;
}

export declare interface ChildThreadOptions extends BaseOptions {
    childThread: true;
    postMessage?: (data: any) => void;
}

export declare interface CleanupThreadPayload {
    tid: number;
}

export declare interface CommandInfo<T extends CommandType> {
    type: T;
    payload: CommandPayloadMap[T];
}

export declare interface CommandPayloadMap {
    load: LoadPayload;
    loaded: LoadedPayload;
    start: StartPayload;
    'cleanup-thread': CleanupThreadPayload;
    'terminate-all-threads': TerminateAllThreadsPayload;
    'spawn-thread': SpawnThreadPayload;
}

export declare type CommandType = keyof CommandPayloadMap;

export declare function createInstanceProxy(instance: WebAssembly.Instance, memory?: WebAssembly.Memory | (() => WebAssembly.Memory)): WebAssembly.Instance;

/** @public */
export declare function createNapiModule (
options: CreateOptions
): NapiModule

/** @public */
export declare type CreateOptions = BaseCreateOptions & ({
    context: Context
    childThread?: boolean
} | {
    context?: Context
    childThread: true
})

/** @public */
export declare interface CreateWorkerInfo {
    type: 'thread' | 'async-work'
    name: string
}

/** @public */
export declare interface EmnapiPlugin {
    importObject?: (originalImports: WebAssembly.Imports) => (WebAssembly.Imports | void)
}

/** @public */
export declare interface InitOptions {
    instance: WebAssembly.Instance
    module: WebAssembly.Module
    memory?: WebAssembly.Memory
    table?: WebAssembly.Table
}

export declare type InputType = string | URL | Response | BufferSource | WebAssembly.Module;

export declare interface InstantiatedSource extends LoadedSource {
    napiModule: NapiModule;
}

export declare function instantiateNapiModule(wasmInput: InputType | Promise<InputType>, options: InstantiateOptions): Promise<InstantiatedSource>;

export declare function instantiateNapiModuleSync(wasmInput: BufferSource | WebAssembly.Module, options: InstantiateOptions): InstantiatedSource;

export declare type InstantiateOptions = CreateOptions & LoadOptions;

export declare function isSharedArrayBuffer(value: any): value is SharedArrayBuffer;

export declare function isTrapError(e: Error): e is WebAssembly.RuntimeError;

export declare interface LoadedPayload {
}

export declare interface LoadedSource extends WebAssembly.WebAssemblyInstantiatedSource {
    usedInstance: WebAssembly.Instance;
}

export declare function loadNapiModule(napiModule: NapiModule, wasmInput: InputType | Promise<InputType>, options?: LoadOptions): Promise<LoadedSource>;

export declare function loadNapiModuleSync(napiModule: NapiModule, wasmInput: BufferSource | WebAssembly.Module, options?: LoadOptions): LoadedSource;

export declare interface LoadOptions {
    wasi?: WASIInstance;
    overwriteImports?: (importObject: WebAssembly.Imports) => WebAssembly.Imports;
    beforeInit?: (source: WebAssembly.WebAssemblyInstantiatedSource) => void;
    getMemory?: (exports: WebAssembly.Exports) => WebAssembly.Memory;
    getTable?: (exports: WebAssembly.Exports) => WebAssembly.Table;
}

export declare interface LoadPayload {
    wasmModule: WebAssembly.Module;
    wasmMemory: WebAssembly.Memory;
    sab?: Int32Array;
}

export declare interface MainThreadBaseOptions extends BaseOptions {
    waitThreadStart?: boolean | number;
}

export declare type MainThreadOptions = MainThreadOptionsWithThreadManager | MainThreadOptionsCreateThreadManager;

export declare interface MainThreadOptionsCreateThreadManager extends MainThreadBaseOptions, ThreadManagerOptionsMain {
}

export declare interface MainThreadOptionsWithThreadManager extends MainThreadBaseOptions {
    threadManager?: ThreadManager | (() => ThreadManager);
}

export declare interface MessageEventData<T extends CommandType> {
    __emnapi__: CommandInfo<T>;
}

export declare class MessageHandler extends ThreadMessageHandler {
    napiModule: NapiModule | undefined;
    constructor(options: MessageHandlerOptions);
    instantiate(data: LoadPayload): InstantiatedSource | PromiseLike<InstantiatedSource>;
    handle(e: WorkerMessageEvent): void;
}

export declare interface MessageHandlerOptions extends ThreadMessageHandlerOptions {
    onLoad: (data: LoadPayload) => InstantiatedSource | PromiseLike<InstantiatedSource>;
}

/** @public */
export declare interface NapiModule {
    imports: {
        env: any
        napi: any
        emnapi: any
    }
    exports: any
    loaded: boolean
    filename: string
    childThread: boolean
    emnapi: {
        /**
         * Synchronize data between the wasm memory and an ArrayBuffer / view.
         *
         * Note: when a non-shared wasm memory has grown, a view over the
         * detached old buffer is re-created over the current buffer through the
         * intrinsic base-class constructor, so for view inputs the returned view
         * may be a base-class instance (e.g. `Uint8Array` or `DataView`)
         * instead of the subclass that was passed in.
         */
        syncMemory<T extends ArrayBuffer | ArrayBufferView> (
        js_to_wasm: boolean,
        arrayBufferOrView: T,
        offset?: number,
        len?: number
        ): T extends ArrayBufferView ? ArrayBufferView : T
        getMemoryAddress (arrayBufferOrView: ArrayBuffer | ArrayBufferView): PointerInfo
        addSendListener (worker: any): boolean
    }

    init (options: InitOptions): any
    initWorker (arg: number, func: [number, number]): void
    postMessage?: (msg: any) => any

    waitThreadStart: boolean | number
    /* Excluded from this release type: PThread */}

/** @public */
export declare interface NodeBinding {
    node: {
        emitAsyncInit: Function
        emitAsyncDestroy: Function
        makeCallback: Function
    }
    napi: {
        asyncInit: Function
        asyncDestroy: Function
        makeCallback: Function
    }
}

/** @public */
export declare type PluginContext = any

/** @public */
export declare type PluginFactory = (ctx: PluginContext) => EmnapiPlugin

/** @public */
export declare interface PointerInfo {
    address: number
    ownership: ReferenceOwnership
    runtimeAllocated: 0 | 1
}

export declare interface ReuseWorkerOptions {
    size: number;
    strict?: boolean;
}

export declare interface SpawnThreadPayload {
    startArg: number;
    errorOrTid: number;
}

export declare interface StartPayload {
    tid: number;
    arg: number;
    sab?: Int32Array;
}

export declare interface StartResult {
    exitCode: number;
    instance: WebAssembly.Instance;
}

export declare interface TerminateAllThreadsPayload {
}

export declare class ThreadManager {
    unusedWorkers: WorkerLike[];
    pthreads: Record<number, WorkerLike>;
    get nextWorkerID(): number;
    wasmModule: WebAssembly.Module | null;
    wasmMemory: WebAssembly.Memory | null;
    private readonly messageEvents;
    private readonly _childThread;
    private readonly _onCreateWorker;
    private readonly _reuseWorker;
    private readonly _beforeLoad?;
    readonly printErr: (message: string) => void;
    threadSpawn?: ((startArg: number, errorOrTid?: number) => number);
    constructor(options: ThreadManagerOptions);
    init(): void;
    initMainThread(): void;
    private preparePool;
    shouldPreloadWorkers(): boolean;
    loadWasmModuleToAllWorkers(): Promise<WorkerLike[]>;
    preloadWorkers(): Promise<WorkerLike[]>;
    setup(wasmModule: WebAssembly.Module, wasmMemory: WebAssembly.Memory): void;
    markId(worker: WorkerLike): number;
    returnWorkerToPool(worker: WorkerLike): void;
    loadWasmModuleToWorker(worker: WorkerLike, sab?: Int32Array): Promise<WorkerLike>;
    allocateUnusedWorker(): WorkerLike;
    getNewWorker(sab?: Int32Array): WorkerLike | undefined;
    cleanThread(worker: WorkerLike, tid: number, force?: boolean): void;
    terminateWorker(worker: WorkerLike): void;
    terminateAllThreads(): void;
    addMessageEventListener(worker: WorkerLike, onMessage: (e: WorkerMessageEvent) => void): () => void;
    fireMessageEvent(worker: WorkerLike, e: WorkerMessageEvent): void;
}

export declare type ThreadManagerOptions = ThreadManagerOptionsMain | ThreadManagerOptionsChild;

export declare interface ThreadManagerOptionsBase {
    printErr?: (message: string) => void;
    threadSpawn?: (startArg: number, errorOrTid?: number) => number;
}

export declare interface ThreadManagerOptionsChild extends ThreadManagerOptionsBase {
    childThread: true;
}

export declare interface ThreadManagerOptionsMain extends ThreadManagerOptionsBase {
    beforeLoad?: (worker: WorkerLike) => any;
    reuseWorker?: boolean | number | ReuseWorkerOptions;
    onCreateWorker: WorkerFactory;
    childThread?: false;
}

export declare class ThreadMessageHandler {
    protected instance: WebAssembly.Instance | undefined;
    private messagesBeforeLoad;
    protected postMessage: (message: any) => void;
    protected onLoad?: (data: LoadPayload) => WebAssembly.WebAssemblyInstantiatedSource | PromiseLike<WebAssembly.WebAssemblyInstantiatedSource>;
    protected onError: (error: Error, type: WorkerMessageType) => void;
    constructor(options?: ThreadMessageHandlerOptions);
    instantiate(data: LoadPayload): WebAssembly.WebAssemblyInstantiatedSource | PromiseLike<WebAssembly.WebAssemblyInstantiatedSource>;
    handle(e: WorkerMessageEvent<MessageEventData<WorkerMessageType>>): void;
    private _load;
    private _start;
    protected _loaded(err: Error | null, source: WebAssembly.WebAssemblyInstantiatedSource | null, payload: LoadPayload): void;
    protected handleAfterLoad<E extends WorkerMessageEvent>(e: E, f: (e: E) => void): void;
}

export declare interface ThreadMessageHandlerOptions {
    onLoad?: (data: LoadPayload) => WebAssembly.WebAssemblyInstantiatedSource | PromiseLike<WebAssembly.WebAssemblyInstantiatedSource>;
    onError?: (error: Error, type: WorkerMessageType) => void;
    postMessage?: (message: any) => void;
}

export declare const version: string;

export declare interface WASIInstance {
    readonly wasiImport?: Record<string, any>;
    initialize(instance: object): void;
    start(instance: object): number;
    getImportObject?(): any;
}

export declare class WASIThreads {
    PThread: ThreadManager | undefined;
    private wasmMemory;
    private wasmInstance;
    private readonly threadSpawn;
    readonly childThread: boolean;
    private readonly postMessage;
    readonly wasi: WASIInstance;
    constructor(options: WASIThreadsOptions);
    getImportObject(): {
        wasi: WASIThreadsImports;
    };
    setup(wasmInstance: WebAssembly.Instance, wasmModule: WebAssembly.Module, wasmMemory?: WebAssembly.Memory): void;
    preloadWorkers(): Promise<WorkerLike[]>;
    initialize(instance: WebAssembly.Instance, module: WebAssembly.Module, memory?: WebAssembly.Memory): WebAssembly.Instance;
    start(instance: WebAssembly.Instance, module: WebAssembly.Module, memory?: WebAssembly.Memory): StartResult;
    terminateAllThreads(): void;
}

export declare interface WASIThreadsImports {
    'thread-spawn': (startArg: number, errorOrTid?: number) => number;
}

export declare type WASIThreadsOptions = MainThreadOptions | ChildThreadOptions;

export declare type WorkerFactory = (ctx: {
    type: string;
    name: string;
}) => WorkerLike;

export declare type WorkerLike = (Worker | Worker_2) & {
    whenLoaded?: Promise<WorkerLike>;
    loaded?: boolean;
    __emnapi_tid?: number;
};

export declare interface WorkerMessageEvent<T = any> {
    data: T;
}

export declare type WorkerMessageType = 'load' | 'start';

export { }

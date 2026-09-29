//#region src/emnapi/v8.js
function v8 (emnapiPluginCtx) {
  const { emnapiCtx, emnapiString } = emnapiPluginCtx;
  var mod = (function (exports, emscripten_runtime) {

    //#region src/v8/array.ts
    /**
     * @__deps $emnapiCtx
     * @__sig ppi
     */
    function _v8_array_new(context, value) {
        return emnapiCtx.napiValueFromJsValue(Array(value));
    }
    /**
     * @__deps $emnapiCtx
     * @__sig ip
     */
    function _v8_array_length(array) {
        const arr = emnapiCtx.jsValueFromNapiValue(array);
        return arr.length;
    }

    //#endregion src/v8/array.ts

    //#region src/v8/boolean.ts
    /**
     * @__deps $emnapiCtx
     * @__sig ip
     */
    function _v8_boolean_value(value) {
        const jsValue = emnapiCtx.jsValueFromNapiValue(value);
        return jsValue ? 1 : 0;
    }
    /**
     * @__deps $emnapiCtx
     * @__sig ppi
     */
    function _v8_boolean_object_new(isolate, value) {
        // eslint-disable-next-line no-new-wrappers
        return emnapiCtx.napiValueFromJsValue(new Boolean(value));
    }
    /**
     * @__deps $emnapiCtx
     * @__sig ip
     */
    function _v8_boolean_object_value_of(self) {
        const boolObj = emnapiCtx.jsValueFromNapiValue(self);
        return boolObj.valueOf() ? 1 : 0;
    }

    //#endregion src/v8/boolean.ts

    //#region src/v8/date.ts
    /**
     * @__deps $emnapiCtx
     * @__sig ppd
     */
    function _v8_date_new(context, value) {
        return emnapiCtx.napiValueFromJsValue(new Date(value));
    }

    //#endregion src/v8/date.ts

    //#region src/v8/exception.ts
    /**
     * @__deps $emnapiCtx
     * @__sig ppp
     */
    function _v8_exception_error(message, options) {
        return emnapiCtx.napiValueFromJsValue(new Error(emnapiCtx.jsValueFromNapiValue(message), 
        // @ts-ignore
        emnapiCtx.jsValueFromNapiValue(options)));
    }
    /**
     * @__deps $emnapiCtx
     * @__sig ppp
     */
    function _v8_exception_type_error(message, options) {
        return emnapiCtx.napiValueFromJsValue(new TypeError(emnapiCtx.jsValueFromNapiValue(message), 
        // @ts-ignore
        emnapiCtx.jsValueFromNapiValue(options)));
    }
    /**
     * @__deps $emnapiCtx
     * @__sig ppp
     */
    function _v8_exception_range_error(message, options) {
        return emnapiCtx.napiValueFromJsValue(new RangeError(emnapiCtx.jsValueFromNapiValue(message), 
        // @ts-ignore
        emnapiCtx.jsValueFromNapiValue(options)));
    }
    /**
     * @__deps $emnapiCtx
     * @__sig ppp
     */
    function _v8_exception_reference_error(message, options) {
        return emnapiCtx.napiValueFromJsValue(new ReferenceError(emnapiCtx.jsValueFromNapiValue(message), 
        // @ts-ignore
        emnapiCtx.jsValueFromNapiValue(options)));
    }
    /**
     * @__deps $emnapiCtx
     * @__sig ppp
     */
    function _v8_exception_syntax_error(message, options) {
        return emnapiCtx.napiValueFromJsValue(new SyntaxError(emnapiCtx.jsValueFromNapiValue(message), 
        // @ts-ignore
        emnapiCtx.jsValueFromNapiValue(options)));
    }

    //#endregion src/v8/exception.ts

    //#region src/v8/external.ts
    /**
     * @__deps $emnapiCtx
     * @__sig ppp
     */
    function _v8_external_new(isolate, data) {
        const external = emnapiCtx.isolate.createExternal(data);
        return emnapiCtx.napiValueFromJsValue(external);
    }
    /**
     * @__deps $emnapiCtx
     * @__sig pp
     */
    function _v8_external_value(external) {
        const obj = emnapiCtx.jsValueFromNapiValue(external);
        return emnapiCtx.isolate.getExternalValue(obj);
    }

    //#endregion src/v8/external.ts

    //#region src/v8/function.ts
    /**
     * @__deps $emnapiCtx
     * @__sig vpp
     */
    function _v8_function_set_name(fn, name) {
        if (!emnapiCtx.features.setFunctionName) {
            return;
        }
        const str = emnapiCtx.jsValueFromNapiValue(name);
        const func = emnapiCtx.jsValueFromNapiValue(fn);
        emnapiCtx.features.setFunctionName(func, str);
    }
    /**
     * @__deps $emnapiCtx
     * @__sig ppppp
     */
    function _v8_function_new_instance(fn, ctx, argc, argv) {
        if (emnapiCtx.isolate.hasPendingException())
            return 1;
        const Ctor = emnapiCtx.jsValueFromNapiValue(fn);
        argv >>>= 0;
        let i;
        let ret;
        try {
            var HEAP_DATA_VIEW = new DataView(emnapiPluginCtx.wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === emnapiPluginCtx.wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(emnapiPluginCtx.wasmMemory.buffer));
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
        }
        catch (err) {
            emnapiCtx.isolate.throwException(err);
            return 1;
        }
        return emnapiCtx.napiValueFromJsValue(ret);
    }
    /**
     * @__deps $emnapiCtx
     * @__sig ppppip
     */
    function _v8_function_call(fn, ctx, recv, argc, argv) {
        if (emnapiCtx.isolate.hasPendingException())
            return 1;
        const func = emnapiCtx.jsValueFromNapiValue(fn);
        const thisArg = emnapiCtx.jsValueFromNapiValue(recv);
        argv >>>= 0;
        let i;
        let ret;
        try {
            const argList = Array(argc);
            var HEAP_DATA_VIEW = new DataView(emnapiPluginCtx.wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === emnapiPluginCtx.wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(emnapiPluginCtx.wasmMemory.buffer));
            for (i = 0; i < argc; i++) {
                const argVal = GET_HEAP_DATA_VIEW().getUint32(argv + i * 4, true);
                argList[i] = emnapiCtx.jsValueFromNapiValue(argVal);
            }
            ret = func.apply(thisArg, argList);
        }
        catch (err) {
            emnapiCtx.isolate.throwException(err);
            return 1;
        }
        return emnapiCtx.napiValueFromJsValue(ret);
    }

    //#endregion src/v8/function.ts

    //#region src/v8/handle_scope.ts
    /**
     * @__deps $emnapiCtx
     * @__sig pp
     */
    function _v8_open_handle_scope(_isolate) {
        return emnapiCtx.isolate.openScope().id;
    }
    /**
     * @__deps $emnapiCtx
     * @__sig v
     */
    function _v8_close_handle_scope() {
        return emnapiCtx.isolate.closeScope();
    }
    /**
     * @__deps $emnapiCtx
     * @__sig ppp
     */
    function _v8_handle_scope_escape(scope, value) {
        const scopeValue = emnapiCtx.getHandleScope(scope);
        value >>>= 0;
        return scopeValue.escape(value);
    }

    //#endregion src/v8/handle_scope.ts

    //#region src/v8/internal.ts
    /**
     * @__deps $emnapiCtx
     * @__sig pp
     */
    function _v8_local_from_global_reference(ref) {
        const reference = emnapiCtx.isolate.getRef(ref);
        if (reference === undefined)
            return 1;
        const id = reference.slot();
        return id || 1;
    }
    /**
     * @__deps $emnapiCtx
     * @__sig ppp
     */
    function _v8_globalize_reference(isolate, value) {
        const jsValue = emnapiCtx.jsValueFromNapiValue(value);
        if (jsValue === undefined)
            return 0;
        return emnapiCtx.isolate.createReference(jsValue).id;
    }
    /**
     * @__deps $emnapiCtx
     * @__sig pp
     */
    function _v8_copy_global_reference(from) {
        const ref = emnapiCtx.isolate.getRef(from);
        if (ref === undefined)
            return 0;
        return ref.copy().id;
    }
    /**
     * @__deps $emnapiCtx
     * @__sig vpp
     */
    function _v8_move_global_reference(from, to) {
        const refFrom = emnapiCtx.isolate.getRef(from);
        const refTo = emnapiCtx.isolate.getRef(to);
        if (refFrom === undefined || refTo === undefined)
            return;
        refFrom.move(refTo);
    }
    /**
     * @__deps $emnapiCtx
     * @__sig vp
     */
    function _v8_dispose_global(ref) {
        emnapiCtx.isolate.removeRef(ref);
    }
    /**
     * @__deps $emnapiCtx
     * @__sig vppppi
     */
    function _v8_make_weak(ref, data, callback, weak_callback, type) {
        const refValue = emnapiCtx.isolate.getRef(ref);
        if (!refValue)
            return;
        callback >>>= 0;
        refValue.setWeak(data, (data) => {
            let field0 = 0;
            let field1 = 0;
            if (type === 1) {
                const id = refValue.slot();
                if (id) {
                    const value = emnapiCtx.jsValueFromNapiValue(id);
                    field0 = emnapiCtx.isolate.getInternalField(value, 0);
                    field1 = emnapiCtx.isolate.getInternalField(value, 1);
                    if ((typeof field0 !== 'number' && typeof field0 !== 'bigint') ||
                        (typeof field1 !== 'number' && typeof field1 !== 'bigint')) {
                        throw new Error('Internal field is not a number');
                    }
                }
            }
            (emnapiPluginCtx.wasmTable.get(callback))(weak_callback, data, type, field0, field1);
        });
    }
    /**
     * @__deps $emnapiCtx
     * @__sig pp
     */
    function _v8_clear_weak(ref) {
        const refValue = emnapiCtx.isolate.getRef(ref);
        if (!refValue)
            return 0;
        refValue.clearWeak();
        return 0;
    }

    //#endregion src/v8/internal.ts

    //#region src/v8/isolate.ts
    /**
     * @__sig p
     */
    function _v8_isolate_get_current_context() {
        return 6 /* Constant.GLOBAL */;
    }
    /**
     * @__deps $emnapiCtx
     * @__sig pp
     */
    function _v8_isolate_throw_exception(error) {
        emnapiCtx.isolate.throwException(emnapiCtx.jsValueFromNapiValue(error));
        return error;
    }

    //#endregion src/v8/isolate.ts

    //#region src/v8/json.ts
    /**
     * @__deps $emnapiCtx
     * @__sig ppp
     */
    function _v8_json_parse(context, json_string) {
        const jsonStringValue = emnapiCtx.jsValueFromNapiValue(json_string);
        try {
            const parsedValue = JSON.parse(jsonStringValue);
            return emnapiCtx.napiValueFromJsValue(parsedValue);
        }
        catch (e) {
            emnapiCtx.isolate.throwException(e);
            return 0;
        }
    }
    /**
     * @__deps $emnapiCtx
     * @__sig pppp
     */
    function _v8_json_stringify(context, json_object, gap) {
        const jsonStringValue = emnapiCtx.jsValueFromNapiValue(json_object);
        try {
            const str = JSON.stringify(jsonStringValue, null, emnapiCtx.jsValueFromNapiValue(gap));
            return emnapiCtx.napiValueFromJsValue(str);
        }
        catch (e) {
            emnapiCtx.isolate.throwException(e);
            return 0;
        }
    }

    //#endregion src/v8/json.ts

    //#region src/v8/number.ts
    /**
     * @__deps $emnapiCtx
     * @__sig dp
     */
    function _v8_number_value(value) {
        const jsValue = emnapiCtx.jsValueFromNapiValue(value);
        return Number(jsValue);
    }
    /**
     * @__deps $emnapiCtx
     * @__sig vpp
     */
    function _v8_integer_value(value, out) {
        const jsValue = emnapiCtx.jsValueFromNapiValue(value);
        // Use BigInt if available, else fallback to Number
        let v;
        if (typeof jsValue === 'bigint') {
            v = jsValue;
        }
        else {
            v = Math.trunc(Number(jsValue));
        }
        out >>>= 0;
        var HEAP_DATA_VIEW = new DataView(emnapiPluginCtx.wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === emnapiPluginCtx.wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(emnapiPluginCtx.wasmMemory.buffer));
        GET_HEAP_DATA_VIEW().setBigInt64(out, BigInt(v), true);
    }
    /**
     * @__deps $emnapiCtx
     * @__sig ip
     */
    function _v8_uint32_value(value) {
        const jsValue = emnapiCtx.jsValueFromNapiValue(value);
        return Number(jsValue) >>> 0;
    }
    /**
     * @__deps $emnapiCtx
     * @__sig ip
     */
    function _v8_int32_value(value) {
        const jsValue = emnapiCtx.jsValueFromNapiValue(value);
        return Number(jsValue) | 0;
    }
    /**
     * @__deps $emnapiCtx
     * @__sig ppd
     */
    function _v8_number_new(isolate, value) {
        return emnapiCtx.napiValueFromJsValue(value);
    }
    /**
     * @__deps $emnapiCtx
     * @__sig ppi
     */
    function _v8_integer_new(isolate, value) {
        return emnapiCtx.napiValueFromJsValue(value | 0);
    }
    /**
     * @__deps $emnapiCtx
     * @__sig ppi
     */
    function _v8_integer_new_from_unsigned(isolate, value) {
        return emnapiCtx.napiValueFromJsValue(value >>> 0);
    }
    /**
     * @__deps $emnapiCtx
     * @__sig ppd
     */
    function _v8_number_object_new(isolate, value) {
        // eslint-disable-next-line no-new-wrappers
        return emnapiCtx.napiValueFromJsValue(new Number(value));
    }

    //#endregion src/v8/number.ts

    //#region src/v8/object.ts
    /**
     * @__deps $emnapiCtx
     * @__sig ippppp
     */
    function _v8_object_set(obj, context, key, value, success) {
        let r = false;
        try {
            r = Reflect.set(emnapiCtx.jsValueFromNapiValue(obj), emnapiCtx.jsValueFromNapiValue(key), emnapiCtx.jsValueFromNapiValue(value));
        }
        catch (_) {
            return 10;
        }
        success >>>= 0;
        if (success) {
            const v = r ? 1 : 0;
            var HEAP_DATA_VIEW = new DataView(emnapiPluginCtx.wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === emnapiPluginCtx.wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(emnapiPluginCtx.wasmMemory.buffer));
            GET_HEAP_DATA_VIEW().setInt32(success, v, true);
        }
        return 0;
    }
    /**
     * @__deps $emnapiCtx
     * @__sig ip
     */
    function _v8_object_internal_field_count(obj) {
        const objValue = emnapiCtx.jsValueFromNapiValue(obj);
        return emnapiCtx.isolate.getInternalFieldCount(objValue);
    }
    /**
     * @__deps $emnapiCtx
     * @__sig vpip
     */
    function _v8_object_set_internal_field(obj, index, data) {
        const objValue = emnapiCtx.jsValueFromNapiValue(obj);
        const dataValue = emnapiCtx.jsValueFromNapiValue(data);
        emnapiCtx.isolate.setInternalField(objValue, index, dataValue);
    }
    /**
     * @__deps $emnapiCtx
     * @__sig vpip
     */
    function _v8_object_set_aligned_pointer_in_internal_field(obj, index, data) {
        const objValue = emnapiCtx.jsValueFromNapiValue(obj);
        emnapiCtx.isolate.setInternalField(objValue, index, data);
    }
    /**
     * @__deps $emnapiCtx
     * @__sig pip
     */
    function _v8_object_get_internal_field(obj, index) {
        const objValue = emnapiCtx.jsValueFromNapiValue(obj);
        return emnapiCtx.isolate.napiValueFromJsValue(emnapiCtx.isolate.getInternalField(objValue, index));
    }
    /**
     * @__deps $emnapiCtx
     * @__sig pip
     */
    function _v8_object_get_aligned_pointer_in_internal_field(obj, index) {
        const objValue = emnapiCtx.jsValueFromNapiValue(obj);
        return emnapiCtx.isolate.getInternalField(objValue, index);
    }
    /**
     * @__deps $emnapiCtx
     * @__sig pppp
     */
    function _v8_object_get_key(obj, context, key) {
        const objValue = emnapiCtx.jsValueFromNapiValue(obj);
        if (!objValue)
            return 1;
        return emnapiCtx.napiValueFromJsValue(objValue[emnapiCtx.jsValueFromNapiValue(key)]);
    }
    /**
     * @__deps $emnapiCtx
     * @__sig pppi
     */
    function _v8_object_get_index(obj, context, index) {
        const objValue = emnapiCtx.jsValueFromNapiValue(obj);
        if (!objValue)
            return 1;
        return emnapiCtx.napiValueFromJsValue(objValue[index >>> 0]);
    }
    /**
     * @__deps $emnapiCtx
     * @__sig ppp
     */
    function _v8_private_for_api(isolate, name) {
        const n = emnapiCtx.isolate.getOrCreateGlobalPrivate(emnapiCtx.jsValueFromNapiValue(name));
        return emnapiCtx.napiValueFromJsValue(n);
    }
    /**
     * @__deps $emnapiCtx
     * @__sig ippppp
     */
    function _v8_object_set_private(obj, context, key, value, success) {
        if (emnapiCtx.isolate.hasPendingException())
            return 1;
        const o = emnapiCtx.jsValueFromNapiValue(obj);
        const k = emnapiCtx.jsValueFromNapiValue(key);
        const v = emnapiCtx.jsValueFromNapiValue(value);
        try {
            emnapiCtx.isolate.setPrivate(o, k, v);
        }
        catch (err) {
            emnapiCtx.isolate.throwException(err);
            return 1;
        }
        success >>>= 0;
        if (success) {
            const vv = 1;
            var HEAP_DATA_VIEW = new DataView(emnapiPluginCtx.wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === emnapiPluginCtx.wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(emnapiPluginCtx.wasmMemory.buffer));
            GET_HEAP_DATA_VIEW().setInt32(success, vv, true);
        }
        return 0;
    }
    /**
     * @__deps $emnapiCtx
     * @__sig ipppp
     */
    function _v8_object_has_private(obj, context, key, has) {
        if (emnapiCtx.isolate.hasPendingException())
            return 1;
        const o = emnapiCtx.jsValueFromNapiValue(obj);
        const k = emnapiCtx.jsValueFromNapiValue(key);
        let v;
        try {
            v = emnapiCtx.isolate.hasPrivate(o, k) ? 1 : 0;
        }
        catch (err) {
            emnapiCtx.isolate.throwException(err);
            return 1;
        }
        has >>>= 0;
        if (has) {
            var HEAP_DATA_VIEW = new DataView(emnapiPluginCtx.wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === emnapiPluginCtx.wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(emnapiPluginCtx.wasmMemory.buffer));
            GET_HEAP_DATA_VIEW().setInt32(has, v, true);
        }
        return 0;
    }
    /**
     * @__deps $emnapiCtx
     * @__sig pppp
     */
    function _v8_object_get_private(obj, context, key) {
        if (emnapiCtx.isolate.hasPendingException())
            return 1;
        const o = emnapiCtx.jsValueFromNapiValue(obj);
        const k = emnapiCtx.jsValueFromNapiValue(key);
        try {
            const v = emnapiCtx.isolate.getPrivate(o, k);
            return emnapiCtx.napiValueFromJsValue(v);
        }
        catch (err) {
            emnapiCtx.isolate.throwException(err);
            return 1;
        }
    }
    /**
     * @__deps $emnapiCtx
     * @__sig ipppp
     */
    function _v8_object_delete_private(obj, context, key, success) {
        if (emnapiCtx.isolate.hasPendingException())
            return 1;
        const o = emnapiCtx.jsValueFromNapiValue(obj);
        const k = emnapiCtx.jsValueFromNapiValue(key);
        let r;
        try {
            r = emnapiCtx.isolate.deletePrivate(o, k);
        }
        catch (err) {
            emnapiCtx.isolate.throwException(err);
            return 1;
        }
        success >>>= 0;
        if (success) {
            const vv = r ? 1 : 0;
            var HEAP_DATA_VIEW = new DataView(emnapiPluginCtx.wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === emnapiPluginCtx.wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(emnapiPluginCtx.wasmMemory.buffer));
            GET_HEAP_DATA_VIEW().setInt32(success, vv, true);
        }
        return 0;
    }
    /**
     * @__deps $emnapiCtx
     * @__sig pp
     */
    function _v8_object_new(isolate) {
        return emnapiCtx.napiValueFromJsValue({});
    }

    //#endregion src/v8/object.ts

    //#region src/v8/script.ts
    /**
     * @__deps $emnapiCtx
     * @__sig pppii
     */
    function _v8_script_compiler_compile_unbound_script(isolate, sourceString, options, reason) {
        const str = emnapiCtx.jsValueFromNapiValue(sourceString);
        if (!str)
            return 1;
        return emnapiCtx.napiValueFromJsValue(str);
    }
    /**
     * @__deps $emnapiCtx
     * @__sig pp
     */
    function _v8_unbound_script_bind_to_current_context(unboundScript) {
        const str = emnapiCtx.jsValueFromNapiValue(unboundScript);
        if (!str)
            return 1;
        return emnapiCtx.napiValueFromJsValue(str);
    }
    /**
     * @__deps $emnapiCtx
     * @__sig ppp
     */
    function _v8_script_run(script, context) {
        if (emnapiCtx.isolate.hasPendingException())
            return 1;
        const str = emnapiCtx.jsValueFromNapiValue(script);
        const g = emnapiCtx.jsValueFromNapiValue(context);
        let ret;
        try {
            ret = g.eval(str);
        }
        catch (err) {
            emnapiCtx.isolate.throwException(err);
            return 1;
        }
        return emnapiCtx.napiValueFromJsValue(ret);
    }

    //#endregion src/v8/script.ts

    //#region src/v8/string.ts
    /**
     * @__deps $emnapiCtx
     * @__deps $emnapiString
     * @__sig pppii
     */
    function _v8_string_new_from_utf8(isolate, data, type, length) {
        data >>>= 0;
        length >>>= 0;
        const str = emnapiString.UTF8ToString(data, length);
        return emnapiCtx.napiValueFromJsValue(str);
    }
    /**
     * @__deps $emnapiCtx
     * @__sig ppp
     */
    function _v8_string_object_new(isolate, value) {
        // eslint-disable-next-line no-new-wrappers
        return emnapiCtx.napiValueFromJsValue(new String(emnapiCtx.jsValueFromNapiValue(value)));
    }
    /**
     * @__deps $emnapiCtx
     * @__sig pp
     */
    function _v8_string_object_value_of(self) {
        const strObj = emnapiCtx.jsValueFromNapiValue(self);
        return emnapiCtx.napiValueFromJsValue(strObj.valueOf());
    }
    /**
     * @__deps $emnapiCtx
     * @__deps $emnapiString
     * @__sig pppii
     */
    function _v8_string_new_from_one_byte(isolate, data, type, length) {
        data >>>= 0;
        length >>>= 0;
        const str = emnapiString.encode(data, length === -1 || length === 4294967295, length >>> 0, (c) => String.fromCharCode(c));
        return emnapiCtx.napiValueFromJsValue(str);
    }
    /**
     * @__deps $emnapiCtx
     * @__deps $emnapiString
     * @__sig pppii
     */
    function _v8_string_new_from_two_byte(isolate, data, type, length) {
        data >>>= 0;
        length >>>= 0;
        const str = emnapiString.UTF16ToString(data, length);
        return emnapiCtx.napiValueFromJsValue(str);
    }
    /**
     * @__deps $emnapiCtx
     * @__deps $emnapiString
     * @__sig pppi
     */
    function _v8_string_new_external_one_byte(isolate, data, length) {
        data >>>= 0;
        length >>>= 0;
        const str = emnapiString.encode(data, length === -1 || length === 4294967295, length >>> 0, (c) => String.fromCharCode(c));
        return emnapiCtx.napiValueFromJsValue(str);
    }
    /**
     * @__deps $emnapiCtx
     * @__deps $emnapiString
     * @__sig pppi
     */
    function _v8_string_new_external_two_byte(isolate, data, length) {
        data >>>= 0;
        length >>>= 0;
        const str = emnapiString.UTF16ToString(data, length);
        return emnapiCtx.napiValueFromJsValue(str);
    }
    /**
     * @__deps $emnapiCtx
     * @__sig pppi
     */
    function _v8_regex_new(context, pattern, flags) {
        pattern >>>= 0;
        const str = emnapiCtx.jsValueFromNapiValue(pattern);
        let f = '';
        if (flags & 1)
            f += 'g';
        if (flags & 2)
            f += 'i';
        if (flags & 4)
            f += 'm';
        if (flags & 8)
            f += 'y';
        if (flags & 16)
            f += 'u';
        if (flags & 32)
            f += 's';
        return emnapiCtx.napiValueFromJsValue(f ? new RegExp(str, f) : new RegExp(str));
    }
    /**
     * @__deps $emnapiCtx
     * @__deps $emnapiString
     * @__sig ipp
     */
    function _v8_string_utf8_length(str, isolate) {
        const jsValue = emnapiCtx.jsValueFromNapiValue(str);
        if (jsValue === undefined)
            return 0;
        if (typeof jsValue !== 'string')
            return 0;
        return emnapiString.lengthBytesUTF8(jsValue);
    }
    /**
     * @__deps $emnapiCtx
     * @__sig ip
     */
    function _v8_string_length(str) {
        const jsValue = emnapiCtx.jsValueFromNapiValue(str);
        if (jsValue === undefined)
            return 0;
        if (typeof jsValue !== 'string')
            return 0;
        return jsValue.length;
    }
    /**
     * @__deps $emnapiCtx
     * @__deps $emnapiString
     * @__sig ipppipi
     */
    function _v8_string_write_utf8(str, isolate, buffer, length, nchars_ref, options) {
        buffer >>>= 0;
        nchars_ref >>>= 0;
        const jsValue = emnapiCtx.jsValueFromNapiValue(str);
        var HEAP_DATA_VIEW = new DataView(emnapiPluginCtx.wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === emnapiPluginCtx.wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(emnapiPluginCtx.wasmMemory.buffer));
        if (jsValue === undefined || typeof jsValue !== 'string') {
            if (nchars_ref) {
                GET_HEAP_DATA_VIEW().setInt32(nchars_ref, 0, true);
            }
            return 0;
        }
        const written = emnapiString.stringToUTF8(jsValue, buffer, length);
        if (nchars_ref) {
            GET_HEAP_DATA_VIEW().setInt32(nchars_ref, written, true);
        }
        return written;
    }

    //#endregion src/v8/string.ts

    //#region src/v8/template.ts
    /**
     * @__deps $emnapiCtx
     * @__sig ippppp
     */
    function _v8_get_cb_info(cbinfo, argc, argv, this_arg, data) {
        if (!cbinfo)
            return 1;
        const cbinfoValue = emnapiCtx.getCallbackInfo(cbinfo);
        argc >>>= 0;
        argv >>>= 0;
        var HEAP_DATA_VIEW = new DataView(emnapiPluginCtx.wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === emnapiPluginCtx.wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(emnapiPluginCtx.wasmMemory.buffer));
        if (argv) {
            if (!argc)
                return 1;
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
            const localData = emnapiCtx.napiValueFromJsValue(cbinfoValue.data);
            GET_HEAP_DATA_VIEW().setUint32(data, localData, true);
        }
        return 0;
    }
    /**
     * @__deps $emnapiCtx
     * @__sig ppppppiiipiii
     */
    function _v8_function_template_new(isolate, callback, cb, data, signature, length, behavior, side_effect_type, c_function, instance_type, allowed_receiver_instance_type_range_start, allowed_receiver_instance_type_range_end) {
        const jsCb = (emnapiPluginCtx.wasmTable.get(callback));
        const tpl = emnapiCtx.isolate.createFunctionTemplate(jsCb, cb, emnapiCtx.jsValueFromNapiValue(data), emnapiCtx.jsValueFromNapiValue(signature));
        return emnapiCtx.napiValueFromJsValue(tpl);
    }
    /**
     * @__deps $emnapiCtx
     * @__sig pppppiii
     */
    function _v8_function_new(context, callback, cb, data, length, behavior, side_effect_type) {
        const jsCb = (emnapiPluginCtx.wasmTable.get(callback));
        const tpl = emnapiCtx.isolate.createFunctionTemplate(jsCb, cb, emnapiCtx.jsValueFromNapiValue(data), undefined);
        const func = tpl.getFunction();
        return emnapiCtx.napiValueFromJsValue(func);
    }
    /**
     * @__deps $emnapiCtx
     * @__sig pp
     */
    function _v8_cbinfo_holder(info) {
        const cbinfoValue = emnapiCtx.getCallbackInfo(info);
        const { holder } = cbinfoValue;
        return emnapiCtx.napiValueFromJsValue(holder);
    }
    /**
     * @__deps $emnapiCtx
     * @__sig pp
     */
    function _v8_cbinfo_new_target(info) {
        const cbinfoValue = emnapiCtx.getCallbackInfo(info);
        const { thiz, fn } = cbinfoValue;
        const value = thiz == null || thiz.constructor == null
            ? 0
            : thiz instanceof fn
                ? emnapiCtx.napiValueFromJsValue(thiz.constructor)
                : 0;
        return value;
    }
    /**
     * @__deps $emnapiCtx
     * @__sig ppp
     */
    function _v8_function_template_get_function(template, context) {
        const tpl = emnapiCtx.jsValueFromNapiValue(template);
        if (!tpl)
            return 0;
        return emnapiCtx.napiValueFromJsValue(tpl.getFunction());
    }
    function _v8_function_template_set_class_name(template, name) {
        const tpl = emnapiCtx.jsValueFromNapiValue(template);
        const nameValue = emnapiCtx.jsValueFromNapiValue(name);
        if (!tpl || nameValue == null)
            return;
        tpl.setClassName(nameValue);
    }
    /**
     * @__deps $emnapiCtx
     * @__sig ppp
     */
    function _v8_object_template_new(isolate, constructor) {
        const tpl = emnapiCtx.isolate.createObjectTemplate(emnapiCtx.jsValueFromNapiValue(constructor));
        return emnapiCtx.napiValueFromJsValue(tpl);
    }
    /**
     * @__deps $emnapiCtx
     * @__sig vpi
     */
    function _v8_object_template_set_internal_field_count(tpl, value) {
        const templateObject = emnapiCtx.jsValueFromNapiValue(tpl);
        templateObject.setInternalFieldCount(value);
    }
    /**
     * @__deps $emnapiCtx
     * @__sig ppp
     */
    function _v8_object_template_new_instance(obj_tpl, context) {
        if (emnapiCtx.isolate.hasPendingException())
            return 1;
        const objTemplate = emnapiCtx.jsValueFromNapiValue(obj_tpl);
        return emnapiCtx.napiValueFromJsValue(objTemplate.newInstance(context));
    }
    /**
     * @__deps $emnapiCtx
     * @__sig ppp
     */
    function _v8_signature_new(isolate, receiver) {
        const rcv = emnapiCtx.jsValueFromNapiValue(receiver);
        const sig = emnapiCtx.isolate.createSignature(rcv);
        return emnapiCtx.napiValueFromJsValue(sig);
    }
    /**
     * @__deps $emnapiCtx
     * @__sig vpppi
     */
    function _v8_template_set(tpl, name, value, attr) {
        const templateObject = emnapiCtx.jsValueFromNapiValue(tpl);
        if (!templateObject)
            return;
        const nameValue = emnapiCtx.jsValueFromNapiValue(name);
        const valueValue = emnapiCtx.jsValueFromNapiValue(value);
        if (nameValue == null)
            return;
        templateObject.set(nameValue, valueValue, attr);
    }
    /**
     * @__deps $emnapiCtx
     * @__sig pp
     */
    function _v8_function_template_instance_template(tpl) {
        const templateObject = emnapiCtx.jsValueFromNapiValue(tpl);
        if (!templateObject)
            return 1;
        return emnapiCtx.napiValueFromJsValue(templateObject.instanceTemplate());
    }
    /**
     * @__deps $emnapiCtx
     * @__sig pp
     */
    function _v8_function_template_prototype_template(tpl) {
        const templateObject = emnapiCtx.jsValueFromNapiValue(tpl);
        if (!templateObject)
            return 1;
        return emnapiCtx.napiValueFromJsValue(templateObject.prototypeTemplate());
    }
    /**
     * @__deps $emnapiCtx
     * @__sig vpp
     */
    function _v8_get_property_cb_info(cbinfo, args) {
        if (!cbinfo)
            return;
        const cbinfoValue = emnapiCtx.getCallbackInfo(cbinfo);
        args >>>= 0;
        const thiz = emnapiCtx.napiValueFromJsValue(cbinfoValue.thiz);
        const holder = emnapiCtx.napiValueFromJsValue(cbinfoValue.holder);
        var HEAP_DATA_VIEW = new DataView(emnapiPluginCtx.wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === emnapiPluginCtx.wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(emnapiPluginCtx.wasmMemory.buffer));
        GET_HEAP_DATA_VIEW().setUint32(args + 1 * 4, holder, true);
        GET_HEAP_DATA_VIEW().setUint32(args + 6 * 4, thiz, true);
        const localData = emnapiCtx.napiValueFromJsValue(cbinfoValue.data);
        GET_HEAP_DATA_VIEW().setUint32(args + 5 * 4, localData, true);
    }
    /**
     * @__deps $emnapiCtx
     * @__sig vpppppppiii
     */
    function _v8_object_template_set_accessor(tpl, name, getter_wrap, setter_wrap, getter, setter, data, attribute, getter_side_effect_type, setter_side_effect_type) {
        const templateObject = emnapiCtx.jsValueFromNapiValue(tpl);
        if (!templateObject)
            return;
        const nameValue = emnapiCtx.jsValueFromNapiValue(name);
        getter_wrap >>>= 0;
        setter_wrap >>>= 0;
        const getterWrap = (emnapiPluginCtx.wasmTable.get(getter_wrap));
        const setterWrap = (emnapiPluginCtx.wasmTable.get(setter_wrap));
        templateObject.setAccessor(nameValue, getterWrap, setterWrap, getter, setter, emnapiCtx.jsValueFromNapiValue(data), attribute, getter_side_effect_type, setter_side_effect_type);
    }

    //#endregion src/v8/template.ts

    //#region src/v8/try_catch.ts
    /**
     * @__deps $emnapiCtx
     * @__sig vp
     */
    function _v8_trycatch_construct(tc) {
        emnapiCtx.isolate.pushTryCatch(tc);
    }
    /**
     * @__deps $emnapiCtx
     * @__sig vp
     */
    function _v8_trycatch_destruct(tc) {
        emnapiCtx.isolate.popTryCatch(tc);
    }
    /**
     * @__deps $emnapiCtx
     * @__sig ip
     */
    function _v8_trycatch_has_caught(tc) {
        const tryCatch = emnapiCtx.isolate.getTryCatch(tc);
        if (!tryCatch)
            return 0;
        return Number(tryCatch.hasCaught());
    }
    /**
     * @__deps $emnapiCtx
     * @__sig pp
     */
    function _v8_trycatch_rethrow(tc) {
        const tryCatch = emnapiCtx.isolate.getTryCatch(tc);
        if (!tryCatch)
            return 1;
        const e = tryCatch.rethrow(emnapiCtx.isolate);
        if (e === undefined)
            return 1;
        return emnapiCtx.napiValueFromJsValue(e);
    }
    /**
     * @__deps $emnapiCtx
     * @__sig pp
     */
    function _v8_trycatch_exception(tc) {
        const tryCatch = emnapiCtx.isolate.getTryCatch(tc);
        if (!tryCatch || !tryCatch.hasCaught())
            return 1;
        return emnapiCtx.napiValueFromJsValue(tryCatch.exception());
    }
    /**
     * @__deps $emnapiCtx
     * @__sig vp
     */
    function _v8_trycatch_reset(tc) {
        const tryCatch = emnapiCtx.isolate.getTryCatch(tc);
        if (!tryCatch)
            return;
        tryCatch.reset();
    }

    //#endregion src/v8/try_catch.ts

    //#region src/v8/value.ts
    /**
     * @__deps $emnapiCtx
     * @__sig ipp
     */
    function _v8_value_strict_equals(value, that) {
        const jsValue = emnapiCtx.jsValueFromNapiValue(value);
        const jsThat = emnapiCtx.jsValueFromNapiValue(that);
        return Object.is(jsValue, jsThat) ? 1 : 0;
    }
    /**
     * @__deps $emnapiCtx
     * @__sig ppp
     */
    function _v8_value_to_boolean(value, isolate) {
        const jsValue = emnapiCtx.jsValueFromNapiValue(value);
        const boolValue = Boolean(jsValue);
        return emnapiCtx.napiValueFromJsValue(boolValue);
    }
    /**
     * @__deps $emnapiCtx
     * @__sig ppp
     */
    function _v8_value_to_number(value, context) {
        const jsValue = emnapiCtx.jsValueFromNapiValue(value);
        const numValue = Number(jsValue);
        return emnapiCtx.napiValueFromJsValue(numValue);
    }
    /**
     * @__deps $emnapiCtx
     * @__sig ppp
     */
    function _v8_value_to_string(value, context) {
        const jsValue = emnapiCtx.jsValueFromNapiValue(value);
        const strValue = String(jsValue);
        return emnapiCtx.napiValueFromJsValue(strValue);
    }
    /**
     * @__deps $emnapiCtx
     * @__sig ppp
     */
    function _v8_value_to_object(value, context) {
        const jsValue = emnapiCtx.jsValueFromNapiValue(value);
        if (jsValue === null || jsValue === undefined)
            return 0;
        const objValue = Object(jsValue);
        return emnapiCtx.napiValueFromJsValue(objValue);
    }
    /**
     * @__deps $emnapiCtx
     * @__sig ppp
     */
    function _v8_value_to_integer(value, context) {
        const jsValue = emnapiCtx.jsValueFromNapiValue(value);
        const intValue = Math.trunc(Number(jsValue));
        return emnapiCtx.napiValueFromJsValue(intValue);
    }
    /**
     * @__deps $emnapiCtx
     * @__sig ppp
     */
    function _v8_value_to_uint32(value, context) {
        const jsValue = emnapiCtx.jsValueFromNapiValue(value);
        const uint32Value = Number(jsValue) >>> 0;
        return emnapiCtx.napiValueFromJsValue(uint32Value);
    }
    /**
     * @__deps $emnapiCtx
     * @__sig ppp
     */
    function _v8_value_to_int32(value, context) {
        const jsValue = emnapiCtx.jsValueFromNapiValue(value);
        const int32Value = Number(jsValue) | 0;
        return emnapiCtx.napiValueFromJsValue(int32Value);
    }
    /**
     * @__deps $emnapiCtx
     * @__sig ppp
     */
    function _v8_value_to_array_index(value, context) {
        const jsValue = emnapiCtx.jsValueFromNapiValue(value);
        // V8: ToArrayIndex returns uint32 if possible, else undefined
        const n = Number(jsValue);
        if (typeof n === 'number' &&
            isFinite(n) &&
            n >= 0 &&
            n <= 0xffffffff &&
            Math.floor(n) === n) {
            return emnapiCtx.napiValueFromJsValue(n >>> 0);
        }
        return 0;
    }
    /**
     * @__deps $emnapiCtx
     * @__sig ip
     */
    function _v8_value_is_function(value) {
        const jsValue = emnapiCtx.jsValueFromNapiValue(value);
        if (jsValue == null)
            return 0;
        const isFunction = typeof jsValue === 'function';
        return isFunction ? 1 : 0;
    }
    /**
     * @__deps $emnapiCtx
     * @__sig ip
     */
    function _v8_value_is_number(value) {
        const jsValue = emnapiCtx.jsValueFromNapiValue(value);
        if (jsValue == null)
            return 0;
        const isFunction = typeof jsValue === 'number';
        return isFunction ? 1 : 0;
    }
    /**
     * @__deps $emnapiCtx
     * @__sig ip
     */
    function _v8_value_is_undefined(value) {
        const jsValue = emnapiCtx.jsValueFromNapiValue(value);
        const isUndefined = jsValue === undefined;
        return isUndefined ? 1 : 0;
    }
    /**
     * @__deps $emnapiCtx
     * @__sig ip
     */
    function _v8_value_is_null(value) {
        const jsValue = emnapiCtx.jsValueFromNapiValue(value);
        const isUndefined = jsValue === null;
        return isUndefined ? 1 : 0;
    }
    /**
     * @__deps $emnapiCtx
     * @__sig ip
     */
    function _v8_value_is_true(value) {
        const jsValue = emnapiCtx.jsValueFromNapiValue(value);
        if (jsValue == null)
            return 0;
        const isUndefined = jsValue === true;
        return isUndefined ? 1 : 0;
    }
    /**
     * @__deps $emnapiCtx
     * @__sig ip
     */
    function _v8_value_is_false(value) {
        const jsValue = emnapiCtx.jsValueFromNapiValue(value);
        if (jsValue == null)
            return 0;
        const isUndefined = jsValue === false;
        return isUndefined ? 1 : 0;
    }
    /**
     * @__deps $emnapiCtx
     * @__sig ip
     */
    function _v8_value_is_string(value) {
        const jsValue = emnapiCtx.jsValueFromNapiValue(value);
        if (jsValue == null)
            return 0;
        const isFunction = typeof jsValue === 'string';
        return isFunction ? 1 : 0;
    }

    //#endregion src/v8/value.ts

    //#region src/v8/node.ts
    /**
     * @__deps $emnapiCtx
     * @__deps $emnapiString
     * @__sig ppppi
     */
    function _node_encode(isolate, buf, len, encoding) {
        const autoLength = len === -1 || len === 4294967295;
        buf >>>= 0;
        len >>>= 0;
        if (encoding === 1) {
            return emnapiCtx.napiValueFromJsValue(emnapiString.UTF8ToString(buf, len));
        }
        if (encoding === -1) {
            return emnapiCtx.napiValueFromJsValue(emnapiString.UTF16ToString(buf, len));
        }
        if (encoding === 2) {
            const Buffer = emnapiCtx.features.Buffer;
            if (typeof Buffer !== 'function') {
                emnapiCtx.isolate.throwException(new Error('Buffer is not supported'));
                return 1;
            }
            const buffer = Buffer.from(emscripten_runtime.wasmMemory.buffer, buf, len >>> 0);
            return emnapiCtx.napiValueFromJsValue(buffer.toString('base64'));
        }
        if (encoding === 3) {
            return emnapiCtx.napiValueFromJsValue(emnapiString.UTF16ToString(buf, len / 2));
        }
        if (encoding === 4 || encoding === 0) {
            return emnapiCtx.napiValueFromJsValue(emnapiString.encode(buf, autoLength, len >>> 0, (c) => String.fromCharCode(c)));
        }
        if (encoding === 5) {
            return emnapiCtx.napiValueFromJsValue(emnapiString.encode(buf, autoLength, len >>> 0, (c) => c.toString(16).padStart(2, '0')));
        }
        if (encoding === 6) {
            const Buffer = emnapiCtx.features.Buffer;
            if (typeof Buffer !== 'function') {
                emnapiCtx.isolate.throwException(new Error('Buffer is not supported'));
                return 1;
            }
            const buffer = Buffer.from(emscripten_runtime.wasmMemory.buffer, buf, len >>> 0);
            return emnapiCtx.napiValueFromJsValue(buffer);
        }
        emnapiCtx.isolate.throwException(new Error(`Unsupported encoding: ${encoding}`));
        return 1;
    }

    //#endregion src/v8/node.ts

    //#region src/v8/index.ts

    //#endregion src/v8/index.ts

    exports._node_encode = _node_encode;
    exports._v8_array_length = _v8_array_length;
    exports._v8_array_new = _v8_array_new;
    exports._v8_boolean_object_new = _v8_boolean_object_new;
    exports._v8_boolean_object_value_of = _v8_boolean_object_value_of;
    exports._v8_boolean_value = _v8_boolean_value;
    exports._v8_cbinfo_holder = _v8_cbinfo_holder;
    exports._v8_cbinfo_new_target = _v8_cbinfo_new_target;
    exports._v8_clear_weak = _v8_clear_weak;
    exports._v8_close_handle_scope = _v8_close_handle_scope;
    exports._v8_copy_global_reference = _v8_copy_global_reference;
    exports._v8_date_new = _v8_date_new;
    exports._v8_dispose_global = _v8_dispose_global;
    exports._v8_exception_error = _v8_exception_error;
    exports._v8_exception_range_error = _v8_exception_range_error;
    exports._v8_exception_reference_error = _v8_exception_reference_error;
    exports._v8_exception_syntax_error = _v8_exception_syntax_error;
    exports._v8_exception_type_error = _v8_exception_type_error;
    exports._v8_external_new = _v8_external_new;
    exports._v8_external_value = _v8_external_value;
    exports._v8_function_call = _v8_function_call;
    exports._v8_function_new = _v8_function_new;
    exports._v8_function_new_instance = _v8_function_new_instance;
    exports._v8_function_set_name = _v8_function_set_name;
    exports._v8_function_template_get_function = _v8_function_template_get_function;
    exports._v8_function_template_instance_template = _v8_function_template_instance_template;
    exports._v8_function_template_new = _v8_function_template_new;
    exports._v8_function_template_prototype_template = _v8_function_template_prototype_template;
    exports._v8_function_template_set_class_name = _v8_function_template_set_class_name;
    exports._v8_get_cb_info = _v8_get_cb_info;
    exports._v8_get_property_cb_info = _v8_get_property_cb_info;
    exports._v8_globalize_reference = _v8_globalize_reference;
    exports._v8_handle_scope_escape = _v8_handle_scope_escape;
    exports._v8_int32_value = _v8_int32_value;
    exports._v8_integer_new = _v8_integer_new;
    exports._v8_integer_new_from_unsigned = _v8_integer_new_from_unsigned;
    exports._v8_integer_value = _v8_integer_value;
    exports._v8_isolate_get_current_context = _v8_isolate_get_current_context;
    exports._v8_isolate_throw_exception = _v8_isolate_throw_exception;
    exports._v8_json_parse = _v8_json_parse;
    exports._v8_json_stringify = _v8_json_stringify;
    exports._v8_local_from_global_reference = _v8_local_from_global_reference;
    exports._v8_make_weak = _v8_make_weak;
    exports._v8_move_global_reference = _v8_move_global_reference;
    exports._v8_number_new = _v8_number_new;
    exports._v8_number_object_new = _v8_number_object_new;
    exports._v8_number_value = _v8_number_value;
    exports._v8_object_delete_private = _v8_object_delete_private;
    exports._v8_object_get_aligned_pointer_in_internal_field = _v8_object_get_aligned_pointer_in_internal_field;
    exports._v8_object_get_index = _v8_object_get_index;
    exports._v8_object_get_internal_field = _v8_object_get_internal_field;
    exports._v8_object_get_key = _v8_object_get_key;
    exports._v8_object_get_private = _v8_object_get_private;
    exports._v8_object_has_private = _v8_object_has_private;
    exports._v8_object_internal_field_count = _v8_object_internal_field_count;
    exports._v8_object_new = _v8_object_new;
    exports._v8_object_set = _v8_object_set;
    exports._v8_object_set_aligned_pointer_in_internal_field = _v8_object_set_aligned_pointer_in_internal_field;
    exports._v8_object_set_internal_field = _v8_object_set_internal_field;
    exports._v8_object_set_private = _v8_object_set_private;
    exports._v8_object_template_new = _v8_object_template_new;
    exports._v8_object_template_new_instance = _v8_object_template_new_instance;
    exports._v8_object_template_set_accessor = _v8_object_template_set_accessor;
    exports._v8_object_template_set_internal_field_count = _v8_object_template_set_internal_field_count;
    exports._v8_open_handle_scope = _v8_open_handle_scope;
    exports._v8_private_for_api = _v8_private_for_api;
    exports._v8_regex_new = _v8_regex_new;
    exports._v8_script_compiler_compile_unbound_script = _v8_script_compiler_compile_unbound_script;
    exports._v8_script_run = _v8_script_run;
    exports._v8_signature_new = _v8_signature_new;
    exports._v8_string_length = _v8_string_length;
    exports._v8_string_new_external_one_byte = _v8_string_new_external_one_byte;
    exports._v8_string_new_external_two_byte = _v8_string_new_external_two_byte;
    exports._v8_string_new_from_one_byte = _v8_string_new_from_one_byte;
    exports._v8_string_new_from_two_byte = _v8_string_new_from_two_byte;
    exports._v8_string_new_from_utf8 = _v8_string_new_from_utf8;
    exports._v8_string_object_new = _v8_string_object_new;
    exports._v8_string_object_value_of = _v8_string_object_value_of;
    exports._v8_string_utf8_length = _v8_string_utf8_length;
    exports._v8_string_write_utf8 = _v8_string_write_utf8;
    exports._v8_template_set = _v8_template_set;
    exports._v8_trycatch_construct = _v8_trycatch_construct;
    exports._v8_trycatch_destruct = _v8_trycatch_destruct;
    exports._v8_trycatch_exception = _v8_trycatch_exception;
    exports._v8_trycatch_has_caught = _v8_trycatch_has_caught;
    exports._v8_trycatch_reset = _v8_trycatch_reset;
    exports._v8_trycatch_rethrow = _v8_trycatch_rethrow;
    exports._v8_uint32_value = _v8_uint32_value;
    exports._v8_unbound_script_bind_to_current_context = _v8_unbound_script_bind_to_current_context;
    exports._v8_value_is_false = _v8_value_is_false;
    exports._v8_value_is_function = _v8_value_is_function;
    exports._v8_value_is_null = _v8_value_is_null;
    exports._v8_value_is_number = _v8_value_is_number;
    exports._v8_value_is_string = _v8_value_is_string;
    exports._v8_value_is_true = _v8_value_is_true;
    exports._v8_value_is_undefined = _v8_value_is_undefined;
    exports._v8_value_strict_equals = _v8_value_strict_equals;
    exports._v8_value_to_array_index = _v8_value_to_array_index;
    exports._v8_value_to_boolean = _v8_value_to_boolean;
    exports._v8_value_to_int32 = _v8_value_to_int32;
    exports._v8_value_to_integer = _v8_value_to_integer;
    exports._v8_value_to_number = _v8_value_to_number;
    exports._v8_value_to_object = _v8_value_to_object;
    exports._v8_value_to_string = _v8_value_to_string;
    exports._v8_value_to_uint32 = _v8_value_to_uint32;

    return exports;

})({}, emnapiPluginCtx);
  return {
    importObject: (original) => {
      Object.assign(original.env, mod);
    }
  };
}

//#endregion src/emnapi/v8.js

export { v8 as default };

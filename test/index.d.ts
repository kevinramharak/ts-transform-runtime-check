// TODO: figure out the API
// TODO: generate this

declare module 'ts-transform-runtime-check' {
    /**
     * check if `value` conforms to the runtime type of `T`
     */
    export function is<T>(value: unknown): value is T;
}

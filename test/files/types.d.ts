declare module '@test/ts-transform-runtime-check' {

/**
 * check if `value` conforms to the runtime type of `T`
 */
export function is<T>(value: unknown): value is T;

}
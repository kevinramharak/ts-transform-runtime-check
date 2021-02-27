
// TODO: missing features
// - createTypeCheck<T>(): (value: any ) => is<T>(value);
// - extends<A>(B: any): B extends A
// - ?<A>(value: B): A extends B
// - cache interface checks into an object? Share the cache with createTypeCheck
// - ignore @internal flagged properties
// - use json-schema's (at compile time and at runtime?)
// see https://github.com/vega/ts-json-schema-generator for example

class StubError extends Error {
    public name = 'StubError'
    constructor(fnName: string) {
        super(`'${fnName}' is a stub function, calls to this function should have been removed by the transformer plugin`);
    }
}

/**
 * check if `value` conforms to the runtime type of `T`
 */
export function is<T>(value: unknown): value is T {
    throw new StubError('is');
};

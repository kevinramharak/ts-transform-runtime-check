
// TODO: missing features
// - extends<A>(B: any): B extends A
// - ?<A>(value: B): A extends B
// - cache checks, Share the cache with createIs
// - ignore @internal flagged properties
// - use json-schema's (at compile time and at runtime?)
// - type MyType = Schema<url>;
// see https://github.com/vega/ts-json-schema-generator for example

class StubError extends Error {
    constructor(fnName: string) {
        super(`'${fnName}' is a stub function, calls to this function should have been removed by the transformer plugin`);
    }
}

/**
 * check if `value` conforms to the runtime type of `T`
 */
export function is<T>(value: unknown): value is T {
    throw new StubError(is.name);
}

/**
 * create a typeguard for type `T`
 */
export function createIs<T>(): (value: unknown) => value is T {
    throw new StubError(createIs.name);
}

/**
 * alias type to allow this to change easily
 */
type SchemaIdentifier = string;

/**
 * A type based on a JSON schema
 * can be used like
 * ```ts
 * type MyType = Schema<'url/to/schema.json'>
 * const isMyType = createIs<MyType>();
 * ```
 * 
 * TODO: implement this
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type Schema<T extends SchemaIdentifier> = unknown;

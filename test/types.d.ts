declare module '@transformer' {
export function is<T>(value: unknown): value is T;
export function createIs<T>(): (value: unknown) => value is T;
type SchemaIdentifier = string;
export type Schema<T extends SchemaIdentifier> = unknown;
export {};
}
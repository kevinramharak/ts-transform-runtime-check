
// The point of this file is to define values that can be reused to ensure all tests use equal values

export const symbol: symbol = Symbol.for('symbol');
export const unique: unique symbol = Symbol.for('unique symbol');
export const boolean: boolean = true;
export const number: number = 42;
export const bigint: bigint = 42n;
export const string: string = 'string';

export const object: object = {};
export const record: Record<string | symbol | number, any> = {};
export const fn = () => {};
export const cls = class {};

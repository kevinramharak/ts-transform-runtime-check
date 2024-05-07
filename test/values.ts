
// The point of this file is to define values that can be reused to ensure all tests use equal values

export const symbol: symbol = Symbol.for('symbol');
export const unique: unique symbol = Symbol.for('unique symbol');
export const boolean: boolean = {} as unknown as boolean;
export const number: number = {} as unknown as number;
export const bigint: bigint = {} as unknown as bigint;
export const string: string = {} as unknown as string;

export const object: object = {};
export const record: Record<string | symbol | number, any> = {};
export const fn = () => {};
export const cls = class {};

import transformer from './dist/index';

/**
 * check if `value` conforms to the runtime type of `T`
 */
export function is<T>(value: unknown): value is T;

export default transformer;


export type Index = string | number;
export type Branches<R, T extends () => R> = Record<Index, T> & { default: T };

/**
 * helper function to branch on an enum bitmask
 * for more info about how Object.keys defines the order
 * see: https://www.stefanjudis.com/today-i-learned/property-order-is-predictable-in-javascript-objects-since-es2015/
 */
export function branch<R, F extends number = number, T extends (flag?: F) => R = (flag?: F) => R>(type: F, branches: Branches<R, T>) {
    const index = Object.keys(branches).find(flag => type & Number(flag))!;
    const branch = branches[index] || branches.default;
    return branch.call(branches);
}

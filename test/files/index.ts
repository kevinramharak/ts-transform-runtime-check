/// <reference path="./types.d.ts" />

import { is } from '@test/ts-transform-runtime-check';

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Grammar_and_types#data_types
// https://www.typescriptlang.org/docs/handbook/basic-types.html

// null
const nullValue = null;
const nulls = [
    is<null>(nullValue),
    is<null>(nullValue as any),
];

// undefined
const undefinedValue = undefined;
const undefineds = [
    is<undefined>(undefinedValue),
    is<undefined>(undefinedValue as any),
];

// void
const voids = [
    is<void>(undefined),
    is<void>(null), // strictNullChecks ? true : false
    is<void>(undefined as any),
    is<void>(null as any),
];

// bigint
const bigint = 1n as bigint;
const bigintAsConst = 1n as const;
const bigints = [
    is<bigint>(bigint),
    is<1n>(bigint),
    is<bigint>(bigintAsConst),
    is<1n>(bigintAsConst),
];

// boolean
const boolean = true as boolean;
const booleanAsConst = true as const;
const booleans = [
    is<boolean>(boolean),
    is<boolean>(booleanAsConst),
    is<true>(boolean),
    is<false>(boolean),
    is<true>(booleanAsConst),
    is<false>(booleanAsConst),
    is<boolean>(boolean as any),
    is<true>(boolean as any),
    is<false>(boolean as any),
];

// number
const number = 2 as number;
const numberAsConst = 2 as const;
const numbers = [
    is<number>(2),
    is<number>(number),
    is<number>(numberAsConst),
    is<2>(2),
    is<3>(2),
    is<2>(number),
    is<2>(numberAsConst),
    is<number>(number as any),
];

// string
const string = 'string' as string;
const stringAsConst = 'string' as const;
const strings = [
    is<string>("string"),
    is<string>(string),
    is<string>(stringAsConst),
    is<string>(`${string}`),
    is<"string">("string"),
    is<"other_string">("string"),
    is<"string">(string),
    is<"string">(stringAsConst),
    is<string>(string as any),
];

// object
// NOTE: object is anything that is not a primitve (including null)
const object = {} as object;
const objects = [
    is<object>(object),
    is<object>(object as () => {}),
    is<object>(object as typeof Number),
    is<object>(object as any),
];

// symbol
// TODO: unique symbol
const symbol = Symbol.for('symbol');
const symbols = [
    is<symbol>(symbol),
];

// enum 
enum Enum {
    First,
    Second,
}

const enum ConstEnum {
    First,
    Second,
}

const enums = [
    is<Enum>(Enum),
    is<Enum>(Enum.First),
    is<Enum>(Enum.Second),
    is<Enum.First>(Enum),
    is<Enum.Second>(Enum),
    is<Enum.First>(Enum.First),
    is<Enum.First>(Enum.Second),
    is<Enum.Second>(Enum.First),
    is<Enum.Second>(Enum.Second),
    is<Enum>(ConstEnum.First),
    is<Enum>(ConstEnum.Second),
    is<Enum.First>(ConstEnum.First),
    is<Enum.Second>(ConstEnum.Second),
    is<ConstEnum.Second>(Enum.First),
    is<ConstEnum.Second>(Enum.Second),
    is<ConstEnum>(Enum),
    is<ConstEnum>(Enum.First),
    is<ConstEnum>(Enum.Second),
    is<Enum.First>(ConstEnum.First),
    is<Enum.Second>(ConstEnum.Second),
];

// array
const array = [] as number[];
const recursiveArray = [] as number[][];
const arrays = [
    is<any[]>(array),
    is<number[]>(array),
    is<number[][]>(array),
    is<number[][]>(recursiveArray),
    is<void[]>(array),
];

// tuple
const tuple = [1, 2] as [number, number];
const tupleAsConst = [1, 2 ] as const;
const tuples = [
    is<[number, number]>(tuple),
    is<[1, 2]>(tuple),
    is<[number, number]>(tupleAsConst),
    is<[1, 2]>(tupleAsConst),
    is<[]>(tuple),
    is<[string | number, [Enum.First, ConstEnum.Second]]>([] as any),
];

// interface
interface InterfaceA {
    A: number;
}

interface InterfaceB {
    B: string;
}

const interfaces = [
    is<InterfaceA>({}),
    is<InterfaceB>({}),
    is<InterfaceA | InterfaceB>({}),
    is<InterfaceA & InterfaceB>({}),
];

// class
class A {

}

class B {

}

const classes = [
    is<A>(A),
    is<typeof A>(A),
    is<B>(A),
    is<typeof B>(A),
    is<A>(new A),
    is<A>((new A) as any),
    is<A>(new B),
];

// unions
const unions = [
    is<string | number>(void 0 as any),
];


// intersections
const intersections = [
    is<Array<number> & Array<string>>(void 0 as any),
];

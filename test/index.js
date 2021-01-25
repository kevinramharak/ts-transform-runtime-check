"use strict";
/// <reference path="./index.d.ts" />
Object.defineProperty(exports, "__esModule", { value: true });
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Grammar_and_types#data_types
// https://www.typescriptlang.org/docs/handbook/basic-types.html
// null
const nullValue = null;
const nulls = [
    (/* null */ true),
    (/* null */ nullValue === null),
];
// undefined
const undefinedValue = undefined;
const undefineds = [
    (/* undefined */ true),
    (/* undefined */ undefinedValue === void 0),
];
// void
const voids = [
    (/* void */ true),
    (/* void */ false),
    (/* void */ undefined === void 0),
    (/* void */ null === void 0),
];
// bigint
const bigint = 1n;
const bigintAsConst = 1n;
const bigints = [
    (/* bigint */ true),
    (/* 1n */ false),
    (/* bigint */ true),
    (/* 1n */ true),
];
// boolean
const boolean = true;
const booleanAsConst = true;
const booleans = [
    (/* boolean */ true),
    (/* boolean */ true),
    (/* true */ true),
    (/* false */ true),
    (/* true */ true),
    (/* false */ false),
    (/* boolean */ typeof boolean === "boolean"),
    (/* true */ boolean === true),
    (/* false */ boolean === false),
];
// number
const number = 2;
const numberAsConst = 2;
const numbers = [
    (/* number */ true),
    (/* number */ true),
    (/* number */ true),
    (/* 2 */ true),
    (/* 3 */ false),
    (/* 2 */ false),
    (/* 2 */ true),
    (/* number */ typeof number === "number"),
];
// string
const string = 'string';
const stringAsConst = 'string';
const strings = [
    (/* string */ true),
    (/* string */ true),
    (/* string */ true),
    (/* string */ true),
    (/* "string" */ true),
    (/* "other_string" */ false),
    (/* "string" */ string === "string"),
    (/* "string" */ true),
    (/* string */ typeof string === "string"),
];
// object
// NOTE: object is anything that is not a primitve (including null)
const object = {};
const objects = [
    (/* object */ true),
    (/* object */ true),
    (/* object */ true),
    (/* object */ (typeof object === "object" && object !== null) || typeof object === "function"),
];
// symbol
// TODO: unique symbol
const symbol = Symbol.for('symbol');
const symbols = [
    (/* symbol */ true),
];
// enum 
var Enum;
(function (Enum) {
    Enum[Enum["First"] = 0] = "First";
    Enum[Enum["Second"] = 1] = "Second";
})(Enum || (Enum = {}));
const enums = [
    (/* Enum */ (typeof Enum === "string" || typeof Enum === "number") && Enum in Enum),
    (/* Enum */ (typeof Enum.First === "string" || typeof Enum.First === "number") && Enum.First in Enum),
    (/* Enum */ (typeof Enum.Second === "string" || typeof Enum.Second === "number") && Enum.Second in Enum),
    (/* Enum.First */ false),
    (/* Enum.Second */ false),
    (/* Enum.First */ true),
    (/* Enum.First */ false),
    (/* Enum.Second */ false),
    (/* Enum.Second */ true),
    (/* Enum */ (typeof 0 /* First */ === "string" || typeof 0 /* First */ === "number") && 0 /* First */ in Enum),
    (/* Enum */ (typeof 1 /* Second */ === "string" || typeof 1 /* Second */ === "number") && 1 /* Second */ in Enum),
    (/* Enum.First */ true),
    (/* Enum.Second */ true),
    (/* ConstEnum.Second */ false),
    (/* ConstEnum.Second */ true),
    (/* ConstEnum */ (typeof Enum === "string" || typeof Enum === "number") && Enum in ConstEnum),
    (/* ConstEnum */ (typeof Enum.First === "string" || typeof Enum.First === "number") && Enum.First in ConstEnum),
    (/* ConstEnum */ (typeof Enum.Second === "string" || typeof Enum.Second === "number") && Enum.Second in ConstEnum),
    (/* Enum.First */ true),
    (/* Enum.Second */ true),
];
// array
const array = [];
const recursiveArray = [];
const arrays = [
    (/* any[] */ Array.isArray(array)),
    (/* number[] */ Array.isArray(array) && array.every(item => typeof item === "number")),
    (/* number[][] */ Array.isArray(array) && array.every(item => Array.isArray(item) && item.every(item => typeof item === "number"))),
    (/* number[][] */ Array.isArray(recursiveArray) && recursiveArray.every(item => Array.isArray(item) && item.every(item => typeof item === "number"))),
    (/* void[] */ Array.isArray(array) && array.every(item => item === void 0)),
];
// tuple
const tuple = [1, 2];
const tupleAsConst = [1, 2];
const tuples = [
    (/* [number, number] */ Array.isArray(tuple) && tuple.length === 2 && typeof tuple[0] === "number" && typeof tuple[1] === "number"),
    (/* [1, 2] */ Array.isArray(tuple) && tuple.length === 2 && tuple[0] === 1 && tuple[1] === 2),
    (/* [number, number] */ Array.isArray(tupleAsConst) && tupleAsConst.length === 2 && typeof tupleAsConst[0] === "number" && typeof tupleAsConst[1] === "number"),
    (/* [1, 2] */ Array.isArray(tupleAsConst) && tupleAsConst.length === 2 && tupleAsConst[0] === 1 && tupleAsConst[1] === 2),
    (/* [] */ Array.isArray(tuple) && tuple.length === 0),
    (/* [string | number, [Enum.First, ConstEnum.Second]] */ Array.isArray([]) && [].length === 2 && (typeof [][0] === "string" || typeof [][0] === "number") && (Array.isArray([][1]) && [][1].length === 2 && [][1][0] === 0 && [][1][1] === 1)),
];
const interfaces = [
    (/* InterfaceA */ {} != null && typeof {}["A"] === "number"),
    (/* InterfaceB */ {} != null && typeof {}["B"] === "string"),
    (/* InterfaceA | InterfaceB */ {} != null && typeof {}["A"] === "number" || {} != null && typeof {}["B"] === "string"),
    (/* InterfaceA & InterfaceB */ {} != null && typeof {}["A"] === "number" && ({} != null && typeof {}["B"] === "string")),
];
// class
class A {
}
class B {
}
const classes = [
    (/* A */ A instanceof A),
    (/* typeof A */ A),
    (/* B */ A instanceof B),
    (/* typeof B */ A),
    (/* A */ new A instanceof A),
    (/* A */ (new A) instanceof A),
    (/* A */ new B instanceof A),
];
// unions
const unions = [
    (/* string | number */ typeof void 0 === "string" || typeof void 0 === "number"),
];
// intersections
const intersections = [
    (/* number[] & string[] */ Array.isArray(void 0) && (void 0).every(item => typeof item === "number") && (Array.isArray(void 0) && (void 0).every(item => typeof item === "string"))),
];
//# sourceMappingURL=index.js.map
"use strict";
exports.__esModule = true;
var index_1 = require("../index");
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Grammar_and_types#data_types
// https://www.typescriptlang.org/docs/handbook/basic-types.html
// null
var nullValue = null;
var nulls = [
    index_1.is(nullValue),
    index_1.is(nullValue),
];
// undefined
var undefinedValue = undefined;
var undefineds = [
    index_1.is(undefinedValue),
    index_1.is(undefinedValue),
];
// void
var voids = [
    index_1.is(undefined),
    index_1.is(null),
    index_1.is(undefined),
    index_1.is(null),
];
// bigint
var bigint = 1n;
var bigintAsConst = 1n;
var bigints = [
    index_1.is(bigint),
    index_1.is(bigint),
    index_1.is(bigintAsConst),
    index_1.is(bigintAsConst),
];
// boolean
var boolean = true;
var booleanAsConst = true;
var booleans = [
    index_1.is(boolean),
    index_1.is(booleanAsConst),
    index_1.is(boolean),
    index_1.is(boolean),
    index_1.is(booleanAsConst),
    index_1.is(booleanAsConst),
    index_1.is(boolean),
    index_1.is(boolean),
    index_1.is(boolean),
];
// number
var number = 2;
var numberAsConst = 2;
var numbers = [
    index_1.is(2),
    index_1.is(number),
    index_1.is(numberAsConst),
    index_1.is(2),
    index_1.is(2),
    index_1.is(number),
    index_1.is(numberAsConst),
    index_1.is(number),
];
// string
var string = 'string';
var stringAsConst = 'string';
var strings = [
    index_1.is("string"),
    index_1.is(string),
    index_1.is(stringAsConst),
    index_1.is("" + string),
    index_1.is("string"),
    index_1.is("string"),
    index_1.is(string),
    index_1.is(stringAsConst),
    index_1.is(string),
];
// object
// NOTE: object is anything that is not a primitve (including null)
var object = {};
var objects = [
    index_1.is(object),
    index_1.is(object),
    index_1.is(object),
    index_1.is(object),
];
// symbol
// TODO: unique symbol
var symbol = Symbol["for"]('symbol');
var symbols = [
    index_1.is(symbol),
];
// enum 
var Enum;
(function (Enum) {
    Enum[Enum["First"] = 0] = "First";
    Enum[Enum["Second"] = 1] = "Second";
})(Enum || (Enum = {}));
var enums = [
    index_1.is(Enum),
    index_1.is(Enum.First),
    index_1.is(Enum.Second),
    index_1.is(Enum),
    index_1.is(Enum),
    index_1.is(Enum.First),
    index_1.is(Enum.Second),
    index_1.is(Enum.First),
    index_1.is(Enum.Second),
    index_1.is(0 /* First */),
    index_1.is(1 /* Second */),
    index_1.is(0 /* First */),
    index_1.is(1 /* Second */),
    index_1.is(Enum.First),
    index_1.is(Enum.Second),
    index_1.is(Enum),
    index_1.is(Enum.First),
    index_1.is(Enum.Second),
    index_1.is(0 /* First */),
    index_1.is(1 /* Second */),
];
// array
var array = [];
var recursiveArray = [];
var arrays = [
    index_1.is(array),
    index_1.is(array),
    index_1.is(array),
    index_1.is(recursiveArray),
    index_1.is(array),
];
// tuple
var tuple = [1, 2];
var tupleAsConst = [1, 2];
var tuples = [
    index_1.is(tuple),
    index_1.is(tuple),
    index_1.is(tupleAsConst),
    index_1.is(tupleAsConst),
    index_1.is(tuple),
    index_1.is([]),
];
var interfaces = [
    index_1.is({}),
    index_1.is({}),
    index_1.is({}),
    index_1.is({}),
];
// class
var A = /** @class */ (function () {
    function A() {
    }
    return A;
}());
var B = /** @class */ (function () {
    function B() {
    }
    return B;
}());
var classes = [
    index_1.is(A),
    index_1.is(A),
    index_1.is(A),
    index_1.is(A),
    index_1.is(new A),
    index_1.is((new A)),
    index_1.is(new B),
];
// unions
var unions = [
    index_1.is(void 0),
];
// intersections
var intersections = [
    index_1.is(void 0),
];

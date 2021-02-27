
import { is } from '@test/ts-transform-runtime-check';
import { expect } from 'chai';
import { bigint, boolean, cls, fn, number, string, symbol, unique } from '../values';

const isTrue = [
    is<bigint>(bigint),
    is<bigint>(1n),
    is<1n>(1n),
];

const isFalse = [
    is<bigint>(undefined),
    is<bigint>(null),
    is<bigint>(true),
    is<bigint>(false),
    is<bigint>(boolean),
    is<bigint>(number),
    is<bigint>(string),
    is<bigint>(symbol),
    is<bigint>(unique),
    is<bigint>(fn),
    is<bigint>(cls),
    is<1n>(1),
    is<1n>(2n),
];

export function test() {
    isTrue.forEach(entry => expect(entry).to.be.true);
    isFalse.forEach(entry => expect(entry).to.be.false);
}

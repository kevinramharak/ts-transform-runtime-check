
import { is } from '@test/ts-transform-runtime-check';
import { expect } from 'chai';
import { boolean, cls, fn, number, string } from '../values';

const isTrue = [
    is<null>(null),
];

const isFalse = [
    is<null>(undefined),
    is<null>(true),
    is<null>(false),
    is<null>(boolean),
    is<null>(number),
    is<null>(string),
    is<null>(fn),
    is<null>(cls),
];

export function test() {
    isTrue.forEach(entry => expect(entry).to.be.true);
    isFalse.forEach(entry => expect(entry).to.be.false);
}

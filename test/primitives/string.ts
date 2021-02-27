
import { is } from '@test/ts-transform-runtime-check';
import { expect } from 'chai';
import { symbol, unique, bigint, boolean, cls, fn, number, string } from '../values';

const isTrue = [
    is<string>(string),
    is<string>('string'),
    is<'string'>('string'),
];

const isFalse = [
    is<string>(undefined),
    is<string>(null),
    is<string>(true),
    is<string>(false),
    is<string>(boolean),
    is<string>(number),
    is<string>(bigint),
    is<string>(symbol),
    is<string>(unique),
    is<string>(fn),
    is<string>(cls),
    is<'constant'>(string),
];

export function test() {
    isTrue.forEach(entry => expect(entry).to.be.true);
    isFalse.forEach(entry => expect(entry).to.be.false);
}

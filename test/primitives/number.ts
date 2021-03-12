
import { is } from '@transformer';
import { expect } from 'chai';
import { boolean, cls, fn, number, string } from '@test/values';

const isTrue = [
    is<number>(number),
    is<number>(42),
    is<42>(42),
];

const isFalse = [
    is<number>(undefined),
    is<number>(null),
    is<number>(true),
    is<number>(false),
    is<number>(boolean),
    is<number>(string),
    is<number>(fn),
    is<number>(cls),
    is<42>(24),
];

export function test() {
    isTrue.forEach(entry => expect(entry).to.be.true);
    isFalse.forEach(entry => expect(entry).to.be.false);
}

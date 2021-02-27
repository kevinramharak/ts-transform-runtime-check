
import { is } from '@test/ts-transform-runtime-check';
import { expect } from 'chai';
import { boolean, cls, fn, number, string } from '../values';

const isTrue = [
    is<undefined>(undefined),
    is<void>(undefined),
];

const isFalse = [
    is<void>(null),
    is<void>(true),
    is<void>(false),
    is<void>(boolean),
    is<void>(number),
    is<void>(string),
    is<void>(fn),
    is<void>(cls),
    is<undefined>(null),
    is<undefined>(true),
    is<undefined>(false),
    is<undefined>(boolean),
    is<undefined>(number),
    is<undefined>(string),
    is<undefined>(fn),
    is<undefined>(cls),
];

export function test() {
    isTrue.forEach(entry => expect(entry).to.be.true);
    isFalse.forEach(entry => expect(entry).to.be.false);
}

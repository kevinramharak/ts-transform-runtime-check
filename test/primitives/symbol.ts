
import { is } from '@lib';
import { expect } from 'chai';
import { symbol, unique, bigint, boolean, cls, fn, number, string } from '@test/values';

const isTrue = [
    is<symbol>(symbol),
    is<symbol>(unique),
    // TODO: support unqiue symbol
    // is<typeof unique>(unique),
];

const isFalse = [
    is<symbol>(undefined),
    is<symbol>(null),
    is<symbol>(true),
    is<symbol>(false),
    is<symbol>(boolean),
    is<symbol>(number),
    is<symbol>(string),
    is<symbol>(bigint),
    is<typeof unique>(symbol),
    is<symbol>(fn),
    is<symbol>(cls),
];

export function test() {
    isTrue.forEach(entry => expect(entry).to.be.true);
    isFalse.forEach(entry => expect(entry).to.be.false);
}


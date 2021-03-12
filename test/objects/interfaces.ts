
import { is } from '@transformer';
import { expect } from 'chai';
import { bigint, boolean, cls, fn, number, string, symbol, unique } from '@test/values';

type Has<P extends PropertyKey, K> = {
    [key in P]: K;
}

const isTrue: boolean[] = [
    is<Has<'property', boolean>>({ property: boolean }),
];

const isFalse: boolean[] = [
    is<Has<'property', boolean>>({ property: number }),
];

export function test() {
    isTrue.forEach(entry => expect(entry).to.be.true);
    isFalse.forEach(entry => expect(entry).to.be.false);
}

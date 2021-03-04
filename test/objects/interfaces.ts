
import { is } from '@test/ts-transform-runtime-check';
import { expect } from 'chai';
import { bigint, boolean, cls, fn, number, string, symbol, unique } from '../values';

interface Has<T> {
    property: T;
}

const isTrue: boolean[] = [
    is<Has<boolean>>({ property: boolean }),
    is<Has<number>>({ property: number }),
    is<Has<bigint>>({ property: bigint }),
];

const isFalse: boolean[] = [
    is<Has<boolean>>({ property: number }),
    is<Has<number>>({ property: bigint }),
];


export function test() {
    isTrue.forEach(entry => expect(entry).to.be.true);
    isFalse.forEach(entry => expect(entry).to.be.false);
}

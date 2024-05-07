
import { is } from '@lib';
import { expect } from 'chai';
import { boolean, cls, fn, number, string } from '@test/values';

const shouldBeTrue = [
    [is<true>(true), true],
    [is<false>(false), false],
    [is<boolean>(boolean), boolean],
    [is<boolean>(true), true],
    [is<boolean>(false), false],
] as const;

const shouldBeFalse = [
    [is<boolean>(null), null],
    [is<boolean>(number), number],
    [is<boolean>(string), string],
    [is<boolean>(fn), fn],
    [is<boolean>(cls), cls],
    [is<boolean>(1), 1],
    [is<boolean>(0), 0],
    [is<boolean>(void 0), void 0],
    [is<boolean>(undefined), undefined],
    [is<true>(null), null],
    [is<true>(false), false],
    [is<true>(boolean), boolean],
    [is<true>(number), number],
    [is<true>(string), string],
    [is<true>(fn), fn],
    [is<true>(cls), cls],
    [is<boolean>(1), 1],
    [is<boolean>(0), 0],
    [is<boolean>(void 0), void 0],
    [is<boolean>(undefined), undefined],
    [is<false>(null), null],
    [is<false>(true), true],
    [is<false>(boolean), boolean],
    [is<false>(number), number],
    [is<false>(string), string],
    [is<false>(fn), fn],
    [is<false>(cls), cls],
] as const;

export function test() {
    shouldBeTrue.forEach(([actual, value], index) => {
        expect(actual, `shouldBeTrue[${index}] is<${'T'}>(${value})`).to.be.true;
    });
    shouldBeFalse.forEach(([test, value], index) => {
        expect(test, `shouldBeFalse[${index}] is<${'T'}>(${value})`).to.be.false;
    });
}

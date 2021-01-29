import { expect } from 'chai';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

import Compiler, { defaultTsConfig } from 'ts-transform-test-compiler';
import { ScriptTarget, TSConfig } from 'typescript';
import RuntimeCheck from '../src/transformer';

const PackageModuleName = '@test/ts-transform-runtime-check';
const tsConfig = Object.assign({}, defaultTsConfig, {
    strict: true,
    noUnusedLocals: false,
    noUnusedParameters: false,
    target: ScriptTarget.ES2020,
    types: [],
} as Partial<typeof defaultTsConfig>);

before(() => {
    const typeDefs = readFileSync('./lib/index.d.ts', { encoding: 'utf-8' }).replace(/ declare function /g, ' function ');
    writeFileSync('test/files/types.d.ts', `declare module '${PackageModuleName}' {\n${typeDefs}\n}`);
});

describe('ts-transform-runtime-check', () => {
    const compiler = new Compiler(RuntimeCheck as any, 'tmp', tsConfig).setRootDir('test/files').setSourceFiles('index.ts');
    it('should run', () => {
        const result = compiler.compile('test', { PackageModuleName, });
        if (!result.succeeded) {
            result.print();
        }
    });
});

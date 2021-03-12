import ts from 'typescript';
import { expect } from 'chai';

import { createEnvironment } from './createEnvironment';

import { compilerOptions as rootCompilerOptions } from '../tsconfig.json';
import { compilerOptions as testCompilerOptions } from './tsconfig.json';

import { createModule } from './createModule';
import { readdirSync } from 'fs';

function getPrimitiveFileNames() {
    return readdirSync('test/primitives', { withFileTypes: true }).filter(type => type.isFile() && type.name.endsWith('.ts')).map(type => type.name.replace('.ts', ''));
}

function getObjectFileNames() {
    return readdirSync('test/objects', { withFileTypes: true }).filter(type => type.isFile() && type.name.endsWith('.ts')).map(type => type.name.replace('.ts', ''));
}

const PackageModuleName = '@transformer';

const compilerOptionsResult = ts.convertCompilerOptionsFromJson(Object.assign({}, rootCompilerOptions, testCompilerOptions), '.');
expect(compilerOptionsResult.errors.length).to.equal(0);
const compilerOptions = compilerOptionsResult.options;

describe('ts-transform-runtime-check', () => {
    const {
        fs,
        createProgram,
        emit,
        compileString,
        transformString,
        assertNoDiagnostics,
    } = createEnvironment(compilerOptions, { PackageModuleName, debug: true });

    describe('should generate and execute type checks for primitive values correctly', () => {
        const primitives = getPrimitiveFileNames();

        primitives.forEach((primitive) => {
            it(`should generate and execute type checks for '${primitive}' correctly`, () => {
                const fileName = `test/primitives/${primitive}.ts`;
                const outputName = fileName.replace('.ts', '.js');
                const program = createProgram([fileName]);
                const { diagnostics } = emit(program, fileName);
                assertNoDiagnostics(diagnostics);
                const contents = fs.get(outputName);
                expect(contents).to.be.a('string');
                const mod = createModule<{ test: () => void }>(outputName, contents!);
                const { test } = mod.exports;
                expect(test).to.be.a('function');
                test();
            });
        });
    });

    describe('should generate and execute type checks for non-primitive values correctly', () => {
        const objects = getObjectFileNames();

        objects.forEach((object) => {
            it(`should generate and execute type checks for '${object}' correctly`, () => {
                const fileName = `test/objects/${object}.ts`;
                const outputName = fileName.replace('.ts', '.js');
                const program = createProgram([fileName]);
                const { diagnostics } = emit(program, fileName);
                assertNoDiagnostics(diagnostics);
                const contents = fs.get(outputName);
                expect(contents).to.be.a('string');
                const mod = createModule<{ test: () => void }>(outputName, contents!);
                const { test } = mod.exports;
                expect(test).to.be.a('function');
                test();
            });
        });
    });

    describe('notepad', () => {
        it('debug', () => {
            const result = transformString(
                ['is', 'createIs'],
                `

type Has<P extends PropertyKey, K> = {
    [key in P]: K;
}

is<Has<'property', boolean>>({ property: boolean } as any)

                `
            );
            console.log(result);
        });
    });
});

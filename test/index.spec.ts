import { convertCompilerOptionsFromJson } from 'typescript';
import { expect } from 'chai';

import { createEnvironment } from './createEnvironment';

import { compilerOptions as rootCompilerOptions } from '../tsconfig.json';
import { compilerOptions as testCompilerOptions } from './tsconfig.json';
import { createModule } from './createModule';
import { readdirSync } from 'fs';

function getPrimitiveFileNames() {
    return readdirSync('test/primitives', { withFileTypes: true }).filter(type => type.isFile() && type.name.endsWith('.ts')).map(type => type.name.replace('.ts', ''));
}

const PackageModuleName = '@test/ts-transform-runtime-check';

const compilerOptionsResult = convertCompilerOptionsFromJson(Object.assign({}, rootCompilerOptions, testCompilerOptions), '.');
expect(compilerOptionsResult.errors.length).to.equal(0);
const compilerOptions = compilerOptionsResult.options;

describe('ts-transform-runtime-check', () => {
    const {
        fs,
        createProgram,
        emit,
        compileString,
        assertNoDiagnostics,
    } = createEnvironment(compilerOptions, { PackageModuleName });

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
});

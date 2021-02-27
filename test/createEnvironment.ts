
import ts from 'typescript';
import * as tsvfs from '@typescript/vfs';
import { readFileSync, writeFileSync } from 'fs';

import RuntimeCheck from '../src/transformer';
import { IPackageOptions } from '../src/config';
import { Transform } from 'stream';
import { expect } from 'chai';

export interface FileDiagnostic {
    file: string;
    line: number;
    character: number;
    message: string;
}

export interface GeneralDiagnostic {
    message: string;
}

export type Diagnostic = FileDiagnostic | GeneralDiagnostic;

type TransformerOptions = Partial<IPackageOptions> & Pick<IPackageOptions, 'PackageModuleName'>;

function formatDiagnostic(diagnostic: Diagnostic = { message: 'stub diagnostic' }) {
    return typeof (diagnostic as FileDiagnostic).file === 'string' ? `${(diagnostic as FileDiagnostic).file}:${(diagnostic as FileDiagnostic).line}:${(diagnostic as FileDiagnostic).character} ${diagnostic.message}` : diagnostic.message;
}

export function createEnvironment(options: ts.CompilerOptions, transformerOptions: TransformerOptions) {
    const currentDirectory =  process.cwd();
    const fs = tsvfs.createDefaultMapFromNodeModules(options);
    const system = tsvfs.createFSBackedSystem(fs, currentDirectory, ts);

    // override the `getCurrentDirectory()`
    // https://github.com/microsoft/TypeScript-Website/blob/v2/packages/typescript-vfs/src/index.ts#L432
    system.getCurrentDirectory = () => currentDirectory;

    const host = tsvfs.createVirtualCompilerHost(system, options, ts).compilerHost;
    const typeDefs = readFileSync('./lib/index.d.ts', { encoding: 'utf-8' }).replace(/ declare function /g, ' function ');
    writeFileSync('test/types.d.ts', `declare module '${transformerOptions.PackageModuleName}' {\n${typeDefs}\n}`);

    const rootNames = ['test/types.d.ts', 'test/values.ts'];

    const environment = {
        fs,
        system,
        host,
        compileString(input: string, inlineTransformerOptions: Partial<IPackageOptions> = {}) {
            inlineTransformerOptions = Object.assign({}, transformerOptions, inlineTransformerOptions);
            input = input.trim();
            const tempFile = 'test/input.ts';
            const template = `
import { is } from "${inlineTransformerOptions.PackageModuleName}";

output: {
    ${input}
}
            `.trim();
            fs.set(tempFile, template);
            const program = ts.createProgram({
                rootNames: [...rootNames, tempFile],
                options,
                host,
            });
            const { diagnostics } = environment.emit(program, tempFile, inlineTransformerOptions);
            environment.assertNoDiagnostics(diagnostics);
            const result =  fs.get(tempFile.replace('.ts', '.js'));
            if (!result) {
                throw new Error(`failed to compile string: '${input}'`);
            }
            const extractor = /output:\s*{\s*([\s\S]+)\s*}/m
            const extracted = result.match(extractor);
            if (extracted && extracted[1]) {
                const code = extracted[1];
                // small hack to strip a trailing semi-colon if it was not present with the input
                if (!input.endsWith(';') && code.endsWith(';')) {
                    return code.slice(0, -1);
                }
                return code;
            }
            throw new Error(`
failed to extract contents from compield string.

input:
------------
${input}
------------
output:
------------
${result}
------------
            `.trim()
            );
        },
        createProgram(files: string[], compilerOptions: Partial<ts.CompilerOptions> = {}) {
            return ts.createProgram({
                rootNames: [...rootNames, ...files],
                options: Object.assign({}, options, compilerOptions),
                host,
            });
        },
        emit(program: ts.Program, target?: string | ts.SourceFile, options: Partial<IPackageOptions> = {}, writeFile: ts.WriteFileCallback = (fileName: string, content: string) => fs.set(fileName, content)) {
            if (typeof target === 'string') {
                const file = program.getSourceFile(target);
                if (file) {
                    target = file;
                } else {
                    throw new Error(`no source file exits for: '${target}'`);
                }
            }

            const result = program.emit(target, writeFile, void 0, void 0, {
                before: [
                    RuntimeCheck(program, Object.assign({}, transformerOptions, options)),
                ],
            });

            const diagnostics: Diagnostic[] = [...ts.getPreEmitDiagnostics(program), ...result.diagnostics].map(diagnostic => {
                if (diagnostic.file) {
                    const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start!);
                    const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
                    return {
                        file: diagnostic.file.fileName,
                        line,
                        character,
                        message,
                    };
                } else {
                    return {
                        message: diagnostic.messageText as string,
                    };
                }
            });
            
            return {
                diagnostics,
            };
        },
        assertNoDiagnostics(diagnostics: Diagnostic[]) {
            expect(diagnostics.length).to.equal(0, formatDiagnostic(diagnostics[0]));
        },
    };

    return environment;
}

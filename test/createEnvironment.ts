
import ts from 'typescript';
import * as tsvfs from '@typescript/vfs';

import { readFileSync, writeFileSync } from 'fs';
import process from 'process';

import RuntimeCheck from '@/transformer';
import { IPackageOptions } from '@/config';
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

export type TransformerOptions = Partial<IPackageOptions> & Pick<IPackageOptions, 'PackageModuleName'>;

function formatDiagnostic(diagnostic: Diagnostic = { message: 'stub diagnostic' }) {
    return typeof (diagnostic as FileDiagnostic).file === 'string' ? `${(diagnostic as FileDiagnostic).file}:${(diagnostic as FileDiagnostic).line}:${(diagnostic as FileDiagnostic).character} ${diagnostic.message}` : diagnostic.message;
}

function normalizeDiagnostic(diagnostic: ts.Diagnostic): Diagnostic {
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
}

function annotate<T extends (...args: any[]) => any, C extends any>(func: T, context?: C) {
    const ref = func;
    return (...args: unknown[]) => {
        console.log(new Error().stack);
        return ref.call(context, ...args);
    }
}

export function createEnvironment(options: ts.CompilerOptions, transformerOptions: TransformerOptions) {
    const fs = tsvfs.createDefaultMapFromNodeModules(options);
    const system = tsvfs.createFSBackedSystem(fs, process.cwd(), ts);

    const host = tsvfs.createVirtualCompilerHost(system, options, ts).compilerHost;

    const environment = {
        system,
        host,
        compileString(imports: string[], input: string, inlineTransformerOptions: Partial<IPackageOptions> = {}) {
            inlineTransformerOptions = Object.assign({}, transformerOptions, inlineTransformerOptions);
            input = input.trim();
            const tempFile = 'test/input.ts';
            const template = `
import { ${imports.join(', ')} } from "${inlineTransformerOptions.PackageModuleName}";

output: {
    ${input}
}
            `.trim();
            host.writeFile(tempFile, template, false);
            const program = ts.createProgram({
                rootNames: [tempFile],
                options,
                host,
            });
            const { diagnostics } = environment.emit(program, tempFile, inlineTransformerOptions);
            environment.assertNoDiagnostics(diagnostics);
            const result =  system.readFile(tempFile.replace('.ts', '.js'));
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
failed to extract contents from compiled string.

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
        transformString(imports: string[], input: string, inlineTransformerOptions: Partial<IPackageOptions> = {}) {
            inlineTransformerOptions = Object.assign({}, transformerOptions, inlineTransformerOptions);
            input = input.trim();
            const tempFile = 'test/input.ts';
            const template = `
import { ${imports.join(', ')} } from "${inlineTransformerOptions.PackageModuleName}";

output: {
    ${input}
}
            `.trim();
            host.writeFile(tempFile, template, false);
            const program = ts.createProgram({
                rootNames: [tempFile],
                options,
                host,
            });
            const transformerFactory = RuntimeCheck(program, inlineTransformerOptions);
            const sourceFile = program.getSourceFile(tempFile);
            if (!sourceFile) {
                throw new Error(`expected source file for ${tempFile}`);
            }
            const transformationResult = ts.transform(sourceFile, [transformerFactory], program.getCompilerOptions());
            if (transformationResult.diagnostics) {
                environment.assertNoDiagnostics(transformationResult.diagnostics.map(normalizeDiagnostic));
            }
            const resultFile = transformationResult.transformed.find(file => file.fileName === tempFile);
            if (!resultFile) {
                throw new Error(`expected source file for ${tempFile}`);
            }
            const writer = ts.createTextWriter(host.getNewLine());
            const printer = ts.createPrinter();
            printer.writeFile(resultFile, writer, void 0);

            const result = writer.getText();

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
failed to extract contents from compiled string.

input:
------------
${input}
------------
output:
------------
${transformationResult}
------------
            `.trim()
            );
        },
        createProgram(files: string[], compilerOptions: Partial<ts.CompilerOptions> = {}) {
            return ts.createProgram({
                rootNames: [...files],
                options: Object.assign({}, options, compilerOptions),
                host,
            });
        },
        emit(program: ts.Program, target?: string | ts.SourceFile, options: Partial<IPackageOptions> = {}, writeFile: ts.WriteFileCallback = host.writeFile) {
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

            const diagnostics: Diagnostic[] = [...ts.getPreEmitDiagnostics(program), ...result.diagnostics].map(normalizeDiagnostic);
            
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

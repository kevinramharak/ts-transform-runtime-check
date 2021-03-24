import ts from 'typescript';

import { DefaultPackageOptions, IPackageOptions, IPublicPackageOptions } from '@/config';
import { MarkedTransformer, ShouldTransform, transformers as transformerFactories } from '@/transformers';
import { useLogger, warn, Logger } from '@/util/log';
import { createContextTransformer } from './createContextTransformer';
import { noopContextTransformer } from './noop';

/**
 * NOTE: this assumes there is only 1 file with relevant exports or 1 single ambient module declaration
 */
function getExportsSymbolTableForModuleSpecifier(program: ts.Program, checker: ts.TypeChecker, moduleSpecifier: string): ts.SymbolTable | undefined {
    // NOTE: this took a long time to figure out, not sure why there isn't a simpler api for this

    // either find the sourcefile and use the exports table
    for (const sourceFile of program.getSourceFiles()) {
        if (sourceFile.resolvedModules && sourceFile.resolvedModules.has(moduleSpecifier)) {
            const resolvedModuleInfo = sourceFile.resolvedModules.get(moduleSpecifier);
            // sometimes the map does have the key, but the value is undefined (wtf)
            if (resolvedModuleInfo) {
                const packageSourceFile = program.getSourceFile(resolvedModuleInfo.resolvedFileName);
                if (packageSourceFile) {
                    if (packageSourceFile.symbol.exports) {
                        return packageSourceFile.symbol.exports;
                    }
                    throw new Error(`'${moduleSpecifier}' source file was found but has no exports`)
                }
            }
        }
    }

    const ambientModule = checker.tryFindAmbientModuleWithoutAugmentations(moduleSpecifier);
    if (ambientModule) {
        if (ambientModule.exports) {
            ambientModule.exports;
        }
        throw new Error(`'${moduleSpecifier}' ambient declaration was found but has no exports`);
    }
}

/**
 * implements a `(program: ts.Program, options: any) => ts.TransformerFactory<ts.SourceFile>` signature expected by ttypescript
 * see: https://github.com/cevek/ttypescript#program
 */
export function createSourceFileTransformerFactory(program: ts.Program, options?: Partial<IPublicPackageOptions>): ts.TransformerFactory<ts.SourceFile>;
export function createSourceFileTransformerFactory(program: ts.Program, _options: Partial<IPackageOptions> = {}): ts.TransformerFactory<ts.SourceFile> {
    const options = Object.assign({}, DefaultPackageOptions, _options) as IPackageOptions;
    const checker = program.getTypeChecker();

    // TODO: implement this when its actually able to self host
    // if (!is<IPackageOptions>(options)) {
    //     throw new TypeError('invalid configuration object');
    // }

    try {
        const packageExportsSymbolTable = getExportsSymbolTableForModuleSpecifier(program, checker, options.PackageModuleName);
        if (!packageExportsSymbolTable) {
            warn(`no import found for '${options.PackageModuleName}, defaulting to a noop transformer'`);
            return noopContextTransformer;
        }

        const transformers: [ShouldTransform, MarkedTransformer][] = [];
        for (const [name, symbol] of (packageExportsSymbolTable as Map<string, ts.Symbol>).entries()) {
            const transformer = transformerFactories.find(transformer => transformer.name === name);
            if (transformer) {
                // NOTE: the `unknown` cast is needed because of the power of typescript 'branded' types
                transformers.push([
                    transformer.createShouldTransform(symbol.valueDeclaration),
                    transformer,
                ] as unknown as [ShouldTransform, MarkedTransformer]);
            }
            warn(`${name} has no transformer factory`);
        }
    
        return createContextTransformer(checker, transformers, options);
    } catch (e: unknown) {
        if (e instanceof Error) {
            warn(e.message);
        }
        throw e;
    }
}

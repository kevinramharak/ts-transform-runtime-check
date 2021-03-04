import ts from 'typescript';
import { is } from 'ts-transform-runtime-check';

import { DefaultPackageOptions, IPackageOptions, IPublicPackageOptions } from '../config';
import { MarkedTransformer, ShouldTransform, transformers } from '../transformers';
import { useLogger, warn, Logger } from '../log';
import { createContextTransformer } from './createContextTransformer';
import { noopContextTransformer } from './noop';

function findSourceFileForModuleSpecifier(program: ts.Program, moduleSpecifier: string) {
    // NOTE: this took a long time to figure out, not sure why there isn't a simpler api for this
    const sourceFiles = program.getSourceFiles();
    const sourceFileWithResolvedReference = sourceFiles.find(sourceFile => {
        return sourceFile.resolvedModules && sourceFile.resolvedModules.has(moduleSpecifier);
    });
    if (!sourceFileWithResolvedReference) {
        return;
    }
    const resolvedModuleInfo = sourceFileWithResolvedReference.resolvedModules!.get(moduleSpecifier);

    if (resolvedModuleInfo && resolvedModuleInfo.resolvedFileName) {
        const packageSourcefile = program.getSourceFile(resolvedModuleInfo.resolvedFileName);
        return packageSourcefile;
    }
}

/**
 * Wraps the logger to remove annoying reference properties on `Node` and `Type` values
 */
function createDebugLogger(logger: Logger) {
    const methods = [
        'debug',
        'error',
        'info',
        'log',
        'warn',
    ] as const;

    let _logger: Logger = {} as Logger;
    methods.forEach(name => {
        const fn = logger[name];
        _logger[name] = (...input: unknown[]) => {
            fn.apply(logger, input.map(value => {
                if (value != null && (value as any).checker) {
                    delete (value as any).checker;
                }
                return value;
            }));
        };
    });
    _logger['assert'] = (condition, ...input) => {
        logger.assert(condition, input);
    };
    return _logger;
}

/**
 * implements a `(program: ts.Program, options: any) => ts.TransformerFactory<ts.SourceFile>` signature expected by ttypescript
 * see: https://github.com/cevek/ttypescript#program
 */
export function createSourceFileTransformerFactory(program: ts.Program, options?: Partial<IPublicPackageOptions>): ts.TransformerFactory<ts.SourceFile>;
export function createSourceFileTransformerFactory(program: ts.Program, _options: Partial<IPackageOptions> = {}): ts.TransformerFactory<ts.SourceFile> {
    const options = Object.assign({}, DefaultPackageOptions, _options) as IPackageOptions;
    const checker = program.getTypeChecker();

    if (options.debug) {
        useLogger(createDebugLogger(console));
    }

    if (!is<IPackageOptions>(options)) {
        throw new TypeError('invalid configuration object');
    }


    let packageSymbolTable: ts.SymbolTable;

    // first try and find the package as if it has a normal definition `import { } from 'PACKAGE_MODULE_SPECIFIER'`
    const packageSourceFile = findSourceFileForModuleSpecifier(program, options.PackageModuleName);

    if (packageSourceFile) {
        if (packageSourceFile.symbol.exports) {
            packageSymbolTable = packageSourceFile.symbol.exports;
        } else {
            // we found the source file, but it has no exports
            warn(`'${options.PackageModuleName}' package was found but has no exports, defaulting to a noop transformer`);
            return noopContextTransformer;
        }
    } else {
        // then attempt to find it as an ambient module declaration
        const ambientModules = checker.getAmbientModules();
        // NOTE: module.name has double quotes surrounding its name
        const moduleSymbol = ambientModules.find(module => module.name === `"${options.PackageModuleName}"`);
        if (moduleSymbol && moduleSymbol.exports) {
            packageSymbolTable = moduleSymbol.exports;
        } else {
            // we found the ambient declaration file, but it has no exports
            warn(`'${options.PackageModuleName}' ambient declaration was found but has no exports, defaulting to a noop transformer`);
            return noopContextTransformer;
        }
    }

    const transformerEntries = [...packageSymbolTable as Map<ts.__String, ts.Symbol>].map(([name, symbol]) => {
        const transformer = transformers.find(transformer => transformer.name === name);
        if (!transformer) {
            throw new Error('no transformer found for type declaration ' + name);
        }
        return [
            transformer.createShouldTransform(symbol.valueDeclaration),
            transformer,
        ] as [ShouldTransform<any>, MarkedTransformer<any>];
    });

    return createContextTransformer(checker, transformerEntries, options);
}

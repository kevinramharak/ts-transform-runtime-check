
import ts from 'typescript';
import { transformers } from './transformers';
import { visitCallExpresion, visitImportDeclaration } from './visitors';

const PACKAGE_NAME = 'ts-transform-runtime-check';

const ERROR = {
    NoModuleDeclarationFound: `no module found for '${PACKAGE_NAME}', make sure to import the module to use its features`,
    MissingTransformer: (name: string) => `function declaration ${name} does not have a registered transformer`,
};

export type TransformerMap = Map<ts.FunctionDeclaration, (node: ts.CallExpression, checker: ts.TypeChecker, context: ts.TransformationContext) => ts.Expression>;

export interface ITransformerOptions {
    addTypeComment: boolean;
    warnOnInvalidUse: boolean;
    throwOnInvalidUse: boolean;
    addParenthesis: boolean;
}

const DefaultTransformerOptions: ITransformerOptions = {
    addTypeComment: true,
    warnOnInvalidUse: true,
    throwOnInvalidUse: false,
    addParenthesis: true,
}

export function createSourceFileTransformerFactory(program: ts.Program, options: Partial<ITransformerOptions> = {}): ts.TransformerFactory<ts.SourceFile> {
    const config = Object.assign({}, DefaultTransformerOptions, options) as ITransformerOptions;
    const checker = program.getTypeChecker();

    // find a file that has a a module reference to `PACKAGE_NAME`
    // NOTE: this took ages to find out, not sure why there isn't a simpler api for this
    const fileWithPackageAsResolvedModule = program.getSourceFiles().find(sourceFile => {
        return sourceFile.resolvedModules && sourceFile.resolvedModules.has(PACKAGE_NAME);
    });

    if (!fileWithPackageAsResolvedModule) {
        // TODO: what to do here? maybe return a transformer with no-ops?
        if (typeof console && console != null && typeof console.warn === 'function') {
            console.warn(ERROR.NoModuleDeclarationFound);
        }
        return createContextTransformer(checker, new Map() as any, config);
    }

    const packageSourceFileInfo = fileWithPackageAsResolvedModule.resolvedModules!.get(PACKAGE_NAME)!;
    const packageSourceFile = program.getSourceFile(packageSourceFileInfo.resolvedFileName);
    const moduleSymbol = packageSourceFile!.symbol;
    const exports = moduleSymbol.exports!;
    return createContextTransformer(checker, exports, config);
}

function createContextTransformer(checker: ts.TypeChecker, exports: ts.SymbolTable, options: ITransformerOptions) {
    const _transformers = [...exports as Map<ts.__String, ts.Symbol>].filter(([name, symbol]) => {
        return name !== 'default' && ts.isFunctionDeclaration(symbol.valueDeclaration) && transformers[name as keyof typeof transformers];
    }).map(([name, symbol]) => {
        const createTransformer = transformers[name as keyof typeof transformers];
        return [symbol.valueDeclaration as ts.FunctionDeclaration, createTransformer(options)] as const;
    });
    const map = new Map(_transformers);
    return function contextTransformer(context: ts.TransformationContext) {
        const visitor = createNodeVisitor(checker, context, map, options);
        return function sourceFileVisitor(file: ts.SourceFile) {
            return ts.visitNode(file, visitor);
        }
    }
}

function createNodeVisitor(checker: ts.TypeChecker, context: ts.TransformationContext, transformers: TransformerMap, options: ITransformerOptions) {
    return function nodeVisitor(node: ts.Node): ts.Node | undefined {
        if (ts.isImportDeclaration(node)) {
            return visitImportDeclaration(node, PACKAGE_NAME);
        }

        // transform
        if (ts.isCallExpression(node)) {
            return visitCallExpresion(node, checker, context, transformers);
        }
        
        if (options.throwOnInvalidUse || options.warnOnInvalidUse) {
            if (ts.isIdentifier(node)) {
                const type = checker.getTypeAtLocation(node);
                if (type && type.symbol && transformers.has(type.symbol.valueDeclaration as ts.FunctionDeclaration) && !ts.isCallExpression(node.parent)) {
                    const message = `${node.text} being used illegaly in a '${ts.SyntaxKind[node.parent.kind]}'`;
                    if (options.throwOnInvalidUse) {
                        throw new TypeError(message);
                    } else if (options.warnOnInvalidUse) {
                        if (typeof console !== 'undefined' && console != null && typeof console.warn === 'function') {
                            console.warn(message);
                        }
                    }
                }
            }
        }

        return ts.visitEachChild(node, nodeVisitor, context);
    }
}

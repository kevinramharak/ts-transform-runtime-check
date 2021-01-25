import ts from 'typescript';
import { transformers } from './transformers';
import { visitCallExpresion, visitImportDeclaration } from './visitors';

const PACKAGE_NAME = 'ts-transform-runtime-check';

const ERROR = {
    NoModuleDeclarationFound: `no module declaration found for '${PACKAGE_NAME}'`,
    NoModuleDeclarationBody: `the module declaration for '${PACKAGE_NAME}' has no body`,
    NoModuleDeclarationBlock: `the module declaration for '${PACKAGE_NAME}' does not have a body of type 'ModuleBlock'`,
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
    // find the module declaration of our package
    const module = checker.getAmbientModules().find(symbol => ts.isModuleDeclaration(symbol.valueDeclaration) && symbol.valueDeclaration.name.text === PACKAGE_NAME);
    if (!module) {
        throw new Error(ERROR.NoModuleDeclarationFound);
    }
    return createContextTransformer(checker, module.valueDeclaration as ts.ModuleDeclaration, config);
}

function createContextTransformer(checker: ts.TypeChecker, module: ts.ModuleDeclaration, options: ITransformerOptions) {
    if (!module.body) {
        throw new Error(ERROR.NoModuleDeclarationBody);
    }
    if (!ts.isModuleBlock(module.body)) {
        throw new Error(ERROR.NoModuleDeclarationBlock);
    }
    const body = module.body! as ts.ModuleBlock;
    // TODO: make sure the exports match these functions
    const declarations = body.statements.filter(statement => ts.isFunctionDeclaration(statement) && statement.name) as ts.FunctionDeclaration[];
    const transfomerMap = new Map(declarations.map(declaration => {
        const name = declaration.name!.text;
        const createTransformer = transformers[name as keyof typeof transformers];
        if (!createTransformer) {
            throw new Error(ERROR.MissingTransformer(name));
        }
        return [declaration, createTransformer(options)];
    }));
    return function contextTransformer(context: ts.TransformationContext) {
        const visitor = createNodeVisitor(checker, context, transfomerMap, options);
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

        // TODO: maybe write some event mechanism to allow a hook for whenever an identifier / type gets assigned to anything?
        if (options.throwOnInvalidUse || options.warnOnInvalidUse) {
            if (ts.isIdentifier(node)) {
                const type = checker.getTypeAtLocation(node);
                if (type && type.symbol && transformers.has(type.symbol.valueDeclaration as ts.FunctionDeclaration) && !ts.isCallExpression(node.parent)) {
                    const message = `${node.text} being used illegaly in a '${ts.SyntaxKind[node.parent.kind]}'`;
                    if (options.throwOnInvalidUse) {
                        throw new TypeError(message);
                    } else if (options.warnOnInvalidUse) {
                        console.warn(message);
                    }
                }
            }
        }

        return ts.visitEachChild(node, nodeVisitor, context);
    }
}


/**
 * Used to find our type declarations. Those type declarations will be tracked to figure out when one of the transformers is invoked.
 */
const PACKAGE_MODULE_SPECIFIER = 'ts-transform-runtime-check';

/**
 * Options to be compatible with typescript-is
 * see: https://github.com/woutervh-/typescript-is#options
 */
interface ITypeScriptIsOptions {
    /**
     * `boolean` (default false). If `true`, all type guards will return `true`, i.e. no validation takes place. Can be used for example in production deployments where doing a lot of validation can cost too much CPU.
     */
    shortCircuit: boolean;
    /**
     * `boolean` (default: `false`). If `true`, when the transformer encounters a class (except for `Date`), it will ignore it and simply return `true`. If `false`, an error is generated at compile time.
     */
    ignoreClasses: boolean;
    /**
     * `boolean` (default: `false`). If `true`, when the transformer encounters a method, it will ignore it and simply return `true`. If `false`, an error is generated at compile time.
     */
    ignoreMethods: boolean;
    /**
     * One of `error`, `ignore`, or `basic` (default: `error`). Determines the behavior of transformer when encountering a function. `error` will cause a compile-time error, `ignore` will cause the validation function to always return `true`, and `basic` will do a simple function-type-check.
     */
    functionBehaviour: 'error' | 'ignore' | 'basic';
    /**
     * `boolean` (default: `false`). If `true`, objects are checked for having superfluous properties and will cause the validation to fail if they do. If `false`, no check for superfluous properties is made.
     */
    disallowSuperfluousObjectProperties: boolean;
}

/**
 * Package configuration
 */
export interface IPublicPackageOptions {
    /**
     * Adds the type being being checked in a prefix comment when transforming type checks
     * 
     * (default: `true`)
     */
    addTypeComment?: boolean;
    /**
     * Adds parenthesis around the generated type expressions
     * 
     * (default: `true`)
     */
    addParenthesis?: boolean;
    /**
     * logs a warning if a package function is being used incorrectly
     * 
     * (default: `true`)
     * 
     * TODO: ts-patch to use the diagnostics api?
     */
    warnOnInvalidUse?: boolean;
    /**
     * throws an error if a package function is being used incorrectly, overrides @see {IPublicPackageOptions['warnOnInvalidUse']}
     * 
     * (default: `true`)
     * 
     * TODO: ts-patch to use the diagnostics api?
     */
    throwOnInvalidUse?: boolean;
    /**
     * do not generate type checks for properties that have an `@internal` annotation
     * 
     * (default: uses the value in the project's tsconfig which defaults to `false`)
     * 
     * see: https://www.typescriptlang.org/tsconfig/#stripInternal
     */
    ignoreInternal?: boolean;
    /**
     * [typescript-is](https://github.com/woutervh-/typescript-is) compatibility options
     */
    TypeScriptIs?: Partial<ITypeScriptIsOptions>;
}

/**
 * Package configuration not exposed in the public api
 */
export interface IInternalPackageOptions {
    /**
     * The module specifier that is used to track the features
     */
    PackageModuleName: string;
    /**
     * Debug mode for developing
     */
    debug: boolean;
}

/**
 * default internal package options
 */
const InternalPackageOptions: IInternalPackageOptions = {
    PackageModuleName: PACKAGE_MODULE_SPECIFIER,
    debug: false,
}

/**
 * default public package options
 */
const PackageOptions: Required<IPublicPackageOptions> = {
    addTypeComment: true,
    warnOnInvalidUse: true,
    throwOnInvalidUse: true,
    addParenthesis: true,
    ignoreInternal: false,
    TypeScriptIs: {
        shortCircuit: false,
        ignoreClasses: false,
        ignoreMethods: false,
        functionBehaviour: 'basic',
        disallowSuperfluousObjectProperties: false,
    }
}

export type IPackageOptions = IInternalPackageOptions & Required<IPublicPackageOptions>;
export const DefaultPackageOptions = Object.assign({}, InternalPackageOptions, PackageOptions);

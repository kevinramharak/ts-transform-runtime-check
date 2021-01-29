
/**
 * Used to find our type declarations. Those type declarations will be tracked to figure out when one of the transformers is invoked.
 * Can be overriden for tests
 */
const PACKAGE_MODULE_SPECIFIER = 'ts-transform-runtime-check';

/**
 * Package configuration
 */
export interface IPublicPackageOptions {
    /**
     * Adds the type being being checked in a prefix comment before the transformed node
     */
    addTypeComment: boolean;
    /**
     * Adds parenthesis around the generated type expressions
     */
    addParenthesis: boolean;
    /**
     * TODO: implement
     * logs a warning if a package function is being used incorrectly
     */
    warnOnInvalidUse: boolean;
    /**
     * TODO: implement
     * throws an error if a package function is being used incorrectly
     */
    throwOnInvalidUse: boolean;
}

/**
 * Package configuration not exposed in the public api
 */
export interface IInternalPackageOptions {
    PackageModuleName: string;
}

const InternalPackageOptions: IInternalPackageOptions = {
    PackageModuleName: PACKAGE_MODULE_SPECIFIER,
}

/**
 * 
 */
const PackageOptions: IPublicPackageOptions = {
    addTypeComment: true,
    warnOnInvalidUse: true,
    throwOnInvalidUse: false,
    addParenthesis: true,
}

export type IPackageOptions = IInternalPackageOptions & IPublicPackageOptions;
export const DefaultPackageOptions = Object.assign({}, InternalPackageOptions, PackageOptions);
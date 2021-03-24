
/**
 * @type {import('eslint').Linter.BaseConfig}
 */
module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    parserOptions: {
        tsconfigRootDir: __dirname,
        project: ['./tsconfig.json'],
    },
    plugins: [
        '@typescript-eslint'
    ],
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:@typescript-eslint/recommended-requiring-type-checking',
    ],
    rules: {
        "@typescript-eslint/explicit-module-boundary-types": "off",
        "@typescript-eslint/no-unused-vars": [
            "warn",
            {
                vars: "all",
                args: "all",
                caughtErrors: "all",
                varsIgnorePattern: "^_",
                argsIgnorePattern: "^_",
                caughtErrorsIgnorePattern: "^_",
            },
        ],
    },
};

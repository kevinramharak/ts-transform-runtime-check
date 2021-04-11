
import ts from 'typescript';
import fs from 'fs/promises';
import { createEnvironment } from '../test/createEnvironment';

function printHelp() {
    console.log(`
    --file FILENAME - transform file and print to stdout
    --string STRING - transform string and print to stdout
    `);
}

async function getCompilerOptions() {
    const contents = await fs.readFile('./tsconfig.json', { encoding: 'utf8' });
    const json = JSON.parse(contents).compilerOptions;
    const compilerOptions = ts.convertCompilerOptionsFromJson(json, '.');
    if (compilerOptions.errors.length > 0) {
        throw new Error(compilerOptions.errors[0].messageText.toString());
    }
    return compilerOptions.options;
}

(async function main(args) {
    if (args.includes('-h') || args.includes('--help')) {
        printHelp();
        return;
    }

    let input = '';
    if (args.includes('--file')) {
        input = await fs.readFile(args[args.indexOf('--file') + 1], { encoding: 'utf-8' });
    } else if (args.includes('--string')) {
        input = args[args.indexOf('--string') + 1];
    } else {
        printHelp();
        return;
    }

    const options = await getCompilerOptions();
    const env = createEnvironment(options, {
        PackageModuleName: '@lib'
    });
    const result = env.transformString(['createIs', 'is'], input);
    console.log(result);
})(process.argv.slice(2)).catch(error => {
    console.error(error);
});

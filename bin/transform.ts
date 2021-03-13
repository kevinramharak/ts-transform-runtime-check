
import ts from 'typescript';

import { createEnvironment } from '../test/createEnvironment';

function printHelp() {
    console.log(`
    --file FILENAME - transform file and print to stdout
    --string STRING - transform string and print to stdout
    `);
}

(function main(args) {
    if (args.includes('-h') || args.includes('--help')) {
        printHelp();
        return;
    }

    let input = '';
    if (args.includes('--file')) {
        input = require('fs').readFileSync(args[args.indexOf('--file') + 1], { encoding: 'utf-8' });
    } else if (args.includes('--string')) {
        input = args[args.indexOf('--string') + 1];
    } else {
        printHelp();
        return;
    }


    const env = createEnvironment(ts.getDefaultCompilerOptions(), {
        PackageModuleName: '@transformer'
    });
    const result = env.transformString(['createIs', 'is'], input);
    console.log(result);
})(process.argv.slice(2));

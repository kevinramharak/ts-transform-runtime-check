

import { transformers } from './transformers';
import { createSourceFileTransformerFactory as transformer } from './transformer';

// generate stub functions in case the package gets imported without running the transform
// const stubs = Object.keys(transformers).reduce((record, name) => {
//     record[name as keyof typeof transformers] = () => {
//         throw new TypeError(`ts-transform-runtime-check :: you are using the stub function of ${name}. did you forget to configure the transform plugin?`);
//     };
//     return record;
// }, {} as Record<keyof typeof transformers, (...args: any[]) => never>);

// TODO: figure out a way to export the stubs without breaking stuff
//exports = stubs;

export default transformer;

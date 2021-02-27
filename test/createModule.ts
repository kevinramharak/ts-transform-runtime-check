import path from 'path';
import { Module as _Module } from 'module';

interface ModuleConstructor {
    _nodeModulePaths(directoryPath: string): string[];
}

interface ModuleInstance {
    _compile(source: string, fileName: string): void;
}

const Module = _Module as typeof _Module & ModuleConstructor;

export function createModule<T extends Record<string, any>>(fileName: string, source: string): InstanceType<typeof Module> & { exports: T } {
    fileName = path.resolve(process.cwd(), fileName);
    const mod = new Module(fileName, require.main) as InstanceType<typeof Module> & ModuleInstance;
    mod.filename = fileName;
    mod.paths = Module._nodeModulePaths(path.dirname(fileName));
    mod._compile(source, fileName);
    return mod;
}

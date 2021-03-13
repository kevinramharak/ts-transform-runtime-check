
export interface Logger {
    debug(...input: unknown[]): void;
    log(...input: unknown[]): void;
    info(...input: unknown[]): void;
    warn(...input: unknown[]): void;
    error(...input: unknown[]): void;
    assert(condition: boolean, ...input: unknown[]): asserts condition;
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
function noop(...input: unknown[]) {}

export class AssertionError extends Error {}

const noopLogger: Logger = {
    debug: noop,
    log: noop,
    info: noop,
    warn: noop,
    error: noop,
    assert(condition, ...input) {
        if (!condition) {
            throw new AssertionError('assertion error: ' + input.join(', '));
        }
    }
};

let _logger: Logger = noopLogger;

export function useLogger(logger: Logger) {
    _logger = logger;
}

export function log(...input: unknown[]) {
    _logger.log(...input);
}

export function debug(...input: unknown[]) {
    _logger.debug(...input);
}

export function info(...input: unknown[]) {
    _logger.info(...input);
}

export function warn(...input: unknown[]) {
    _logger.warn(...input);
}

export function error(...input: unknown[]) {
    _logger.error(...input);
}

export function assert(condition: boolean, ...input: unknown[]): asserts condition {
    _logger.assert(condition, ...input);
    if (!condition) {
        throw new AssertionError();
    }
}
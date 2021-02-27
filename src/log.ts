
interface Logger {
    debug(...input: unknown[]): void;
    log(...input: unknown[]): void;
    info(...input: unknown[]): void;
    warn(...input: unknown[]): void;
    error(...input: unknown[]): void;
    assert(condition: boolean, ...input: unknown[]): asserts condition;
}

function noop(...input: unknown[]) {}

const noopLogger: Logger = {
    debug: noop,
    log: noop,
    info: noop,
    warn: noop,
    error: noop,
    assert(condition, ...input) {
        if (!condition) {
            throw new Error('assertion error: ' + input.join(', '));
        }
    }
};

let _logger: Logger = noopLogger;

export function useLogger(logger: Logger) {
    _logger = logger;
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

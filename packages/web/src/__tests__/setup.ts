// Enable React act() environment for jsdom tests.
// This silences the "The current testing environment is not configured to support act(...)" warning.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

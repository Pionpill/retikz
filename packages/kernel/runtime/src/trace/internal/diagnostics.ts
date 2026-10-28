import type { PerformanceTraceDiagnostic, RuntimeTraceReporter } from '../types';

const traceDiagnosticObservers = new WeakMap<RuntimeTraceReporter, (diagnostic: PerformanceTraceDiagnostic) => void>();

/** 让 Runtime 内部 owner 在不提前 drain 的前提下观察 reporter diagnostics */
export const observeRuntimeTraceReporterDiagnostics = (
  reporter: RuntimeTraceReporter,
  observer: (diagnostic: PerformanceTraceDiagnostic) => void,
): void => {
  traceDiagnosticObservers.set(reporter, observer);
};

/** 通知 Runtime 内部 owner 一个刚产生的 reporter diagnostic */
export const notifyRuntimeTraceReporterDiagnostic = (
  reporter: RuntimeTraceReporter,
  diagnostic: PerformanceTraceDiagnostic,
): void => {
  traceDiagnosticObservers.get(reporter)?.(diagnostic);
};

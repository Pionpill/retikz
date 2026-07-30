import type { PerformanceTraceDiagnostic, RuntimeTraceReporter } from '../types';

const traceDiagnosticObservers = new WeakMap<RuntimeTraceReporter, (diagnostic: PerformanceTraceDiagnostic) => void>();
const traceDiagnosticDrainCounts = new WeakMap<RuntimeTraceReporter['report'], number>();

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

/** 记录一次由 Runtime owner 执行的 reporter diagnostic drain */
export const recordRuntimeTraceReporterDiagnosticDrain = (report: RuntimeTraceReporter['report']): void => {
  traceDiagnosticDrainCounts.set(report, (traceDiagnosticDrainCounts.get(report) ?? 0) + 1);
};

/** 返回指定 report facade 已执行的 diagnostic drain 次数 */
export const getRuntimeTraceReporterDiagnosticDrainCount = (report: RuntimeTraceReporter['report']): number =>
  traceDiagnosticDrainCounts.get(report) ?? 0;

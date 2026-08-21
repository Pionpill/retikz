import type {
  CreateRuntimeTraceReporterInput,
  PerformanceTraceDiagnostic,
  PerformanceTraceRecord,
  RuntimeTracePhaseDefinition,
  RuntimeTraceReporter,
} from './types';

import { RetikzRuntimeError, RetikzRuntimeErrorCode } from '../error';
import { PerformanceTraceOutcome } from './constants';
import { notifyRuntimeTraceReporterDiagnostic, recordRuntimeTraceReporterDiagnosticDrain } from './internal';

const isValidCount = (value: number): boolean => Number.isSafeInteger(value) && value >= 0;

const traceDefinitionError = (message: string, cause: unknown): RetikzRuntimeError =>
  new RetikzRuntimeError({
    code: RetikzRuntimeErrorCode.TraceDefinitionInvalid,
    phase: 'trace-definition',
    message,
    cause,
  });

/** 为 phase 与 unit 组合生成无碰撞 definition key */
const traceDefinitionKey = (phase: PerformanceTraceRecord['phase'], unit: PerformanceTraceRecord['unit']): string =>
  `${phase.length}:${phase}${unit}`;

const isValidRecord = (
  record: Omit<PerformanceTraceRecord, 'owner'>,
  definitions: ReadonlyMap<string, RuntimeTracePhaseDefinition>,
): boolean => {
  const definition = definitions.get(traceDefinitionKey(record.phase, record.unit));
  if (definition === undefined) return false;
  if (!definition.outcomes.includes(record.outcome)) return false;
  if (!isValidCount(record.visited) || !isValidCount(record.reused) || !isValidCount(record.changed)) {
    return false;
  }
  if (record.reused > record.visited || record.changed > record.visited) return false;
  return record.outcome !== PerformanceTraceOutcome.Bailout || record.changed === 0;
};

const normalizePhaseDefinitions = (
  definitions: ReadonlyArray<RuntimeTracePhaseDefinition>,
): ReadonlyMap<string, RuntimeTracePhaseDefinition> => {
  const byKey = new Map<string, RuntimeTracePhaseDefinition>();
  for (const definition of definitions) {
    if (definition.outcomes.length === 0) {
      throw traceDefinitionError(`createRuntimeTraceReporter: phase "${definition.phase}" has no outcomes`, definition);
    }
    const key = traceDefinitionKey(definition.phase, definition.unit);
    if (byKey.has(key)) {
      throw traceDefinitionError(
        `createRuntimeTraceReporter: duplicate phase/unit "${definition.phase}/${definition.unit}"`,
        definition,
      );
    }
    byKey.set(key, Object.freeze({ ...definition, outcomes: Object.freeze([...definition.outcomes]) }));
  }
  return byKey;
};

/** 创建一个固定 owner 且失败隔离的同步 trace reporter */
export const createRuntimeTraceReporter = <const TOwner extends string>(
  input: CreateRuntimeTraceReporterInput<TOwner>,
): RuntimeTraceReporter<TOwner> => {
  const owner = input.owner;
  const sink = input.sink;
  if (owner.length === 0) {
    throw traceDefinitionError('createRuntimeTraceReporter: owner must not be empty', owner);
  }

  const definitions = normalizePhaseDefinitions(input.phases);
  let diagnostics: Array<PerformanceTraceDiagnostic> = [];
  let reporting = false;
  const reporterRef: { current?: RuntimeTraceReporter<TOwner> } = {};

  const appendDiagnostic = (code: PerformanceTraceDiagnostic['code'], phase: PerformanceTraceRecord['phase']): void => {
    const diagnostic = Object.freeze({ code, owner, phase });
    diagnostics.push(diagnostic);
    if (reporterRef.current !== undefined) {
      notifyRuntimeTraceReporterDiagnostic(reporterRef.current, diagnostic);
    }
  };

  const report: RuntimeTraceReporter<TOwner>['report'] = record => {
    const diagnosticPhase = record.phase;
    if (reporting) {
      appendDiagnostic('reentrant-report', diagnosticPhase);
      return;
    }

    if (!isValidRecord(record, definitions)) {
      appendDiagnostic('invalid-record', diagnosticPhase);
      return;
    }

    const output = Object.freeze({ ...record, owner });
    reporting = true;
    try {
      sink(output);
    } catch {
      appendDiagnostic('sink-threw', diagnosticPhase);
    } finally {
      reporting = false;
    }
  };
  const drainDiagnostics = (): ReadonlyArray<PerformanceTraceDiagnostic> => {
    recordRuntimeTraceReporterDiagnosticDrain(report);
    const output = Object.freeze([...diagnostics]);
    diagnostics = [];
    return output;
  };
  const reporter: RuntimeTraceReporter<TOwner> = Object.freeze({
    owner,
    report,
    diagnostics: drainDiagnostics,
  });
  reporterRef.current = reporter;
  return reporter;
};

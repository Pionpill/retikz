import type { PerformanceTracePhaseValue } from './constants';
import type {
  CreateRuntimeTraceReporterInput,
  PerformanceTraceDiagnostic,
  PerformanceTraceRecord,
  RuntimeTracePhaseDefinition,
  RuntimeTraceReporter,
} from './types';

import {
  PerformanceTraceOutcome,
  PerformanceTracePhase as PerformanceTracePhaseConstants,
  PerformanceTraceUnit,
} from './constants';
import { notifyRuntimeTraceReporterDiagnostic, recordRuntimeTraceReporterDiagnosticDrain } from './internal';

const performanceTracePhases: ReadonlySet<unknown> = new Set(Object.values(PerformanceTracePhaseConstants));
const performanceTraceUnits: ReadonlySet<unknown> = new Set(Object.values(PerformanceTraceUnit));
const performanceTraceOutcomes: ReadonlySet<unknown> = new Set(Object.values(PerformanceTraceOutcome));
const isValidCount = (value: number): boolean => Number.isSafeInteger(value) && value >= 0;

const isPerformanceTracePhase = (value: unknown): value is PerformanceTracePhaseValue =>
  performanceTracePhases.has(value);

/** 为 phase 与 unit 组合生成无碰撞 definition key */
const traceDefinitionKey = (phase: PerformanceTracePhaseValue, unit: PerformanceTraceRecord['unit']): string =>
  `${phase.length}:${phase}${unit}`;

const hasValidRecordShape = (record: unknown): record is Omit<PerformanceTraceRecord, 'owner'> => {
  if (typeof record !== 'object' || record === null) return false;
  return (
    isPerformanceTracePhase(Reflect.get(record, 'phase')) &&
    performanceTraceUnits.has(Reflect.get(record, 'unit')) &&
    performanceTraceOutcomes.has(Reflect.get(record, 'outcome')) &&
    typeof Reflect.get(record, 'visited') === 'number' &&
    typeof Reflect.get(record, 'reused') === 'number' &&
    typeof Reflect.get(record, 'changed') === 'number'
  );
};

const isValidRecord = (record: unknown, definitions: ReadonlyMap<string, RuntimeTracePhaseDefinition>): boolean => {
  if (!hasValidRecordShape(record)) return false;
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
  if (!Array.isArray(definitions)) {
    throw new Error('createRuntimeTraceReporter: phases must be an array');
  }

  const byKey = new Map<string, RuntimeTracePhaseDefinition>();
  for (const definition of definitions) {
    if (!performanceTracePhases.has(definition.phase)) {
      throw new Error('createRuntimeTraceReporter: invalid phase');
    }
    if (!performanceTraceUnits.has(definition.unit)) {
      throw new Error(`createRuntimeTraceReporter: phase "${definition.phase}" has an invalid unit`);
    }
    if (!Array.isArray(definition.outcomes) || definition.outcomes.length === 0) {
      throw new Error(`createRuntimeTraceReporter: phase "${definition.phase}" has no outcomes`);
    }
    if (
      definition.outcomes.some((outcome: PerformanceTraceRecord['outcome']) => !performanceTraceOutcomes.has(outcome))
    ) {
      throw new Error(`createRuntimeTraceReporter: phase "${definition.phase}" has an invalid outcome`);
    }
    const key = traceDefinitionKey(definition.phase, definition.unit);
    if (byKey.has(key)) {
      throw new Error(`createRuntimeTraceReporter: duplicate phase/unit "${definition.phase}/${definition.unit}"`);
    }
    byKey.set(key, Object.freeze({ ...definition, outcomes: Object.freeze([...definition.outcomes]) }));
  }
  return byKey;
};

const resolveDiagnosticPhase = (
  record: unknown,
  definitions: ReadonlyMap<string, RuntimeTracePhaseDefinition>,
): PerformanceTracePhaseValue => {
  const phase = typeof record === 'object' && record !== null ? Reflect.get(record, 'phase') : undefined;
  if (isPerformanceTracePhase(phase)) return phase;
  return definitions.values().next().value?.phase ?? PerformanceTracePhaseConstants.Update;
};

/** 创建一个固定 owner 且失败隔离的同步 trace reporter */
export const createRuntimeTraceReporter = <const TOwner extends string>(
  input: CreateRuntimeTraceReporterInput<TOwner>,
): RuntimeTraceReporter<TOwner> => {
  const owner = input.owner;
  const sink = input.sink;
  if (typeof owner !== 'string' || owner.length === 0) {
    throw new Error('createRuntimeTraceReporter: owner must not be empty');
  }
  if (typeof sink !== 'function') {
    throw new Error('createRuntimeTraceReporter: sink must be a function');
  }

  const definitions = normalizePhaseDefinitions(input.phases);
  let diagnostics: Array<PerformanceTraceDiagnostic> = [];
  let reporting = false;
  const reporterRef: { current?: RuntimeTraceReporter<TOwner> } = {};

  const appendDiagnostic = (code: PerformanceTraceDiagnostic['code'], phase: PerformanceTracePhaseValue): void => {
    const diagnostic = Object.freeze({ code, owner, phase });
    diagnostics.push(diagnostic);
    if (reporterRef.current !== undefined) {
      notifyRuntimeTraceReporterDiagnostic(reporterRef.current, diagnostic);
    }
  };

  const report: RuntimeTraceReporter<TOwner>['report'] = record => {
    const diagnosticPhase = resolveDiagnosticPhase(record, definitions);
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

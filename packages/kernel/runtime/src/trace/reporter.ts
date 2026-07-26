import type {
  CreateRuntimeTraceReporterInput,
  PerformanceTraceDiagnostic,
  PerformanceTracePhase,
  PerformanceTraceRecord,
  RuntimeTracePhaseDefinition,
  RuntimeTraceReporter,
} from './types';

const performanceTracePhases: ReadonlySet<unknown> = new Set<PerformanceTracePhase>(['compile', 'commit', 'update']);
const performanceTraceUnits: ReadonlySet<unknown> = new Set<PerformanceTraceRecord['unit']>([
  'ir-child',
  'scene-primitive',
  'program',
  'scene-change',
]);
const performanceTraceOutcomes: ReadonlySet<unknown> = new Set<PerformanceTraceRecord['outcome']>([
  'full',
  'incremental',
  'bailout',
  'fallback',
  'commit',
]);

const isValidCount = (value: number): boolean => Number.isSafeInteger(value) && value >= 0;

const isPerformanceTracePhase = (value: unknown): value is PerformanceTracePhase => performanceTracePhases.has(value);

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

const isValidRecord = (
  record: unknown,
  definitions: ReadonlyMap<PerformanceTracePhase, RuntimeTracePhaseDefinition>,
): boolean => {
  if (!hasValidRecordShape(record)) return false;
  const definition = definitions.get(record.phase);
  if (definition === undefined || definition.unit !== record.unit) return false;
  if (!definition.outcomes.includes(record.outcome)) return false;
  if (!isValidCount(record.visited) || !isValidCount(record.reused) || !isValidCount(record.changed)) {
    return false;
  }
  if (record.reused > record.visited || record.changed > record.visited) return false;
  return record.outcome !== 'bailout' || record.changed === 0;
};

const normalizePhaseDefinitions = (
  definitions: ReadonlyArray<RuntimeTracePhaseDefinition>,
): ReadonlyMap<PerformanceTracePhase, RuntimeTracePhaseDefinition> => {
  if (!Array.isArray(definitions)) {
    throw new Error('createRuntimeTraceReporter: phases must be an array');
  }

  const byPhase = new Map<PerformanceTracePhase, RuntimeTracePhaseDefinition>();
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
    if (byPhase.has(definition.phase)) {
      throw new Error(`createRuntimeTraceReporter: duplicate phase "${definition.phase}"`);
    }
    byPhase.set(definition.phase, Object.freeze({ ...definition, outcomes: Object.freeze([...definition.outcomes]) }));
  }
  return byPhase;
};

const resolveDiagnosticPhase = (
  record: unknown,
  definitions: ReadonlyMap<PerformanceTracePhase, RuntimeTracePhaseDefinition>,
): PerformanceTracePhase => {
  const phase = typeof record === 'object' && record !== null ? Reflect.get(record, 'phase') : undefined;
  if (isPerformanceTracePhase(phase)) return phase;
  return definitions.keys().next().value ?? 'update';
};

/** 创建一个固定 owner 且失败隔离的同步 trace reporter */
export const createRuntimeTraceReporter = (input: CreateRuntimeTraceReporterInput): RuntimeTraceReporter => {
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

  const appendDiagnostic = (code: PerformanceTraceDiagnostic['code'], phase: PerformanceTracePhase): void => {
    diagnostics.push(Object.freeze({ code, owner, phase }));
  };

  return Object.freeze({
    owner,
    report: (record): void => {
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
    },
    diagnostics: (): ReadonlyArray<PerformanceTraceDiagnostic> => {
      const output = Object.freeze([...diagnostics]);
      diagnostics = [];
      return output;
    },
  });
};

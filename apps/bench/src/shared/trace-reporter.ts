import type { PerformanceTraceRecord, PerformanceTraceSink, ValueOf } from '@retikz/foundation';

/** 性能 trace 的执行结果常量 */
export const PerformanceTraceOutcome = {
  /** 完整执行结果 */
  Full: 'full',
  /** 增量执行结果 */
  Incremental: 'incremental',
  /** 增量路径主动放弃结果 */
  Bailout: 'bailout',
  /** 回退到完整执行结果 */
  Fallback: 'fallback',
  /** 提交结果 */
  Commit: 'commit',
} as const;

/** 性能 trace 的执行结果取值类型 */
export type PerformanceTraceOutcome = ValueOf<typeof PerformanceTraceOutcome>;

/** trace reporter 的非致命诊断 */
export type PerformanceTraceDiagnostic = Readonly<{
  /** 诊断类别 */
  code: 'invalid-record' | 'sink-threw' | 'reentrant-report';
  /** reporter 绑定的 owner */
  owner: string;
  /** 触发诊断的执行阶段 */
  phase: string;
}>;

/** owner 允许报告的阶段、单位与结果组合 */
export type PerformanceTracePhaseDefinition = Readonly<{
  /** owner 自定义的阶段名称 */
  phase: string;
  /** 与阶段共同标识声明组合的 owner 自定义计数单位 */
  unit: string;
  /** 阶段允许报告的结果 */
  outcomes: ReadonlyArray<PerformanceTraceOutcome>;
}>;

/**
 * 由 Bench 固定 owner 的同步 trace reporter
 * @template TOwner 报告器固定绑定的来源名称类型，保留 owner 的字面量信息；默认沿用 string
 */
export type PerformanceTraceReporter<TOwner extends string = string> = Readonly<{
  /** reporter 绑定的 owner */
  owner: TOwner;
  /** 校验并报告一条不含 owner 的性能记录 */
  report: (record: Omit<PerformanceTraceRecord, 'owner'>) => void;
  /** 返回并清空 reporter-local 诊断 */
  diagnostics: () => ReadonlyArray<PerformanceTraceDiagnostic>;
}>;

/**
 * 创建 trace reporter 的配置
 * @template TOwner 报告器固定绑定的来源名称类型，保留 owner 的字面量信息；默认沿用 string
 */
export type CreatePerformanceTraceReporterInput<TOwner extends string = string> = Readonly<{
  /** reporter 固定绑定的 owner */
  owner: TOwner;
  /** owner 可以报告的阶段定义 */
  phases: ReadonlyArray<PerformanceTracePhaseDefinition>;
  /** 接收合法记录的同步回调 */
  sink: PerformanceTraceSink;
}>;

const isValidCount = (value: number): boolean => Number.isSafeInteger(value) && value >= 0;

/** 为 phase 与 unit 组合生成无碰撞 definition key */
const traceDefinitionKey = (phase: PerformanceTraceRecord['phase'], unit: PerformanceTraceRecord['unit']): string =>
  `${phase.length}:${phase}${unit}`;

const isValidRecord = (
  record: Omit<PerformanceTraceRecord, 'owner'>,
  definitions: ReadonlyMap<string, PerformanceTracePhaseDefinition>,
): boolean => {
  const definition = definitions.get(traceDefinitionKey(record.phase, record.unit));
  if (definition === undefined) return false;
  if (!definition.outcomes.some(outcome => outcome === record.outcome)) return false;
  if (!isValidCount(record.visited) || !isValidCount(record.reused) || !isValidCount(record.changed)) {
    return false;
  }

  if (record.reused > record.visited || record.changed > record.visited) return false;

  return record.outcome !== PerformanceTraceOutcome.Bailout || record.changed === 0;
};

const normalizePhaseDefinitions = (
  definitions: ReadonlyArray<PerformanceTracePhaseDefinition>,
): ReadonlyMap<string, PerformanceTracePhaseDefinition> => {
  const byKey = new Map<string, PerformanceTracePhaseDefinition>();

  for (const definition of definitions) {
    if (definition.outcomes.length === 0) {
      throw new Error(`createPerformanceTraceReporter: phase "${definition.phase}" has no outcomes`);
    }

    const key = traceDefinitionKey(definition.phase, definition.unit);
    if (byKey.has(key)) {
      throw new Error(`createPerformanceTraceReporter: duplicate phase/unit "${definition.phase}/${definition.unit}"`);
    }

    byKey.set(key, Object.freeze({ ...definition, outcomes: Object.freeze([...definition.outcomes]) }));
  }

  return byKey;
};

/**
 * 创建一个固定 owner 且失败隔离的同步 trace reporter
 * @template TOwner 报告器固定绑定的来源名称类型，保留 owner 的字面量信息
 * @param input 固定归属、允许的阶段与同步接收函数
 * @returns 隔离非法记录、接收函数异常与重入的报告器
 * @throws {Error} owner 为空、阶段与单位重复或 outcomes 为空时抛出 TraceDefinitionInvalid
 */
export const createPerformanceTraceReporter = <const TOwner extends string>(
  input: CreatePerformanceTraceReporterInput<TOwner>,
): PerformanceTraceReporter<TOwner> => {
  const owner = input.owner;
  const sink = input.sink;
  if (owner.length === 0) {
    throw new Error('createPerformanceTraceReporter: owner must not be empty');
  }

  const definitions = normalizePhaseDefinitions(input.phases);
  let diagnostics: Array<PerformanceTraceDiagnostic> = [];
  let reporting = false;

  const appendDiagnostic = (code: PerformanceTraceDiagnostic['code'], phase: PerformanceTraceRecord['phase']): void => {
    const diagnostic = Object.freeze({ code, owner, phase });
    diagnostics.push(diagnostic);
  };

  const report: PerformanceTraceReporter<TOwner>['report'] = record => {
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
    const output = Object.freeze([...diagnostics]);
    diagnostics = [];

    return output;
  };

  const reporter: PerformanceTraceReporter<TOwner> = Object.freeze({
    owner,
    report,
    diagnostics: drainDiagnostics,
  });

  return reporter;
};

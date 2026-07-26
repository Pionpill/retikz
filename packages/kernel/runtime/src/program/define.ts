import type { RuntimeOwnerToken } from '../owner';
import type { RuntimeTracePhaseDefinition } from '../trace';
import type {
  RuntimeCandidateView,
  RuntimeCommitEvent,
  RuntimeProgramContext,
  RuntimeProgramDefinition,
  RuntimeProgramDefinitionInput,
  RuntimeProgramToken,
  RuntimeRunResult,
  RuntimeUpdateResult,
} from './types';

import { RuntimeError } from '../error';

/** registry 私有保存的 Program metadata 与 callback 擦除视图 */
export type RuntimeProgramErasedExecutor = Readonly<{
  /** 已复制冻结的 owner dependencies */
  owners: ReadonlyArray<RuntimeOwnerToken>;
  /** 已复制冻结的 Program dependencies */
  programs: ReadonlyArray<RuntimeProgramToken>;
  /** 已复制冻结的 trace declarations */
  tracePhases: ReadonlyArray<RuntimeTracePhaseDefinition>;
  /** 捕获具体 Definition 的 artifact */
  capture: <TArtifactInput, TArtifact>(input: TArtifactInput) => TArtifact;
  /** 读取具体 Definition 的 private Program view */
  readForProgram: <TArtifact, TProgramRead>(artifact: TArtifact) => TProgramRead;
  /** 读取具体 Definition 的 public artifact view */
  read: <TArtifact, TPublicRead>(artifact: TArtifact) => TPublicRead;
  /** 释放具体 Definition 捕获的 artifact */
  dispose?: <TArtifact>(artifact: TArtifact) => void;
  /** 执行 full Program callback */
  run: <TArtifactInput>(view: RuntimeCandidateView, context: RuntimeProgramContext) => RuntimeRunResult<TArtifactInput>;
  /** 执行 incremental Program callback */
  update?: <TArtifactInput, TProgramRead>(
    previous: TProgramRead,
    view: RuntimeCandidateView,
    context: RuntimeProgramContext,
  ) => RuntimeUpdateResult<TArtifactInput>;
  /** 通知成功发布的 artifact */
  observeCommit?: <TPublicRead>(event: RuntimeCommitEvent<TPublicRead>) => void;
}>;

const runtimeProgramTokens = new WeakSet<object>();
const runtimeProgramExecutors = new WeakMap<object, RuntimeProgramErasedExecutor>();
const tracePhases: ReadonlySet<unknown> = new Set(['compile', 'commit', 'update']);
const traceUnits: ReadonlySet<unknown> = new Set(['ir-child', 'scene-primitive', 'program', 'scene-change']);
const traceOutcomes: ReadonlySet<unknown> = new Set(['full', 'incremental', 'bailout', 'fallback', 'commit']);

/** 创建 Program Definition 输入错误 */
const invalidProgram = (code: 'RUNTIME_PROGRAM_ID_INVALID' | 'RUNTIME_PROGRAM_TOKEN_INVALID', cause: unknown) =>
  new RuntimeError({ code, phase: 'program-definition', cause });

/** 校验并复制 Program 的 trace declarations */
const copyTracePhases = (value: unknown): ReadonlyArray<RuntimeTracePhaseDefinition> => {
  if (!Array.isArray(value)) {
    throw new RuntimeError({ code: 'RUNTIME_TRACE_DEFINITION_INVALID', phase: 'program-definition', cause: value });
  }
  const definitions: ReadonlyArray<unknown> = value;
  const seen = new Set<string>();
  const copied = definitions.map(candidate => {
    if (typeof candidate !== 'object' || candidate === null) {
      throw new RuntimeError({
        code: 'RUNTIME_TRACE_DEFINITION_INVALID',
        phase: 'program-definition',
        cause: candidate,
      });
    }
    const phase: unknown = Reflect.get(candidate, 'phase');
    const unit: unknown = Reflect.get(candidate, 'unit');
    const outcomesCandidate: unknown = Reflect.get(candidate, 'outcomes');
    const outcomes: ReadonlyArray<unknown> = Array.isArray(outcomesCandidate) ? outcomesCandidate : [];
    const key = `${String(phase)}\u0000${String(unit)}`;
    if (
      !tracePhases.has(phase) ||
      !traceUnits.has(unit) ||
      !Array.isArray(outcomesCandidate) ||
      outcomesCandidate.length === 0 ||
      outcomes.some(outcome => !traceOutcomes.has(outcome)) ||
      seen.has(key)
    ) {
      throw new RuntimeError({
        code: 'RUNTIME_TRACE_DEFINITION_INVALID',
        phase: 'program-definition',
        cause: candidate,
      });
    }
    seen.add(key);
    return Object.freeze({ phase, unit, outcomes: Object.freeze([...outcomes]) }) as RuntimeTracePhaseDefinition;
  });
  return Object.freeze(copied);
};

/** 创建不暴露 author callbacks 的 typed Program token */
export const defineRuntimeProgram = <TArtifactInput, TArtifact, TProgramRead, TPublicRead = TProgramRead>(
  input: RuntimeProgramDefinitionInput<TArtifactInput, TArtifact, TProgramRead, TPublicRead>,
): RuntimeProgramDefinition<TArtifactInput, TArtifact, TProgramRead, TPublicRead> => {
  const candidate: unknown = input;
  if (typeof candidate !== 'object' || candidate === null) throw invalidProgram('RUNTIME_PROGRAM_TOKEN_INVALID', input);
  const id: unknown = Reflect.get(candidate, 'id');
  const owner: unknown = typeof id === 'object' && id !== null ? Reflect.get(id, 'owner') : undefined;
  const key: unknown = typeof id === 'object' && id !== null ? Reflect.get(id, 'key') : undefined;
  if (
    typeof id !== 'object' ||
    id === null ||
    typeof owner !== 'string' ||
    owner.length === 0 ||
    typeof key !== 'string' ||
    key.length === 0
  ) {
    throw invalidProgram('RUNTIME_PROGRAM_ID_INVALID', id);
  }
  if (!Array.isArray(input.owners) || !Array.isArray(input.programs)) {
    throw invalidProgram('RUNTIME_PROGRAM_TOKEN_INVALID', input);
  }
  const artifactCandidate: unknown = Reflect.get(candidate, 'artifact');
  if (
    typeof artifactCandidate !== 'object' ||
    artifactCandidate === null ||
    typeof Reflect.get(artifactCandidate, 'capture') !== 'function' ||
    typeof Reflect.get(artifactCandidate, 'readForProgram') !== 'function' ||
    typeof Reflect.get(artifactCandidate, 'read') !== 'function' ||
    (Reflect.get(artifactCandidate, 'dispose') !== undefined &&
      typeof Reflect.get(artifactCandidate, 'dispose') !== 'function') ||
    typeof input.run !== 'function' ||
    (input.update !== undefined && typeof input.update !== 'function') ||
    (input.observeCommit !== undefined && typeof input.observeCommit !== 'function')
  ) {
    throw invalidProgram('RUNTIME_PROGRAM_TOKEN_INVALID', input);
  }
  const { capture, readForProgram, read, dispose } = input.artifact;
  const { run, update, observeCommit } = input;
  const copiedId = Object.freeze({ owner, key });
  const copiedOwners = Object.freeze([...input.owners]);
  const copiedPrograms = Object.freeze([...input.programs]);
  const copiedTracePhases = copyTracePhases(input.tracePhases);
  const token = Object.freeze({ id: copiedId }) as RuntimeProgramDefinition<
    TArtifactInput,
    TArtifact,
    TProgramRead,
    TPublicRead
  >;
  const typedExecutor = Object.freeze({
    owners: copiedOwners,
    programs: copiedPrograms,
    tracePhases: copiedTracePhases,
    capture: (source: TArtifactInput): TArtifact => capture(source),
    readForProgram: (value: TArtifact): TProgramRead => readForProgram(value),
    read: (value: TArtifact): TPublicRead => read(value),
    dispose,
    run: (view: RuntimeCandidateView, context: RuntimeProgramContext): RuntimeRunResult<TArtifactInput> =>
      run(view, context),
    update,
    observeCommit,
  });
  const erasedExecutor = typedExecutor as unknown as RuntimeProgramErasedExecutor;
  runtimeProgramTokens.add(token);
  runtimeProgramExecutors.set(token, erasedExecutor);
  return token;
};

/** 判断动态值是否由当前 Runtime 实例的 define helper 创建 */
export const isRuntimeProgramDefinition = (value: unknown): value is RuntimeProgramToken =>
  typeof value === 'object' && value !== null && runtimeProgramTokens.has(value);

/** 读取 define 时创建的 Program callback 擦除视图 */
export const getRuntimeProgramDefinitionExecutor = (definition: RuntimeProgramToken): RuntimeProgramErasedExecutor => {
  if (!isRuntimeProgramDefinition(definition)) {
    throw invalidProgram('RUNTIME_PROGRAM_TOKEN_INVALID', definition);
  }
  const executor = runtimeProgramExecutors.get(definition);
  if (executor === undefined) throw new Error('runtime Program definition: missing executor');
  return executor;
};

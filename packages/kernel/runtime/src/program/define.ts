import type { RuntimeDiagnostic } from '../diagnostic';
import type { RuntimeOwnerToken } from '../owner';
import type { RuntimeRevision } from '../owner';
import type { RuntimeTracePhaseDefinition } from '../trace';
import type { RuntimeSnapshot } from '../transaction';
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
import { PerformanceTraceOutcome, PerformanceTracePhase, PerformanceTraceUnit } from '../trace/constants';

/** Program prepare 完成但尚未发布的 artifact 与双层 read cache */
export type RuntimePreparedProgramArtifact<TArtifact, TProgramRead, TPublicRead> = Readonly<{
  /** session-owned captured artifact */
  artifact: TArtifact;
  /** 只供本 Program update 使用的 private read */
  programRead: TProgramRead;
  /** 依赖 Program 与宿主可见的 public read */
  publicRead: TPublicRead;
}>;

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
  /** capture、拒绝 current alias 并缓存 concrete artifact 的双层 read */
  prepareArtifact: (
    input: unknown,
    current?: RuntimePreparedProgramArtifact<unknown, unknown, unknown>,
  ) => RuntimePreparedProgramArtifact<unknown, unknown, unknown>;
  /** 以 concrete public read 类型创建 revision-bound artifact Snapshot */
  snapshot: <TArtifactInput, TArtifact, TProgramRead, TPublicRead>(
    definition: RuntimeProgramDefinition<TArtifactInput, TArtifact, TProgramRead, TPublicRead>,
    prepared: RuntimePreparedProgramArtifact<unknown, unknown, unknown>,
    revision: RuntimeRevision,
  ) => RuntimeSnapshot<TPublicRead>;
  /** 以动态 token 创建 observer 使用的 erased public Snapshot */
  snapshotToken: (
    definition: RuntimeProgramToken,
    prepared: RuntimePreparedProgramArtifact<unknown, unknown, unknown>,
    revision: RuntimeRevision,
  ) => RuntimeSnapshot<unknown>;
  /** 释放 concrete prepared artifact，并隔离 dispose throw */
  retire: (prepared: RuntimePreparedProgramArtifact<unknown, unknown, unknown>) => ReadonlyArray<RuntimeDiagnostic>;
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
const tracePhases: ReadonlySet<unknown> = new Set(Object.values(PerformanceTracePhase));
const traceUnits: ReadonlySet<unknown> = new Set(Object.values(PerformanceTraceUnit));
const traceOutcomes: ReadonlySet<unknown> = new Set(Object.values(PerformanceTraceOutcome));

/** 创建 artifact dispose 失败的非致命诊断 */
const artifactDisposeDiagnostic = (program: RuntimeProgramToken, cause: unknown): RuntimeDiagnostic =>
  Object.freeze({
    code: 'RUNTIME_ARTIFACT_DISPOSE_FAILED',
    phase: 'artifact-dispose',
    severity: 'error',
    message: cause instanceof Error ? cause.message : String(cause),
    owner: program.id.owner,
    program: program.id,
    cause,
  });

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
  /** 释放一个已捕获 artifact，并把 throw 隔离为 secondary diagnostic */
  const retireArtifact = (artifact: TArtifact): ReadonlyArray<RuntimeDiagnostic> => {
    if (dispose === undefined) return Object.freeze([]);
    try {
      dispose(artifact);
      return Object.freeze([]);
    } catch (cause) {
      return Object.freeze([artifactDisposeDiagnostic(token, cause)]);
    }
  };

  /** 创建带稳定 Program context 的 artifact lifecycle primary error */
  const artifactError = (
    code:
      | 'RUNTIME_ARTIFACT_CAPTURE_FAILED'
      | 'RUNTIME_ARTIFACT_PROGRAM_READ_FAILED'
      | 'RUNTIME_ARTIFACT_PUBLIC_READ_FAILED',
    phase: 'artifact-capture' | 'artifact-program-read' | 'artifact-public-read',
    cause: unknown,
    diagnostics: ReadonlyArray<RuntimeDiagnostic> = [],
  ) =>
    new RuntimeError({
      code,
      phase,
      owner: copiedId.owner,
      program: copiedId,
      cause,
      diagnostics,
    });

  const typedExecutor = Object.freeze({
    owners: copiedOwners,
    programs: copiedPrograms,
    tracePhases: copiedTracePhases,
    capture: (source: TArtifactInput): TArtifact => capture(source),
    readForProgram: (value: TArtifact): TProgramRead => readForProgram(value),
    read: (value: TArtifact): TPublicRead => read(value),
    dispose,
    prepareArtifact: (
      source: TArtifactInput,
      current?: RuntimePreparedProgramArtifact<TArtifact, TProgramRead, TPublicRead>,
    ): RuntimePreparedProgramArtifact<TArtifact, TProgramRead, TPublicRead> => {
      let artifact: TArtifact;
      try {
        artifact = capture(source);
      } catch (cause) {
        throw artifactError('RUNTIME_ARTIFACT_CAPTURE_FAILED', 'artifact-capture', cause);
      }
      if (current !== undefined && dispose !== undefined && artifact === current.artifact) {
        throw new RuntimeError({
          code: 'RUNTIME_ARTIFACT_OWNERSHIP_ALIAS',
          phase: 'artifact-capture',
          owner: copiedId.owner,
          program: copiedId,
          cause: artifact,
        });
      }

      let programRead: TProgramRead;
      try {
        programRead = readForProgram(artifact);
      } catch (cause) {
        throw artifactError(
          'RUNTIME_ARTIFACT_PROGRAM_READ_FAILED',
          'artifact-program-read',
          cause,
          retireArtifact(artifact),
        );
      }

      let publicRead: TPublicRead;
      try {
        publicRead = read(artifact);
      } catch (cause) {
        throw artifactError(
          'RUNTIME_ARTIFACT_PUBLIC_READ_FAILED',
          'artifact-public-read',
          cause,
          retireArtifact(artifact),
        );
      }

      return Object.freeze({
        artifact,
        programRead,
        publicRead,
      });
    },
    snapshot: (
      definition: RuntimeProgramDefinition<TArtifactInput, TArtifact, TProgramRead, TPublicRead>,
      prepared: RuntimePreparedProgramArtifact<TArtifact, TProgramRead, TPublicRead>,
      revision: RuntimeRevision,
    ): RuntimeSnapshot<TPublicRead> => {
      if (definition !== token) {
        throw new RuntimeError({
          code: 'RUNTIME_PROGRAM_TOKEN_INVALID',
          phase: 'artifact-snapshot',
          program: definition.id,
          cause: definition,
        });
      }
      return Object.freeze({ revision, value: prepared.publicRead });
    },
    snapshotToken: (
      definition: RuntimeProgramToken,
      prepared: RuntimePreparedProgramArtifact<TArtifact, TProgramRead, TPublicRead>,
      revision: RuntimeRevision,
    ): RuntimeSnapshot<TPublicRead> => {
      if (definition !== token) {
        throw new RuntimeError({
          code: 'RUNTIME_PROGRAM_TOKEN_INVALID',
          phase: 'artifact-snapshot',
          program: definition.id,
          cause: definition,
        });
      }
      return Object.freeze({ revision, value: prepared.publicRead });
    },
    retire: (
      prepared: RuntimePreparedProgramArtifact<TArtifact, TProgramRead, TPublicRead>,
    ): ReadonlyArray<RuntimeDiagnostic> => retireArtifact(prepared.artifact),
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

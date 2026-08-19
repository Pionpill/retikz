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

import { RuntimeDiagnosticCode } from '../diagnostic';
import { RetikzRuntimeError, RetikzRuntimeErrorCode } from '../error';

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

/** 创建 artifact dispose 失败的非致命诊断 */
const artifactDisposeDiagnostic = (program: RuntimeProgramToken, cause: unknown): RuntimeDiagnostic =>
  Object.freeze({
    code: RuntimeDiagnosticCode.ArtifactDisposeFailed,
    phase: 'artifact-dispose',
    severity: 'error',
    message: cause instanceof Error ? cause.message : String(cause),
    owner: program.id.owner,
    program: program.id,
    cause,
  });

/** 创建 Program Definition 输入错误 */
const invalidProgram = (
  code: typeof RetikzRuntimeErrorCode.ProgramIdInvalid | typeof RetikzRuntimeErrorCode.ProgramTokenInvalid,
  cause: unknown,
) => new RetikzRuntimeError({ code, phase: 'program-definition', cause });

/** 校验并复制 Program 的 trace declarations */
const copyTracePhases = (
  definitions: ReadonlyArray<RuntimeTracePhaseDefinition>,
): ReadonlyArray<RuntimeTracePhaseDefinition> => {
  const seen = new Set<string>();
  const copied = definitions.map(definition => {
    const { phase, unit, outcomes } = definition;
    const key = `${String(phase)}\u0000${String(unit)}`;
    if (outcomes.length === 0 || seen.has(key)) {
      throw new RetikzRuntimeError({
        code: RetikzRuntimeErrorCode.TraceDefinitionInvalid,
        phase: 'program-definition',
        cause: definition,
      });
    }
    seen.add(key);
    return Object.freeze({ phase, unit, outcomes: Object.freeze([...outcomes]) });
  });
  return Object.freeze(copied);
};

/** 创建不暴露 author callbacks 的 typed Program token */
export const defineRuntimeProgram = <TArtifactInput, TArtifact, TProgramRead, TPublicRead = TProgramRead>(
  input: RuntimeProgramDefinitionInput<TArtifactInput, TArtifact, TProgramRead, TPublicRead>,
): RuntimeProgramDefinition<TArtifactInput, TArtifact, TProgramRead, TPublicRead> => {
  const { owner, key } = input.id;
  if (owner.length === 0 || key.length === 0) {
    throw invalidProgram(RetikzRuntimeErrorCode.ProgramIdInvalid, input.id);
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
      | typeof RetikzRuntimeErrorCode.ArtifactCaptureFailed
      | typeof RetikzRuntimeErrorCode.ArtifactProgramReadFailed
      | typeof RetikzRuntimeErrorCode.ArtifactPublicReadFailed,
    phase: 'artifact-capture' | 'artifact-program-read' | 'artifact-public-read',
    cause: unknown,
    diagnostics: ReadonlyArray<RuntimeDiagnostic> = [],
  ) =>
    new RetikzRuntimeError({
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
        throw artifactError(RetikzRuntimeErrorCode.ArtifactCaptureFailed, 'artifact-capture', cause);
      }
      if (current !== undefined && dispose !== undefined && artifact === current.artifact) {
        throw new RetikzRuntimeError({
          code: RetikzRuntimeErrorCode.ArtifactOwnershipAlias,
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
          RetikzRuntimeErrorCode.ArtifactProgramReadFailed,
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
          RetikzRuntimeErrorCode.ArtifactPublicReadFailed,
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
        throw new RetikzRuntimeError({
          code: RetikzRuntimeErrorCode.ProgramTokenInvalid,
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
        throw new RetikzRuntimeError({
          code: RetikzRuntimeErrorCode.ProgramTokenInvalid,
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
    throw invalidProgram(RetikzRuntimeErrorCode.ProgramTokenInvalid, definition);
  }
  const executor = runtimeProgramExecutors.get(definition);
  if (executor === undefined) {
    throw new RetikzRuntimeError({
      code: RetikzRuntimeErrorCode.InternalInvariant,
      message: 'runtime Program definition: missing executor',
      phase: 'program-definition',
      cause: definition,
    });
  }
  return executor;
};

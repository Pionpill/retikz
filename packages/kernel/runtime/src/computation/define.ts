import type { RuntimeDiagnostic } from '../diagnostic';
import { RuntimeDiagnosticCode } from '../diagnostic';
import { RetikzRuntimeError, RetikzRuntimeErrorCode } from '../error';
import type { RuntimeSourceToken } from '../source';
import type { RuntimeRevision } from '../source';
import type { RuntimeTracePhaseDefinition } from '../trace';
import type { RuntimeSnapshot } from '../transaction';
import type {
  RuntimeCandidateView,
  RuntimeCommitEvent,
  RuntimeComputationContext,
  RuntimeComputationDefinition,
  RuntimeComputationDefinitionInput,
  RuntimeComputationToken,
  RuntimeRunResult,
  RuntimeUpdateResult,
} from './types';

/** Computation prepare 完成但尚未发布的 artifact 与双层 read cache */
export type RuntimePreparedComputationArtifact<TArtifact, TComputationRead, TPublicRead> = Readonly<{
  /** runtime-owned captured artifact */
  artifact: TArtifact;
  /** 只供本 Computation update 使用的 private read */
  computationRead: TComputationRead;
  /** 依赖 Computation 与宿主可见的 public read */
  publicRead: TPublicRead;
}>;

/** registry 私有保存的 Computation metadata 与 callback 擦除视图 */
export type RuntimeComputationErasedExecutor = Readonly<{
  /** 已复制冻结的 Source dependencies */
  sources: ReadonlyArray<RuntimeSourceToken>;
  /** 已复制冻结的 Computation dependencies */
  computations: ReadonlyArray<RuntimeComputationToken>;
  /** 已复制冻结的 trace declarations */
  tracePhases: ReadonlyArray<RuntimeTracePhaseDefinition>;
  /** 捕获具体 Definition 的 artifact */
  capture: <TArtifactInput, TArtifact>(input: TArtifactInput) => TArtifact;
  /** 读取具体 Definition 的 private Computation view */
  readForComputation: <TArtifact, TComputationRead>(artifact: TArtifact) => TComputationRead;
  /** 读取具体 Definition 的 public artifact view */
  read: <TArtifact, TPublicRead>(artifact: TArtifact) => TPublicRead;
  /** 释放具体 Definition 捕获的 artifact */
  dispose?: <TArtifact>(artifact: TArtifact) => void;
  /** capture、拒绝 current alias 并缓存 concrete artifact 的双层 read */
  prepareArtifact: (
    input: unknown,
    current?: RuntimePreparedComputationArtifact<unknown, unknown, unknown>,
  ) => RuntimePreparedComputationArtifact<unknown, unknown, unknown>;
  /** 以 concrete public read 类型创建 revision-bound artifact Snapshot */
  snapshot: <TArtifactInput, TArtifact, TComputationRead, TPublicRead>(
    definition: RuntimeComputationDefinition<TArtifactInput, TArtifact, TComputationRead, TPublicRead>,
    prepared: RuntimePreparedComputationArtifact<unknown, unknown, unknown>,
    revision: RuntimeRevision,
  ) => RuntimeSnapshot<TPublicRead>;
  /** 以动态 token 创建 observer 使用的 erased public Snapshot */
  snapshotToken: (
    definition: RuntimeComputationToken,
    prepared: RuntimePreparedComputationArtifact<unknown, unknown, unknown>,
    revision: RuntimeRevision,
  ) => RuntimeSnapshot<unknown>;
  /** 释放 concrete prepared artifact，并隔离 dispose throw */
  retire: (prepared: RuntimePreparedComputationArtifact<unknown, unknown, unknown>) => ReadonlyArray<RuntimeDiagnostic>;
  /** 执行 full Computation callback */
  run: <TArtifactInput>(
    view: RuntimeCandidateView,
    context: RuntimeComputationContext,
  ) => RuntimeRunResult<TArtifactInput>;
  /** 执行 incremental Computation callback */
  update?: <TArtifactInput, TComputationRead>(
    previous: TComputationRead,
    view: RuntimeCandidateView,
    context: RuntimeComputationContext,
  ) => RuntimeUpdateResult<TArtifactInput>;
  /** 通知成功发布的 artifact */
  observeCommit?: <TPublicRead>(event: RuntimeCommitEvent<TPublicRead>) => void;
}>;

const runtimeComputationTokens = new WeakSet<object>();

const runtimeComputationExecutors = new WeakMap<object, RuntimeComputationErasedExecutor>();

/** 创建 artifact dispose 失败的非致命诊断 */
const artifactDisposeDiagnostic = (computation: RuntimeComputationToken, cause: unknown): RuntimeDiagnostic =>
  Object.freeze({
    code: RuntimeDiagnosticCode.ArtifactDisposeFailed,
    phase: 'artifact-dispose',
    severity: 'error',
    message: cause instanceof Error ? cause.message : String(cause),
    owner: computation.id.owner,
    computation: computation.id,
    cause,
  });

/** 创建 Computation Definition 输入错误 */
const invalidComputation = (
  code: typeof RetikzRuntimeErrorCode.ComputationIdInvalid | typeof RetikzRuntimeErrorCode.ComputationTokenInvalid,
  cause: unknown,
) => new RetikzRuntimeError({ code, phase: 'computation-definition', cause });

/** 校验并复制 Computation 的 trace declarations */
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
        phase: 'computation-definition',
        cause: definition,
      });
    }

    seen.add(key);

    return Object.freeze({ phase, unit, outcomes: Object.freeze([...outcomes]) });
  });

  return Object.freeze(copied);
};

/** 创建不暴露 author callbacks 的 typed Computation token */
export const defineRuntimeComputation = <
  TArtifactInput,
  TArtifact = TArtifactInput,
  TComputationRead = TArtifact,
  TPublicRead = TArtifact,
>(
  input: RuntimeComputationDefinitionInput<TArtifactInput, TArtifact, TComputationRead, TPublicRead>,
): RuntimeComputationDefinition<TArtifactInput, TArtifact, TComputationRead, TPublicRead> => {
  const { owner, key } = input.id;
  if (owner.length === 0 || key.length === 0) {
    throw invalidComputation(RetikzRuntimeErrorCode.ComputationIdInvalid, input.id);
  }

  // 公开条件类型保证只有同类型转换可省略；在定义入口恢复完整执行契约
  const capture = input.artifact?.capture ?? ((value: TArtifactInput) => value as unknown as TArtifact);
  const readForComputation =
    input.artifact?.readForComputation ?? ((value: TArtifact) => value as unknown as TComputationRead);
  const read = input.artifact?.read ?? ((value: TArtifact) => value as unknown as TPublicRead);
  const dispose = input.artifact?.dispose;
  const { run, update, observeCommit } = input;
  const copiedId = Object.freeze({ owner, key });
  const copiedSources = Object.freeze([...input.sources]);
  const copiedComputations = Object.freeze([...(input.computations ?? [])]);
  const copiedTracePhases = copyTracePhases(input.tracePhases ?? []);
  const token = Object.freeze({ id: copiedId }) as RuntimeComputationDefinition<
    TArtifactInput,
    TArtifact,
    TComputationRead,
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

  /** 创建带稳定 Computation context 的 artifact lifecycle primary error */
  const artifactError = (
    code:
      | typeof RetikzRuntimeErrorCode.ArtifactCaptureFailed
      | typeof RetikzRuntimeErrorCode.ArtifactComputationReadFailed
      | typeof RetikzRuntimeErrorCode.ArtifactPublicReadFailed,
    phase: 'artifact-capture' | 'artifact-computation-read' | 'artifact-public-read',
    cause: unknown,
    diagnostics: ReadonlyArray<RuntimeDiagnostic> = [],
  ) =>
    new RetikzRuntimeError({
      code,
      phase,
      owner: copiedId.owner,
      computation: copiedId,
      cause,
      diagnostics,
    });

  const typedExecutor = Object.freeze({
    sources: copiedSources,
    computations: copiedComputations,
    tracePhases: copiedTracePhases,
    capture: (source: TArtifactInput): TArtifact => capture(source),
    readForComputation: (value: TArtifact): TComputationRead => readForComputation(value),
    read: (value: TArtifact): TPublicRead => read(value),
    dispose,
    prepareArtifact: (
      source: TArtifactInput,
      current?: RuntimePreparedComputationArtifact<TArtifact, TComputationRead, TPublicRead>,
    ): RuntimePreparedComputationArtifact<TArtifact, TComputationRead, TPublicRead> => {
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
          computation: copiedId,
          cause: artifact,
        });
      }

      let computationRead: TComputationRead;

      try {
        computationRead = readForComputation(artifact);
      } catch (cause) {
        throw artifactError(
          RetikzRuntimeErrorCode.ArtifactComputationReadFailed,
          'artifact-computation-read',
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
        computationRead,
        publicRead,
      });
    },
    snapshot: (
      definition: RuntimeComputationDefinition<TArtifactInput, TArtifact, TComputationRead, TPublicRead>,
      prepared: RuntimePreparedComputationArtifact<TArtifact, TComputationRead, TPublicRead>,
      revision: RuntimeRevision,
    ): RuntimeSnapshot<TPublicRead> => {
      if (definition !== token) {
        throw new RetikzRuntimeError({
          code: RetikzRuntimeErrorCode.ComputationTokenInvalid,
          phase: 'artifact-snapshot',
          computation: definition.id,
          cause: definition,
        });
      }

      return Object.freeze({ revision, value: prepared.publicRead });
    },
    snapshotToken: (
      definition: RuntimeComputationToken,
      prepared: RuntimePreparedComputationArtifact<TArtifact, TComputationRead, TPublicRead>,
      revision: RuntimeRevision,
    ): RuntimeSnapshot<TPublicRead> => {
      if (definition !== token) {
        throw new RetikzRuntimeError({
          code: RetikzRuntimeErrorCode.ComputationTokenInvalid,
          phase: 'artifact-snapshot',
          computation: definition.id,
          cause: definition,
        });
      }

      return Object.freeze({ revision, value: prepared.publicRead });
    },
    retire: (
      prepared: RuntimePreparedComputationArtifact<TArtifact, TComputationRead, TPublicRead>,
    ): ReadonlyArray<RuntimeDiagnostic> => retireArtifact(prepared.artifact),
    run: (view: RuntimeCandidateView, context: RuntimeComputationContext): RuntimeRunResult<TArtifactInput> =>
      run(view, context),
    update,
    observeCommit,
  });

  const erasedExecutor = typedExecutor as unknown as RuntimeComputationErasedExecutor;
  runtimeComputationTokens.add(token);
  runtimeComputationExecutors.set(token, erasedExecutor);

  return token;
};

/** 判断动态值是否由当前 Runtime 实例的 define helper 创建 */
export const isRuntimeComputationDefinition = (value: unknown): value is RuntimeComputationToken =>
  typeof value === 'object' && value !== null && runtimeComputationTokens.has(value);

/** 读取 define 时创建的 Computation callback 擦除视图 */
export const getRuntimeComputationDefinitionExecutor = (
  definition: RuntimeComputationToken,
): RuntimeComputationErasedExecutor => {
  if (!isRuntimeComputationDefinition(definition)) {
    throw invalidComputation(RetikzRuntimeErrorCode.ComputationTokenInvalid, definition);
  }

  const executor = runtimeComputationExecutors.get(definition);
  if (executor === undefined) {
    throw new RetikzRuntimeError({
      code: RetikzRuntimeErrorCode.InternalInvariant,
      message: 'runtime Computation definition: missing executor',
      phase: 'computation-definition',
      cause: definition,
    });
  }

  return executor;
};

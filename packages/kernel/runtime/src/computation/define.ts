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
  RuntimeRunOutcome,
  RuntimeUpdateOutcome,
} from './types';

/**
 * Computation prepare 完成但尚未发布的 result 与双层 read cache
 * @template TResult capture 产生并由运行时持有和释放的计算结果类型
 * @template TComputationRead 仅供当前计算的 update 读取旧结果的私有视图类型
 * @template TPublicRead 依赖计算、提交观察者和宿主可读取的公开结果视图类型
 */
export type RuntimePreparedComputationResult<TResult, TComputationRead, TPublicRead> = Readonly<{
  /** 运行时捕获并持有的计算结果 */
  result: TResult;
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
  /**
   * 捕获具体 Definition 的 result
   * @template TResultInput run 或 update 产生、交给 result capture 的结果输入类型
   * @template TResult capture 产生并由运行时持有和释放的计算结果类型
   */
  capture: <TResultInput, TResult>(input: TResultInput) => TResult;
  /**
   * 读取具体 Definition 的 private Computation view
   * @template TResult capture 产生并由运行时持有和释放的计算结果类型
   * @template TComputationRead 仅供当前计算的 update 读取旧结果的私有视图类型
   */
  readForComputation: <TResult, TComputationRead>(result: TResult) => TComputationRead;
  /**
   * 读取具体 Definition 的 public result view
   * @template TResult capture 产生并由运行时持有和释放的计算结果类型
   * @template TPublicRead 依赖计算、提交观察者和宿主可读取的公开结果视图类型
   */
  read: <TResult, TPublicRead>(result: TResult) => TPublicRead;
  /**
   * 释放具体 Definition 捕获的 result
   * @template TResult capture 产生并由运行时持有和释放的计算结果类型
   */
  dispose?: <TResult>(result: TResult) => void;
  /** capture、拒绝 current alias 并缓存 concrete result 的双层 read */
  prepareResult: (
    input: unknown,
    current?: RuntimePreparedComputationResult<unknown, unknown, unknown>,
  ) => RuntimePreparedComputationResult<unknown, unknown, unknown>;
  /**
   * 以 concrete public read 类型创建 revision-bound result Snapshot
   * @template TResultInput run 或 update 产生、交给 result capture 的结果输入类型
   * @template TResult capture 产生并由运行时持有和释放的计算结果类型
   * @template TComputationRead 仅供当前计算的 update 读取旧结果的私有视图类型
   * @template TPublicRead 依赖计算、提交观察者和宿主可读取的公开结果视图类型
   */
  snapshot: <TResultInput, TResult, TComputationRead, TPublicRead>(
    definition: RuntimeComputationDefinition<TResultInput, TResult, TComputationRead, TPublicRead>,
    prepared: RuntimePreparedComputationResult<unknown, unknown, unknown>,
    revision: RuntimeRevision,
  ) => RuntimeSnapshot<TPublicRead>;
  /** 以动态 token 创建 observer 使用的 erased public Snapshot */
  snapshotToken: (
    definition: RuntimeComputationToken,
    prepared: RuntimePreparedComputationResult<unknown, unknown, unknown>,
    revision: RuntimeRevision,
  ) => RuntimeSnapshot<unknown>;
  /** 释放 concrete prepared result，并隔离 dispose throw */
  retire: (prepared: RuntimePreparedComputationResult<unknown, unknown, unknown>) => ReadonlyArray<RuntimeDiagnostic>;
  /**
   * 执行 full Computation callback
   * @template TResultInput run 或 update 产生、交给 result capture 的结果输入类型
   */
  run: <TResultInput>(
    view: RuntimeCandidateView,
    context: RuntimeComputationContext,
  ) => RuntimeRunOutcome<TResultInput>;
  /**
   * 执行 incremental Computation callback
   * @template TResultInput run 或 update 产生、交给 result capture 的结果输入类型
   * @template TComputationRead 仅供当前计算的 update 读取旧结果的私有视图类型
   */
  update?: <TResultInput, TComputationRead>(
    previous: TComputationRead,
    view: RuntimeCandidateView,
    context: RuntimeComputationContext,
  ) => RuntimeUpdateOutcome<TResultInput>;
  /**
   * 通知成功发布的 result
   * @template TPublicRead 依赖计算、提交观察者和宿主可读取的公开结果视图类型
   */
  observeCommit?: <TPublicRead>(event: RuntimeCommitEvent<TPublicRead>) => void;
}>;

const runtimeComputationTokens = new WeakSet<object>();

const runtimeComputationExecutors = new WeakMap<object, RuntimeComputationErasedExecutor>();

/** 创建 result dispose 失败的非致命诊断 */
const resultDisposeDiagnostic = (computation: RuntimeComputationToken, cause: unknown): RuntimeDiagnostic =>
  Object.freeze({
    code: RuntimeDiagnosticCode.ResultDisposeFailed,
    phase: 'result-dispose',
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

/**
 * 创建不暴露 author callbacks 的 typed Computation token
 * @template TResultInput run 或 update 产生、交给 result capture 的结果输入类型
 * @template TResult capture 产生并由运行时持有和释放的计算结果类型；默认沿用 TResultInput
 * @template TComputationRead 仅供当前计算的 update 读取旧结果的私有视图类型；默认沿用 TResult
 * @template TPublicRead 依赖计算、提交观察者和宿主可读取的公开结果视图类型；默认沿用 TResult
 */
export const defineRuntimeComputation = <
  TResultInput,
  TResult = TResultInput,
  TComputationRead = TResult,
  TPublicRead = TResult,
>(
  input: RuntimeComputationDefinitionInput<TResultInput, TResult, TComputationRead, TPublicRead>,
): RuntimeComputationDefinition<TResultInput, TResult, TComputationRead, TPublicRead> => {
  const { owner, key } = input.id;
  if (owner.length === 0 || key.length === 0) {
    throw invalidComputation(RetikzRuntimeErrorCode.ComputationIdInvalid, input.id);
  }

  // 公开条件类型保证只有同类型转换可省略；在定义入口恢复完整执行契约
  const capture = input.result?.capture ?? ((value: TResultInput) => value as unknown as TResult);
  const readForComputation =
    input.result?.readForComputation ?? ((value: TResult) => value as unknown as TComputationRead);
  const read = input.result?.read ?? ((value: TResult) => value as unknown as TPublicRead);
  const dispose = input.result?.dispose;
  const { run, update, observeCommit } = input;
  const copiedId = Object.freeze({ owner, key });
  const copiedSources = Object.freeze([...input.sources]);
  const copiedComputations = Object.freeze([...(input.computations ?? [])]);
  const copiedTracePhases = copyTracePhases(input.tracePhases ?? []);
  const token = Object.freeze({ id: copiedId }) as RuntimeComputationDefinition<
    TResultInput,
    TResult,
    TComputationRead,
    TPublicRead
  >;

  /** 释放一个已捕获 result，并把 throw 隔离为 secondary diagnostic */
  const retireResult = (result: TResult): ReadonlyArray<RuntimeDiagnostic> => {
    if (dispose === undefined) return Object.freeze([]);

    try {
      dispose(result);
      return Object.freeze([]);
    } catch (cause) {
      return Object.freeze([resultDisposeDiagnostic(token, cause)]);
    }
  };

  /** 创建带稳定 Computation context 的 result lifecycle primary error */
  const resultError = (
    code:
      | typeof RetikzRuntimeErrorCode.ResultCaptureFailed
      | typeof RetikzRuntimeErrorCode.ResultComputationReadFailed
      | typeof RetikzRuntimeErrorCode.ResultPublicReadFailed,
    phase: 'result-capture' | 'result-computation-read' | 'result-public-read',
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
    capture: (source: TResultInput): TResult => capture(source),
    readForComputation: (value: TResult): TComputationRead => readForComputation(value),
    read: (value: TResult): TPublicRead => read(value),
    dispose,
    prepareResult: (
      source: TResultInput,
      current?: RuntimePreparedComputationResult<TResult, TComputationRead, TPublicRead>,
    ): RuntimePreparedComputationResult<TResult, TComputationRead, TPublicRead> => {
      let result: TResult;

      try {
        result = capture(source);
      } catch (cause) {
        throw resultError(RetikzRuntimeErrorCode.ResultCaptureFailed, 'result-capture', cause);
      }

      if (current !== undefined && dispose !== undefined && result === current.result) {
        throw new RetikzRuntimeError({
          code: RetikzRuntimeErrorCode.ResultOwnershipAlias,
          phase: 'result-capture',
          owner: copiedId.owner,
          computation: copiedId,
          cause: result,
        });
      }

      let computationRead: TComputationRead;

      try {
        computationRead = readForComputation(result);
      } catch (cause) {
        throw resultError(
          RetikzRuntimeErrorCode.ResultComputationReadFailed,
          'result-computation-read',
          cause,
          retireResult(result),
        );
      }

      let publicRead: TPublicRead;

      try {
        publicRead = read(result);
      } catch (cause) {
        throw resultError(
          RetikzRuntimeErrorCode.ResultPublicReadFailed,
          'result-public-read',
          cause,
          retireResult(result),
        );
      }

      return Object.freeze({
        result,
        computationRead,
        publicRead,
      });
    },
    snapshot: (
      definition: RuntimeComputationDefinition<TResultInput, TResult, TComputationRead, TPublicRead>,
      prepared: RuntimePreparedComputationResult<TResult, TComputationRead, TPublicRead>,
      revision: RuntimeRevision,
    ): RuntimeSnapshot<TPublicRead> => {
      if (definition !== token) {
        throw new RetikzRuntimeError({
          code: RetikzRuntimeErrorCode.ComputationTokenInvalid,
          phase: 'result-snapshot',
          computation: definition.id,
          cause: definition,
        });
      }

      return Object.freeze({ revision, value: prepared.publicRead });
    },
    snapshotToken: (
      definition: RuntimeComputationToken,
      prepared: RuntimePreparedComputationResult<TResult, TComputationRead, TPublicRead>,
      revision: RuntimeRevision,
    ): RuntimeSnapshot<TPublicRead> => {
      if (definition !== token) {
        throw new RetikzRuntimeError({
          code: RetikzRuntimeErrorCode.ComputationTokenInvalid,
          phase: 'result-snapshot',
          computation: definition.id,
          cause: definition,
        });
      }

      return Object.freeze({ revision, value: prepared.publicRead });
    },
    retire: (
      prepared: RuntimePreparedComputationResult<TResult, TComputationRead, TPublicRead>,
    ): ReadonlyArray<RuntimeDiagnostic> => retireResult(prepared.result),
    run: (view: RuntimeCandidateView, context: RuntimeComputationContext): RuntimeRunOutcome<TResultInput> =>
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

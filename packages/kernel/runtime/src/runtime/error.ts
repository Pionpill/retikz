import type { RuntimeDiagnostic } from '../diagnostic';
import { BuiltinRuntimeDiagnosticCode } from '../diagnostic';
import { RuntimeTraceDiagnosticCodes } from '../diagnostic/internal';
import type { RetikzRuntimeErrorCode } from '../error';
import { RetikzRuntimeError } from '../error';

/** 创建 runtime contract 错误 */
export const createRuntimeContractError = (
  code:
    | typeof RetikzRuntimeErrorCode.RegistryMismatch
    | typeof RetikzRuntimeErrorCode.UpdateStrategyInvalid
    | typeof RetikzRuntimeErrorCode.InitialSourceMismatch
    | typeof RetikzRuntimeErrorCode.SourceCommandInvalid
    | typeof RetikzRuntimeErrorCode.RevisionInvalid
    | typeof RetikzRuntimeErrorCode.RevisionStale
    | typeof RetikzRuntimeErrorCode.ChangeSetRevisionMismatch
    | typeof RetikzRuntimeErrorCode.UndeclaredDependency
    | typeof RetikzRuntimeErrorCode.Reentrant
    | typeof RetikzRuntimeErrorCode.Disposed
    | typeof RetikzRuntimeErrorCode.ParticipantTokenInvalid
    | typeof RetikzRuntimeErrorCode.ParticipantDuplicate
    | typeof RetikzRuntimeErrorCode.ParticipantDependencyInvalid
    | typeof RetikzRuntimeErrorCode.ParticipantUnknown
    | typeof RetikzRuntimeErrorCode.ParticipantAlreadyOwned
    | typeof RetikzRuntimeErrorCode.ParticipantRollbackFailed,
  phase: string,
  cause?: unknown,
  owner?: string,
) => Object.freeze(new RetikzRuntimeError({ code, phase, cause, owner }));

/** 失败 transaction 可从 Runtime 内部保留的 execution diagnostic 闭集 */
const executionDiagnosticCodes = new Set<string>([
  ...Object.values(RuntimeTraceDiagnosticCodes),
  BuiltinRuntimeDiagnosticCode.ResultDisposeFailed,
  BuiltinRuntimeDiagnosticCode.SourceDisposeFailed,
]);

/** 判断失败 transaction 中仍需保留的执行诊断 */
export const isRuntimeExecutionDiagnostic = (diagnostic: RuntimeDiagnostic): boolean =>
  diagnostic.severity === 'error' && executionDiagnosticCodes.has(diagnostic.code);

/** 保留 lifecycle primary error，并替换为完整 secondary diagnostics envelope */
export const withRuntimeFailureDiagnostics = (
  cause: unknown,
  diagnostics: ReadonlyArray<RuntimeDiagnostic>,
): unknown => {
  if (cause instanceof RetikzRuntimeError) {
    return new RetikzRuntimeError({
      code: cause.code,
      phase: cause.phase,
      cause: cause.cause,
      owner: cause.owner,
      computation: cause.computation,
      diagnostics,
    });
  }

  return cause;
};

/** 读取 primary error 已携带的 execution diagnostics */
export const readRuntimeErrorDiagnostics = (cause: unknown): ReadonlyArray<RuntimeDiagnostic> => {
  if (cause instanceof RetikzRuntimeError) return cause.diagnostics;
  return Object.freeze([]);
};

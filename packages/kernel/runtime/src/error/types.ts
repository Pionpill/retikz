import type { RuntimeDiagnosticCode } from '../diagnostic';
import type { ValueOf } from '../shared';
import type { RuntimeErrorCode, RuntimeOwnerErrorCode, RuntimeOwnerPhase } from './constants';

/** Runtime owner 执行阶段 */
export type RuntimeOwnerPhaseValue = ValueOf<typeof RuntimeOwnerPhase>;

/** Runtime owner 的稳定错误分类 */
export type RuntimeOwnerErrorCodeValue = ValueOf<typeof RuntimeOwnerErrorCode>;

/** Runtime owner value 释放失败的非致命诊断 */
export type RuntimeOwnerLifecycleDiagnostic = Readonly<{
  /** 诊断分类 */
  code: typeof RuntimeDiagnosticCode.OwnerDisposeFailed;
  /** 发生失败的 owner */
  owner: string;
  /** 释放阶段 */
  phase: typeof RuntimeOwnerPhase.Retire;
  /** 可读错误信息 */
  message: string;
  /** 原始错误 */
  cause: unknown;
}>;

/** owner executor 的成功结果与非致命诊断 */
export type RuntimeOwnerExecutionResult<T> = Readonly<{
  /** 成功产物 */
  value: T;
  /** 执行过程中隔离的非致命诊断 */
  diagnostics: ReadonlyArray<RuntimeOwnerLifecycleDiagnostic>;
}>;

/** Runtime transaction、Program 与 registry 的稳定错误分类 */
export type RuntimeErrorCodeValue = ValueOf<typeof RuntimeErrorCode>;

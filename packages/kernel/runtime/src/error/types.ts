import type { ValueOf } from '@retikz/foundation';

import type { RuntimeDiagnosticCode } from '../diagnostic';
import type { RetikzRuntimeErrorCode, RuntimeSourcePhase } from './constants';

/** Runtime Source 执行阶段 */
export type RuntimeSourcePhaseValue = ValueOf<typeof RuntimeSourcePhase>;

/** Runtime Source value 释放失败的非致命诊断 */
export type RuntimeSourceLifecycleDiagnostic = Readonly<{
  /** 诊断分类 */
  code: typeof RuntimeDiagnosticCode.SourceDisposeFailed;
  /** 发生失败的 Source */
  owner: string;
  /** 释放阶段 */
  phase: typeof RuntimeSourcePhase.Retire;
  /** lifecycle cleanup 固定为非致命 error diagnostic */
  severity: 'error';
  /** 可读错误信息 */
  message: string;
  /** 原始错误 */
  cause: unknown;
}>;

/** Source executor 的成功结果与非致命诊断 */
export type RuntimeSourceExecutionResult<T> = Readonly<{
  /** 成功产物 */
  value: T;
  /** 执行过程中隔离的非致命诊断 */
  diagnostics: ReadonlyArray<RuntimeSourceLifecycleDiagnostic>;
}>;

/** Runtime transaction、Computation 与 registry 的稳定错误分类 */
export type RetikzRuntimeErrorCodeValue = ValueOf<typeof RetikzRuntimeErrorCode>;

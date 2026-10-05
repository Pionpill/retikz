import type { RuntimeDiagnosticCode } from '../diagnostic';
import type { RuntimeSourcePhase } from './constants';

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

/**
 * Source executor 的成功结果与非致命诊断
 * @template T Source 执行成功时 value 字段承载的结果类型
 */
export type RuntimeSourceExecutionResult<T> = Readonly<{
  /** 成功产物 */
  value: T;
  /** 执行过程中隔离的非致命诊断 */
  diagnostics: ReadonlyArray<RuntimeSourceLifecycleDiagnostic>;
}>;

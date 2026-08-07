import type { RuntimeProgramId } from '../identity';
import type { OpenString, ValueOf } from '../shared';
import type { RuntimeDiagnosticCode, RuntimeDiagnosticPhase } from './constants';

/** Runtime 内置结构化诊断码取值 */
export type RuntimeDiagnosticCodeValue = ValueOf<typeof RuntimeDiagnosticCode>;
/** Runtime 结构化诊断阶段取值 */
export type RuntimeDiagnosticPhaseValue = ValueOf<typeof RuntimeDiagnosticPhase>;

/** Runtime 提交或执行阶段产生的结构化诊断 */
export type RuntimeDiagnostic = Readonly<{
  /** 稳定诊断分类 */
  code: OpenString<RuntimeDiagnosticCodeValue>;
  /** 产生诊断的执行阶段 */
  phase: RuntimeDiagnosticPhaseValue;
  /** 诊断严重级别 */
  severity: 'warning' | 'error';
  /** 面向开发者的诊断信息 */
  message: string;
  /** 关联的 owner key */
  owner?: string;
  /** 关联的 Program identity */
  program?: RuntimeProgramId;
  /** 隔离的原始非致命错误 */
  cause?: unknown;
}>;

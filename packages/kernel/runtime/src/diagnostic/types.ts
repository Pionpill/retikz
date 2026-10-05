import type { OpenString } from '@retikz/foundation';

import type { RuntimeComputationId } from '../identity';
import type { RuntimeDiagnosticCode, RuntimeDiagnosticPhase } from './constants';

/** Runtime 提交或执行阶段产生的结构化诊断 */
export type RuntimeDiagnostic = Readonly<{
  /** 稳定诊断分类 */
  code: OpenString<RuntimeDiagnosticCode>;
  /** 产生诊断的执行阶段 */
  phase: RuntimeDiagnosticPhase;
  /** 诊断严重级别 */
  severity: 'warning' | 'error';
  /** 面向开发者的诊断信息 */
  message: string;
  /** 来源归属，例如 Source key 或 participant key */
  owner?: string;
  /** 关联的 Computation identity */
  computation?: RuntimeComputationId;
  /** 隔离的原始非致命错误 */
  cause?: unknown;
}>;

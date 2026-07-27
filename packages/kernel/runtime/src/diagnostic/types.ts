import type { RuntimeProgramId } from '../identity';

/** Runtime 提交或执行阶段产生的结构化诊断 */
export type RuntimeDiagnostic = Readonly<{
  /** 稳定诊断分类 */
  code: string;
  /** 产生诊断的执行阶段 */
  phase: string;
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

/** 不会阻止 transaction 提交的 Runtime warning */
export type RuntimeWarningDiagnostic = RuntimeDiagnostic & Readonly<{ severity: 'warning' }>;

import type { InspectionDiagnosticOrigin, InspectionSelectionTarget } from './types';

/** Inspect fail-loud 错误，保留结构化 origin 与原始 cause */
export class InspectionCompileError extends Error {
  /** 错误发生的 selection/request/output 阶段 */
  readonly origin: InspectionDiagnosticOrigin;

  constructor(message: string, origin: InspectionDiagnosticOrigin, options?: ErrorOptions) {
    super(message, options);
    this.name = 'InspectionCompileError';
    this.origin = origin;
    Object.freeze(this);
  }
}

/** 创建 selection admission 的结构化 origin */
export const selectionOrigin = (ruleIndex: number, target: InspectionSelectionTarget | null) =>
  Object.freeze({ stage: 'selection' as const, ruleIndex, target });

/** 用 Inspect origin 包装任意同步失败 */
export const wrapInspectionError = (origin: InspectionDiagnosticOrigin, cause: unknown): InspectionCompileError => {
  if (cause instanceof InspectionCompileError) return cause;
  const message = cause instanceof Error ? cause.message : String(cause);
  return new InspectionCompileError(`Inspection ${origin.stage} failed: ${message}`, origin, { cause });
};

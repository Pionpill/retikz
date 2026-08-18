import { RetikzError } from '@retikz/foundation';

import type { InspectionDiagnosticOrigin, InspectionSelectionTarget } from './types';

import { RetikzInspectionErrorCode } from '../error';

/** Inspect fail-loud 错误，保留结构化 origin 与原始 cause */
export class RetikzInspectionCompileError extends RetikzError<
  typeof RetikzInspectionErrorCode.CompileFailed,
  Readonly<{ origin: InspectionDiagnosticOrigin }>
> {
  /** 错误发生的 selection/request/output 阶段 */
  readonly origin: InspectionDiagnosticOrigin;

  constructor(message: string, origin: InspectionDiagnosticOrigin, options?: ErrorOptions) {
    super({ code: RetikzInspectionErrorCode.CompileFailed, message, details: { origin }, cause: options?.cause });
    this.origin = origin;
    Object.freeze(this);
  }
}

/** 创建 selection admission 的结构化 origin */
export const selectionOrigin = (ruleIndex: number, target: InspectionSelectionTarget | null) =>
  Object.freeze({ stage: 'selection' as const, ruleIndex, target });

/** 用 Inspect origin 包装任意同步失败 */
export const wrapInspectionError = (
  origin: InspectionDiagnosticOrigin,
  cause: unknown,
): RetikzInspectionCompileError => {
  if (cause instanceof RetikzInspectionCompileError) return cause;
  const message = cause instanceof Error ? cause.message : String(cause);
  return new RetikzInspectionCompileError(`Inspection ${origin.stage} failed: ${message}`, origin, { cause });
};

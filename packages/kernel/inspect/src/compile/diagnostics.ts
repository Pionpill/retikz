import type { InspectionDiagnosticOrigin, InspectionSelectionTarget } from './types';

import { RetikzInspectError, RetikzInspectErrorCode } from '../error';

/** 创建 selection admission 的结构化 origin */
export const createInspectionSelectionDiagnosticOrigin = (
  ruleIndex: number,
  target: InspectionSelectionTarget | null,
) => Object.freeze({ stage: 'selection' as const, ruleIndex, target });

/** 用 Inspect origin 包装任意同步失败 */
export const wrapInspectionError = (origin: InspectionDiagnosticOrigin, cause: unknown): RetikzInspectError => {
  if (cause instanceof RetikzInspectError && cause.code === RetikzInspectErrorCode.CompileFailed) return cause;
  const message = cause instanceof Error ? cause.message : String(cause);
  return new RetikzInspectError({
    code: RetikzInspectErrorCode.CompileFailed,
    message: `Inspection ${origin.stage} failed: ${message}`,
    details: { origin },
    cause,
  });
};

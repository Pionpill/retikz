import { RetikzInspectError, RetikzInspectErrorCode } from '../error';
import type { InspectionDiagnosticOrigin } from './types';

/** 包装检查失败，原样保留扩展异常或编译失败作为 cause */
export const wrapInspectionError = (origin: InspectionDiagnosticOrigin, cause: unknown): RetikzInspectError =>
  new RetikzInspectError({
    code: RetikzInspectErrorCode.CompileFailed,
    message: `Inspection ${origin.stage} failed: ${cause instanceof Error ? cause.message : String(cause)}`,
    details: { origin },
    cause,
  });

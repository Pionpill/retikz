import { BuiltinRuntimeDiagnosticCode } from '../constants';

/** reporter 局部诊断到 Runtime 稳定分类的唯一映射 */
export const RuntimeTraceDiagnosticCodes = {
  'invalid-record': BuiltinRuntimeDiagnosticCode.TraceInvalidRecord,
  'sink-threw': BuiltinRuntimeDiagnosticCode.TraceSinkFailed,
  'reentrant-report': BuiltinRuntimeDiagnosticCode.TraceReentrant,
} as const;

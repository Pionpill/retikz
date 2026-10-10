import { RuntimeDiagnosticCode } from '../constants';

/** reporter 局部诊断到 Runtime 稳定分类的唯一映射 */
export const RuntimeTraceDiagnosticCodes = {
  'invalid-record': RuntimeDiagnosticCode.TraceInvalidRecord,
  'sink-threw': RuntimeDiagnosticCode.TraceSinkFailed,
  'reentrant-report': RuntimeDiagnosticCode.TraceReentrant,
} as const;

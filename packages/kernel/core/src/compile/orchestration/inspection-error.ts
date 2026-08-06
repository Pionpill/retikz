import type { CompileOccurrenceLocator, InspectionDiagnosticOrigin, InspectionOwner } from '../../contract';

import { registerFatalProbeError } from '../probe-failure';

const ownerLabel = (owner: InspectionOwner): string =>
  owner.kind === 'composite' ? `Composite '${owner.namespace}.${owner.type}'` : `Path kind '${owner.name}'`;

const originLabel = (origin: InspectionDiagnosticOrigin): string => {
  if (origin.kind === 'primary') return 'primary compile';
  if (origin.stage === 'resolve' && origin.site === 'authoring') {
    return `authored ${origin.locator.kind} ${origin.locator.value.target} target`;
  }
  const output = origin.stage === 'output' ? ` output[${origin.outputIndex}]` : '';
  return `${ownerLabel(origin.owner)} at ${origin.occurrence.sourcePath}${output}`;
};

/** 携带结构化 Inspector 来源的编译失败 */
export class InspectionCompileError extends Error {
  /** 失败所属 Inspector 阶段与 occurrence */
  readonly origin: InspectionDiagnosticOrigin;

  constructor(origin: InspectionDiagnosticOrigin, cause: unknown) {
    const stage = origin.kind === 'inspection' ? origin.stage : 'primary';
    const detail = cause instanceof Error ? cause.message : String(cause);
    super(`Inspection ${stage} failed for ${originLabel(origin)}: ${detail}`, { cause });
    this.name = 'InspectionCompileError';
    this.origin = origin;
    registerFatalProbeError(this);
  }
}

/** 为 Inspector 阶段失败补充稳定的结构化来源 */
export const wrapInspectionError = (origin: InspectionDiagnosticOrigin, cause: unknown): InspectionCompileError =>
  cause instanceof InspectionCompileError ? cause : new InspectionCompileError(origin, cause);

/** 创建 provider 绑定后的 Inspector resolve 来源 */
export const inspectionOccurrenceResolveOrigin = (
  owner: InspectionOwner,
  occurrence: CompileOccurrenceLocator,
): InspectionDiagnosticOrigin => ({
  kind: 'inspection',
  stage: 'resolve',
  site: 'occurrence',
  owner,
  occurrence,
});

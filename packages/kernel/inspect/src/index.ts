export type {
  InspectionCompileResult,
  InspectionDiagnostic,
  InspectionDiagnosticOrigin,
  InspectionPlane,
  InspectionPlaneEntry,
  InspectionSelection,
  InspectionSelectionRule,
  InspectionSelectionTarget,
} from './compile';
export { compileInspectionToScene } from './compile';
export type {
  AnyInspectorDefinitionInput,
  InspectionAppearanceContext,
  InspectorContext,
  InspectorCoordinateSpace,
  InspectorDefinitionInput,
  InspectorFragment,
  InspectorKey,
  InspectorOutput,
} from './contract';
export { defineInspector } from './contract';
export * from './error';
export type { InspectorRegistry } from './providers';
export {
  CLIP_INSPECTOR_KEY,
  COORDINATE_INSPECTOR_KEY,
  createDefaultInspectorRegistry,
  createInspectorRegistry,
  mergeInspectorRegistries,
  NODE_INSPECTOR_KEY,
  PATH_INSPECTOR_KEY,
  SCOPE_INSPECTOR_KEY,
} from './providers';
export * from './schema';

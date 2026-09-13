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
  AnyInspectorDefinition,
  AnyInspectorDefinitionInput,
  InspectionAppearanceContext,
  InspectorContext,
  InspectorCoordinateSpace,
  InspectorDefinition,
  InspectorDefinitionInput,
  InspectorFragment,
  InspectorKey,
  InspectorOutput,
} from './contract';
export { defineInspector } from './contract';
export * from './error';
export type { InspectorRegistry } from './providers';
export {
  BUILTIN_INSPECTORS,
  CLIP_INSPECTOR,
  CLIP_INSPECTOR_KEY,
  COORDINATE_INSPECTOR,
  COORDINATE_INSPECTOR_KEY,
  createDefaultInspectorRegistry,
  createInspectorRegistry,
  NODE_INSPECTOR,
  NODE_INSPECTOR_KEY,
  PATH_INSPECTOR,
  PATH_INSPECTOR_KEY,
  SCOPE_INSPECTOR,
  SCOPE_INSPECTOR_KEY,
} from './providers';
export * from './schema';

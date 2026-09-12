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
  InspectionAppearanceContext,
  InspectorContext,
  InspectorDefinition,
  InspectorKey,
  InspectorOutput,
} from './contract';
export { defineInspector } from './contract';
export * from './error';
export type { InspectorRegistry } from './providers';
export {
  BUILTIN_INSPECTORS,
  createDefaultInspectorRegistry,
  createInspectorRegistry,
  STROKE_PATH_INSPECTOR,
  STROKE_PATH_INSPECTOR_KEY,
} from './providers';
export * from './schema';

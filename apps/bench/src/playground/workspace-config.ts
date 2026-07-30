import type { ValueOf } from '@retikz/core';

/** Workspace 配置入口 */
export const WorkspaceConfigControlId = {
  Mode: 'mode',
  Backend: 'backend',
  Policy: 'policy',
  SampleRuns: 'sampleRuns',
  WarmupRuns: 'warmupRuns',
  Environment: 'environment',
} as const;

/** Workspace 配置入口取值 */
export type WorkspaceConfigControlIdValue = ValueOf<typeof WorkspaceConfigControlId>;

/** Workspace 配置入口描述 */
export type WorkspaceConfigControl = Readonly<{
  id: WorkspaceConfigControlIdValue;
  label: string;
}>;

/** Header 中直接可调的高频配置 */
export const quickConfigControls: ReadonlyArray<WorkspaceConfigControl> = Object.freeze([
  Object.freeze({ id: WorkspaceConfigControlId.Mode, label: 'Mode' }),
  Object.freeze({ id: WorkspaceConfigControlId.Backend, label: 'Renderer' }),
  Object.freeze({ id: WorkspaceConfigControlId.Policy, label: 'Policy' }),
]);

/** 详细配置 Sheet 中的低频配置 */
export const detailedConfigControls: ReadonlyArray<WorkspaceConfigControl> = Object.freeze([
  Object.freeze({ id: WorkspaceConfigControlId.SampleRuns, label: 'Samples' }),
  Object.freeze({ id: WorkspaceConfigControlId.WarmupRuns, label: 'Warmup' }),
  Object.freeze({ id: WorkspaceConfigControlId.Environment, label: 'Environment' }),
]);

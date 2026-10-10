import type { ValueOf } from '@retikz/foundation';

/** Render 后端物化与 retained 更新的 trace 阶段词汇 */
export const RenderTracePhase = {
  /** 完整 Scene 的后端提交 */
  Commit: 'commit',
  /** retained renderer 的增量或全量更新 */
  Update: 'update',
} as const;

/** Render trace 阶段名称 */
export type RenderTracePhase = ValueOf<typeof RenderTracePhase>;

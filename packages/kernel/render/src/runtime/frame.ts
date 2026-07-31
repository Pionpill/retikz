import type { InspectionPlane, Scene, SceneRuntimeSnapshot } from '@retikz/core';

/** 静态 renderer 一次性物化的主图与检查辅助层 */
export type StaticRenderFrame = Readonly<{
  /** 决定 viewBox、资源与正常绘制内容的主 Scene */
  primary: Scene;
  /** 不参与主图语义的可选检查辅助层 */
  inspection: InspectionPlane | null;
}>;

/** Retained renderer 原子提交的主图快照与检查辅助层 */
export type RenderFrameSnapshot = Readonly<{
  /** Runtime 当前 revision 的主 Scene 快照 */
  primary: SceneRuntimeSnapshot;
  /** 与主 Scene 属于同一 revision 的完整检查辅助层 */
  inspection: InspectionPlane | null;
}>;

import type { Scene, SceneRuntimeSnapshot } from '@retikz/core';

import type { RenderReadonlyLayer } from './readonly-layer';

/** 静态 renderer 一次性物化的主图与有序只读图层 */
export type StaticRenderFrame = Readonly<{
  /** 决定 viewBox、资源与正常绘制内容的主 Scene */
  primary: Scene;
  /** 在主图之后执行且不参与主图语义的有序只读图层 */
  layers: ReadonlyArray<RenderReadonlyLayer>;
}>;

/** Retained renderer 原子提交的主图快照与有序只读图层 */
export type RenderFrameSnapshot = Readonly<{
  /** Runtime 当前 revision 的主 Scene 快照 */
  primary: SceneRuntimeSnapshot;
  /** 与主 Scene 属于同一 revision 并整帧提交的有序只读图层 */
  layers: ReadonlyArray<RenderReadonlyLayer>;
}>;

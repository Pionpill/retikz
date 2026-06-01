import type { IRClipSpec } from '../ir/clip';

/**
 * 裁剪区几何（Scene 资源用，纯数据，无函数）
 * @description 与 IR 的 `IRClipSpec` 同形（4 形状判别 union）；IR 是输入校验面、primitive 是 Scene 输出数据面。
 *   坐标为所在 group 的局部坐标系。adapter 物化成 `<clipPath>` 内对应 `<rect>`/`<circle>`/`<ellipse>`/`<polygon>`。
 */
export type ClipShape = IRClipSpec;

/**
 * Scene 级裁剪资源（adapter 物化为 `<clipPath>`）
 * @description `SceneResource` 的 `{ kind:'clip' }` 分支；id 由 compile 去重 + 稳定分配（`clip-1` / `clip-2`…），
 *   `GroupPrim.clipRef` 经 id 引用。与 paint 资源共存于 `Scene.resources`、id 命名空间不撞。
 */
export type ClipResource = {
  kind: 'clip';
  id: string;
  shape: ClipShape;
};

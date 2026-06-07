/**
 * Canvas 镜头：scene 根 viewBox track 在时刻 t → 附加 ctx transform（把取景 [x,y,w,h] 映射回 layout 视口）
 * @description 与 SVG 镜头同语义（group transform，非改 viewBox 属性）：复用 meet-fit 之上再叠一层镜头变换。
 *   在绘制所有 prim 之前应用一次（caller 的 ctx.save/restore 作用域内）。
 */
import type { Scene } from '@retikz/core';
import { evaluateTrack } from '../animation/evaluate';
import type { EasingRegistry } from '../animation/types';

/** 在 ctx 上施加 scene 根镜头变换（取首个 viewBox track 在 time 的取景）；无镜头则不动 */
export const applySceneCamera = (
  ctx: CanvasRenderingContext2D,
  scene: Scene,
  time: number,
  easings: EasingRegistry | undefined,
): void => {
  const track = (scene.animations ?? []).find(t => t.property === 'viewBox');
  if (!track) return;
  const result = evaluateTrack(track, time, { easings });
  if (!result || !Array.isArray(result.value)) return;
  const [vx, vy, vw, vh] = result.value as Array<number>;
  if (!vw || !vh) return;
  const { x: lx, y: ly, width: lw, height: lh } = scene.layout;
  const sx = lw / vw;
  const sy = lh / vh;
  ctx.translate(lx - sx * vx, ly - sy * vy);
  ctx.scale(sx, sy);
};

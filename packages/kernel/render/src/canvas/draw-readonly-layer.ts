import type { RenderReadonlyLayer } from '../runtime';
import { drawScene } from './draw-scene';
import type { DrawOptions } from './types';

/** 在当前 Canvas frame transform 内执行一个普通只读 Scene 图层 */
export const drawReadonlyLayer = (
  context: CanvasRenderingContext2D,
  layer: RenderReadonlyLayer,
  options: DrawOptions = {},
): void => {
  context.save();
  context.transform(...layer.transform);
  drawScene(context, layer.scene, { ...options, trace: undefined });
  context.restore();
};

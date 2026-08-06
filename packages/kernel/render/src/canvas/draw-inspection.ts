import type { InspectionPlane } from '@retikz/core';

import type { DrawOptions } from './types';

import { drawScene } from './draw-scene';

/** 在当前 Canvas frame transform 内按 canonical 顺序绘制辅助 Scene */
export const drawInspectionPlane = (
  ctx: CanvasRenderingContext2D,
  inspection: InspectionPlane,
  options: DrawOptions = {},
): void => {
  for (const entry of inspection.entries) {
    ctx.save();
    ctx.transform(...entry.transform);
    drawScene(ctx, entry.scene, { ...options, trace: undefined });
    ctx.restore();
  }
};

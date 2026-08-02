import type { InspectionLinePrimitive, InspectionPlane, InspectionPrimitive } from '@retikz/core';

import {
  createInspectionHatchSegments,
  InspectionHatchStrokeWidth,
  resolveInspectionColor,
  resolveInspectionFillAlphas,
} from '../shared';

type InspectionLineStyle = InspectionLinePrimitive['lineStyle'];

const lineDash = (lineStyle: InspectionLineStyle): Array<number> => {
  if (lineStyle === 'dashed') return [6, 4];
  if (lineStyle === 'dotted') return [1, 4];
  return [];
};

const prepareStroke = (ctx: CanvasRenderingContext2D, colorScope: number, primitive: InspectionPrimitive): void => {
  ctx.strokeStyle = resolveInspectionColor(colorScope, primitive.tone);
  ctx.lineWidth = 1;
  ctx.globalAlpha = 'opacity' in primitive ? (primitive.opacity ?? 1) : 1;
  const lineStyle = 'lineStyle' in primitive ? primitive.lineStyle : 'solid';
  ctx.setLineDash(lineDash(lineStyle));
  ctx.lineCap = lineStyle === 'dotted' ? 'round' : 'butt';
};

const drawPrimitive = (ctx: CanvasRenderingContext2D, colorScope: number, primitive: InspectionPrimitive): void => {
  if (primitive.kind === 'rect') {
    ctx.beginPath();
    ctx.rect(primitive.x, primitive.y, primitive.width, primitive.height);
    if (primitive.presentation === 'fill') {
      const color = resolveInspectionColor(colorScope, primitive.tone);
      const alphas = resolveInspectionFillAlphas(primitive.fillPattern, primitive.opacity);
      if (primitive.fillPattern === 'solid') {
        ctx.fillStyle = color;
        ctx.globalAlpha = alphas.fill;
        ctx.fill();
        return;
      }
      const segments = createInspectionHatchSegments(primitive, primitive.fillPattern);
      if (segments.length === 0) return;
      ctx.save();
      ctx.beginPath();
      ctx.rect(primitive.x, primitive.y, primitive.width, primitive.height);
      ctx.clip();
      ctx.beginPath();
      for (const segment of segments) {
        ctx.moveTo(segment.x1, segment.y1);
        ctx.lineTo(segment.x2, segment.y2);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = InspectionHatchStrokeWidth;
      ctx.globalAlpha = alphas.hatch;
      ctx.setLineDash([]);
      ctx.lineCap = 'butt';
      ctx.stroke();
      ctx.restore();
      return;
    }
    prepareStroke(ctx, colorScope, primitive);
    ctx.stroke();
    return;
  }
  if (primitive.kind === 'line') {
    prepareStroke(ctx, colorScope, primitive);
    ctx.beginPath();
    ctx.moveTo(primitive.x1, primitive.y1);
    ctx.lineTo(primitive.x2, primitive.y2);
    ctx.stroke();
    return;
  }
  ctx.fillStyle = resolveInspectionColor(colorScope, primitive.tone);
  ctx.globalAlpha = 1;
  ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
  ctx.textAlign = 'start';
  ctx.textBaseline = 'bottom';
  ctx.fillText(primitive.text, primitive.x, primitive.y);
};

/** 在当前 Canvas frame transform 内按 canonical 顺序绘制 inspection plane */
export const drawInspectionPlane = (ctx: CanvasRenderingContext2D, inspection: InspectionPlane): void => {
  for (const entry of inspection.entries) {
    ctx.save();
    ctx.transform(...entry.transform);
    for (const primitive of entry.primitives) drawPrimitive(ctx, entry.colorScope, primitive);
    ctx.restore();
  }
};

import type { InspectionLinePrimitive, InspectionPlane, InspectionPrimitive } from '@retikz/core';

type InspectionTone = InspectionPrimitive['tone'];
type InspectionLineStyle = InspectionLinePrimitive['lineStyle'];

const toneColors: Readonly<Record<InspectionTone, string>> = Object.freeze({
  neutral: '#64748b',
  accent: '#2563eb',
  guide: '#0891b2',
  warning: '#dc2626',
});

const lineDash = (lineStyle: InspectionLineStyle): Array<number> => {
  if (lineStyle === 'dashed') return [6, 4];
  if (lineStyle === 'dotted') return [1, 4];
  return [];
};

const prepareStroke = (ctx: CanvasRenderingContext2D, primitive: InspectionPrimitive): void => {
  ctx.strokeStyle = toneColors[primitive.tone];
  ctx.lineWidth = 1;
  ctx.globalAlpha = 'opacity' in primitive ? (primitive.opacity ?? 1) : 1;
  const lineStyle = 'lineStyle' in primitive ? (primitive.lineStyle ?? 'solid') : 'solid';
  ctx.setLineDash(lineDash(lineStyle));
  ctx.lineCap = lineStyle === 'dotted' ? 'round' : 'butt';
};

const drawPrimitive = (ctx: CanvasRenderingContext2D, primitive: InspectionPrimitive): void => {
  if (primitive.kind === 'rect') {
    ctx.beginPath();
    ctx.rect(primitive.x, primitive.y, primitive.width, primitive.height);
    if (primitive.presentation === 'fill') {
      ctx.fillStyle = toneColors[primitive.tone];
      ctx.globalAlpha = primitive.opacity ?? 0.14;
      ctx.fill();
      return;
    }
    prepareStroke(ctx, primitive);
    ctx.stroke();
    return;
  }
  if (primitive.kind === 'line') {
    prepareStroke(ctx, primitive);
    ctx.beginPath();
    ctx.moveTo(primitive.x1, primitive.y1);
    ctx.lineTo(primitive.x2, primitive.y2);
    ctx.stroke();
    return;
  }
  ctx.fillStyle = toneColors[primitive.tone];
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
    for (const primitive of entry.primitives) drawPrimitive(ctx, primitive);
    ctx.restore();
  }
};

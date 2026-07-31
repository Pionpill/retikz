import type {
  InspectionLinePrimitive,
  InspectionPlane,
  InspectionPrimitive,
  InspectionRectPrimitive,
} from '@retikz/core';

import type { SvgAttrs, SvgNode } from '../types';

type InspectionTone = InspectionPrimitive['tone'];

const toneColors: Readonly<Record<InspectionTone, string>> = Object.freeze({
  neutral: '#64748b',
  accent: '#2563eb',
  guide: '#0891b2',
  warning: '#dc2626',
});

const lineDash = (lineStyle: InspectionLinePrimitive['lineStyle']): string | undefined => {
  if (lineStyle === 'dashed') return '6 4';
  if (lineStyle === 'dotted') return '1 4';
  return undefined;
};

const lineAttrs = (
  tone: InspectionTone,
  lineStyle: InspectionLinePrimitive['lineStyle'],
  opacity: number | undefined,
): SvgAttrs => ({
  fill: 'none',
  stroke: toneColors[tone],
  'stroke-width': 1,
  'stroke-linecap': lineStyle === 'dotted' ? 'round' : 'butt',
  ...(lineDash(lineStyle) === undefined ? {} : { 'stroke-dasharray': lineDash(lineStyle) }),
  ...(opacity === undefined ? {} : { opacity }),
});

const buildRect = (primitive: InspectionRectPrimitive): SvgNode => {
  const geometry = {
    x: primitive.x,
    y: primitive.y,
    width: primitive.width,
    height: primitive.height,
  };
  if (primitive.presentation === 'fill') {
    return {
      tag: 'rect',
      attrs: {
        ...geometry,
        fill: toneColors[primitive.tone],
        opacity: primitive.opacity ?? 0.14,
      },
    };
  }
  return {
    tag: 'rect',
    attrs: {
      ...geometry,
      ...lineAttrs(primitive.tone, primitive.lineStyle ?? 'solid', primitive.opacity),
    },
  };
};

const buildPrimitive = (primitive: InspectionPrimitive): SvgNode => {
  if (primitive.kind === 'rect') return buildRect(primitive);
  if (primitive.kind === 'line') {
    return {
      tag: 'line',
      attrs: {
        x1: primitive.x1,
        y1: primitive.y1,
        x2: primitive.x2,
        y2: primitive.y2,
        ...lineAttrs(primitive.tone, primitive.lineStyle, primitive.opacity),
      },
    };
  }
  return {
    tag: 'text',
    attrs: {
      x: primitive.x,
      y: primitive.y,
      fill: toneColors[primitive.tone],
      'font-family': 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
      'font-size': 10,
      'dominant-baseline': 'text-after-edge',
    },
    children: [primitive.text],
  };
};

/** 把独立 inspection plane 物化为主图之后的不可交互 SVG 分组 */
export const buildSvgInspectionGroup = (inspection: InspectionPlane): SvgNode => ({
  tag: 'g',
  attrs: {
    'data-retikz-inspection': 'layout',
    'pointer-events': 'none',
  },
  children: inspection.entries.map(entry => ({
    tag: 'g',
    attrs: { transform: `matrix(${entry.transform.join(' ')})` },
    children: entry.primitives.map(buildPrimitive),
  })),
});

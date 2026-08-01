import type {
  InspectionLinePrimitive,
  InspectionPlane,
  InspectionPrimitive,
  InspectionRectPrimitive,
} from '@retikz/core';

import type { SvgAttrs, SvgNode } from '../types';

import {
  createInspectionHatchSegments,
  InspectionHatchStrokeWidth,
  resolveInspectionColor,
  resolveInspectionFillAlphas,
} from '../../shared';

type InspectionTone = InspectionPrimitive['tone'];

const lineDash = (lineStyle: InspectionLinePrimitive['lineStyle']): string | undefined => {
  if (lineStyle === 'dashed') return '6 4';
  if (lineStyle === 'dotted') return '1 4';
  return undefined;
};

const lineAttrs = (
  colorScope: number,
  tone: InspectionTone,
  lineStyle: InspectionLinePrimitive['lineStyle'],
  opacity: number | undefined,
): SvgAttrs => ({
  fill: 'none',
  stroke: resolveInspectionColor(colorScope, tone),
  'stroke-width': 1,
  'stroke-linecap': lineStyle === 'dotted' ? 'round' : 'butt',
  ...(lineDash(lineStyle) === undefined ? {} : { 'stroke-dasharray': lineDash(lineStyle) }),
  ...(opacity === undefined ? {} : { opacity }),
});

const buildRect = (colorScope: number, primitive: InspectionRectPrimitive): ReadonlyArray<SvgNode> => {
  const geometry = {
    x: primitive.x,
    y: primitive.y,
    width: primitive.width,
    height: primitive.height,
  };
  if (primitive.presentation === 'fill') {
    const color = resolveInspectionColor(colorScope, primitive.tone);
    const alphas = resolveInspectionFillAlphas(primitive.fillPattern, primitive.opacity);
    if (primitive.fillPattern === 'solid') {
      return [
        {
          tag: 'rect',
          attrs: { ...geometry, fill: color, opacity: alphas.fill },
        },
      ];
    }
    const segments = createInspectionHatchSegments(geometry, primitive.fillPattern);
    if (segments.length === 0) return [];
    return [
      {
        tag: 'path',
        attrs: {
          d: segments.map(segment => `M ${segment.x1} ${segment.y1} L ${segment.x2} ${segment.y2}`).join(' '),
          fill: 'none',
          stroke: color,
          'stroke-width': InspectionHatchStrokeWidth,
          opacity: alphas.hatch,
        },
      },
    ];
  }
  return [
    {
      tag: 'rect',
      attrs: {
        ...geometry,
        ...lineAttrs(colorScope, primitive.tone, primitive.lineStyle, primitive.opacity),
      },
    },
  ];
};

const buildPrimitive = (colorScope: number, primitive: InspectionPrimitive): ReadonlyArray<SvgNode> => {
  if (primitive.kind === 'rect') return buildRect(colorScope, primitive);
  if (primitive.kind === 'line') {
    return [
      {
        tag: 'line',
        attrs: {
          x1: primitive.x1,
          y1: primitive.y1,
          x2: primitive.x2,
          y2: primitive.y2,
          ...lineAttrs(colorScope, primitive.tone, primitive.lineStyle, primitive.opacity),
        },
      },
    ];
  }
  return [
    {
      tag: 'text',
      attrs: {
        x: primitive.x,
        y: primitive.y,
        fill: resolveInspectionColor(colorScope, primitive.tone),
        'font-family': 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
        'font-size': 10,
        'dominant-baseline': 'text-after-edge',
      },
      children: [primitive.text],
    },
  ];
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
    children: entry.primitives.flatMap(primitive => buildPrimitive(entry.colorScope, primitive)),
  })),
});

import { PathLineCap, PathLineJoin } from '@retikz/core';

import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** English control panel for path style channels */
export const builtinPathStyleControls = definePreviewControls({
  presentation: 'panel',
  title: 'Path style channels',
  defaultSize: 36,
  sections: [
    {
      label: 'Stroke',
      controls: [
        { kind: 'color', id: 'stroke', label: 'stroke', defaultValue: '#2563eb' },
        {
          kind: 'range',
          id: 'strokeWidth',
          label: 'strokeWidth',
          defaultValue: 4,
          min: 0.5,
          max: 10,
          step: 0.5,
        },
        { kind: 'range', id: 'opacity', label: 'opacity', defaultValue: 0.9, min: 0.1, max: 1, step: 0.1 },
        {
          kind: 'select',
          id: 'dashMode',
          label: 'dashPattern',
          defaultValue: 'solid',
          options: [
            { value: 'solid', label: 'Solid' },
            { value: 'dashed', label: 'Dashed' },
            { value: 'dotted', label: 'Dotted' },
          ],
        },
      ],
    },
    {
      label: 'Caps and joins',
      controls: [
        {
          kind: 'select',
          id: 'lineCap',
          label: 'lineCap',
          defaultValue: PathLineCap.Round,
          options: [
            { value: PathLineCap.Butt, label: 'butt' },
            { value: PathLineCap.Round, label: 'round' },
            { value: PathLineCap.Square, label: 'square' },
          ],
        },
        {
          kind: 'select',
          id: 'lineJoin',
          label: 'lineJoin',
          defaultValue: PathLineJoin.Round,
          options: [
            { value: PathLineJoin.Miter, label: 'miter' },
            { value: PathLineJoin.Round, label: 'round' },
            { value: PathLineJoin.Bevel, label: 'bevel' },
          ],
        },
        {
          kind: 'range',
          id: 'roundedCorners',
          label: 'roundedCorners',
          defaultValue: 8,
          min: 0,
          max: 20,
          step: 1,
        },
      ],
    },
  ],
});

/** Stable documentation contract for the path-style playground */
export const previewControlContract = {
  controls: builtinPathStyleControls,
  canonicalValues: {
    stroke: '#2563eb',
    strokeWidth: 4,
    opacity: 0.9,
    dashMode: 'solid',
    lineCap: PathLineCap.Round,
    lineJoin: PathLineJoin.Round,
    roundedCorners: 8,
  },
  presets: [
    {
      id: 'smooth',
      label: 'Smooth solid',
      values: {
        stroke: '#2563eb',
        strokeWidth: 4,
        opacity: 0.9,
        dashMode: 'solid',
        lineCap: PathLineCap.Round,
        lineJoin: PathLineJoin.Round,
        roundedCorners: 8,
      },
    },
    {
      id: 'technical',
      label: 'Technical dashed',
      values: {
        stroke: '#be123c',
        strokeWidth: 2,
        opacity: 1,
        dashMode: 'dashed',
        lineCap: PathLineCap.Butt,
        lineJoin: PathLineJoin.Miter,
        roundedCorners: 0,
      },
    },
  ],
  relatedApis: [
    'PathMark.stroke',
    'PathMark.strokeWidth',
    'PathMark.opacity',
    'PathMark.dashPattern',
    'PathMark.lineCap',
    'PathMark.lineJoin',
    'PathMark.roundedCorners',
  ],
} satisfies PreviewControlContract;

import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { PatternPlaygroundControlId } from './pattern-playground.controls';

/** Built-in pattern controls panel in English */
export const patternPlaygroundControls = definePreviewControls({
  presentation: 'panel',
  title: 'Tune the pattern',
  sections: [
    {
      label: 'Tile',
      controls: [
        {
          kind: 'select',
          id: PatternPlaygroundControlId.Shape,
          label: 'shape',
          defaultValue: 'lines',
          options: [
            { value: 'lines', label: 'Lines' },
            { value: 'dots', label: 'Dots' },
            { value: 'grid', label: 'Grid' },
          ],
        },
        {
          kind: 'range',
          id: PatternPlaygroundControlId.Size,
          label: 'size',
          defaultValue: 12,
          min: 4,
          max: 24,
        },
        {
          kind: 'range',
          id: PatternPlaygroundControlId.LineWidth,
          label: 'lineWidth',
          defaultValue: 1.5,
          min: 0.5,
          max: 4,
          step: 0.5,
        },
        {
          kind: 'select',
          id: PatternPlaygroundControlId.LineStyle,
          label: 'Line style',
          defaultValue: 'solid',
          options: [
            { value: 'solid', label: 'Solid' },
            { value: 'dashed', label: 'Dashed' },
            { value: 'dotted', label: 'Dotted' },
          ],
          visibleWhen: { controlId: PatternPlaygroundControlId.Shape, oneOf: ['lines', 'grid'] },
        },
        {
          kind: 'select',
          id: PatternPlaygroundControlId.LineCap,
          label: 'Line cap',
          defaultValue: 'butt',
          options: [
            { value: 'butt', label: 'Butt' },
            { value: 'round', label: 'Round' },
            { value: 'square', label: 'Square' },
          ],
          visibleWhen: { controlId: PatternPlaygroundControlId.Shape, oneOf: ['lines', 'grid'] },
        },
        {
          kind: 'select',
          id: PatternPlaygroundControlId.GridHorizontalStyle,
          label: 'Horizontal style',
          defaultValue: 'inherit',
          options: [
            { value: 'inherit', label: 'Inherit base style' },
            { value: 'dashed', label: 'Dashed' },
            { value: 'dotted', label: 'Dotted' },
          ],
          visibleWhen: { controlId: PatternPlaygroundControlId.Shape, oneOf: ['grid'] },
        },
        {
          kind: 'select',
          id: PatternPlaygroundControlId.GridVerticalStyle,
          label: 'Vertical style',
          defaultValue: 'inherit',
          options: [
            { value: 'inherit', label: 'Inherit base style' },
            { value: 'dashed', label: 'Dashed' },
            { value: 'dotted', label: 'Dotted' },
          ],
          visibleWhen: { controlId: PatternPlaygroundControlId.Shape, oneOf: ['grid'] },
        },
        {
          kind: 'select',
          id: PatternPlaygroundControlId.LineCycle,
          label: 'Line cycle',
          defaultValue: 'uniform',
          options: [
            { value: 'uniform', label: 'Uniform' },
            { value: 'every-five', label: 'Major every 5 lines' },
            { value: 'three-style', label: 'Three-style cycle' },
          ],
          visibleWhen: { controlId: PatternPlaygroundControlId.Shape, oneOf: ['lines'] },
        },
        {
          kind: 'range',
          id: PatternPlaygroundControlId.Rotation,
          label: 'rotation',
          defaultValue: 0,
          min: -180,
          max: 180,
          step: 15,
        },
      ],
    },
    {
      label: 'Colors',
      controls: [
        { kind: 'color', id: PatternPlaygroundControlId.Color, label: 'color', defaultValue: '#2563eb' },
        {
          kind: 'select',
          id: PatternPlaygroundControlId.Background,
          label: 'background',
          defaultValue: 'transparent',
          options: [
            { value: 'transparent', label: 'Transparent' },
            { value: '#eff6ff', label: 'Light' },
            { value: '#0f172a', label: 'Dark' },
          ],
        },
      ],
    },
  ],
});

export const previewControlContract = {
  controls: patternPlaygroundControls,
  canonicalValues: {
    shape: 'lines',
    size: 12,
    lineWidth: 1.5,
    lineStyle: 'solid',
    lineCap: 'butt',
    gridHorizontalStyle: 'inherit',
    gridVerticalStyle: 'inherit',
    lineCycle: 'uniform',
    rotation: 0,
    color: '#2563eb',
    background: 'transparent',
  },
  presets: [
    {
      id: 'dots',
      label: 'Dots',
      values: {
        shape: 'dots',
        size: 14,
        lineWidth: 2,
        lineStyle: 'solid',
        lineCap: 'butt',
        gridHorizontalStyle: 'inherit',
        gridVerticalStyle: 'inherit',
        lineCycle: 'uniform',
        rotation: 0,
        color: '#c2410c',
        background: '#eff6ff',
      },
    },
    {
      id: 'angled-grid',
      label: 'Angled grid',
      values: {
        shape: 'grid',
        size: 16,
        lineWidth: 1,
        lineStyle: 'dotted',
        lineCap: 'round',
        gridHorizontalStyle: 'dashed',
        gridVerticalStyle: 'dotted',
        lineCycle: 'uniform',
        rotation: 45,
        color: '#15803d',
        background: 'transparent',
      },
    },
  ],
  relatedApis: [
    'IRPaint',
    'PatternShape',
    'IRPatternPaint.dashed',
    'IRPatternPaint.dotted',
    'IRPatternPaint.dashPattern',
    'IRPatternPaint.lineCap',
    'IRPatternPaint.horizontalStyle',
    'IRPatternPaint.verticalStyle',
    'IRPatternPaint.lineStyleCycle',
    'Node.fill',
    'Path.fill',
  ],
} satisfies PreviewControlContract;

import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** 内置图案 playground 的稳定字段 id */
export const PatternPlaygroundControlId = {
  Shape: 'shape',
  Size: 'size',
  LineWidth: 'lineWidth',
  Rotation: 'rotation',
  Color: 'color',
  Background: 'background',
} as const;

/** 内置图案参数的中文属性面板 */
export const patternPlaygroundControls = definePreviewControls({
  presentation: 'panel',
  title: '调整图案',
  sections: [
    {
      label: '重复单元',
      controls: [
        {
          kind: 'select',
          id: PatternPlaygroundControlId.Shape,
          label: 'shape',
          defaultValue: 'lines',
          options: [
            { value: 'lines', label: '线条' },
            { value: 'dots', label: '圆点' },
            { value: 'grid', label: '网格' },
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
      label: '颜色',
      controls: [
        { kind: 'color', id: PatternPlaygroundControlId.Color, label: 'color', defaultValue: '#2563eb' },
        {
          kind: 'select',
          id: PatternPlaygroundControlId.Background,
          label: 'background',
          defaultValue: 'transparent',
          options: [
            { value: 'transparent', label: '透明' },
            { value: '#eff6ff', label: '浅色' },
            { value: '#0f172a', label: '深色' },
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
    rotation: 0,
    color: '#2563eb',
    background: 'transparent',
  },
  presets: [
    {
      id: 'dots',
      label: '圆点',
      values: {
        shape: 'dots',
        size: 14,
        lineWidth: 2,
        rotation: 0,
        color: '#c2410c',
        background: '#eff6ff',
      },
    },
    {
      id: 'angled-grid',
      label: '斜网格',
      values: {
        shape: 'grid',
        size: 16,
        lineWidth: 1,
        rotation: 45,
        color: '#15803d',
        background: 'transparent',
      },
    },
  ],
  relatedApis: ['IRPaintSpec', 'PatternShape', 'Node.fill', 'Path.fill'],
} satisfies PreviewControlContract;

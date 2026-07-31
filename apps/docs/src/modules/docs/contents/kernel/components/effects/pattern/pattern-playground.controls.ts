import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** 内置图案 playground 的稳定字段 id */
export const PatternPlaygroundControlId = {
  Shape: 'shape',
  Size: 'size',
  LineWidth: 'lineWidth',
  LineStyle: 'lineStyle',
  LineCap: 'lineCap',
  GridHorizontalStyle: 'gridHorizontalStyle',
  GridVerticalStyle: 'gridVerticalStyle',
  LineCycle: 'lineCycle',
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
          label: '图案类型',
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
          label: '间距',
          defaultValue: 12,
          min: 4,
          max: 24,
        },
        {
          kind: 'range',
          id: PatternPlaygroundControlId.LineWidth,
          label: '线宽',
          defaultValue: 1.5,
          min: 0.5,
          max: 4,
          step: 0.5,
        },
        {
          kind: 'select',
          id: PatternPlaygroundControlId.LineStyle,
          label: '线型',
          defaultValue: 'solid',
          options: [
            { value: 'solid', label: '实线' },
            { value: 'dashed', label: '虚线' },
            { value: 'dotted', label: '点线' },
          ],
          visibleWhen: { controlId: PatternPlaygroundControlId.Shape, oneOf: ['lines', 'grid'] },
        },
        {
          kind: 'select',
          id: PatternPlaygroundControlId.LineCap,
          label: '端点',
          defaultValue: 'butt',
          options: [
            { value: 'butt', label: '平直' },
            { value: 'round', label: '圆头' },
            { value: 'square', label: '方头' },
          ],
          visibleWhen: { controlId: PatternPlaygroundControlId.Shape, oneOf: ['lines', 'grid'] },
        },
        {
          kind: 'select',
          id: PatternPlaygroundControlId.GridHorizontalStyle,
          label: '横向线型',
          defaultValue: 'inherit',
          options: [
            { value: 'inherit', label: '继承基础线型' },
            { value: 'dashed', label: '虚线' },
            { value: 'dotted', label: '点线' },
          ],
          visibleWhen: { controlId: PatternPlaygroundControlId.Shape, oneOf: ['grid'] },
        },
        {
          kind: 'select',
          id: PatternPlaygroundControlId.GridVerticalStyle,
          label: '纵向线型',
          defaultValue: 'inherit',
          options: [
            { value: 'inherit', label: '继承基础线型' },
            { value: 'dashed', label: '虚线' },
            { value: 'dotted', label: '点线' },
          ],
          visibleWhen: { controlId: PatternPlaygroundControlId.Shape, oneOf: ['grid'] },
        },
        {
          kind: 'select',
          id: PatternPlaygroundControlId.LineCycle,
          label: '线条周期',
          defaultValue: 'uniform',
          options: [
            { value: 'uniform', label: '统一样式' },
            { value: 'every-five', label: '每 5 条一条主线' },
            { value: 'three-style', label: '三样式循环' },
          ],
          visibleWhen: { controlId: PatternPlaygroundControlId.Shape, oneOf: ['lines'] },
        },
        {
          kind: 'range',
          id: PatternPlaygroundControlId.Rotation,
          label: '旋转',
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
        { kind: 'color', id: PatternPlaygroundControlId.Color, label: '主色', defaultValue: '#2563eb' },
        {
          kind: 'select',
          id: PatternPlaygroundControlId.Background,
          label: '背景',
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
      label: '圆点',
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
      label: '斜网格',
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
    'IRPaintSpec',
    'PatternShape',
    'IRPatternPaintSpec.dashed',
    'IRPatternPaintSpec.dotted',
    'IRPatternPaintSpec.dashPattern',
    'IRPatternPaintSpec.lineCap',
    'IRPatternPaintSpec.horizontalStyle',
    'IRPatternPaintSpec.verticalStyle',
    'IRPatternPaintSpec.lineStyleCycle',
    'Node.fill',
    'Path.fill',
  ],
} satisfies PreviewControlContract;

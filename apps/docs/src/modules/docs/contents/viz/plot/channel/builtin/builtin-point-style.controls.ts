import { BuiltinShape } from '@retikz/core';

import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { pointStyleRows } from './builtin-point-style.data';

/** 点样式通道的中文属性面板 */
export const builtinPointStyleControls = definePreviewControls({
  presentation: 'panel',
  title: '点样式通道',
  defaultSize: 36,
  sections: [
    {
      label: '数据',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: '点数据',
          rows: pointStyleRows,
          columns: [{ key: 'x' }, { key: 'y' }],
        },
      ],
    },
    {
      label: '颜色',
      controls: [
        {
          kind: 'select',
          id: 'paintChannel',
          label: '作用通道',
          defaultValue: 'color',
          options: [
            { value: 'color', label: '主颜色' },
            { value: 'fill', label: '填充' },
            { value: 'stroke', label: '描边' },
          ],
        },
        { kind: 'color', id: 'paint', label: '颜色值', defaultValue: '#2563eb' },
        {
          kind: 'range',
          id: 'strokeWidth',
          label: '描边宽度',
          defaultValue: 2,
          min: 0,
          max: 8,
          step: 0.5,
        },
      ],
    },
    {
      label: '透明度',
      controls: [
        { kind: 'range', id: 'opacity', label: '整体透明度', defaultValue: 1, min: 0.1, max: 1, step: 0.1 },
        {
          kind: 'range',
          id: 'fillOpacity',
          label: '填充透明度',
          defaultValue: 0.85,
          min: 0.1,
          max: 1,
          step: 0.05,
        },
        {
          kind: 'range',
          id: 'strokeOpacity',
          label: '描边透明度',
          defaultValue: 1,
          min: 0.1,
          max: 1,
          step: 0.1,
        },
      ],
    },
    {
      label: '图形',
      controls: [
        { kind: 'range', id: 'size', label: '大小', defaultValue: 13, min: 4, max: 24, step: 1 },
        {
          kind: 'select',
          id: 'shape',
          label: '形状',
          defaultValue: BuiltinShape.Circle,
          options: [
            { value: BuiltinShape.Circle, label: '圆形' },
            { value: BuiltinShape.Rectangle, label: '矩形' },
            { value: BuiltinShape.Diamond, label: '菱形' },
          ],
        },
      ],
    },
  ],
});

/** 点样式通道 playground 的稳定文档契约 */
export const previewControlContract = {
  controls: builtinPointStyleControls,
  canonicalValues: {
    paintChannel: 'color',
    paint: '#2563eb',
    strokeWidth: 2,
    opacity: 1,
    fillOpacity: 0.85,
    strokeOpacity: 1,
    size: 13,
    shape: BuiltinShape.Circle,
  },
  presets: [
    {
      id: 'semantic-color',
      label: '语义主色',
      values: {
        paintChannel: 'color',
        paint: '#2563eb',
        strokeWidth: 2,
        opacity: 1,
        fillOpacity: 0.85,
        strokeOpacity: 1,
        size: 13,
        shape: BuiltinShape.Circle,
      },
    },
    {
      id: 'outlined-diamond',
      label: '描边菱形',
      values: {
        paintChannel: 'stroke',
        paint: '#be123c',
        strokeWidth: 5,
        opacity: 1,
        fillOpacity: 0.75,
        strokeOpacity: 1,
        size: 17,
        shape: BuiltinShape.Diamond,
      },
    },
  ],
  relatedApis: [
    'PointMark.color',
    'PointMark.fill',
    'PointMark.stroke',
    'PointMark.strokeWidth',
    'PointMark.opacity',
    'PointMark.fillOpacity',
    'PointMark.strokeOpacity',
    'PointMark.size',
    'PointMark.shape',
  ],
} satisfies PreviewControlContract;

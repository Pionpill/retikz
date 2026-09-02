import { PathLineCap, PathLineJoin } from '@retikz/core';

import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { pathStyleRows } from './builtin-path-style.data';

/** 路径样式通道的中文属性面板 */
export const builtinPathStyleControls = definePreviewControls({
  presentation: 'panel',
  title: '路径样式通道',
  defaultSize: 36,
  sections: [
    {
      label: '数据',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: '路径数据',
          rows: pathStyleRows,
          columns: [{ key: 'step' }, { key: 'value' }],
        },
      ],
    },
    {
      label: '描边',
      controls: [
        { kind: 'color', id: 'stroke', label: '描边颜色', defaultValue: '#2563eb' },
        {
          kind: 'range',
          id: 'strokeWidth',
          label: '描边宽度',
          defaultValue: 4,
          min: 0.5,
          max: 10,
          step: 0.5,
        },
        { kind: 'range', id: 'opacity', label: '整体透明度', defaultValue: 0.9, min: 0.1, max: 1, step: 0.1 },
        {
          kind: 'select',
          id: 'dashMode',
          label: '虚线模式',
          defaultValue: 'solid',
          options: [
            { value: 'solid', label: '实线' },
            { value: 'dashed', label: '虚线' },
            { value: 'dotted', label: '点线' },
          ],
        },
      ],
    },
    {
      label: '端点与连接',
      controls: [
        {
          kind: 'select',
          id: 'lineCap',
          label: '端点样式',
          defaultValue: PathLineCap.Round,
          options: [
            { value: PathLineCap.Butt, label: '平直' },
            { value: PathLineCap.Round, label: '圆头' },
            { value: PathLineCap.Square, label: '方头' },
          ],
        },
        {
          kind: 'select',
          id: 'lineJoin',
          label: '连接样式',
          defaultValue: PathLineJoin.Round,
          visibleWhen: { controlId: 'roundedCorners', oneOf: [0] },
          options: [
            { value: PathLineJoin.Miter, label: '尖角' },
            { value: PathLineJoin.Round, label: '圆角' },
            { value: PathLineJoin.Bevel, label: '斜角' },
          ],
        },
        {
          kind: 'range',
          id: 'roundedCorners',
          label: '路径圆角',
          defaultValue: 0,
          min: 0,
          max: 20,
          step: 1,
        },
      ],
    },
  ],
});

/** 路径样式 playground 的稳定文档契约 */
export const previewControlContract = {
  controls: builtinPathStyleControls,
  canonicalValues: {
    stroke: '#2563eb',
    strokeWidth: 4,
    opacity: 0.9,
    dashMode: 'solid',
    lineCap: PathLineCap.Round,
    lineJoin: PathLineJoin.Round,
    roundedCorners: 0,
  },
  presets: [
    {
      id: 'smooth',
      label: '圆润实线',
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
      label: '技术虚线',
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

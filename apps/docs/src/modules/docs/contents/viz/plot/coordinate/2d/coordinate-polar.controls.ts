import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { coordinate2DRows } from './coordinate-2d.data';

/** 极坐标二维坐标系示例的中文控件 */
export const coordinatePolarControls = definePreviewControls({
  presentation: 'panel',
  title: '极坐标二维坐标系',
  sections: [
    {
      label: '数据',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: '分类数值',
          rows: coordinate2DRows,
          columns: [{ key: 'category' }, { key: 'value' }],
        },
      ],
    },
    {
      label: '图元',
      controls: [
        {
          kind: 'select',
          id: 'markType',
          label: '图元类型',
          defaultValue: 'line',
          options: [
            { value: 'point', label: '点' },
            { value: 'line', label: '线' },
            { value: 'interval', label: '面' },
          ],
        },
        {
          kind: 'select',
          id: 'markInterpolation',
          label: '图元插值',
          defaultValue: 'inherit',
          options: [
            { value: 'inherit', label: '继承坐标系' },
            { value: 'polar', label: '极坐标曲线' },
            { value: 'chord', label: '直线弦' },
          ],
          visibleWhen: { controlId: 'markType', oneOf: ['line', 'interval'] },
        },
      ],
    },
    {
      label: '坐标投影',
      controls: [
        {
          kind: 'select',
          id: 'coordinateInterpolation',
          label: '坐标插值',
          defaultValue: 'auto',
          options: [
            { value: 'auto', label: '自动推断' },
            { value: 'polar', label: '极坐标曲线' },
            { value: 'chord', label: '直线弦' },
          ],
        },
        {
          kind: 'range',
          id: 'innerRadius',
          label: '内半径',
          defaultValue: 0,
          min: 0,
          max: 0.75,
          step: 0.05,
        },
        {
          kind: 'range',
          id: 'startAngle',
          label: '起始角度',
          defaultValue: -90,
          min: -180,
          max: 180,
          step: 15,
        },
        {
          kind: 'range',
          id: 'sweepAngle',
          label: '扫过角度',
          defaultValue: 360,
          min: 90,
          max: 360,
          step: 15,
        },
      ],
    },
  ],
});

/** 极坐标二维坐标系示例的稳定文档契约 */
export const previewControlContract = {
  controls: coordinatePolarControls,
  canonicalValues: {
    markType: 'line',
    markInterpolation: 'inherit',
    coordinateInterpolation: 'auto',
    innerRadius: 0,
    startAngle: -90,
    sweepAngle: 360,
  },
  relatedApis: ['PointMark', 'PathMark.interpolation', 'IntervalMark.interpolation', 'Plot.coordinate.interpolation'],
} satisfies PreviewControlContract;

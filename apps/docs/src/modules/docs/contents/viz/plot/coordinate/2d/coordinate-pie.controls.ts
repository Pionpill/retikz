import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { share } from './coordinate-pie.data';

/** 饼图与环形图示例的中文控件 */
export const coordinatePieControls = definePreviewControls({
  presentation: 'panel',
  title: '扇区图',
  sections: [
    {
      label: '数据',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: '类别占比',
          rows: share,
          columns: [
            { key: 'label', label: '类别' },
            { key: 'value', label: '数值' },
          ],
        },
      ],
    },
    {
      label: '圆环',
      controls: [
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
          defaultValue: 0,
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

/** 饼图与环形图示例的稳定文档契约 */
export const previewControlContract = {
  controls: coordinatePieControls,
  canonicalValues: {
    innerRadius: 0,
    startAngle: 0,
    sweepAngle: 360,
  },
  presets: [
    { id: 'pie', label: '饼图', values: { innerRadius: 0, startAngle: 0, sweepAngle: 360 } },
    { id: 'donut', label: '环形图', values: { innerRadius: 0.55, startAngle: 0, sweepAngle: 360 } },
    { id: 'semicircle', label: '半圆图', values: { innerRadius: 0.45, startAngle: 180, sweepAngle: 180 } },
  ],
  relatedApis: ['Plot.coordinate', 'IntervalMark.angle'],
} satisfies PreviewControlContract;

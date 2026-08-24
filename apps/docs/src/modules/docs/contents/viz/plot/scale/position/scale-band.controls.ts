import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { segments } from './scale-band.data';

/** 分类位置比例尺 playground 的中文属性面板 */
export const scaleBandControls = definePreviewControls({
  presentation: 'panel',
  title: '分类位置比例尺',
  sections: [
    {
      label: '数据',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'segments',
          label: '套餐营收',
          rows: segments,
          columns: [
            { key: 'segment', label: '套餐' },
            { key: 'revenue', label: '营收' },
          ],
        },
      ],
    },
    {
      label: '分类摆放',
      controls: [
        {
          kind: 'select',
          id: 'scaleType',
          label: '比例尺类型',
          defaultValue: 'band',
          options: [
            { value: 'band', label: '等宽分格 band' },
            { value: 'point', label: '等距点位 point' },
          ],
        },
        {
          kind: 'range',
          id: 'paddingInner',
          label: '格内间距',
          defaultValue: 0,
          min: 0,
          max: 0.8,
          step: 0.05,
          visibleWhen: { controlId: 'scaleType', oneOf: ['band'] },
        },
        {
          kind: 'range',
          id: 'paddingOuter',
          label: '外侧间距',
          defaultValue: 0,
          min: 0,
          max: 0.5,
          step: 0.05,
          visibleWhen: { controlId: 'scaleType', oneOf: ['band'] },
        },
        {
          kind: 'range',
          id: 'padding',
          label: '端点间距',
          defaultValue: 0.5,
          min: 0,
          max: 1,
          step: 0.05,
          visibleWhen: { controlId: 'scaleType', oneOf: ['point'] },
        },
      ],
    },
  ],
});

/** 分类位置比例尺 playground 的稳定文档契约 */
export const previewControlContract = {
  controls: scaleBandControls,
  canonicalValues: {
    scaleType: 'band',
    paddingInner: 0,
    paddingOuter: 0,
    padding: 0.5,
  },
  relatedApis: ['PlotScale.paddingInner', 'PlotScale.paddingOuter', 'PlotScale.padding'],
} satisfies PreviewControlContract;

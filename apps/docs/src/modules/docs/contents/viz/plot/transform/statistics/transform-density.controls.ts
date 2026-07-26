import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { measurements } from './transform-density.data';

/** 密度示例的中文控件 */
export const densityControls = definePreviewControls({
  presentation: 'panel',
  title: '核密度估计',
  sections: [
    {
      label: '数据',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: '分组测量值',
          rows: measurements,
          columns: [
            { key: 'group', label: '组' },
            { key: 'value', label: '测量值' },
          ],
        },
      ],
    },
    {
      label: '估计参数',
      controls: [
        {
          kind: 'select',
          id: 'bandwidthMode',
          label: '带宽策略',
          defaultValue: 'silverman',
          options: [
            { value: 'silverman', label: 'Silverman 规则' },
            { value: 'value', label: '显式带宽' },
          ],
        },
        {
          kind: 'range',
          id: 'bandwidth',
          label: '带宽',
          defaultValue: 0.6,
          min: 0.2,
          max: 1.5,
          step: 0.1,
          visibleWhen: { controlId: 'bandwidthMode', oneOf: ['value'] },
        },
        {
          kind: 'range',
          id: 'sampleCount',
          label: '采样数',
          defaultValue: 48,
          min: 12,
          max: 96,
          step: 12,
        },
      ],
    },
  ],
});

/** 密度示例的稳定文档契约 */
export const previewControlContract = {
  controls: densityControls,
  canonicalValues: { bandwidthMode: 'silverman', bandwidth: 0.6, sampleCount: 48 },
  presets: [
    {
      id: 'silverman',
      label: '自动带宽',
      values: { bandwidthMode: 'silverman', bandwidth: 0.6, sampleCount: 48 },
    },
    { id: 'narrow', label: '窄带宽', values: { bandwidthMode: 'value', bandwidth: 0.35, sampleCount: 72 } },
    { id: 'wide', label: '宽带宽', values: { bandwidthMode: 'value', bandwidth: 1.2, sampleCount: 48 } },
  ],
  relatedApis: ['IRPlotDensityTransform.bandwidth', 'IRPlotDensityTransform.sampleCount'],
} satisfies PreviewControlContract;

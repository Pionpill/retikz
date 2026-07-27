import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { measurements } from './transform-density.data';

/** 密度示例的英文控件 */
export const densityControls = definePreviewControls({
  presentation: 'panel',
  title: 'Kernel density estimate',
  sections: [
    {
      label: 'Data',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: 'Grouped measurements',
          rows: measurements,
          columns: [
            { key: 'group', label: 'Group' },
            { key: 'value', label: 'Value' },
          ],
        },
      ],
    },
    {
      label: 'Estimate parameters',
      controls: [
        {
          kind: 'select',
          id: 'bandwidthMode',
          label: 'Bandwidth strategy',
          defaultValue: 'silverman',
          options: [
            { value: 'silverman', label: 'Silverman rule' },
            { value: 'value', label: 'Explicit bandwidth' },
          ],
        },
        {
          kind: 'range',
          id: 'bandwidth',
          label: 'Bandwidth',
          defaultValue: 0.6,
          min: 0.2,
          max: 1.5,
          step: 0.1,
          visibleWhen: { controlId: 'bandwidthMode', oneOf: ['value'] },
        },
        {
          kind: 'range',
          id: 'sampleCount',
          label: 'Sample count',
          defaultValue: 48,
          min: 12,
          max: 96,
          step: 12,
        },
      ],
    },
  ],
});

/** 密度示例的英文稳定文档契约 */
export const previewControlContract = {
  controls: densityControls,
  canonicalValues: { bandwidthMode: 'silverman', bandwidth: 0.6, sampleCount: 48 },
  presets: [
    {
      id: 'silverman',
      label: 'Automatic bandwidth',
      values: { bandwidthMode: 'silverman', bandwidth: 0.6, sampleCount: 48 },
    },
    { id: 'narrow', label: 'Narrow bandwidth', values: { bandwidthMode: 'value', bandwidth: 0.35, sampleCount: 72 } },
    { id: 'wide', label: 'Wide bandwidth', values: { bandwidthMode: 'value', bandwidth: 1.2, sampleCount: 48 } },
  ],
  relatedApis: ['IRPlotDensityTransform.bandwidth', 'IRPlotDensityTransform.sampleCount'],
} satisfies PreviewControlContract;

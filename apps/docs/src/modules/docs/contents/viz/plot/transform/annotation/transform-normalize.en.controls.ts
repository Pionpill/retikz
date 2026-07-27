import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { revenue } from './transform-normalize.data';

/** 归一化示例的英文控件 */
export const normalizeControls = definePreviewControls({
  presentation: 'panel',
  title: 'Within-group shares',
  sections: [
    {
      label: 'Data',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: 'Quarterly product sales',
          rows: revenue,
          columns: [
            { key: 'quarter', label: 'Quarter' },
            { key: 'product', label: 'Product' },
            { key: 'amount', label: 'Amount' },
          ],
        },
      ],
    },
    {
      label: 'Normalization',
      controls: [
        {
          kind: 'select',
          id: 'basis',
          label: 'Output basis',
          defaultValue: 'percent',
          options: [
            { value: 'fraction', label: 'Fraction 0–1' },
            { value: 'percent', label: 'Percent 0–100' },
          ],
        },
        {
          kind: 'select',
          id: 'grouping',
          label: 'Grouping scope',
          defaultValue: 'quarter',
          options: [
            { value: 'quarter', label: 'Each quarter' },
            { value: 'global', label: 'All rows' },
          ],
        },
      ],
    },
  ],
});

/** 归一化示例的英文稳定文档契约 */
export const previewControlContract = {
  controls: normalizeControls,
  canonicalValues: { basis: 'percent', grouping: 'quarter' },
  presets: [
    { id: 'quarter-percent', label: 'Quarterly percent', values: { basis: 'percent', grouping: 'quarter' } },
    { id: 'global-fraction', label: 'Global fraction', values: { basis: 'fraction', grouping: 'global' } },
  ],
  relatedApis: ['IRPlotNormalizeTransform.basis', 'IRPlotNormalizeTransform.groupBy'],
} satisfies PreviewControlContract;

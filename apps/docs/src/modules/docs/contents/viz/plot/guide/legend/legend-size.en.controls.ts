import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { cities } from './legend.data';

/** 尺寸图例示例的英文控件 */
export const legendSizeControls = definePreviewControls({
  presentation: 'panel',
  title: 'Size legend',
  sections: [
    {
      label: 'Data',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: 'Population samples',
          rows: cities,
          columns: [
            { key: 'lng', label: 'Longitude' },
            { key: 'lat', label: 'Latitude' },
            { key: 'pop', label: 'Population' },
          ],
        },
      ],
    },
    {
      label: 'Layout',
      controls: [
        {
          kind: 'select',
          id: 'position',
          label: 'Position',
          defaultValue: 'bottom',
          options: [
            { value: 'right', label: 'Right' },
            { value: 'left', label: 'Left' },
            { value: 'top', label: 'Top' },
            { value: 'bottom', label: 'Bottom' },
          ],
        },
        {
          kind: 'select',
          id: 'orient',
          label: 'Direction',
          defaultValue: 'auto',
          options: [
            { value: 'auto', label: 'Follow position' },
            { value: 'vertical', label: 'Vertical' },
            { value: 'horizontal', label: 'Horizontal' },
          ],
        },
      ],
    },
    {
      label: 'Symbol',
      controls: [
        { kind: 'range', id: 'symbolSize', label: 'Target size', defaultValue: 18, min: 10, max: 36, step: 2 },
        {
          kind: 'select',
          id: 'symbolFit',
          label: 'Fit mode',
          defaultValue: 'fit',
          options: [
            { value: 'fit', label: 'Fit target box' },
            { value: 'preserve', label: 'Preserve rendered radius' },
          ],
        },
      ],
    },
  ],
});

/** 尺寸图例示例的英文稳定文档契约 */
export const previewControlContract = {
  controls: legendSizeControls,
  canonicalValues: { position: 'bottom', orient: 'auto', symbolSize: 18, symbolFit: 'fit' },
  relatedApis: [
    'PlotLegend.position',
    'PlotLegend.orient',
    'PlotLegend.style.symbolSize',
    'PlotLegend.style.symbolFit',
  ],
} satisfies PreviewControlContract;

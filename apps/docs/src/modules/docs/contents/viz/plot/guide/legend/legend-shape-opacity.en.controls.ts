import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { cities } from './legend.data';

/** 形状与透明度图例示例的英文控件 */
export const legendShapeOpacityControls = definePreviewControls({
  presentation: 'panel',
  title: 'Shape and opacity legends',
  sections: [
    {
      label: 'Data',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: 'City samples',
          rows: cities,
          columns: [{ key: 'lng' }, { key: 'lat' }, { key: 'region' }, { key: 'pop' }],
        },
      ],
    },
    {
      label: 'Shape legend',
      controls: [
        { kind: 'switch', id: 'showShape', label: 'Show', defaultValue: true },
        {
          kind: 'select',
          id: 'shapePosition',
          label: 'Position',
          defaultValue: 'right',
          visibleWhen: { controlId: 'showShape', oneOf: [true] },
          options: [
            { value: 'right', label: 'Right' },
            { value: 'left', label: 'Left' },
            { value: 'top', label: 'Top' },
            { value: 'bottom', label: 'Bottom' },
          ],
        },
      ],
    },
    {
      label: 'Opacity legend',
      controls: [
        { kind: 'switch', id: 'showOpacity', label: 'Show', defaultValue: true },
        {
          kind: 'select',
          id: 'opacityPosition',
          label: 'Position',
          defaultValue: 'bottom',
          visibleWhen: { controlId: 'showOpacity', oneOf: [true] },
          options: [
            { value: 'right', label: 'Right' },
            { value: 'left', label: 'Left' },
            { value: 'top', label: 'Top' },
            { value: 'bottom', label: 'Bottom' },
          ],
        },
        {
          kind: 'range',
          id: 'tickCount',
          label: 'Target ticks',
          defaultValue: 4,
          min: 2,
          max: 7,
          step: 1,
          visibleWhen: { controlId: 'showOpacity', oneOf: [true] },
        },
      ],
    },
  ],
});

/** 形状与透明度图例示例的英文稳定文档契约 */
export const previewControlContract = {
  controls: legendShapeOpacityControls,
  canonicalValues: {
    showShape: true,
    shapePosition: 'right',
    showOpacity: true,
    opacityPosition: 'bottom',
    tickCount: 4,
  },
  relatedApis: ['PlotLegend.channel', 'PlotLegend.position', 'PlotLegend.ticks'],
} satisfies PreviewControlContract;

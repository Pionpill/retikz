import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { cities } from './legend.data';

/** 颜色图例形态示例的英文控件 */
export const legendColorFormsControls = definePreviewControls({
  presentation: 'panel',
  title: 'Color legend forms',
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
      label: 'Form',
      controls: [
        {
          kind: 'select',
          id: 'form',
          label: 'Legend form',
          defaultValue: 'swatch',
          options: [
            { value: 'swatch', label: 'Categorical swatches' },
            { value: 'ramp', label: 'Continuous ramp' },
            { value: 'binned', label: 'Binned color' },
          ],
        },
        {
          kind: 'select',
          id: 'position',
          label: 'Position',
          defaultValue: 'right',
          options: [
            { value: 'right', label: 'Right' },
            { value: 'left', label: 'Left' },
            { value: 'top', label: 'Top' },
            { value: 'bottom', label: 'Bottom' },
          ],
        },
        { kind: 'switch', id: 'showLabels', label: 'Show labels', defaultValue: true },
      ],
    },
    {
      label: 'Current form',
      controls: [
        {
          kind: 'select',
          id: 'orient',
          label: 'Direction',
          defaultValue: 'auto',
          visibleWhen: { controlId: 'form', oneOf: ['swatch'] },
          options: [
            { value: 'auto', label: 'Follow position' },
            { value: 'vertical', label: 'Vertical' },
            { value: 'horizontal', label: 'Horizontal' },
          ],
        },
        {
          kind: 'range',
          id: 'swatchSize',
          label: 'Swatch size',
          defaultValue: 14,
          min: 8,
          max: 28,
          step: 2,
          visibleWhen: { controlId: 'form', oneOf: ['swatch'] },
        },
        {
          kind: 'range',
          id: 'tickCount',
          label: 'Target ticks',
          defaultValue: 4,
          min: 2,
          max: 8,
          step: 1,
          visibleWhen: { controlId: 'form', oneOf: ['ramp'] },
        },
        {
          kind: 'select',
          id: 'format',
          label: 'Number format',
          defaultValue: '~s',
          visibleWhen: { controlId: 'form', oneOf: ['ramp'] },
          options: [
            { value: '~s', label: 'Compact units' },
            { value: '.0f', label: 'Integer' },
            { value: '.1f', label: 'One decimal' },
          ],
        },
        {
          kind: 'range',
          id: 'rampLength',
          label: 'Ramp length',
          defaultValue: 118,
          min: 72,
          max: 180,
          step: 6,
          visibleWhen: { controlId: 'form', oneOf: ['ramp'] },
        },
        {
          kind: 'range',
          id: 'rampThickness',
          label: 'Ramp thickness',
          defaultValue: 14,
          min: 8,
          max: 28,
          step: 2,
          visibleWhen: { controlId: 'form', oneOf: ['ramp'] },
        },
        {
          kind: 'range',
          id: 'binCount',
          label: 'Interval count',
          defaultValue: 4,
          min: 2,
          max: 7,
          step: 1,
          visibleWhen: { controlId: 'form', oneOf: ['binned'] },
        },
        {
          kind: 'select',
          id: 'scheme',
          label: 'Color scheme',
          defaultValue: 'blues',
          visibleWhen: { controlId: 'form', oneOf: ['binned'] },
          options: [
            { value: 'blues', label: 'Blues' },
            { value: 'greens', label: 'Greens' },
            { value: 'magma', label: 'Magma' },
          ],
        },
      ],
    },
  ],
});

/** 颜色图例形态示例的英文稳定文档契约 */
export const previewControlContract = {
  controls: legendColorFormsControls,
  canonicalValues: {
    form: 'swatch',
    position: 'right',
    showLabels: true,
    orient: 'auto',
    swatchSize: 14,
    tickCount: 4,
    format: '~s',
    rampLength: 118,
    rampThickness: 14,
    binCount: 4,
    scheme: 'blues',
  },
  relatedApis: [
    'IRPlotScale.type',
    'PlotLegend.position',
    'PlotLegend.orient',
    'PlotLegend.ticks',
    'PlotLegend.tickLabels',
    'PlotLegend.style.swatchSize',
    'PlotLegend.style.rampLength',
    'PlotLegend.style.rampThickness',
  ],
} satisfies PreviewControlContract;

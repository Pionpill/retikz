import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { controlLabels } from './legend-color-forms.i18n';
import { cities } from './legend.data';

/** 颜色图例形态示例的中文控件 */
const createControls = (lang: Lang) => {
  const text = controlLabels[lang];
  return definePreviewControls({
    presentation: 'panel',
    title: text.colorLegendForms,
    sections: [
      {
        label: text.data,
        defaultCollapsed: true,
        controls: [
          {
            kind: 'table',
            id: 'rows',
            label: text.citySamples,
            rows: cities,
            columns: [{ key: 'lng' }, { key: 'lat' }, { key: 'region' }, { key: 'pop' }],
          },
        ],
      },
      {
        label: text.form,
        controls: [
          {
            kind: 'select',
            id: 'form',
            label: text.legendForm,
            defaultValue: 'swatch',
            options: [
              { value: 'swatch', label: text.categoricalSwatches },
              { value: 'ramp', label: text.continuousRamp },
              { value: 'binned', label: text.binnedColor },
            ],
          },
          {
            kind: 'select',
            id: 'position',
            label: text.position,
            defaultValue: 'right',
            options: [
              { value: 'right', label: text.right },
              { value: 'left', label: text.left },
              { value: 'top', label: text.top },
              { value: 'bottom', label: text.bottom },
            ],
          },
          { kind: 'switch', id: 'showLabels', label: text.showLabels, defaultValue: true },
        ],
      },
      {
        label: text.currentForm,
        controls: [
          {
            kind: 'range',
            id: 'tickCount',
            label: text.targetTicks,
            defaultValue: 4,
            min: 2,
            max: 8,
            step: 1,
            visibleWhen: { controlId: 'form', oneOf: ['ramp'] },
          },
          {
            kind: 'select',
            id: 'format',
            label: text.numberFormat,
            defaultValue: '~s',
            visibleWhen: { controlId: 'form', oneOf: ['ramp'] },
            options: [
              { value: '~s', label: text.compactUnits },
              { value: '.0f', label: text.integer },
              { value: '.1f', label: text.oneDecimal },
            ],
          },

          {
            kind: 'range',
            id: 'binCount',
            label: text.intervalCount,
            defaultValue: 4,
            min: 2,
            max: 7,
            step: 1,
            visibleWhen: { controlId: 'form', oneOf: ['binned'] },
          },
        ],
      },
    ],
  });
};

/** 颜色图例形态示例的稳定文档契约 */
export const createPreviewControlContract = (lang: Lang) =>
  ({
    controls: createControls(lang),
    canonicalValues: {
      form: 'swatch',
      position: 'right',
      showLabels: true,
      tickCount: 4,
      format: '~s',
      binCount: 4,
    },
    relatedApis: ['IRPlotScale.type', 'PlotLegend.position', 'PlotLegend.ticks', 'PlotLegend.tickLabels'],
  }) satisfies PreviewControlContract;

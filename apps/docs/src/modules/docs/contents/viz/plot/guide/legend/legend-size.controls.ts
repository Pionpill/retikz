import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { controlLabels } from './legend-size.i18n';
import { cities } from './legend.data';

/** 尺寸图例示例的中文控件 */
const createControls = (lang: Lang) => {
  const text = controlLabels[lang];
  return definePreviewControls({
    presentation: 'panel',
    title: text.sizeLegend,
    sections: [
      {
        label: text.data,
        defaultCollapsed: true,
        controls: [
          {
            kind: 'table',
            id: 'rows',
            label: text.populationSamples,
            rows: cities,
            columns: [{ key: 'lng' }, { key: 'lat' }, { key: 'pop' }],
          },
        ],
      },
      {
        label: text.layout,
        controls: [
          {
            kind: 'select',
            id: 'position',
            label: text.position,
            defaultValue: 'bottom',
            options: [
              { value: 'right', label: text.right },
              { value: 'left', label: text.left },
              { value: 'top', label: text.top },
              { value: 'bottom', label: text.bottom },
            ],
          },
          {
            kind: 'select',
            id: 'orient',
            label: text.direction,
            defaultValue: 'auto',
            options: [
              { value: 'auto', label: text.followPosition },
              { value: 'vertical', label: text.vertical },
              { value: 'horizontal', label: text.horizontal },
            ],
          },
        ],
      },
      {
        label: text.symbol,
        controls: [
          { kind: 'range', id: 'symbolSize', label: text.targetSize, defaultValue: 18, min: 10, max: 36, step: 2 },
          {
            kind: 'select',
            id: 'symbolFit',
            label: text.fitMode,
            defaultValue: 'fit',
            options: [
              { value: 'fit', label: text.fitTargetBox },
              { value: 'preserve', label: text.preserveRenderedRadius },
            ],
          },
        ],
      },
    ],
  });
};

/** 尺寸图例示例的稳定文档契约 */
export const createPreviewControlContract = (lang: Lang) =>
  ({
    controls: createControls(lang),
    canonicalValues: { position: 'bottom', orient: 'auto', symbolSize: 18, symbolFit: 'fit' },
    relatedApis: [
      'PlotLegend.position',
      'PlotLegend.orient',
      'PlotLegend.style.symbolSize',
      'PlotLegend.style.symbolFit',
    ],
  }) satisfies PreviewControlContract;

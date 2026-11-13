import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { controlLabels } from './legend-shape-opacity.i18n';
import { cities } from './legend.data';

/** 形状与透明度图例示例的中文控件 */
const createControls = (lang: Lang) => {
  const text = controlLabels[lang];
  return definePreviewControls({
    presentation: 'panel',
    title: text.shapeAndOpacityLegends,
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
        label: text.shapeLegend,
        controls: [
          { kind: 'switch', id: 'showShape', label: text.show, defaultValue: true },
          {
            kind: 'select',
            id: 'shapePosition',
            label: text.position,
            defaultValue: 'right',
            visibleWhen: { controlId: 'showShape', oneOf: [true] },
            options: [
              { value: 'right', label: text.right },
              { value: 'left', label: text.left },
              { value: 'top', label: text.top },
              { value: 'bottom', label: text.bottom },
            ],
          },
        ],
      },
      {
        label: text.opacityLegend,
        controls: [
          { kind: 'switch', id: 'showOpacity', label: text.show2, defaultValue: true },
          {
            kind: 'select',
            id: 'opacityPosition',
            label: text.position2,
            defaultValue: 'bottom',
            visibleWhen: { controlId: 'showOpacity', oneOf: [true] },
            options: [
              { value: 'right', label: text.right2 },
              { value: 'left', label: text.left2 },
              { value: 'top', label: text.top2 },
              { value: 'bottom', label: text.bottom2 },
            ],
          },
          {
            kind: 'range',
            id: 'tickCount',
            label: text.targetTicks,
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
};

/** 形状与透明度图例示例的稳定文档契约 */
export const createPreviewControlContract = (lang: Lang) =>
  ({
    controls: createControls(lang),
    canonicalValues: {
      showShape: true,
      shapePosition: 'right',
      showOpacity: true,
      opacityPosition: 'bottom',
      tickCount: 4,
    },
    relatedApis: ['PlotLegend.channel', 'PlotLegend.position', 'PlotLegend.ticks'],
  }) satisfies PreviewControlContract;

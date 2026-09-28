import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract, PreviewControlValuesFor } from '@/modules/docs/preview';

import { controlI18n } from './strip-distribution.i18n';
import { stripVegaBarleyData } from './strip-vega-barley.data';
/** 示例属性的双语交互契约 */
export const createPreviewControlContract = (lang: Lang = 'zh') => {
  const text = controlI18n[lang];
  return {
    controls: definePreviewControls({
      presentation: 'panel',
      title: text.settings,
      sections: [
        {
          label: text.data,
          defaultCollapsed: true,
          controls: [
            {
              kind: 'table',
              id: 'rows',
              label: text.samples,
              rows: stripVegaBarleyData,
              columns: Object.keys(stripVegaBarleyData[0] ?? {}).map(key => ({ key })),
            },
          ],
        },
        {
          label: text.settings,
          controls: [
            { kind: 'range', id: 'size', label: text.size, defaultValue: 4, min: 1, max: 12, step: 1 },
            { kind: 'range', id: 'opacity', label: text.opacity, defaultValue: 0.65, min: 0.1, max: 1, step: 0.05 },
            { kind: 'range', id: 'span', label: text.span, defaultValue: 0.7, min: 0.1, max: 1, step: 0.05 },
            {
              kind: 'select',
              id: 'distribution',
              label: text.distribution,
              defaultValue: 'normal',
              options: [
                { value: 'normal', label: text.distribution_normal },
                { value: 'uniform', label: text.distribution_uniform },
              ],
            },
            {
              kind: 'range',
              id: 'sigma',
              label: text.sigma,
              defaultValue: 0.35,
              min: 0.1,
              max: 1,
              step: 0.05,
              visibleWhen: { controlId: 'distribution', oneOf: ['normal'] },
            },
            { kind: 'range', id: 'seed', label: text.seed, defaultValue: 7, min: 0, max: 30, step: 1 },
          ],
        },
      ],
    }),
    canonicalValues: { size: 4, opacity: 0.65, span: 0.7, distribution: 'normal', sigma: 0.35, seed: 7 } as const,
    relatedApis: ['StripEncodings', 'StripProperties'],
  } satisfies PreviewControlContract;
};
/** 当前示例的控件值 */
export type DemoValues = PreviewControlValuesFor<ReturnType<typeof createPreviewControlContract>['controls']>;

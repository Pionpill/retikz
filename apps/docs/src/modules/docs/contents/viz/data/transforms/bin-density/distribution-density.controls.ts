import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract } from '@/modules/docs/preview';

import { transformDemoI18n } from './bin-density.i18n';

/** 本节的双语控件和 Reset 基线 */
export const createPreviewControlContract = (lang: Lang = 'zh') => {
  const i18n = transformDemoI18n[lang];
  return {
    controls: definePreviewControls({
      presentation: 'panel',
      title: i18n.distribution_density,
      sections: [
        {
          controls: [
            { kind: 'switch', id: 'grouped', label: i18n.grouped, defaultValue: false },
            {
              kind: 'select',
              id: 'bandwidth',
              label: i18n.bandwidth,
              defaultValue: 'silverman',
              options: [
                { value: 'silverman', label: i18n.silverman },
                { value: 'value', label: i18n.explicit },
              ],
            },
            {
              kind: 'range',
              id: 'width',
              label: i18n.width,
              defaultValue: 8,
              min: 2,
              max: 16,
              step: 2,
              visibleWhen: { controlId: 'bandwidth', oneOf: ['value'] },
            },
            { kind: 'range', id: 'samples', label: i18n.samples, defaultValue: 4, min: 2, max: 6, step: 1 },
          ],
        },
      ],
    }),
    canonicalValues: { grouped: false, bandwidth: 'silverman', width: 8, samples: 4 },
    relatedApis: ['DensityTransformSchema'],
  } satisfies PreviewControlContract;
};
/** 注册回退使用中文基线 */
export const previewControlContract = createPreviewControlContract();

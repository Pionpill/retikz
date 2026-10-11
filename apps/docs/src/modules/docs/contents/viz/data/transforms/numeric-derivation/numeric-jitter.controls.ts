import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract } from '@/modules/docs/preview';

import { transformDemoI18n } from './numeric-derivation.i18n';

/** 本节的双语控件和 Reset 基线 */
export const createPreviewControlContract = (lang: Lang = 'zh') => {
  const i18n = transformDemoI18n[lang];
  return {
    controls: definePreviewControls({
      presentation: 'panel',
      title: i18n.numeric_jitter,
      sections: [
        {
          controls: [
            {
              kind: 'select',
              id: 'axis',
              label: i18n.axis,
              defaultValue: 'x',
              options: [
                { value: 'x', label: i18n.xAxis },
                { value: 'y', label: i18n.yAxis },
                { value: 'both', label: i18n.both },
              ],
            },
            { kind: 'range', id: 'amount', label: i18n.amount, defaultValue: 1, min: 0, max: 3, step: 0.5 },
            { kind: 'range', id: 'seed', label: i18n.seed, defaultValue: 0, min: 0, max: 10, step: 1 },
          ],
        },
      ],
    }),
    canonicalValues: { axis: 'x', amount: 1, seed: 0 },
    relatedApis: ['JitterTransformSchema'],
  } satisfies PreviewControlContract;
};
/** 注册回退使用中文基线 */
export const previewControlContract = createPreviewControlContract();

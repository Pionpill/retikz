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
      title: i18n.distribution_bin,
      sections: [
        {
          controls: [
            { kind: 'switch', id: 'grouped', label: i18n.grouped, defaultValue: false },
            {
              kind: 'select',
              id: 'strategy',
              label: i18n.strategy,
              defaultValue: 'count',
              options: [
                { value: 'count', label: i18n.countStrategy },
                { value: 'step', label: i18n.stepStrategy },
                { value: 'thresholds', label: i18n.thresholdsStrategy },
              ],
            },
            {
              kind: 'range',
              id: 'count',
              label: i18n.bins,
              defaultValue: 3,
              min: 2,
              max: 4,
              step: 1,
              visibleWhen: { controlId: 'strategy', oneOf: ['count'] },
            },
            {
              kind: 'range',
              id: 'step',
              label: i18n.step,
              defaultValue: 20,
              min: 15,
              max: 30,
              step: 5,
              visibleWhen: { controlId: 'strategy', oneOf: ['step'] },
            },
          ],
        },
      ],
    }),
    canonicalValues: { grouped: false, strategy: 'count', count: 3, step: 20 },
    relatedApis: ['BinTransformSchema'],
  } satisfies PreviewControlContract;
};
/** 注册回退使用中文基线 */
export const previewControlContract = createPreviewControlContract();

import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract } from '@/modules/docs/preview';

import { transformDemoI18n } from './trend-sampling.i18n';

/** 本节的双语控件和 Reset 基线 */
export const createPreviewControlContract = (lang: Lang = 'zh') => {
  const i18n = transformDemoI18n[lang];
  return {
    controls: definePreviewControls({
      presentation: 'panel',
      title: i18n.trend_smooth,
      sections: [
        {
          controls: [
            { kind: 'switch', id: 'grouped', label: i18n.grouped, defaultValue: false },
            {
              kind: 'select',
              id: 'method',
              label: i18n.method,
              defaultValue: 'linear',
              options: [
                { value: 'linear', label: i18n.linear },
                { value: 'quadratic', label: i18n.quadratic },
              ],
            },
            { kind: 'range', id: 'samples', label: i18n.samples, defaultValue: 4, min: 2, max: 6, step: 1 },
            { kind: 'switch', id: 'extended', label: i18n.extended, defaultValue: false },
          ],
        },
      ],
    }),
    canonicalValues: { grouped: false, method: 'linear', samples: 4, extended: false },
    relatedApis: ['SmoothTransformSchema'],
  } satisfies PreviewControlContract;
};
/** 注册回退使用中文基线 */
export const previewControlContract = createPreviewControlContract();

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
      title: i18n.numeric_interval,
      sections: [
        {
          controls: [
            {
              kind: 'select',
              id: 'mode',
              label: i18n.mode,
              defaultValue: 'baseline',
              options: [
                { value: 'baseline', label: i18n.baselineMode },
                { value: 'fields', label: i18n.fieldsMode },
              ],
            },
            {
              kind: 'range',
              id: 'baseline',
              label: i18n.baseline,
              defaultValue: 0,
              min: -10,
              max: 20,
              step: 5,
              visibleWhen: { controlId: 'mode', oneOf: ['baseline'] },
            },
          ],
        },
      ],
    }),
    canonicalValues: { mode: 'baseline', baseline: 0 },
    relatedApis: ['DeriveIntervalTransformSchema'],
  } satisfies PreviewControlContract;
};
/** 注册回退使用中文基线 */
export const previewControlContract = createPreviewControlContract();

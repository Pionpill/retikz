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
      title: i18n.numeric_stack,
      sections: [
        {
          controls: [
            { kind: 'switch', id: 'grouped', label: i18n.grouped, defaultValue: true },
            { kind: 'switch', id: 'series', label: i18n.series, defaultValue: true },
            {
              kind: 'select',
              id: 'offset',
              label: i18n.offset,
              defaultValue: 'zero',
              options: [
                { value: 'zero', label: i18n.zero },
                { value: 'diverging', label: i18n.diverging },
                { value: 'center', label: i18n.center },
                { value: 'overlap', label: i18n.overlap },
              ],
            },
          ],
        },
      ],
    }),
    canonicalValues: { grouped: true, series: true, offset: 'zero' },
    relatedApis: ['StackTransformSchema'],
  } satisfies PreviewControlContract;
};
/** 注册回退使用中文基线 */
export const previewControlContract = createPreviewControlContract();

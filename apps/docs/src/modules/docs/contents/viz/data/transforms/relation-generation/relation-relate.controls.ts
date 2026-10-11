import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract } from '@/modules/docs/preview';

import { transformDemoI18n } from './relation-generation.i18n';

/** 本节的双语控件和 Reset 基线 */
export const createPreviewControlContract = (lang: Lang = 'zh') => {
  const i18n = transformDemoI18n[lang];
  return {
    controls: definePreviewControls({
      presentation: 'panel',
      title: i18n.relation_relate,
      sections: [
        {
          controls: [
            { kind: 'switch', id: 'grouped', label: i18n.grouped, defaultValue: true },
            {
              kind: 'select',
              id: 'pair',
              label: i18n.pair,
              defaultValue: 'extrema',
              options: [
                { value: 'extrema', label: i18n.extrema },
                { value: 'ends', label: i18n.ends },
              ],
            },
            { kind: 'switch', id: 'measure', label: i18n.measure, defaultValue: true },
          ],
        },
      ],
    }),
    canonicalValues: { grouped: true, pair: 'extrema', measure: true },
    relatedApis: ['RelateTransformSchema'],
  } satisfies PreviewControlContract;
};
/** 注册回退使用中文基线 */
export const previewControlContract = createPreviewControlContract();

import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract } from '@/modules/docs/preview';

import { selectorNthI18n } from './selector-nth.i18n';

/** 指定位置的双语控件、真实数据视图与重置基线 */
export const createPreviewControlContract = (lang: Lang = 'zh') => {
  const i18n = selectorNthI18n[lang];
  return {
    controls: definePreviewControls({
      presentation: 'panel',
      title: i18n.title,
      sections: [
        {
          controls: [
            { kind: 'switch', id: 'grouped', label: i18n.grouped, defaultValue: true },
            {
              kind: 'select',
              id: 'order',
              label: i18n.order,
              defaultValue: 'ascending',
              options: [
                { value: 'ascending', label: i18n.ascending },
                { value: 'descending', label: i18n.descending },
              ],
            },
            { kind: 'range', id: 'index', label: i18n.index, defaultValue: 1, min: 0, max: 8, step: 1 },
          ],
        },
      ],
    }),
    canonicalValues: { grouped: true, order: 'ascending', index: 1 },
    relatedApis: ['BuiltinSelectorOperationSchemas.Nth'],
  } satisfies PreviewControlContract;
};
/** 缺少语言上下文时采用中文基线 */
export const previewControlContract = createPreviewControlContract();

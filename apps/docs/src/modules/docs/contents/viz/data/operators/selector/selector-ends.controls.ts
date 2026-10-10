import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract } from '@/modules/docs/preview';

import { selectorEndsI18n } from './selector-ends.i18n';

/** 首行与末行的双语控件、真实数据视图与重置基线 */
export const createPreviewControlContract = (lang: Lang = 'zh') => {
  const i18n = selectorEndsI18n[lang];
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
              id: 'method',
              label: i18n.method,
              defaultValue: 'first',
              options: [
                { value: 'first', label: i18n.first },
                { value: 'last', label: i18n.last },
              ],
            },
            {
              kind: 'select',
              id: 'order',
              label: i18n.order,
              defaultValue: 'input',
              options: [
                { value: 'input', label: i18n.inputOrder },
                { value: 'ascending', label: i18n.ascending },
                { value: 'descending', label: i18n.descending },
              ],
            },
          ],
        },
      ],
    }),
    canonicalValues: { grouped: true, method: 'first', order: 'input' },
    relatedApis: ['BuiltinSelectorOperationSchemas.First', 'BuiltinSelectorOperationSchemas.Last'],
  } satisfies PreviewControlContract;
};
/** 缺少语言上下文时采用中文基线 */
export const previewControlContract = createPreviewControlContract();

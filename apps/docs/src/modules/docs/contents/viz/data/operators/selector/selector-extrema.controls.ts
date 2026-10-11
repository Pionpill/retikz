import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract } from '@/modules/docs/preview';

import { selectorExtremaI18n } from './selector-extrema.i18n';

/** 极值行的双语控件、真实数据视图与重置基线 */
export const createPreviewControlContract = (lang: Lang = 'zh') => {
  const i18n = selectorExtremaI18n[lang];
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
              defaultValue: 'max',
              options: [
                { value: 'min', label: i18n.min },
                { value: 'max', label: i18n.max },
              ],
            },
            {
              kind: 'select',
              id: 'tie',
              label: i18n.tie,
              defaultValue: 'first',
              options: [
                { value: 'first', label: i18n.firstTie },
                { value: 'last', label: i18n.lastTie },
                { value: 'all', label: i18n.allTie },
              ],
            },
            { kind: 'range', id: 'tail', label: i18n.tail, defaultValue: 90, min: 0, max: 150, step: 5 },
          ],
        },
      ],
    }),
    canonicalValues: { grouped: true, method: 'max', tie: 'first', tail: 90 },
    relatedApis: ['BuiltinSelectorOperationSchemas.Min', 'BuiltinSelectorOperationSchemas.Max'],
  } satisfies PreviewControlContract;
};
/** 缺少语言上下文时采用中文基线 */
export const previewControlContract = createPreviewControlContract();

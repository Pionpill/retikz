import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract } from '@/modules/docs/preview';

import { selectorRankedI18n } from './selector-ranked.i18n';

/** 最高与最低 N 行的双语控件、真实数据视图与重置基线 */
export const createPreviewControlContract = (lang: Lang = 'zh') => {
  const i18n = selectorRankedI18n[lang];
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
              defaultValue: 'top',
              options: [
                { value: 'top', label: i18n.top },
                { value: 'bottom', label: i18n.bottom },
              ],
            },
            { kind: 'range', id: 'n', label: i18n.n, defaultValue: 2, min: 1, max: 8, step: 1 },
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
          ],
        },
      ],
    }),
    canonicalValues: { grouped: true, method: 'top', n: 2, tie: 'first' },
    relatedApis: ['BuiltinSelectorOperationSchemas.Top', 'BuiltinSelectorOperationSchemas.Bottom'],
  } satisfies PreviewControlContract;
};
/** 缺少语言上下文时采用中文基线 */
export const previewControlContract = createPreviewControlContract();

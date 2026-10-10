import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract } from '@/modules/docs/preview';

import { reducerSumI18n } from './reducer-sum.i18n';

/** 求和的双语控件与重置基线 */
export const createPreviewControlContract = (lang: Lang = 'zh') => {
  const i18n = reducerSumI18n[lang];
  return {
    controls: definePreviewControls({
      presentation: 'panel',
      title: i18n.title,
      sections: [
        {
          controls: [
            { kind: 'switch', id: 'grouped', label: i18n.grouped, defaultValue: true },
            { kind: 'range', id: 'tail', label: i18n.tail, defaultValue: 90, min: 0, max: 150, step: 5 },
          ],
        },
      ],
    }),
    canonicalValues: { grouped: true, tail: 90 },
    relatedApis: ['BuiltinReducerOperationSchemas.Sum', 'IRDataSummarizeTransform.params.groupBy'],
  } satisfies PreviewControlContract;
};
/** 缺少语言上下文时采用中文基线 */
export const previewControlContract = createPreviewControlContract();

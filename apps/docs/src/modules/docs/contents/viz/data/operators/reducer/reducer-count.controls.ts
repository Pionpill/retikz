import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract } from '@/modules/docs/preview';

import { reducerCountI18n } from './reducer-count.i18n';

/** 计数的双语分组开关与重置基线 */
export const createPreviewControlContract = (lang: Lang = 'zh') => {
  const i18n = reducerCountI18n[lang];
  return {
    controls: definePreviewControls({
      presentation: 'panel',
      title: i18n.title,
      sections: [
        {
          controls: [{ kind: 'switch', id: 'grouped', label: i18n.grouped, defaultValue: true }],
        },
      ],
    }),
    canonicalValues: { grouped: true },
    relatedApis: ['BuiltinReducerOperationSchemas.Count', 'IRDataSummarizeTransform.params.groupBy'],
  } satisfies PreviewControlContract;
};
/** 缺少语言上下文时采用中文基线 */
export const previewControlContract = createPreviewControlContract();

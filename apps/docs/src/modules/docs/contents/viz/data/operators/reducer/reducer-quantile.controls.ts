import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract } from '@/modules/docs/preview';

import { reducerQuantileI18n } from './reducer-quantile.i18n';

/** 分位数的双语控件与重置基线 */
export const createPreviewControlContract = (lang: Lang = 'zh') => {
  const i18n = reducerQuantileI18n[lang];
  return {
    controls: definePreviewControls({
      presentation: 'panel',
      title: i18n.title,
      sections: [
        {
          controls: [
            { kind: 'switch', id: 'grouped', label: i18n.grouped, defaultValue: true },
            { kind: 'range', id: 'p', label: i18n.p, defaultValue: 0.5, min: 0, max: 1, step: 0.05 },
            { kind: 'range', id: 'tail', label: i18n.tail, defaultValue: 90, min: 0, max: 150, step: 5 },
          ],
        },
      ],
    }),
    canonicalValues: { grouped: true, p: 0.5, tail: 90 },
    relatedApis: ['BuiltinReducerOperationSchemas.Quantile'],
  } satisfies PreviewControlContract;
};
/** 缺少语言上下文时采用中文基线 */
export const previewControlContract = createPreviewControlContract();

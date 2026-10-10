import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract } from '@/modules/docs/preview';

import { reducerCenterI18n } from './reducer-center.i18n';

/** 均值与中位数的双语控件与重置基线 */
export const createPreviewControlContract = (lang: Lang = 'zh') => {
  const i18n = reducerCenterI18n[lang];
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
              defaultValue: 'mean',
              options: [
                { value: 'mean', label: i18n.mean },
                { value: 'median', label: i18n.median },
              ],
            },
            { kind: 'range', id: 'tail', label: i18n.tail, defaultValue: 90, min: 0, max: 150, step: 5 },
          ],
        },
      ],
    }),
    canonicalValues: { grouped: true, method: 'mean', tail: 90 },
    relatedApis: ['BuiltinReducerOperationSchemas.Mean', 'BuiltinReducerOperationSchemas.Median'],
  } satisfies PreviewControlContract;
};
/** 缺少语言上下文时采用中文基线 */
export const previewControlContract = createPreviewControlContract();

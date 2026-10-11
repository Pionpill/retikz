import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract } from '@/modules/docs/preview';

import { selectorOutsideI18n } from './selector-outside.i18n';

/** 分位区间外的行的双语控件、真实数据视图与重置基线 */
export const createPreviewControlContract = (lang: Lang = 'zh') => {
  const i18n = selectorOutsideI18n[lang];
  return {
    controls: definePreviewControls({
      presentation: 'panel',
      title: i18n.title,
      sections: [
        {
          controls: [
            { kind: 'switch', id: 'grouped', label: i18n.grouped, defaultValue: true },
            { kind: 'range', id: 'lowerP', label: i18n.lowerP, defaultValue: 0.25, min: 0, max: 0.45, step: 0.05 },
            { kind: 'range', id: 'upperP', label: i18n.upperP, defaultValue: 0.75, min: 0.55, max: 1, step: 0.05 },
            {
              kind: 'select',
              id: 'boundary',
              label: i18n.boundary,
              defaultValue: 'spread',
              options: [
                { value: 'band', label: i18n.band },
                { value: 'spread', label: i18n.spread },
              ],
            },
            {
              kind: 'range',
              id: 'factor',
              label: i18n.factor,
              defaultValue: 1.5,
              min: 0,
              max: 3,
              step: 0.25,
              visibleWhen: { controlId: 'boundary', oneOf: ['spread'] },
            },
            { kind: 'range', id: 'tail', label: i18n.tail, defaultValue: 90, min: 0, max: 150, step: 5 },
          ],
        },
      ],
    }),
    canonicalValues: { grouped: true, lowerP: 0.25, upperP: 0.75, boundary: 'spread', factor: 1.5, tail: 90 },
    relatedApis: ['OutsideQuantileBandSelectorOperationSchema'],
  } satisfies PreviewControlContract;
};
/** 缺少语言上下文时采用中文基线 */
export const previewControlContract = createPreviewControlContract();

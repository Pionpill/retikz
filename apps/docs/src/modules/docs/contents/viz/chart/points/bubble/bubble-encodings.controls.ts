import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract } from '@/modules/docs/preview';

import { gapminderBubbleData } from './bubble-basic.data';
import { bubbleEncodingsI18n } from './bubble-encodings.i18n';
/** 只提供当前映射示例的相关控件 */
export const createPreviewControlContract = (lang: Lang = 'zh') => {
  const i18n = bubbleEncodingsI18n[lang];
  return {
    controls: definePreviewControls({
      presentation: 'panel',
      title: i18n.title,
      sections: [
        {
          label: i18n.data,
          defaultCollapsed: true,
          controls: [
            {
              kind: 'table',
              id: 'rows',
              label: i18n.samples,
              rows: gapminderBubbleData,
              columns: [
                { key: 'country' },
                { key: 'continent' },
                { key: 'gdpPerCapita' },
                { key: 'lifeExpectancy' },
                { key: 'population' },
              ],
            },
          ],
        },
        {
          label: i18n.section,
          controls: [{ kind: 'switch', id: 'color', label: i18n.color, defaultValue: true }],
        },
      ],
    }),
    canonicalValues: { color: true },
    relatedApis: ['BubbleEncodings.color'],
  } satisfies PreviewControlContract;
};

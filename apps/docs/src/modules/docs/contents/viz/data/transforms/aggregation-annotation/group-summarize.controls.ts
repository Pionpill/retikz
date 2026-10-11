import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract } from '@/modules/docs/preview';

import { transformDemoI18n } from './aggregation-annotation.i18n';

/** 本节的双语控件和 Reset 基线 */
export const createPreviewControlContract = (lang: Lang = 'zh') => {
  const i18n = transformDemoI18n[lang];
  return {
    controls: definePreviewControls({
      presentation: 'panel',
      title: i18n.group_summarize,
      sections: [
        {
          controls: [
            {
              kind: 'select',
              id: 'group',
              label: i18n.group,
              defaultValue: 'team',
              options: [
                { value: 'global', label: i18n.global },
                { value: 'team', label: i18n.team },
                { value: 'item', label: i18n.item },
                { value: 'team-item', label: i18n.teamItem },
              ],
            },
            {
              kind: 'select',
              id: 'metric',
              label: i18n.metric,
              defaultValue: 'sum',
              options: [
                { value: 'sum', label: i18n.sum },
                { value: 'mean', label: i18n.mean },
                { value: 'count', label: i18n.count },
              ],
            },
          ],
        },
      ],
    }),
    canonicalValues: { group: 'team', metric: 'sum' },
    relatedApis: ['SummarizeTransformSchema'],
  } satisfies PreviewControlContract;
};
/** 注册回退使用中文基线 */
export const previewControlContract = createPreviewControlContract();

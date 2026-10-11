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
      title: i18n.group_annotate,
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
              id: 'mode',
              label: i18n.mode,
              defaultValue: 'metrics',
              options: [
                { value: 'metrics', label: i18n.metrics },
                { value: 'selector', label: i18n.selector },
              ],
            },
          ],
        },
      ],
    }),
    canonicalValues: { group: 'team', mode: 'metrics' },
    relatedApis: ['AnnotateTransformSchema'],
  } satisfies PreviewControlContract;
};
/** 注册回退使用中文基线 */
export const previewControlContract = createPreviewControlContract();

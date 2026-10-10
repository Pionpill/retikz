import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract } from '@/modules/docs/preview';

import { rowOrganizationI18n } from './row-organization.i18n';

/** 选择宿主的双语控件与重置基线 */
export const createPreviewControlContract = (lang: Lang = 'zh') => {
  const i18n = rowOrganizationI18n[lang];
  return {
    controls: definePreviewControls({
      presentation: 'panel',
      title: i18n.selectTitle,
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
                { value: 'team', label: 'team' },
                { value: 'item', label: 'item' },
                { value: 'team-item', label: 'team + item' },
              ],
            },
            { kind: 'switch', id: 'ranked', label: i18n.ranked, defaultValue: true },
          ],
        },
      ],
    }),
    canonicalValues: { group: 'team', ranked: true },
    relatedApis: ['SelectTransformSchema'],
  } satisfies PreviewControlContract;
};
/** 缺少语言上下文时采用中文基线 */
export const previewControlContract = createPreviewControlContract();

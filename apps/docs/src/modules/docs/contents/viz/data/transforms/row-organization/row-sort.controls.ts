import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract } from '@/modules/docs/preview';

import { rowOrganizationI18n } from './row-organization.i18n';

/** 单字段排序的双语控件与重置基线 */
export const createPreviewControlContract = (lang: Lang = 'zh') => {
  const i18n = rowOrganizationI18n[lang];
  return {
    controls: definePreviewControls({
      presentation: 'panel',
      title: i18n.sortTitle,
      sections: [
        {
          controls: [
            {
              kind: 'select',
              id: 'group',
              label: i18n.group,
              defaultValue: 'global',
              options: [
                { value: 'global', label: i18n.global },
                { value: 'team', label: 'team' },
                { value: 'item', label: 'item' },
                { value: 'team-item', label: 'team + item' },
              ],
            },
            {
              kind: 'select',
              id: 'field',
              label: i18n.field,
              defaultValue: 'value',
              options: ['value', 'team', 'item'].map(field => ({ value: field, label: field })),
            },
            {
              kind: 'select',
              id: 'order',
              label: i18n.order,
              defaultValue: 'ascending',
              options: [
                { value: 'ascending', label: i18n.ascending },
                { value: 'descending', label: i18n.descending },
              ],
            },
          ],
        },
      ],
    }),
    canonicalValues: { field: 'value', order: 'ascending', group: 'global' },
    relatedApis: ['SortTransformSchema'],
  } satisfies PreviewControlContract;
};
/** 缺少语言上下文时采用中文基线 */
export const previewControlContract = createPreviewControlContract();

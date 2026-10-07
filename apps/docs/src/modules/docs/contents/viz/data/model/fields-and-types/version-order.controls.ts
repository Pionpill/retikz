import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract } from '@/modules/docs/preview';

import { versionRows } from './version-order.data';
import { versionOrderI18n } from './version-order.i18n';

/** 比较不同顺序，固定原始行与绘图配置 */
export const createPreviewControlContract = (lang: Lang = 'zh', defaultOrder = 'naturalAscending') => {
  const i18n = versionOrderI18n[lang];
  return {
    controls: definePreviewControls({
      presentation: 'panel',
      title: i18n.title,
      sections: [
        { label: i18n.data, controls: [{ kind: 'table', id: 'rows', label: i18n.data, rows: versionRows }] },
        {
          label: i18n.order,
          controls: [
            {
              kind: 'select',
              id: 'order',
              label: i18n.order,
              defaultValue: defaultOrder,
              options: [
                { value: 'appearance', label: i18n.appearance },
                { value: 'ascending', label: i18n.ascending },
                { value: 'descending', label: i18n.descending },
                { value: 'naturalAscending', label: i18n.naturalAscending },
                { value: 'naturalDescending', label: i18n.naturalDescending },
                { value: 'labelLength', label: i18n.length },
              ],
            },
          ],
        },
      ],
    }),
    canonicalValues: { order: defaultOrder },
    relatedApis: ['IRDataFieldDefinition.order'],
  } satisfies PreviewControlContract;
};
/** 无语言上下文时的控件基线 */
export const previewControlContract = createPreviewControlContract();

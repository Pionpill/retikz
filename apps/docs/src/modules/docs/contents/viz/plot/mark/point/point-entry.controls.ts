import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { rows } from './point-entry.data';
import { pointEntryI18n } from './point-entry.i18n';

/** 展示接入示例实际使用的观测记录 */
export const createPreviewControlContract = (lang: Lang = 'zh') => {
  const i18n = pointEntryI18n[lang];
  return {
    controls: definePreviewControls({
      presentation: 'panel',
      title: i18n.data,
      sections: [{ controls: [{ kind: 'table', id: 'rows', label: i18n.rows, rows }] }],
    }),
    canonicalValues: {},
    relatedApis: ['Plot.data'],
  } satisfies PreviewControlContract;
};

/** 默认中文预览契约 */
export const previewControlContract = createPreviewControlContract();

import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { relationStatusI18n } from './relation-status.i18n';

/** 创建仅控制 Relation 语义状态的双语契约 */
export const createPreviewControlContract = (lang: Lang) => {
  const copy = relationStatusI18n[lang];
  return {
    controls: definePreviewControls({
      presentation: 'panel',
      title: copy.title,
      sections: [
        {
          controls: [{ kind: 'select', id: 'status', label: copy.status, defaultValue: '', options: copy.options }],
        },
      ],
    }),
    canonicalValues: { status: '' },
    relatedApis: ['Relation.status'],
  } satisfies PreviewControlContract;
};

export const previewControlContract = createPreviewControlContract('zh');

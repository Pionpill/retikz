import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { entityDefinitionI18n } from './entity-definition.i18n';
/** 可用性输入的双语控件 */
export const createPreviewControlContract = (lang: Lang) => {
  const copy = entityDefinitionI18n[lang];
  const controls = definePreviewControls({
    presentation: 'panel',
    title: copy.title,
    sections: [
      {
        label: copy.title,
        controls: [
          {
            kind: 'select',
            id: 'status',
            label: copy.status,
            defaultValue: 'available',
            options: ['available', 'degraded', 'offline'].map((value, index) => ({
              value,
              label: copy.statuses[index],
            })),
          },
          { kind: 'switch', id: 'critical', label: copy.critical, defaultValue: false },
        ],
      },
    ],
  });
  return {
    controls,
    canonicalValues: { status: 'available', critical: false },
    relatedApis: ['Entity.predicate', 'Graph.graphRules'],
  } satisfies PreviewControlContract;
};
export const previewControlContract = createPreviewControlContract('zh');

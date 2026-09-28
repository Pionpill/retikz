import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract } from '@/modules/docs/preview';

import { semanticRolesI18n } from './semantic-roles.i18n';

/** 在固定位置上比较语义角色与纯外观覆盖 */
export const createPreviewControlContract = (lang: Lang) => {
  const t = semanticRolesI18n[lang];
  const controls = definePreviewControls({
    presentation: 'panel',
    title: t.title,
    sections: [
      {
        label: t.title,
        controls: [
          {
            kind: 'select',
            id: 'entityRole',
            label: t.entity,
            defaultValue: 'activity',
            options: ['activity', 'gateway', 'event'].map(value => ({ value, label: value })),
          },
          {
            kind: 'select',
            id: 'relationRole',
            label: t.relation,
            defaultValue: 'flow',
            options: ['flow', 'dependency', 'generalization'].map(value => ({ value, label: value })),
          },
          { kind: 'switch', id: 'emphasis', label: t.emphasis, defaultValue: false },
        ],
      },
    ],
  });
  return {
    controls,
    canonicalValues: { entityRole: 'activity', relationRole: 'flow', emphasis: false },
    relatedApis: ['Entity.role', 'Relation.role', 'Entity.style.strokeWidth'],
  } satisfies PreviewControlContract;
};
export const previewControlContract = createPreviewControlContract('zh');

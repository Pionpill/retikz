import { EntityRole, GraphStatus } from '@retikz/graph';

import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract } from '@/modules/docs/preview';

import { entityPlaygroundI18n } from './entity-playground.i18n';
/** 同一组语义值按页面语言显示 */
export const createPreviewControlContract = (lang: Lang) => {
  const copy = entityPlaygroundI18n[lang];
  const controls = definePreviewControls({
    presentation: 'panel',
    title: copy.title,
    sections: [
      {
        label: copy.title,
        controls: [
          {
            kind: 'select',
            id: 'role',
            label: copy.role,
            defaultValue: 'activity',
            options: Object.values(EntityRole).map((value, index) => ({ value, label: copy.roles[index] })),
          },
          {
            kind: 'select',
            id: 'status',
            label: copy.status,
            defaultValue: '',
            options: ['', ...Object.values(GraphStatus)].map((value, index) => ({
              value,
              label: copy.statuses[index],
            })),
          },
          { kind: 'switch', id: 'group', label: copy.group, defaultValue: false },
          { kind: 'switch', id: 'override', label: copy.override, defaultValue: false },
          {
            kind: 'color',
            id: 'color',
            label: copy.color,
            defaultValue: '#2563eb',
            visibleWhen: { controlId: 'override', oneOf: [true] },
          },
        ],
      },
    ],
  });
  return {
    controls,
    canonicalValues: { role: 'activity', status: '', group: false, override: false, color: '#2563eb' },
    relatedApis: ['Entity.role', 'Entity.status', 'Entity.group', 'Entity.style.color'],
  } satisfies PreviewControlContract;
};
export const previewControlContract = createPreviewControlContract('zh');

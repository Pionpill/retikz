import type { Lang } from '@/i18n';

import { relationFlowI18n } from './relation-flow.i18n';
import { defineRelationRoleControlContract } from './relation-role-controls';

export const createPreviewControlContract = (lang: Lang) => {
  const copy = relationFlowI18n[lang];
  return defineRelationRoleControlContract({
    title: copy.controls[0],
    sectionLabel: copy.controls[1],
    statusLocale: lang,
    direction: {
      label: copy.controls[2],
      defaultValue: 'forward',
      options: [
        { value: 'forward', label: 'source → target' },
        { value: 'reverse', label: 'target → source' },
        { value: 'both', label: copy.controls[3] },
      ],
    },
    colorLabel: copy.controls[4],
  });
};

export const previewControlContract = createPreviewControlContract('zh');

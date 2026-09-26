import type { Lang } from '@/i18n';

import { relationGeneralizationI18n } from './relation-generalization.i18n';
import { defineRelationRoleControlContract } from './relation-role-controls';

export const createPreviewControlContract = (lang: Lang) => {
  const copy = relationGeneralizationI18n[lang];
  return defineRelationRoleControlContract({
    title: copy.controls[0],
    sectionLabel: copy.controls[1],
    statusLocale: lang,
    kind: {
      label: copy.controls[2],
      defaultValue: '',
      options: [
        { value: '', label: copy.controls[3] },
        { value: 'uml.generalization', label: copy.controls[4] },
      ],
    },
    colorLabel: copy.controls[5],
  });
};
export const previewControlContract = createPreviewControlContract('zh');

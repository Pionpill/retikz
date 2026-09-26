import type { Lang } from '@/i18n';

import { relationDependencyI18n } from './relation-dependency.i18n';
import { defineRelationRoleControlContract } from './relation-role-controls';

export const createPreviewControlContract = (lang: Lang) => {
  const copy = relationDependencyI18n[lang];
  return defineRelationRoleControlContract({
    title: copy.controls[0],
    sectionLabel: copy.controls[1],
    statusLocale: lang,
    kind: {
      label: copy.controls[2],
      defaultValue: '',
      options: [
        { value: '', label: copy.controls[3] },
        { value: 'uml.dependency', label: copy.controls[4] },
        { value: 'uml.realization', label: copy.controls[5] },
      ],
    },
    colorLabel: copy.controls[6],
  });
};
export const previewControlContract = createPreviewControlContract('zh');

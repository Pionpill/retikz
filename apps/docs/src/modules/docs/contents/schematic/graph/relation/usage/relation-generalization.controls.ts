import type { Lang } from '@/i18n';

import { relationGeneralizationI18n } from './relation-generalization.i18n';
import { defineRelationRoleControlContract } from './relation-role-controls';

export const createPreviewControlContract = (lang: Lang) => {
  const copy = relationGeneralizationI18n[lang];
  return defineRelationRoleControlContract({
    title: copy.controls[0],
    sectionLabel: copy.controls[1],
    statusLocale: lang,
    colorLabel: copy.controls[2],
  });
};

export const previewControlContract = createPreviewControlContract('zh');

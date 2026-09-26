import type { Lang } from '@/i18n';

import { relationAssociationI18n } from './relation-association.i18n';
import { defineRelationRoleControlContract } from './relation-role-controls';

export const createPreviewControlContract = (lang: Lang) => {
  const copy = relationAssociationI18n[lang];
  return defineRelationRoleControlContract({
    title: copy.controls[0],
    sectionLabel: copy.controls[1],
    statusLocale: lang,
    kind: {
      label: copy.controls[2],
      defaultValue: '',
      options: [
        { value: '', label: copy.controls[3] },
        { value: 'uml.association', label: copy.controls[4] },
        { value: 'uml.aggregation', label: copy.controls[5] },
        { value: 'uml.composition', label: copy.controls[6] },
      ],
    },
    direction: {
      label: copy.controls[7],
      defaultValue: 'forward',
      visibleWithKinds: [''],
      options: [
        { value: 'none', label: copy.controls[8] },
        { value: 'forward', label: 'source → target' },
        { value: 'reverse', label: 'target → source' },
        { value: 'both', label: copy.controls[9] },
      ],
    },
    colorLabel: copy.controls[10],
  });
};
export const previewControlContract = createPreviewControlContract('zh');

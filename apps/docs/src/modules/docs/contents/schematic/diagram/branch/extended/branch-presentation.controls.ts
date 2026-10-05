import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract } from '@/modules/docs/preview';

import { branchPresentationI18n } from './branch-presentation.i18n';
/** 同步语言无关的字段与默认状态 */
export const createPreviewControlContract = (lang: Lang = 'zh') => {
  const t = branchPresentationI18n[lang];
  return {
    controls: definePreviewControls({
      presentation: 'panel',
      title: t.labels[0],
      sections: [
        {
          controls: [
            { kind: 'switch', id: 'title', label: t.labels[1], defaultValue: true },
            { kind: 'switch', id: 'description', label: t.labels[2], defaultValue: true },
            { kind: 'switch', id: 'legend', label: t.labels[3], defaultValue: true },
          ],
        },
      ],
    }),
    canonicalValues: { title: true, description: true, legend: true },
    relatedApis: [
      'BranchDiagram.presentation.title',
      'BranchDiagram.presentation.description',
      'BranchDiagram.presentation.legend',
    ],
  } satisfies PreviewControlContract;
};
export const previewControlContract = createPreviewControlContract();
export const previewControls = previewControlContract.controls;

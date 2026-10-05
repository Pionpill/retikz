import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract } from '@/modules/docs/preview';

import { branchNodesI18n } from './branch-nodes.i18n';

/** 同步语言无关的字段与默认状态 */
export const createPreviewControlContract = (lang: Lang = 'zh') => {
  const t = branchNodesI18n[lang];
  return {
    controls: definePreviewControls({
      presentation: 'panel',
      title: t.labels[0],
      sections: [
        {
          controls: [
            { kind: 'range', id: 'size', label: t.labels[1], defaultValue: 10, min: 4, max: 24, step: 2 },
            { kind: 'switch', id: 'labels', label: t.labels[2], defaultValue: true },
            {
              kind: 'select',
              id: 'main',
              label: t.labels[3],
              defaultValue: 'main',
              options: [
                { value: 'main', label: 'A → C' },
                { value: 'side', label: 'A → B → C' },
              ],
            },
          ],
        },
      ],
    }),
    canonicalValues: { size: 10, labels: true, main: 'main' },
    relatedApis: ['BranchNode.layout.minimumSize', 'BranchNode.labels', 'BranchDiagram.mainBranch'],
  } satisfies PreviewControlContract;
};

export const previewControlContract = createPreviewControlContract();

export const previewControls = previewControlContract.controls;

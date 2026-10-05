import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract } from '@/modules/docs/preview';

import { branchLayoutI18n } from './branch-layout.i18n';
/** 同步语言无关的字段与默认状态 */
export const createPreviewControlContract = (lang: Lang = 'zh') => {
  const t = branchLayoutI18n[lang];
  return {
    controls: definePreviewControls({
      presentation: 'panel',
      title: t.labels[0],
      sections: [
        {
          controls: [
            {
              kind: 'select',
              id: 'direction',
              label: t.labels[1],
              defaultValue: 'right',
              options: t.directions.map((label, i) => ({ value: ['right', 'left', 'down', 'up'][i], label })),
            },
            { kind: 'range', id: 'nodeGap', label: t.labels[2], defaultValue: 48, min: 0, max: 80, step: 8 },
            { kind: 'range', id: 'laneGap', label: t.labels[3], defaultValue: 48, min: 0, max: 80, step: 8 },
            {
              kind: 'select',
              id: 'color',
              label: t.labels[4],
              defaultValue: '#4f7cac',
              options: [
                { value: '#4f7cac', label: t.colors[0] },
                { value: '#c76b34', label: t.colors[1] },
              ],
            },
          ],
        },
      ],
    }),
    canonicalValues: { direction: 'right', nodeGap: 48, laneGap: 48, color: '#4f7cac' },
    relatedApis: [
      'BranchDiagram.layout.direction',
      'BranchDiagram.layout.nodeGap',
      'BranchDiagram.layout.laneGap',
      'Branch.style',
    ],
  } satisfies PreviewControlContract;
};
export const previewControlContract = createPreviewControlContract();
export const previewControls = previewControlContract.controls;

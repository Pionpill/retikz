import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract } from '@/modules/docs/preview';

import { flowOrthogonalI18n } from './flow-orthogonal.i18n';

/** 移动障碍以比较自动与显式折点 */
export const createPreviewControlContract = (lang: Lang = 'zh') => {
  const copy = flowOrthogonalI18n[lang];
  const controls = definePreviewControls({
    presentation: 'panel',
    title: copy.title,
    sections: [
      {
        controls: [
          { kind: 'range', id: 'obstacleX', label: copy.obstacleX, defaultValue: 260, min: 180, max: 340, step: 10 },
          { kind: 'range', id: 'obstacleY', label: copy.obstacleY, defaultValue: 80, min: -20, max: 180, step: 10 },
        ],
      },
      {
        controls: [
          { kind: 'select', id: 'turnPosition', label: copy.position, defaultValue: 'auto', options: copy.positions },
        ],
      },
    ],
  });

  return {
    controls,
    canonicalValues: { turnPosition: 'auto' as const, obstacleX: 260, obstacleY: 80 },
    relatedApis: ['FlowRelation.routing.turnPosition', 'routeFlowRelations'],
  } satisfies PreviewControlContract;
};

export const previewControlContract = createPreviewControlContract();

export const previewControls = previewControlContract.controls;

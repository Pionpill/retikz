import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { flowBendI18n } from './flow-bend.i18n';

/** 调整固定节点之间的曲线与完整标签 */
export const createPreviewControlContract = (lang: Lang = 'zh') => {
  const copy = flowBendI18n[lang];
  const controls = definePreviewControls({
    presentation: 'panel',
    title: copy.title,
    sections: [
      {
        controls: [
          { kind: 'range', id: 'obstacleX', label: copy.obstacleX, defaultValue: 260, min: 180, max: 340, step: 10 },
          { kind: 'range', id: 'obstacleY', label: copy.obstacleY, defaultValue: 100, min: -20, max: 180, step: 10 },
        ],
      },
      {
        label: copy.route,
        controls: [
          { kind: 'switch', id: 'autoAngle', label: copy.autoAngle, defaultValue: true },
          {
            kind: 'range',
            id: 'angle',
            label: copy.angle,
            defaultValue: 60,
            min: 0,
            max: 90,
            step: 15,
            visibleWhen: { controlId: 'autoAngle', oneOf: [false] },
          },
        ],
      },
      {
        label: copy.label,
        controls: [
          { kind: 'range', id: 'position', label: copy.position, defaultValue: 0.5, min: 0, max: 1, step: 0.1 },
          { kind: 'switch', id: 'sloped', label: copy.sloped, defaultValue: true },
          { kind: 'switch', id: 'interrupt', label: copy.interrupt, defaultValue: true },
        ],
      },
    ],
  });

  return {
    controls,
    canonicalValues: {
      obstacleX: 260,
      obstacleY: 100,
      autoAngle: true,
      angle: 60,
      position: 0.5,
      sloped: true,
      interrupt: true,
    },
    relatedApis: ['FlowRelation.routing.bendAngle', 'FlowRelation.label'],
  } satisfies PreviewControlContract;
};

export const previewControlContract = createPreviewControlContract();

export const previewControls = previewControlContract.controls;

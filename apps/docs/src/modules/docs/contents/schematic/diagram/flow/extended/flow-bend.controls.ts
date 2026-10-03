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
          {
            kind: 'range',
            id: 'gap',
            label: copy.gap,
            defaultValue: 4,
            min: 0,
            max: 12,
            step: 2,
            visibleWhen: { controlId: 'interrupt', oneOf: [true] },
          },
          {
            kind: 'range',
            id: 'distance',
            label: copy.distance,
            defaultValue: 4,
            min: 0,
            max: 20,
            step: 2,
            visibleWhen: { controlId: 'sloped', oneOf: [false] },
          },
          { kind: 'range', id: 'fontSize', label: copy.size, defaultValue: 14, min: 10, max: 20, step: 2 },
        ],
      },
    ],
  });
  return {
    controls,
    canonicalValues: {
      autoAngle: true,
      angle: 60,
      position: 0.5,
      sloped: true,
      interrupt: true,
      gap: 4,
      distance: 4,
      fontSize: 14,
    },
    relatedApis: ['FlowRelation.routing.bendAngle', 'FlowRelation.label'],
  } satisfies PreviewControlContract;
};
export const previewControlContract = createPreviewControlContract();
export const previewControls = previewControlContract.controls;

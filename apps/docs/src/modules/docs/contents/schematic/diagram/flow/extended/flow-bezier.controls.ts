import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract } from '@/modules/docs/preview';

import { flowBezierI18n } from './flow-bezier.i18n';

/** 单条关系的自动生成与显式控制点 */
export const createPreviewControlContract = (lang: Lang = 'zh') => {
  const copy = flowBezierI18n[lang];
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
        controls: [
          { kind: 'select', id: 'kind', label: copy.kind, defaultValue: 'cubic', options: copy.options },
          { kind: 'switch', id: 'automatic', label: copy.automatic, defaultValue: true },
          {
            kind: 'range',
            id: 'x1',
            label: copy.x1,
            defaultValue: 90,
            min: 20,
            max: 300,
            step: 10,
            visibleWhen: { controlId: 'automatic', oneOf: [false] },
          },
          {
            kind: 'range',
            id: 'y1',
            label: copy.y1,
            defaultValue: -100,
            min: -160,
            max: 100,
            step: 20,
            visibleWhen: { controlId: 'automatic', oneOf: [false] },
          },
        ],
      },
      {
        visibleWhen: { controlId: 'automatic', oneOf: [false] },
        controls: [
          {
            kind: 'range',
            id: 'x2',
            label: copy.x2,
            defaultValue: 250,
            min: 20,
            max: 300,
            step: 10,
            visibleWhen: { controlId: 'kind', oneOf: ['cubic'] },
          },
          {
            kind: 'range',
            id: 'y2',
            label: copy.y2,
            defaultValue: -100,
            min: -160,
            max: 100,
            step: 20,
            visibleWhen: { controlId: 'kind', oneOf: ['cubic'] },
          },
        ],
      },
    ],
  });

  return {
    controls,
    canonicalValues: {
      obstacleX: 260,
      obstacleY: 100,
      kind: 'cubic' as const,
      automatic: true,
      x1: 90,
      y1: -100,
      x2: 250,
      y2: -100,
    },
    relatedApis: [
      'FlowRelation.routing.kind',
      'FlowRelation.routing.control',
      'FlowRelation.routing.control1',
      'FlowRelation.routing.control2',
    ],
  } satisfies PreviewControlContract;
};

export const previewControlContract = createPreviewControlContract();

export const previewControls = previewControlContract.controls;

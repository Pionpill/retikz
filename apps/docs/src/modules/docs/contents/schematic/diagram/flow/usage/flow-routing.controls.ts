import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { flowRoutingI18n } from './flow-routing.i18n';

/** 当前语言的连线路由面板 */
export const createPreviewControlContract = (lang: Lang = 'zh') => {
  const copy = flowRoutingI18n[lang];
  const controls = definePreviewControls({
    presentation: 'panel',
    title: copy.title,
    sections: [
      {
        label: copy.section,
        controls: [
          { kind: 'select', id: 'kind', label: copy.kind, defaultValue: 'bend', options: copy.kindOptions },
          {
            kind: 'select',
            id: 'turnPosition',
            label: copy.turnPosition,
            defaultValue: 'auto',
            options: copy.turnOptions,
            visibleWhen: { controlId: 'kind', oneOf: ['orthogonal'] },
          },
          {
            kind: 'range',
            id: 'cornerRadius',
            label: copy.radius,
            defaultValue: 0,
            min: 0,
            max: 24,
            step: 4,
            visibleWhen: { controlId: 'kind', oneOf: ['orthogonal', '-|', '|-'] },
          },
        ],
      },
      {
        label: copy.bend,
        visibleWhen: { controlId: 'kind', oneOf: ['bend'] },
        controls: [
          {
            kind: 'select',
            id: 'configuration',
            label: copy.configuration,
            defaultValue: 'auto',
            options: copy.configurationOptions,
          },
          {
            kind: 'select',
            id: 'side',
            label: copy.side,
            defaultValue: 'auto',
            options: copy.sideOptions,
            visibleWhen: { controlId: 'configuration', oneOf: ['auto', 'symmetric'] },
          },
          {
            kind: 'range',
            id: 'angle',
            label: copy.angle,
            defaultValue: 30,
            min: -90,
            max: 90,
            step: 15,
            visibleWhen: { controlId: 'configuration', oneOf: ['symmetric'] },
          },
          {
            kind: 'range',
            id: 'outAngle',
            label: copy.outAngle,
            defaultValue: 0,
            min: -180,
            max: 180,
            step: 15,
            visibleWhen: { controlId: 'configuration', oneOf: ['tangent'] },
          },
          {
            kind: 'range',
            id: 'inAngle',
            label: copy.inAngle,
            defaultValue: 180,
            min: -180,
            max: 180,
            step: 15,
            visibleWhen: { controlId: 'configuration', oneOf: ['tangent'] },
          },
          {
            kind: 'range',
            id: 'looseness',
            label: copy.looseness,
            defaultValue: 1,
            min: 0.25,
            max: 2,
            step: 0.25,
            visibleWhen: { controlId: 'configuration', oneOf: ['tangent'] },
          },
        ],
      },
      {
        label: copy.bezier,
        visibleWhen: { controlId: 'kind', oneOf: ['curve', 'cubic'] },
        controls: [
          { kind: 'switch', id: 'automatic', label: copy.automatic, defaultValue: true },
          {
            kind: 'range',
            id: 'controlHeight',
            label: copy.controlHeight,
            defaultValue: 60,
            min: 0,
            max: 100,
            step: 10,
            visibleWhen: { controlId: 'automatic', oneOf: [false] },
          },
        ],
      },
      {
        label: copy.smooth,
        visibleWhen: { controlId: 'kind', oneOf: ['smooth'] },
        controls: [
          { kind: 'range', id: 'height', label: copy.height, defaultValue: 60, min: 0, max: 100, step: 10 },
          { kind: 'range', id: 'tension', label: copy.tension, defaultValue: 1, min: 0.2, max: 2, step: 0.2 },
        ],
      },
    ],
  });
  return {
    controls,
    canonicalValues: {
      kind: 'bend',
      turnPosition: 'auto',
      automatic: true,
      controlHeight: 60,
      height: 60,
      tension: 1,
      cornerRadius: 0,
      configuration: 'auto',
      side: 'auto',
      angle: 30,
      outAngle: 0,
      inAngle: 180,
      looseness: 1,
    } as const,
    relatedApis: [
      'FlowRelation.routing.kind',
      'FlowRelation.routing.turnPosition',
      'FlowRelation.routing.control',
      'FlowRelation.routing.control1',
      'FlowRelation.routing.control2',
      'FlowRelation.routing.points',
      'FlowRelation.routing.tension',
      'FlowRelation.routing.cornerRadius',
      'FlowRelation.routing.bendDirection',
      'FlowRelation.routing.bendAngle',
      'FlowRelation.routing.outAngle',
      'FlowRelation.routing.inAngle',
      'FlowRelation.routing.looseness',
    ],
  } satisfies PreviewControlContract;
};

export const previewControlContract = createPreviewControlContract();
export const previewControls = previewControlContract.controls;

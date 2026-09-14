import type { Lang } from '@/i18n';
import { buildPreviewControlDefaults, definePreviewControls } from '@/modules/docs/preview';

import { inspectNodeGeometryI18n } from './inspect-node-geometry.i18n';

/** Build localized controls from one dictionary. */
export const createPreviewControlContract = (lang: Lang) => {
  const i18n = inspectNodeGeometryI18n[lang];
  const controls = definePreviewControls({
    presentation: 'panel',
    title: i18n.title,
    sections: [
      {
        label: i18n.shape,
        controls: [
          {
            id: 'position',
            kind: 'point',
            defaultValue: [0, 0],
            min: [-30, -30],
            max: [30, 30],
            step: 1,
            label: i18n.position,
          },
          { id: 'width', kind: 'range', defaultValue: 116, min: 90, max: 145, step: 1, label: i18n.width },
          { id: 'height', kind: 'range', defaultValue: 68, min: 50, max: 90, step: 1, label: i18n.height },
          { id: 'rotate', kind: 'range', defaultValue: 28, min: -180, max: 180, step: 1, label: i18n.rotate },
          { id: 'scaleX', kind: 'range', defaultValue: 1.25, min: 0.5, max: 1.3, step: 0.05, label: i18n.scaleX },
          { id: 'scaleY', kind: 'range', defaultValue: 0.8, min: 0.5, max: 1.3, step: 0.05, label: i18n.scaleY },
        ],
      },
      {
        label: i18n.inspect,
        controls: [
          { id: 'outline', kind: 'switch', defaultValue: true, label: i18n.outline },
          { id: 'boundary', kind: 'switch', defaultValue: true, label: i18n.boundary },
          { id: 'box', kind: 'switch', defaultValue: true, label: i18n.box },
          { id: 'bounds', kind: 'switch', defaultValue: true, label: i18n.bounds },
          { id: 'content', kind: 'switch', defaultValue: true, label: i18n.content },
          { id: 'baselines', kind: 'switch', defaultValue: true, label: i18n.baselines },
          { id: 'keyPoints', kind: 'switch', defaultValue: true, label: i18n.keyPoints },
          { id: 'labels', kind: 'switch', defaultValue: false, label: i18n.labels },
        ],
      },
    ],
  });
  return {
    controls,
    canonicalValues: buildPreviewControlDefaults(controls),
    relatedApis: ['Node.position', 'Node.rotate', 'Node.scale', 'Node.layout', 'NodeInspectOptionsSchema'],
  };
};

/** Stable baseline and registry fallback. */
export const previewControlContract = createPreviewControlContract('zh');
export const previewControls = previewControlContract.controls;

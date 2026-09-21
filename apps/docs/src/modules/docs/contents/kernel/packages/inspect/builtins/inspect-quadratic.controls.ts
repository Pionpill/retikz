import type { Lang } from '@/i18n';
import { buildPreviewControlDefaults, definePreviewControls } from '@/modules/docs/preview';

import { inspectQuadraticI18n } from './inspect-quadratic.i18n';

/** Build localized controls from one dictionary. */
export const createPreviewControlContract = (lang: Lang) => {
  const i18n = inspectQuadraticI18n[lang];
  const controls = definePreviewControls({
    presentation: 'panel',
    defaultSize: 50,
    title: i18n.title,
    sections: [
      {
        label: i18n.shape,
        controls: [
          {
            id: 'position',
            kind: 'point',
            defaultValue: [0, 0],
            min: [-40, -40],
            max: [40, 40],
            step: 1,
            label: i18n.position,
          },
          {
            id: 'start',
            kind: 'point',
            defaultValue: [-90, 35],
            min: [-110, -90],
            max: [-50, 90],
            step: 1,
            label: i18n.start,
          },
          {
            id: 'control',
            kind: 'point',
            defaultValue: [0, -80],
            min: [-100, -100],
            max: [100, 100],
            step: 1,
            label: i18n.control,
          },
          {
            id: 'end',
            kind: 'point',
            defaultValue: [90, 35],
            min: [50, -90],
            max: [110, 90],
            step: 1,
            label: i18n.end,
          },
        ],
      },
      {
        label: i18n.inspect,
        controls: [
          { id: 'controlPoints', kind: 'switch', defaultValue: true, label: i18n.controlPoints },
          { id: 'vertices', kind: 'switch', defaultValue: false, label: i18n.vertices },
          { id: 'labels', kind: 'switch', defaultValue: true, label: i18n.labels },
        ],
      },
    ],
  });
  return {
    controls,
    canonicalValues: buildPreviewControlDefaults(controls),
    relatedApis: ['Scope.transforms', 'Step', 'PathInspectOptionsSchema'],
  };
};

/** Stable baseline and registry fallback. */
export const previewControlContract = createPreviewControlContract('zh');
export const previewControls = previewControlContract.controls;

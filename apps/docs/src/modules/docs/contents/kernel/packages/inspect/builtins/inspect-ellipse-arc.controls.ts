import type { Lang } from '@/i18n';
import { buildPreviewControlDefaults, definePreviewControls } from '@/modules/docs/preview';

import { inspectEllipseArcI18n } from './inspect-ellipse-arc.i18n';

/** Build localized controls from one dictionary. */
export const createPreviewControlContract = (lang: Lang) => {
  const i18n = inspectEllipseArcI18n[lang];
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
          { id: 'radiusX', kind: 'range', defaultValue: 100, min: 20, max: 110, step: 1, label: i18n.radiusX },
          { id: 'radiusY', kind: 'range', defaultValue: 60, min: 20, max: 110, step: 1, label: i18n.radiusY },
          { id: 'startAngle', kind: 'range', defaultValue: 200, min: 0, max: 360, step: 1, label: i18n.startAngle },
          { id: 'endAngle', kind: 'range', defaultValue: 340, min: 0, max: 360, step: 1, label: i18n.endAngle },
        ],
      },
      {
        label: i18n.inspect,
        controls: [
          { id: 'arcGeometry', kind: 'switch', defaultValue: true, label: i18n.arcGeometry },
          { id: 'ellipseAxes', kind: 'switch', defaultValue: false, label: i18n.ellipseAxes },
          { id: 'vertices', kind: 'switch', defaultValue: false, label: i18n.vertices },
          { id: 'labels', kind: 'switch', defaultValue: true, label: i18n.labels },
        ],
      },
    ],
  });
  return {
    controls,
    canonicalValues: buildPreviewControlDefaults(controls),
    relatedApis: ['Step', 'PathInspectOptionsSchema'],
  };
};

/** Stable baseline and registry fallback. */
export const previewControlContract = createPreviewControlContract('zh');
export const previewControls = previewControlContract.controls;

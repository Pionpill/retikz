import type { Lang } from '@/i18n';
import { buildPreviewControlDefaults, definePreviewControls } from '@/modules/docs/preview';

import { inspectCoordinateI18n } from './inspect-coordinate.i18n';

/** Build localized controls from one dictionary. */
export const createPreviewControlContract = (lang: Lang) => {
  const i18n = inspectCoordinateI18n[lang];
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
            min: [-50, -50],
            max: [50, 50],
            step: 1,
            label: i18n.position,
          },
        ],
      },
      {
        label: i18n.inspect,
        controls: [
          { id: 'enabled', kind: 'switch', defaultValue: true, label: i18n.enabled },
          {
            id: 'labels',
            kind: 'switch',
            defaultValue: true,
            label: i18n.labels,
            visibleWhen: { controlId: 'enabled', oneOf: [true] },
          },
        ],
      },
    ],
  });
  return {
    controls,
    canonicalValues: buildPreviewControlDefaults(controls),
    relatedApis: ['Coordinate.position', 'InspectCoordinate.request', 'CoordinateInspectOptionsSchema'],
  };
};

/** Stable baseline and registry fallback. */
export const previewControlContract = createPreviewControlContract('zh');
export const previewControls = previewControlContract.controls;

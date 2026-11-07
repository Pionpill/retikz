import type { Lang } from '@/i18n';
import { buildPreviewControlDefaults, definePreviewControls } from '@/modules/docs/preview';

import { inspectGroupI18n } from './inspect-group.i18n';

/** Build localized controls from one dictionary. */
export const createPreviewControlContract = (lang: Lang) => {
  const i18n = inspectGroupI18n[lang];
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
            min: [-25, -25],
            max: [25, 25],
            step: 1,
            label: i18n.position,
          },
          { id: 'rotate', kind: 'range', defaultValue: 24, min: -180, max: 180, step: 1, label: i18n.rotate },
          { id: 'width', kind: 'range', defaultValue: 100, min: 60, max: 130, step: 1, label: i18n.width },
          { id: 'height', kind: 'range', defaultValue: 60, min: 40, max: 80, step: 1, label: i18n.height },
        ],
      },
      {
        label: i18n.inspect,
        controls: [
          { id: 'origin', kind: 'switch', defaultValue: true, label: i18n.origin },
          { id: 'axes', kind: 'switch', defaultValue: true, label: i18n.axes },
          { id: 'labels', kind: 'switch', defaultValue: true, label: i18n.labels },
        ],
      },
    ],
  });

  return {
    controls,
    canonicalValues: buildPreviewControlDefaults(controls),
    relatedApis: ['Scope.transforms', 'Node.layout', 'GroupInspectOptionsSchema'],
  };
};

/** Stable baseline and registry fallback. */
export const previewControlContract = createPreviewControlContract('zh');

export const previewControls = previewControlContract.controls;

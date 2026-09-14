import type { Lang } from '@/i18n';

import { buildPreviewControlDefaults, definePreviewControls } from '@/modules/docs/preview';

import { inspectClipI18n } from './inspect-clip.i18n';

/** Build localized controls from one dictionary. */
export const createPreviewControlContract = (lang: Lang) => {
  const i18n = inspectClipI18n[lang];
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
            min: [-20, -20],
            max: [20, 20],
            step: 1,
            label: i18n.position,
          },
          { id: 'width', kind: 'range', defaultValue: 220, min: 120, max: 260, step: 1, label: i18n.width },
          { id: 'height', kind: 'range', defaultValue: 140, min: 90, max: 180, step: 1, label: i18n.height },
          { id: 'hole', kind: 'range', defaultValue: 35, min: 10, max: 40, step: 1, label: i18n.hole },
        ],
      },
      {
        label: i18n.inspect,
        controls: [
          { id: 'outline', kind: 'switch', defaultValue: true, label: i18n.outline },
          { id: 'labels', kind: 'switch', defaultValue: true, label: i18n.labels },
        ],
      },
    ],
  });
  return {
    controls,
    canonicalValues: buildPreviewControlDefaults(controls),
    relatedApis: ['Scope.transforms', 'Scope.clip', 'ClipInspectOptionsSchema'],
  };
};

/** Stable baseline and registry fallback. */
export const previewControlContract = createPreviewControlContract('zh');
export const previewControls = previewControlContract.controls;

import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { markPlacementI18n } from './mark-placement.i18n';

/** 位置、形状与外观控件 */
const createControls = (lang: Lang) => {
  const i18n = markPlacementI18n[lang];
  return definePreviewControls({
    presentation: 'panel',
    title: i18n.title,
    sections: [
      {
        controls: [
          {
            kind: 'select',
            id: 'shape',
            label: i18n.shape,
            defaultValue: 'check',
            options: [
              { label: i18n.times, value: 'times' },
              { label: i18n.plus, value: 'plus' },
              { label: i18n.check, value: 'check' },
              { label: i18n.star, value: 'star' },
              { label: i18n.arrow, value: 'stealth' },
            ],
          },
          { kind: 'range', id: 'position', label: i18n.position, defaultValue: 0.5, min: 0, max: 1, step: 0.05 },
          { kind: 'range', id: 'scale', label: i18n.scale, defaultValue: 2, min: 0.5, max: 3, step: 0.1 },
          { kind: 'color', id: 'color', label: i18n.color, defaultValue: '#2563eb' },
          { kind: 'switch', id: 'autoRotate', label: i18n.autoRotate, defaultValue: false },
          {
            kind: 'range',
            id: 'angle',
            label: i18n.angle,
            defaultValue: 0,
            min: -180,
            max: 180,
            step: 15,
            visibleWhen: { controlId: 'autoRotate', oneOf: [false] },
          },
        ],
      },
    ],
  });
};

/** 默认标记控件 */
export const markPlacementControls = createControls('zh');

/** 标记试验场契约 */
export const createPreviewControlContract = (lang: Lang) =>
  ({
    controls: createControls(lang),
    canonicalValues: { shape: 'check', position: 0.5, scale: 2, color: '#2563eb', autoRotate: false, angle: 0 },
    relatedApis: ['Draw.marks', 'Path.marks'],
  }) satisfies PreviewControlContract;

/** 默认预览契约 */
export const previewControlContract = createPreviewControlContract('zh');

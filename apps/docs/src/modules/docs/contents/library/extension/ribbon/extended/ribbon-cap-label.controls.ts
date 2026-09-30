import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { ribbonCapLabelI18n } from './ribbon-cap-label.i18n';

/** 端帽形状作为标签定位的上下文，操作标签字段观察实际位置 */
export const createPreviewControlContract = (lang: Lang) => {
  const text = ribbonCapLabelI18n[lang];
  return {
    controls: definePreviewControls({
      presentation: 'panel',
      title: text.title,
      sections: [
        {
          controls: [
            {
              kind: 'select',
              id: 'cap',
              label: text.cap,
              defaultValue: 'round',
              options: [
                { value: 'round', label: text.round },
                { value: 'square', label: text.square },
                { value: 'arc', label: text.arc },
              ],
            },
            {
              kind: 'select',
              id: 'rotate',
              label: text.rotate,
              defaultValue: 'tangent',
              options: [
                { value: 'none', label: text.none },
                { value: 'radial', label: text.radial },
                { value: 'tangent', label: text.tangent },
                { value: 'angle', label: text.angle },
              ],
            },
            {
              kind: 'range',
              id: 'textAngle',
              label: text.textAngle,
              defaultValue: 30,
              min: -180,
              max: 180,
              step: 5,
              visibleWhen: { controlId: 'rotate', oneOf: ['angle'] },
            },
            {
              kind: 'select',
              id: 'placement',
              label: text.placement,
              defaultValue: 'outside',
              options: [
                { value: 'outside', label: text.outside },
                { value: 'inside', label: text.inside },
              ],
            },
            { kind: 'range', id: 'distance', label: text.distance, defaultValue: 8, min: 0, max: 24, step: 1 },
            { kind: 'switch', id: 'keepUpright', label: text.keepUpright, defaultValue: true },
          ],
        },
      ],
    }),
    canonicalValues: {
      cap: 'round',
      rotate: 'tangent',
      textAngle: 30,
      placement: 'outside',
      distance: 8,
      keepUpright: true,
    },
    relatedApis: ['Path.kindOptions.start.label', 'Path.kindOptions.end.label'],
  } satisfies PreviewControlContract;
};

export const previewControlContract = createPreviewControlContract('zh');

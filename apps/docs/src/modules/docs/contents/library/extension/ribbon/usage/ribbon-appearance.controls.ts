import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { ribbonAppearanceI18n } from './ribbon-appearance.i18n';

/** 固定几何，只调整流带外观 */
export const createPreviewControlContract = (lang: Lang) => {
  const text = ribbonAppearanceI18n[lang];
  return {
    controls: definePreviewControls({
      presentation: 'panel',
      title: text.title,
      sections: [
        {
          controls: [
            {
              kind: 'select',
              id: 'fillKind',
              label: text.fillKind,
              defaultValue: 'solid',
              options: [
                { value: 'solid', label: text.solid },
                { value: 'linearGradient', label: text.linear },
                { value: 'radialGradient', label: text.radial },
                { value: 'conicGradient', label: text.conic },
              ],
            },
            {
              kind: 'color',
              id: 'fill',
              label: text.fill,
              defaultValue: '#38bdf8',
              visibleWhen: { controlId: 'fillKind', oneOf: ['solid'] },
            },
            {
              kind: 'color',
              id: 'startColor',
              label: text.startColor,
              defaultValue: '#38bdf8',
              visibleWhen: { controlId: 'fillKind', oneOf: ['linearGradient', 'radialGradient', 'conicGradient'] },
            },
            {
              kind: 'color',
              id: 'endColor',
              label: text.endColor,
              defaultValue: '#a855f7',
              visibleWhen: { controlId: 'fillKind', oneOf: ['linearGradient', 'radialGradient', 'conicGradient'] },
            },
            {
              kind: 'range',
              id: 'angle',
              label: text.angle,
              defaultValue: 0,
              min: -180,
              max: 180,
              step: 5,
              visibleWhen: { controlId: 'fillKind', oneOf: ['linearGradient', 'conicGradient'] },
            },
            {
              kind: 'range',
              id: 'radius',
              label: text.radius,
              defaultValue: 0.5,
              min: 0.1,
              max: 1,
              step: 0.05,
              visibleWhen: { controlId: 'fillKind', oneOf: ['radialGradient'] },
            },
            {
              kind: 'range',
              id: 'fillOpacity',
              label: text.fillOpacity,
              defaultValue: 0.75,
              min: 0,
              max: 1,
              step: 0.05,
            },
            { kind: 'color', id: 'stroke', label: text.stroke, defaultValue: '#075985' },
            { kind: 'range', id: 'strokeWidth', label: text.strokeWidth, defaultValue: 1, min: 0, max: 6, step: 0.5 },
            { kind: 'switch', id: 'shadow', label: text.shadow, defaultValue: false },
          ],
        },
      ],
    }),
    canonicalValues: {
      fillKind: 'solid',
      fill: '#38bdf8',
      startColor: '#38bdf8',
      endColor: '#a855f7',
      angle: 0,
      radius: 0.5,
      fillOpacity: 0.75,
      stroke: '#075985',
      strokeWidth: 1,
      shadow: false,
    },
    relatedApis: [
      'Path.style.fill',
      'Path.style.fillOpacity',
      'Path.style.stroke',
      'Path.style.strokeWidth',
      'Path.style.shadow',
    ],
  } satisfies PreviewControlContract;
};

export const previewControlContract = createPreviewControlContract('zh');

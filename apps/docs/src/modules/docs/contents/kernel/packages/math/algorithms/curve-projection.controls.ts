import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { curveProjectionI18n } from './curve-projection.i18n';

/** 投影几何参数与双语控件 */
export const createPreviewControlContract = (lang: Lang) => {
  const i18n = curveProjectionI18n[lang];
  return {
    controls: definePreviewControls({
      presentation: 'panel',
      title: i18n.title,
      sections: [
        {
          controls: [
            {
              kind: 'select',
              id: 'kind',
              label: i18n.kind,
              defaultValue: 'quadraticBezier',
              options: [
                { value: 'line', label: i18n.line },
                { value: 'quadraticBezier', label: i18n.quadratic },
                { value: 'cubicBezier', label: i18n.cubic },
                { value: 'arc', label: i18n.arc },
                { value: 'ellipseArc', label: i18n.ellipse },
              ],
            },
            {
              kind: 'range',
              id: 'controlX',
              visibleWhen: { controlId: 'kind', oneOf: ['quadraticBezier', 'cubicBezier'] },
              label: i18n.controlX,
              defaultValue: 20,
              min: -20,
              max: 20,
              step: 1,
            },
            {
              kind: 'range',
              id: 'controlY',
              visibleWhen: { controlId: 'kind', oneOf: ['quadraticBezier', 'cubicBezier'] },
              label: i18n.controlY,
              defaultValue: 10,
              min: 0,
              max: 20,
              step: 1,
            },
            { kind: 'range', id: 'angle', label: i18n.angle, defaultValue: 0, min: -180, max: 180, step: 5 },
          ],
        },
      ],
    }),
    canonicalValues: { kind: 'quadraticBezier', controlX: 20, controlY: 10, angle: 0 },
    relatedApis: ['curve.projectedRange'],
  } satisfies PreviewControlContract;
};
export const previewControlContract = createPreviewControlContract('zh');
export const previewControls = previewControlContract.controls;

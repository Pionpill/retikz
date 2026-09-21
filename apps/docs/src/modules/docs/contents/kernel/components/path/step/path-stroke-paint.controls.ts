import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { pathStrokePaintControlsI18n } from './path-stroke-paint.i18n';

/** Path 渐变描边的中文属性面板 */
const createControls = (lang: Lang) => {
  const i18n = pathStrokePaintControlsI18n[lang];
  return definePreviewControls({
    presentation: 'panel',
    title: i18n.gradientStroke,
    sections: [
      {
        label: i18n.gradient,
        controls: [
          {
            kind: 'select',
            id: 'gradientKind',
            label: i18n.gradientType,
            defaultValue: 'linearGradient',
            options: [
              { value: 'linearGradient', label: i18n.linear },
              { value: 'radialGradient', label: i18n.radial },
              { value: 'conicGradient', label: i18n.conic },
            ],
          },
          {
            kind: 'range',
            id: 'linearAngle',
            label: i18n.angle,
            defaultValue: 90,
            min: 0,
            max: 360,
            step: 15,
            visibleWhen: { controlId: 'gradientKind', oneOf: ['linearGradient'] },
          },
          {
            kind: 'point',
            id: 'center',
            label: i18n.center,
            defaultValue: [0.5, 0.5],
            min: [0, 0],
            max: [1, 1],
            step: 0.1,
            visibleWhen: { controlId: 'gradientKind', oneOf: ['radialGradient', 'conicGradient'] },
          },
          {
            kind: 'range',
            id: 'radius',
            label: i18n.radius,
            defaultValue: 0.5,
            min: 0.1,
            max: 1,
            step: 0.1,
            visibleWhen: { controlId: 'gradientKind', oneOf: ['radialGradient'] },
          },
          {
            kind: 'range',
            id: 'conicAngle',
            label: i18n.startAngle,
            defaultValue: 0,
            min: 0,
            max: 360,
            step: 15,
            visibleWhen: { controlId: 'gradientKind', oneOf: ['conicGradient'] },
          },
          { kind: 'color', id: 'startColor', label: i18n.startColor, defaultValue: '#2563eb' },
          { kind: 'color', id: 'middleColor', label: i18n.middleColor, defaultValue: '#f59e0b' },
          { kind: 'color', id: 'endColor', label: i18n.endColor, defaultValue: '#e11d48' },
        ],
      },
    ],
  });
};

/** 默认中文控件，用于推导控件值类型 */
export const pathStrokePaintControls = createControls('zh');

/** 当前 controls 面板的稳定文档契约 */
export const createPreviewControlContract = (lang: Lang) =>
  ({
    controls: createControls(lang),
    canonicalValues: {
      gradientKind: 'linearGradient',
      linearAngle: 90,
      center: [0.5, 0.5],
      radius: 0.5,
      conicAngle: 0,
      startColor: '#2563eb',
      middleColor: '#f59e0b',
      endColor: '#e11d48',
    },
    relatedApis: ['Path.style.stroke'],
  }) satisfies PreviewControlContract;

/** 默认中文预览契约 */
export const previewControlContract = createPreviewControlContract('zh');

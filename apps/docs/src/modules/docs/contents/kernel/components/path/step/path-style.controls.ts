import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { pathStyleControlsI18n } from './path-style.i18n';

/** Path 描边样式 playground 的中文属性面板 */
const createControls = (lang: Lang) => {
  const i18n = pathStyleControlsI18n[lang];
  return definePreviewControls({
    presentation: 'panel',
    title: i18n.pathAppearance,
    defaultSize: 50,
    sections: [
      {
        label: i18n.stroke,
        controls: [
          { kind: 'color', id: 'stroke', label: i18n.color, defaultValue: '#172033' },
          {
            kind: 'select',
            id: 'thickness',
            label: i18n.thickness,
            defaultValue: 'custom',
            options: [
              { value: 'custom', label: i18n.custom },
              { value: 'thin', label: i18n.thin },
              { value: 'semithick', label: i18n.semithick },
              { value: 'thick', label: i18n.thick },
              { value: 'veryThick', label: i18n.verythick },
            ],
          },
          {
            kind: 'range',
            id: 'strokeWidth',
            label: i18n.strokeWidth,
            defaultValue: 5,
            min: 1,
            max: 14,
            step: 1,
            visibleWhen: { controlId: 'thickness', oneOf: ['custom'] },
          },
          { kind: 'switch', id: 'dashed', label: i18n.dashed, defaultValue: true },
          {
            kind: 'range',
            id: 'dashOffset',
            label: i18n.dashOffset,
            defaultValue: 0,
            min: -16,
            max: 16,
            step: 1,
            visibleWhen: { controlId: 'dashed', oneOf: [true] },
          },
        ],
      },
      {
        label: i18n.capsJoinsAndOpacity,
        controls: [
          {
            kind: 'select',
            id: 'lineCap',
            label: i18n.capStyle,
            defaultValue: 'round',
            options: [
              { value: 'butt', label: i18n.butt },
              { value: 'round', label: i18n.round },
              { value: 'square', label: i18n.square },
            ],
          },
          {
            kind: 'select',
            id: 'lineJoin',
            label: i18n.joinStyle,
            defaultValue: 'round',
            options: [
              { value: 'miter', label: i18n.miter },
              { value: 'round', label: i18n.round2 },
              { value: 'bevel', label: i18n.bevel },
            ],
          },
          { kind: 'range', id: 'opacity', label: i18n.overallOpacity, defaultValue: 1, min: 0.1, max: 1, step: 0.1 },
          {
            kind: 'range',
            id: 'strokeOpacity',
            label: i18n.strokeOpacity,
            defaultValue: 1,
            min: 0.1,
            max: 1,
            step: 0.1,
          },
        ],
      },
    ],
  });
};

/** 默认中文控件，用于推导控件值类型 */
export const pathStyleControls = createControls('zh');

/** 当前 controls 面板的稳定文档契约 */
export const createPreviewControlContract = (lang: Lang) =>
  ({
    controls: createControls(lang),
    canonicalValues: {
      stroke: '#172033',
      thickness: 'custom',
      strokeWidth: 5,
      dashed: true,
      dashOffset: 0,
      lineCap: 'round',
      lineJoin: 'round',
      opacity: 1,
      strokeOpacity: 1,
    },
    relatedApis: [
      'Path.style.stroke',
      'Path.thickness',
      'Path.style.strokeWidth',
      'Path.style.opacity',
      'Path.style.dashPattern',
      'Path.style.dashOffset',
      'Path.style.lineCap',
      'Path.style.lineJoin',
      'Path.style.strokeOpacity',
    ],
  }) satisfies PreviewControlContract;

/** 默认中文预览契约 */
export const previewControlContract = createPreviewControlContract('zh');

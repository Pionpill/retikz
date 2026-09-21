import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { drawStyleControlsI18n } from './draw-style.i18n';

/** Draw 开放路径样式的中文属性面板 */
const createControls = (lang: Lang) => {
  const i18n = drawStyleControlsI18n[lang];
  return definePreviewControls({
    presentation: 'panel',
    title: i18n.drawPathAppearance,
    sections: [
      {
        label: i18n.stroke,
        controls: [
          { kind: 'color', id: 'stroke', label: i18n.color, defaultValue: '#1e90ff' },
          { kind: 'range', id: 'strokeWidth', label: i18n.width, defaultValue: 2, min: 1, max: 8, step: 0.5 },
          { kind: 'switch', id: 'dashed', label: i18n.dashed, defaultValue: false },
          {
            kind: 'range',
            id: 'dashOffset',
            label: i18n.dashoffset,
            defaultValue: 0,
            min: -12,
            max: 12,
            step: 1,
            visibleWhen: { controlId: 'dashed', oneOf: [true] },
          },
        ],
      },
      {
        label: i18n.geometryAndEndpoints,
        controls: [
          {
            kind: 'select',
            id: 'arrow',
            label: i18n.arrow,
            defaultValue: '->',
            options: [
              { value: 'none', label: i18n.none },
              { value: '->', label: i18n.end },
              { value: '<-', label: i18n.start },
              { value: '<->', label: i18n.bothEnds },
            ],
          },
          {
            kind: 'range',
            id: 'roundedCorners',
            label: i18n.cornerRadius,
            defaultValue: 0,
            min: 0,
            max: 40,
            step: 2,
          },
        ],
      },
    ],
  });
};

/** 默认中文控件，用于推导控件值类型 */
export const drawStyleControls = createControls('zh');

/** 当前 controls 面板的稳定文档契约 */
export const createPreviewControlContract = (lang: Lang) =>
  ({
    controls: createControls(lang),
    canonicalValues: {
      stroke: '#1e90ff',
      strokeWidth: 2,
      dashed: false,
      dashOffset: 0,
      arrow: '->',
      roundedCorners: 0,
    },
    relatedApis: [
      'Draw.style.stroke',
      'Draw.style.strokeWidth',
      'Draw.style.dashPattern',
      'Draw.style.dashOffset',
      'Draw.arrow',
      'Draw.roundedCorners',
    ],
  }) satisfies PreviewControlContract;

/** 默认中文预览契约 */
export const previewControlContract = createPreviewControlContract('zh');

import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { pathRoundedCornersControlsI18n } from './path-rounded-corners.i18n';

/** Path 几何圆角 playground 的中文属性面板 */
const createControls = (lang: Lang) => {
  const i18n = pathRoundedCornersControlsI18n[lang];
  return definePreviewControls({
    presentation: 'panel',
    title: i18n.roundedPolyline,
    sections: [
      {
        label: i18n.geometryAndStroke,
        controls: [
          {
            kind: 'range',
            id: 'radius',
            label: i18n.cornerRadius,
            defaultValue: 36,
            min: 0,
            max: 56,
            step: 4,
          },
          { kind: 'range', id: 'strokeWidth', label: i18n.strokeWidth, defaultValue: 24, min: 8, max: 36, step: 4 },
          {
            kind: 'select',
            id: 'lineJoin',
            label: i18n.joinStyle,
            defaultValue: 'round',
            options: [
              { value: 'miter', label: i18n.miter },
              { value: 'round', label: i18n.round },
              { value: 'bevel', label: i18n.bevel },
            ],
          },
        ],
      },
    ],
  });
};

/** 默认中文控件，用于推导控件值类型 */
export const pathRoundedCornersControls = createControls('zh');

/** 当前 controls 面板的稳定文档契约 */
export const createPreviewControlContract = (lang: Lang) =>
  ({
    controls: createControls(lang),
    canonicalValues: { radius: 36, strokeWidth: 24, lineJoin: 'round' },
    relatedApis: ['Path.roundedCorners', 'Path.style.strokeWidth', 'Path.style.lineJoin'],
  }) satisfies PreviewControlContract;

/** 默认中文预览契约 */
export const previewControlContract = createPreviewControlContract('zh');

import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { pathTransformControlsI18n } from './path-transform.i18n';

/** Path 整体变换的中文属性面板 */
const createControls = (lang: Lang) => {
  const i18n = pathTransformControlsI18n[lang];
  return definePreviewControls({
    presentation: 'panel',
    title: i18n.pathTransform,
    sections: [
      {
        label: i18n.transform,
        controls: [
          { kind: 'range', id: 'rotate', label: i18n.rotate, defaultValue: 40, min: -180, max: 180, step: 5 },
          {
            kind: 'point',
            id: 'scale',
            label: i18n.scale,
            defaultValue: [1, 1],
            min: [0.5, 0.5],
            max: [1.5, 1.5],
            step: 0.1,
          },
        ],
      },
    ],
  });
};

/** 默认中文控件，用于推导控件值类型 */
export const pathTransformControls = createControls('zh');

/** 当前 controls 面板的稳定文档契约 */
export const createPreviewControlContract = (lang: Lang) =>
  ({
    controls: createControls(lang),
    canonicalValues: { rotate: 40, scale: [1, 1] },
    relatedApis: ['Path.rotate', 'Path.scale'],
  }) satisfies PreviewControlContract;

/** 默认中文预览契约 */
export const previewControlContract = createPreviewControlContract('zh');

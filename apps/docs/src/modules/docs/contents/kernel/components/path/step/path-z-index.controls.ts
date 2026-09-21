import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { pathZIndexControlsI18n } from './path-z-index.i18n';

/** Path 栈序的中文属性面板 */
const createControls = (lang: Lang) => {
  const i18n = pathZIndexControlsI18n[lang];
  return definePreviewControls({
    presentation: 'panel',
    title: i18n.stacking,
    sections: [
      {
        label: i18n.overlap,
        controls: [{ kind: 'range', id: 'zIndex', label: i18n.blueZIndex, defaultValue: 1, min: -1, max: 2, step: 1 }],
      },
    ],
  });
};

/** 默认中文控件，用于推导控件值类型 */
export const pathZIndexControls = createControls('zh');

/** 当前 controls 面板的稳定文档契约 */
export const createPreviewControlContract = (lang: Lang) =>
  ({
    controls: createControls(lang),
    canonicalValues: { zIndex: 1 },
    relatedApis: ['Path.zIndex'],
  }) satisfies PreviewControlContract;

/** 默认中文预览契约 */
export const previewControlContract = createPreviewControlContract('zh');

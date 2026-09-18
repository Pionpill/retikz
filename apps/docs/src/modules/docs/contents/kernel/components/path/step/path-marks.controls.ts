import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { pathMarksControlsI18n } from './path-marks.i18n';

/** Path 中段标记的中文属性面板 */
const createControls = (lang: Lang) => {
  const i18n = pathMarksControlsI18n[lang];
  return definePreviewControls({
    presentation: 'panel',
    title: i18n.pathMarks,
    sections: [
      {
        label: i18n.position,
        controls: [
          { kind: 'range', id: 'firstPosition', label: i18n.markA, defaultValue: 0.25, min: 0, max: 1, step: 0.05 },
          { kind: 'range', id: 'secondPosition', label: i18n.markB, defaultValue: 0.75, min: 0, max: 1, step: 0.05 },
        ],
      },
    ],
  });
};

/** 默认中文控件，用于推导控件值类型 */
export const pathMarksControls = createControls('zh');

/** 当前 controls 面板的稳定文档契约 */
export const createPreviewControlContract = (lang: Lang) =>
  ({
    controls: createControls(lang),
    canonicalValues: { firstPosition: 0.25, secondPosition: 0.75 },
    relatedApis: ['Path.marks'],
  }) satisfies PreviewControlContract;

/** 默认中文预览契约 */
export const previewControlContract = createPreviewControlContract('zh');

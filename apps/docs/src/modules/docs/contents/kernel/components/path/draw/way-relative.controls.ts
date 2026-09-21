import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { wayRelativeControlsI18n } from './way-relative.i18n';

/** Way 相对坐标对照的中文属性面板 */
const createControls = (lang: Lang) => {
  const i18n = wayRelativeControlsI18n[lang];
  return definePreviewControls({
    presentation: 'panel',
    title: i18n.relativeCoordinates,
    sections: [
      {
        label: i18n.offset,
        controls: [
          {
            kind: 'point',
            id: 'offset',
            label: i18n.offset2,
            defaultValue: [90, 30],
            min: [30, -40],
            max: [100, 40],
            step: 10,
          },
        ],
      },
    ],
  });
};

/** 默认中文控件，用于推导控件值类型 */
export const wayRelativeControls = createControls('zh');

/** 当前 controls 面板的稳定文档契约 */
export const createPreviewControlContract = (lang: Lang) =>
  ({
    controls: createControls(lang),
    canonicalValues: { offset: [90, 30] },
    relatedApis: ['Draw.way'],
  }) satisfies PreviewControlContract;

/** 默认中文预览契约 */
export const previewControlContract = createPreviewControlContract('zh');

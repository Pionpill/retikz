import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { wayFoldControlsI18n } from './way-fold.i18n';

/** Way 折角方向的中文属性面板 */
const createControls = (lang: Lang) => {
  const i18n = wayFoldControlsI18n[lang];
  return definePreviewControls({
    presentation: 'panel',
    title: i18n.fold,
    sections: [
      {
        label: i18n.path,
        controls: [
          {
            kind: 'select',
            id: 'direction',
            label: i18n.foldDirection,
            defaultValue: '-|',
            options: [
              { value: '-|', label: i18n.horizontalVertical },
              { value: '|-', label: i18n.verticalHorizontal },
              { value: '-|-', label: i18n.horizontalVerticalHorizontal },
              { value: '|-|', label: i18n.verticalHorizontalVertical },
            ],
          },
          {
            kind: 'range',
            id: 'fraction',
            label: i18n.middlePosition,
            defaultValue: 0.5,
            min: 0,
            max: 1,
            step: 0.05,
            visibleWhen: { controlId: 'direction', oneOf: ['-|-', '|-|'] },
          },
        ],
      },
    ],
  });
};

/** 默认中文控件，用于推导控件值类型 */
export const wayFoldControls = createControls('zh');

/** 当前 controls 面板的稳定文档契约 */
export const createPreviewControlContract = (lang: Lang) =>
  ({
    controls: createControls(lang),
    canonicalValues: { direction: '-|', fraction: 0.5 },
    relatedApis: ['Draw.way', 'WayFoldOp.fraction'],
  }) satisfies PreviewControlContract;

/** 默认中文预览契约 */
export const previewControlContract = createPreviewControlContract('zh');

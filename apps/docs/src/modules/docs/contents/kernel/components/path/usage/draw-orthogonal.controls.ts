import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { drawOrthogonalControlsI18n } from './draw-orthogonal.i18n';

/** Draw 正交连接的中文属性面板 */
const createControls = (lang: Lang) => {
  const i18n = drawOrthogonalControlsI18n[lang];
  return definePreviewControls({
    presentation: 'panel',
    title: i18n.drawOrthogonalConnections,
    sections: [
      {
        label: i18n.connection,
        controls: [
          {
            kind: 'select',
            id: 'connection',
            label: i18n.connectionType,
            defaultValue: 'horizontal',
            options: [
              { value: 'horizontal', label: i18n.horizontalAxis },
              { value: 'vertical', label: i18n.verticalAxis },
              { value: 'fold', label: i18n.foldConnection },
            ],
          },
        ],
      },
      {
        label: i18n.fold,
        visibleWhen: { controlId: 'connection', oneOf: ['fold'] },
        controls: [
          {
            kind: 'select',
            id: 'via',
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
            visibleWhen: { controlId: 'via', oneOf: ['-|-', '|-|'] },
          },
        ],
      },
    ],
  });
};

/** 默认中文控件，用于推导控件值类型 */
export const drawOrthogonalControls = createControls('zh');

/** 当前 controls 面板的稳定文档契约 */
export const createPreviewControlContract = (lang: Lang) =>
  ({
    controls: createControls(lang),
    canonicalValues: { connection: 'horizontal', via: '-|', fraction: 0.5 },
    relatedApis: [
      'Draw.way',
      'WayAxisLineOp.horizontalTo',
      'WayAxisLineOp.verticalTo',
      'WayFoldOp.via',
      'WayFoldOp.fraction',
    ],
  }) satisfies PreviewControlContract;

/** 默认中文预览契约 */
export const previewControlContract = createPreviewControlContract('zh');

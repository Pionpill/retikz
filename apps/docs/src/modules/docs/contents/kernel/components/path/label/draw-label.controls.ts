import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { drawLabelControlsI18n } from './draw-label.i18n';

/** Draw label playground 的中文属性面板 */
const createControls = (lang: Lang) => {
  const i18n = drawLabelControlsI18n[lang];
  return definePreviewControls({
    presentation: 'panel',
    title: i18n.drawEdgeLabel,
    sections: [
      {
        label: i18n.segmentAndPosition,
        controls: [
          {
            kind: 'select',
            id: 'segmentKind',
            label: i18n.segmentKind,
            defaultValue: 'line',
            options: [
              { value: 'line', label: i18n.line },
              { value: '-|', label: i18n.horizontalThenVertical },
              { value: '|-', label: i18n.verticalThenHorizontal },
              { value: 'curve', label: i18n.quadraticBezier },
            ],
          },
          {
            kind: 'range',
            id: 'position',
            label: i18n.position,
            defaultValue: 0.5,
            min: 0,
            max: 1,
            step: 0.05,
          },
          {
            kind: 'select',
            id: 'side',
            label: i18n.side,
            defaultValue: 'top',
            options: [
              { value: 'top', label: i18n.top },
              { value: 'bottom', label: i18n.bottom },
              { value: 'left', label: i18n.left },
              { value: 'right', label: i18n.right },
            ],
          },
        ],
      },
      {
        label: i18n.text,
        controls: [
          { kind: 'switch', id: 'sloped', label: i18n.rotateAlongPath, defaultValue: false },
          { kind: 'color', id: 'textColor', label: i18n.textColor, defaultValue: '#6b7280' },
        ],
      },
    ],
  });
};

/** 默认中文控件，用于推导控件值类型 */
export const drawLabelControls = createControls('zh');

/** 当前 controls 面板的稳定文档契约 */
export const createPreviewControlContract = (lang: Lang) =>
  ({
    controls: createControls(lang),
    canonicalValues: { segmentKind: 'line', position: 0.5, side: 'top', sloped: false, textColor: '#6b7280' },
    relatedApis: ['Draw.label'],
  }) satisfies PreviewControlContract;

/** 默认中文预览契约 */
export const previewControlContract = createPreviewControlContract('zh');

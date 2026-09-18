import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { drawFillStackControlsI18n } from './draw-fill-stack.i18n';

/** Draw 填充与栈序的中文属性面板 */
const createControls = (lang: Lang) => {
  const i18n = drawFillStackControlsI18n[lang];
  return definePreviewControls({
    presentation: 'panel',
    title: i18n.drawFillAndStacking,
    sections: [
      {
        label: i18n.fill,
        controls: [
          { kind: 'color', id: 'fillA', label: i18n.blueShape, defaultValue: '#1e90ff' },
          { kind: 'color', id: 'fillB', label: i18n.redShape, defaultValue: '#ef4444' },
          {
            kind: 'range',
            id: 'fillOpacity',
            label: i18n.fillOpacity,
            defaultValue: 0.7,
            min: 0.2,
            max: 1,
            step: 0.05,
          },
        ],
      },
      {
        label: i18n.stacking,
        controls: [
          {
            kind: 'range',
            id: 'zIndexA',
            label: i18n.blueZIndex,
            defaultValue: 0,
            min: -1,
            max: 2,
            step: 1,
          },
        ],
      },
    ],
  });
};

/** 默认中文控件，用于推导控件值类型 */
export const drawFillStackControls = createControls('zh');

/** 当前 controls 面板的稳定文档契约 */
export const createPreviewControlContract = (lang: Lang) =>
  ({
    controls: createControls(lang),
    canonicalValues: { fillA: '#1e90ff', fillB: '#ef4444', fillOpacity: 0.7, zIndexA: 0 },
    relatedApis: ['Draw.style.fill', 'Draw.style.fillOpacity', 'Draw.zIndex'],
  }) satisfies PreviewControlContract;

/** 默认中文预览契约 */
export const previewControlContract = createPreviewControlContract('zh');

import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { customMarkI18n } from './custom-mark.i18n';

/** 圆环参数与放置控件 */
const createControls = (lang: Lang) => {
  const i18n = customMarkI18n[lang];
  return definePreviewControls({
    presentation: 'panel',
    defaultSize: 50,
    title: i18n.title,
    sections: [
      {
        controls: [
          { kind: 'range', id: 'radius', label: i18n.radius, defaultValue: 3, min: 1, max: 5, step: 0.5 },
          { kind: 'range', id: 'position', label: i18n.position, defaultValue: 0.5, min: 0, max: 1, step: 0.05 },
          { kind: 'range', id: 'scale', label: i18n.scale, defaultValue: 2, min: 0.5, max: 3, step: 0.1 },
          { kind: 'color', id: 'color', label: i18n.color, defaultValue: '#2563eb' },
        ],
      },
    ],
  });
};

/** 默认圆环控件 */
export const customMarkControls = createControls('zh');

/** 圆环试验场契约 */
export const createPreviewControlContract = (lang: Lang) =>
  ({
    controls: createControls(lang),
    canonicalValues: { radius: 3, position: 0.5, scale: 2, color: '#2563eb' },
    relatedApis: ['MarkDefinition.emit', 'Draw.marks', 'Layout.extensions.marks'],
  }) satisfies PreviewControlContract;

/** 默认预览契约 */
export const previewControlContract = createPreviewControlContract('zh');

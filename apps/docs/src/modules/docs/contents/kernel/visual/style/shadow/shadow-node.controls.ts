import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { shadowI18n } from './shadow-node.i18n';
/** 按语言生成阴影控件，字段与默认值保持一致 */
export const createPreviewControlContract = (lang: Lang) => {
  const text = shadowI18n[lang];
  const controls = definePreviewControls({
    presentation: 'panel',
    title: text.title,
    sections: [
      {
        label: text.section,
        controls: [
          { kind: 'switch', id: 'enabled', label: text.enabled, defaultValue: true },
          { kind: 'range', id: 'offsetX', label: text.offsetX, defaultValue: 8, min: -20, max: 20 },
          { kind: 'range', id: 'offsetY', label: text.offsetY, defaultValue: 10, min: -20, max: 20 },
          { kind: 'range', id: 'blur', label: text.blur, defaultValue: 8, min: 0, max: 20 },
          { kind: 'color', id: 'color', label: text.color, defaultValue: '#4682b4' },
          { kind: 'range', id: 'opacity', label: text.opacity, defaultValue: 0.7, min: 0, max: 1, step: 0.05 },
        ],
      },
    ],
  });
  return {
    controls,
    canonicalValues: { enabled: true, offsetX: 8, offsetY: 10, blur: 8, color: '#4682b4', opacity: 0.7 },
    relatedApis: ['Node.style.shadow'],
  } satisfies PreviewControlContract;
};
/** 中文回退契约 */
export const previewControlContract = createPreviewControlContract('zh');

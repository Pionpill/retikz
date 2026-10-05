import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { demoI18n } from './grid-tracks.i18n';

/** 同一场景的本地化控件与重置基线 */
export const createPreviewControlContract = (lang: Lang) => {
  const text = demoI18n[lang];
  const controls = definePreviewControls({
    presentation: 'panel',
    title: text.title,
    sections: [
      {
        controls: [
          { id: 'width', kind: 'range', min: 240, max: 500, step: 1, defaultValue: 460, label: text.width },
          { id: 'factor', kind: 'range', min: 1, max: 4, step: 1, defaultValue: 1, label: text.factor },
          { id: 'gap', kind: 'range', min: 0, max: 24, step: 1, defaultValue: 12, label: text.gap },
          { id: 'padding', kind: 'range', min: 0, max: 24, step: 1, defaultValue: 12, label: text.padding },
        ],
      },
    ],
  });

  return {
    controls,
    canonicalValues: { width: 460, factor: 1, gap: 12, padding: 12 },
    relatedApis: ['GridLayout.columns', 'GridLayout.size', 'GridLayout.columnGap', 'GridLayout.padding'],
  } satisfies PreviewControlContract;
};

/** 中文注册基线 */
export const previewControlContract = createPreviewControlContract('zh');

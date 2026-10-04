import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { counterResultI18n } from './counter-result.i18n';

/** 每次试验提交一份完整计数，保持控件与重置基线一致 */
export const createPreviewControlContract = (lang: Lang) => {
  const i18n = counterResultI18n[lang];
  return {
    controls: definePreviewControls({
      presentation: 'panel',
      title: i18n.controls,
      sections: [
        {
          controls: [
            { kind: 'range', id: 'initial', label: i18n.initialCount, defaultValue: 1, min: -10, max: 10, step: 1 },
            { kind: 'range', id: 'next', label: i18n.nextCount, defaultValue: 2, min: -10, max: 10, step: 1 },
          ],
        },
      ],
    }),
    canonicalValues: { initial: 1, next: 2 },
    relatedApis: ['createRuntimeSourceInput', 'createRuntimeSourceUpdate', 'createRuntime'],
  } satisfies PreviewControlContract;
};

/** 默认语言的控件契约 */
export const previewControlContract = createPreviewControlContract('zh');

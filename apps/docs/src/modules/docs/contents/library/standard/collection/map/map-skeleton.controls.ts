import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract } from '@/modules/docs/preview';

import { mapSkeletonI18n } from './map-skeleton.i18n';

/** 按语言生成骨架 controls */
const createControls = (lang: Lang) => {
  const t = mapSkeletonI18n[lang];
  return definePreviewControls({
    presentation: 'panel',
    title: t.title,
    sections: [
      {
        controls: [
          { kind: 'switch', id: 'empty', label: t.empty, defaultValue: false },
          {
            kind: 'text',
            id: 'keys',
            label: t.keys,
            defaultValue: 'k₁|k₂|k₁',
            visibleWhen: { controlId: 'empty', oneOf: [false] },
          },
        ],
      },
    ],
  });
};
/** 控件与源码共享的稳定契约 */
export const createPreviewControlContract = (lang: Lang) =>
  ({
    controls: createControls(lang),
    canonicalValues: { keys: 'k₁|k₂|k₁', empty: false },
    relatedApis: ['Map.skeleton'],
  }) satisfies PreviewControlContract;
/** 默认语言契约 */
export const previewControlContract = createPreviewControlContract('zh');

import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { animationTriggerI18n } from './animation-trigger.i18n';

/** 四类公开触发方式的控制面板 */
export const createAnimationTriggerControls = (lang: Lang) => {
  const text = animationTriggerI18n[lang];
  return definePreviewControls({
    presentation: 'panel',
    title: text.title,
    sections: [
      {
        label: text.section,
        controls: [
          {
            kind: 'select',
            id: 'trigger',
            label: text.trigger,
            defaultValue: 'load',
            options: [
              { value: 'load', label: text.load },
              { value: 'visible', label: text.visible },
              { value: 'manual', label: text.manual },
              { value: 'click', label: text.click },
            ],
          },
        ],
      },
    ],
  });
};

/** 双语面板共用触发器默认状态 */
export const createPreviewControlContract = (lang: Lang) =>
  ({
    controls: createAnimationTriggerControls(lang),
    canonicalValues: { trigger: 'load' },
    relatedApis: ['AnimationTrack.trigger'],
  }) satisfies PreviewControlContract;

export const previewControlContract = createPreviewControlContract('zh');

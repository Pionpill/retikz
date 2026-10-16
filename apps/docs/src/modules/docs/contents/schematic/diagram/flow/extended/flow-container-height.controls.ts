import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { flowContainerHeightI18n } from './flow-container-height.i18n';

/** 对比自然分组高度与统一外框高度 */
export const createPreviewControlContract = (lang: Lang = 'zh') => {
  const copy = flowContainerHeightI18n[lang];
  const controls = definePreviewControls({
    presentation: 'panel',
    title: copy.title,
    sections: [{ controls: [{ kind: 'switch', id: 'equal', label: copy.equal, defaultValue: true }] }],
  });
  return {
    controls,
    canonicalValues: { equal: true },
    relatedApis: ['FlowLayout.containerHeight'],
  } satisfies PreviewControlContract;
};

export const previewControlContract = createPreviewControlContract();
export const previewControls = previewControlContract.controls;
